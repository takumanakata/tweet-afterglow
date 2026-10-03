#!/usr/bin/env python3
"""
Tweet Afterglow — curate
Decide which tweets to keep and which to delete, from your X/Twitter archive.

  python3 curate.py prepare   # rule-based pass + batches for the AI pass
  python3 curate.py merge     # merge AI results (data/curation/batches/out_*.jsonl) -> decisions.json
  python3 curate.py report    # print the summary again

Reads   data/tweets.js   (from your X data export: data/tweets.js inside the zip)
        config.json      (copy config.example.json and edit)
Writes  data/curation/base.json          rule-only decisions
        data/curation/rubric.md          the rubric for the AI pass, with your profile filled in
        data/curation/batches/in_XX.jsonl   candidates for the AI pass
        data/curation/batches/out_XX.jsonl  AI results (one JSON per line: {"id","d","c","r"})
        data/curation/decisions.json     final decisions (read by review.html)
        data/curation/report.md          summary + list of kept tweets
"""
import json, re, sys, collections
from datetime import datetime, timezone
from pathlib import Path

HERE   = Path(__file__).resolve().parent
DATA   = HERE / 'data'
OUT    = DATA / 'curation'
BATCH  = OUT / 'batches'
TWEETS = DATA / 'tweets.js'
RUBRIC = HERE / 'RUBRIC.md'

TWITTER_EPOCH_MS = 1288834974657

DEFAULTS = {
    'pivot_date': None,            # "YYYY-MM-DD": tweets on/after this day are never touched
    'pivot_id': None,              # or a tweet id; takes precedence over pivot_date
    'always_delete_users': [],     # screen names: any tweet mentioning / replying to / retweeting them is deleted
    'always_delete_patterns': [],  # regex fragments matched against the text (case-insensitive)
    'candidate_min_favorites': 3,  # standalone tweets with >= this many likes go to the AI pass
    'extra_keywords': [],          # regex fragments added to the announcement-keyword list
    'batch_size': 300,
    'profile': 'A person who posts about their work. Keep only achievements and announcements.',
}

# Auto-generated posts (Vimeo likes, check-ins, ...)
AUTO_TEXT = re.compile(
    r'^I just liked|^I liked a @YouTube|^I uploaded a @YouTube|^I added a video to a @YouTube'
    r'|\(live at http|^Just posted a photo|^#nowplaying|^Photo: |^Photoset: ', re.I)
AUTO_SOURCE = {'Vimeo', 'Instagram', 'foursquare', 'Foursquare', 'Swarm', 'Swarm by Foursquare',
               'YouTube', 'Tumblr', 'Behance', 'SoundCloud'}
# Old-style quote RT: "comment RT @user: text" -> a reaction to someone else
OLD_QUOTE_RT = re.compile(r'\sRT @\w+:?')
# Words that suggest an announcement / achievement (candidate extraction only; the AI pass decides)
KEYWORDS = [
    r'公開', r'展示', r'出演', r'登壇', r'発表', r'リリース', r'受賞', r'掲載', r'取材', r'個展', r'ワークショップ', r'出展',
    r'開催', r'発売', r'選ばれ', r'受かっ', r'合格', r'入選', r'採択', r'ノミネート', r'放送', r'上映', r'ローンチ', r'レジデン',
    r'作りました', r'作った', r'制作', r'VJ', r'ライブ', r'イベント', r'フェス', r'講師', r'授業', r'参加',
    r'release', r'exhibit', r'talk', r'speak', r'announce', r'award', r'selected', r'featured', r'premiere',
    r'launch', r'residen', r'vimeo\.com', r'youtu',
]


def load_config():
    cfg = dict(DEFAULTS)
    p = HERE / 'config.json'
    if p.exists():
        cfg.update(json.loads(p.read_text(encoding='utf-8')))
    else:
        print('! config.json not found, using defaults (copy config.example.json to config.json)')
    if cfg['pivot_id']:
        cfg['_pivot'] = int(cfg['pivot_id'])
    elif cfg['pivot_date']:
        dt = datetime.strptime(cfg['pivot_date'], '%Y-%m-%d').replace(tzinfo=timezone.utc)
        cfg['_pivot'] = (int(dt.timestamp() * 1000) - TWITTER_EPOCH_MS) << 22
    else:
        cfg['_pivot'] = None
    cfg['_users'] = {u.lower().lstrip('@') for u in cfg['always_delete_users']}
    cfg['_patterns'] = re.compile('|'.join(cfg['always_delete_patterns']), re.I) if cfg['always_delete_patterns'] else None
    cfg['_kw'] = re.compile('|'.join(KEYWORDS + list(cfg['extra_keywords'])), re.I)
    return cfg


# ─── archive helpers ───────────────────────────────────────────
def load_tweets():
    raw = TWEETS.read_text(encoding='utf-8')
    raw = re.sub(r'^window\.YTD\.tweets\.\w+\s*=\s*', '', raw).strip().rstrip(';')
    return [d.get('tweet', d) for d in json.loads(raw)]

def created(t):  return datetime.strptime(t['created_at'], '%a %b %d %H:%M:%S %z %Y')
def text(t):     return t.get('full_text') or t.get('text') or ''
def source(t):   return re.sub(r'<[^>]+>', '', t.get('source', ''))
def mentions(t): return [m['screen_name'].lower() for m in t.get('entities', {}).get('user_mentions', [])]
def fav(t):      return int(t.get('favorite_count') or 0)
def rtc(t):      return int(t.get('retweet_count') or 0)
def media(t):    return (t.get('extended_entities') or {}).get('media') or t.get('entities', {}).get('media') or []
def urls(t):
    out = [u.get('expanded_url') or u.get('url') for u in t.get('entities', {}).get('urls', [])]
    out += [m.get('media_url_https') or m.get('media_url') for m in media(t)]
    return [u for u in out if u]

def is_rt(t):    return text(t).startswith('RT @')
def is_reply(t): return bool(t.get('in_reply_to_status_id_str') or t.get('in_reply_to_user_id_str') or text(t).startswith('@'))
def is_auto(t):  return bool(AUTO_TEXT.search(text(t))) or source(t) in AUTO_SOURCE
def is_quote(t): return bool(OLD_QUOTE_RT.search(text(t)))
def is_blocked(t, cfg):
    if cfg['_users'] and (set(mentions(t)) & cfg['_users'] or (t.get('in_reply_to_screen_name') or '').lower() in cfg['_users']):
        return True
    return bool(cfg['_patterns'] and cfg['_patterns'].search(text(t)))


# ─── rule pass ─────────────────────────────────────────────────
def rule_decision(t, cfg):
    """-> (decision, category, reason); decision is keep | delete | review | skip"""
    if cfg['_pivot'] is not None and int(t['id']) >= cfg['_pivot']:
        return ('skip', 'recent', 'newer than pivot (untouched)')
    if is_blocked(t, cfg):
        return ('delete', 'blocked', 'mentions a blocked user / pattern')
    if is_rt(t):
        return ('delete', 'retweet', 'retweet')
    if is_reply(t):
        return ('delete', 'reply', 'reply')
    if is_auto(t):
        return ('delete', 'auto', 'auto-generated post')
    if is_quote(t):
        return ('delete', 'quote', 'old-style quote RT (reaction to someone else)')
    if cfg['_kw'].search(text(t)) or fav(t) >= cfg['candidate_min_favorites'] or urls(t):
        return ('review', 'candidate', 'might be an announcement / achievement -> AI pass')
    return ('delete', 'casual', 'casual post (no keyword, link or engagement)')


def prepare():
    cfg = load_config()
    tweets = load_tweets()
    OUT.mkdir(parents=True, exist_ok=True)
    BATCH.mkdir(exist_ok=True)
    base, review = {}, []
    for t in tweets:
        d, c, r = rule_decision(t, cfg)
        base[t['id']] = {'d': d, 'c': c, 'r': r}
        if d == 'review':
            review.append(t)
    review.sort(key=lambda t: int(t['id']))
    (OUT / 'base.json').write_text(json.dumps({
        'generated': datetime.now().isoformat(timespec='seconds'),
        'pivot_id': str(cfg['_pivot']) if cfg['_pivot'] is not None else None,
        'items': base,
    }, ensure_ascii=False), encoding='utf-8')

    # rubric with the profile filled in
    rubric = RUBRIC.read_text(encoding='utf-8').replace('{{PROFILE}}', cfg['profile'].strip())
    (OUT / 'rubric.md').write_text(rubric, encoding='utf-8')

    for p in BATCH.glob('in_*.jsonl'):
        p.unlink()
    bs = int(cfg['batch_size'])
    for i in range(0, len(review), bs):
        with open(BATCH / f'in_{i // bs:02d}.jsonl', 'w', encoding='utf-8') as f:
            for t in review[i:i + bs]:
                f.write(json.dumps({
                    'id': t['id'], 'date': created(t).strftime('%Y-%m-%d'),
                    'fav': fav(t), 'rt': rtc(t), 'media': bool(media(t)),
                    'urls': [u for u in urls(t) if not u.startswith('https://pbs.twimg.com')][:3],
                    'text': text(t),
                }, ensure_ascii=False) + '\n')

    counts = collections.Counter(v['c'] for v in base.values())
    print(f'tweets: {len(tweets)}')
    for k, v in counts.most_common():
        print(f'  {k:10s} {v:6d}')
    n = len(list(BATCH.glob('in_*.jsonl')))
    print(f'\nAI pass: {len(review)} candidates in {n} batches -> {BATCH.relative_to(HERE)}/in_XX.jsonl')
    print(f'Rubric for the AI pass: {(OUT / "rubric.md").relative_to(HERE)}')
    print('Next: have an LLM judge each in_XX.jsonl into out_XX.jsonl (see README), then run: python3 curate.py merge')


# ─── merge AI results ──────────────────────────────────────────
def merge():
    tweets = {t['id']: t for t in load_tweets()}
    base = json.loads((OUT / 'base.json').read_text(encoding='utf-8'))
    items = base['items']
    ai = {}
    for p in sorted(BATCH.glob('out_*.jsonl')):
        for line in p.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except json.JSONDecodeError:
                print(f'! bad JSON in {p.name}: {line[:80]}')
                continue
            ai[str(o['id'])] = o
    missing = 0
    for tid, v in items.items():
        if v['d'] != 'review':
            continue
        o = ai.get(tid)
        if not o:
            missing += 1
            v.update({'d': 'delete', 'c': 'unreviewed', 'r': 'no AI result -> default delete'})
            continue
        d = 'keep' if o.get('d') == 'keep' else 'delete'
        v.update({'d': d, 'c': o.get('c') or ('keep' if d == 'keep' else 'casual'), 'r': o.get('r') or '', 'ai': True})
    (OUT / 'decisions.json').write_text(json.dumps({
        'generated': datetime.now().isoformat(timespec='seconds'),
        'pivot_id': base['pivot_id'],
        'items': items,
    }, ensure_ascii=False), encoding='utf-8')
    print(f'merged {len(ai)} AI results; {missing} candidates had no result and default to delete')
    report(tweets, items)


def report(tweets=None, items=None):
    if tweets is None:
        tweets = {t['id']: t for t in load_tweets()}
        items = json.loads((OUT / 'decisions.json').read_text(encoding='utf-8'))['items']
    by_d = collections.Counter(v['d'] for v in items.values())
    by_c = collections.Counter((v['d'], v['c']) for v in items.values())
    years = collections.defaultdict(collections.Counter)
    for tid, v in items.items():
        years[created(tweets[tid]).year][v['d']] += 1
    L = ['# Curation report', '', f'generated: {datetime.now().isoformat(timespec="seconds")}', '',
         '## By decision', '', '| decision | count |', '|---|---|']
    L += [f'| {k} | {by_d.get(k, 0)} |' for k in ('keep', 'delete', 'skip')]
    L += ['', '## By category', '', '| decision | category | count |', '|---|---|---|']
    L += [f'| {d} | {c} | {n} |' for (d, c), n in sorted(by_c.items(), key=lambda x: -x[1])]
    L += ['', '## By year', '', '| year | keep | delete | skip |', '|---|---|---|---|']
    L += [f'| {y} | {years[y].get("keep", 0)} | {years[y].get("delete", 0)} | {years[y].get("skip", 0)} |' for y in sorted(years)]
    L += ['', '## Kept tweets', '']
    for tid in sorted((tid for tid, v in items.items() if v['d'] == 'keep'), key=int):
        t = tweets[tid]
        L.append(f'- {created(t).strftime("%Y-%m-%d")} [{items[tid]["c"]}] {text(t)[:100]}'.replace('\n', ' '))
    (OUT / 'report.md').write_text('\n'.join(L), encoding='utf-8')
    print('\n'.join(L[:len(L) - len([l for l in L if l.startswith('- ')]) - 2]))
    print(f'\nfull report: {(OUT / "report.md").relative_to(HERE)}')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'prepare'
    if cmd not in ('prepare', 'merge', 'report'):
        print(__doc__); sys.exit(1)
    {'prepare': prepare, 'merge': merge, 'report': report}[cmd]()
