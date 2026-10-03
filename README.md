# Tweet Afterglow

Clean up your old tweets without losing the good ones.

- Pick a tweet. Everything older than it goes.
- Except the posts worth keeping: an AI proposes them, you confirm.
- Free. No X API key. Nothing leaves your computer except the delete requests from your own browser.

*日本語版は[下](#日本語)にあります。*

## Easiest way

Open this folder in an AI coding assistant (Claude Code, Cursor, …) and say:

> Walk me through the README and run the steps with me.

The README is written so an AI can follow it with you.

## What you need

- Chrome or Edge, on Mac or Windows
- Python 3 (already on Mac; on Windows get it from python.org)
- An AI assistant for one step (optional but recommended)
- About 30 minutes of your attention, then a long unattended wait

## Steps

### 1. Download your X archive

X → Settings → Your account → **Download an archive of your data**. X emails you a zip a day or so later. Inside, find `data/tweets.js` and copy it into this folder's `data/`.

### 2. Say what you want

Duplicate `config.example.json`, name the copy `config.json`, open it in any text editor. Fill in:

- `pivot_date` or `pivot_id`: the line. Nothing on or after this is touched.
- `always_delete_users`: anyone whose mentions, replies and retweets must go.
- `profile`: a few lines about who you are and what counts as an achievement for you. The AI reads this.

### 3. Sort

In a terminal, inside this folder:

```
python3 curate.py prepare
```

Rules remove the obvious (retweets, replies, auto-posts, the people above). What's left goes into small files under `data/curation/batches/`.

**AI pass.** Ask your AI to judge each `in_XX.jsonl` into `out_XX.jsonl`, following `data/curation/rubric.md`. In Claude Code: *"Judge every in_XX.jsonl into out_XX.jsonl using rubric.md."* Then:

```
python3 curate.py merge
```

No AI? Skip the AI pass. Everything the rules didn't rule out gets deleted.

### 4. Review

Double-click `review.html`. Load `data/tweets.js`, then `data/curation/decisions.json`.

You see the **keep** list first. Flip anything with the keep / delete buttons. Search the delete side too, in case something slipped through. Click **Export** and move the downloaded `delete_list.json` into `data/`.

### 5. Delete

1. Log in to x.com in Chrome.
2. Open the console: **Mac** `⌘ Option J` · **Windows** `Ctrl Shift J`. A panel of code appears; that's the console.
3. Open `deleter.js` in a text editor, select all, copy. Click in the console, paste, Enter.
   Chrome may say pasting is blocked. Type `allow pasting`, Enter, then paste again.
4. A green panel appears bottom-right. **Load list** → `data/delete_list.json`.
5. Tick **DRY RUN**, press **START**. Watch the log. Nothing is deleted yet.
6. Untick DRY RUN, **START** again. Now it's real.

X allows about 200 deletions every 15 minutes. The script waits and continues by itself. Leave the tab open and keep the computer awake. If it stops, paste the script again and it picks up where it left off.

### 6. Check, later

Download a fresh archive after a few days and run step 3 again. The numbers tell you what's left.

## If something goes wrong

- **The panel says 404 over and over.** X changed an internal id. Delete one tweet by hand with the Network tab open, find a request named `DeleteTweet`, copy the id from its URL into `QUERY_ID` at the top of `deleter.js`.
- **It says not logged in.** Reload x.com, log in, paste the script again.
- **Anything else.** Paste the panel's log into your AI. It's plain text.

## Use at your own risk

This drives X's website with your own login. Similar tools have gotten accounts rate-limited or locked. Deleted tweets don't come back. Tweets missing from the archive can't be deleted this way.

MIT license. Fork it, hand it to your own AI, make it fit you.

---

# 日本語

古いツイートを片付ける。でも、残したいものは残す。

- ツイートを1つ選ぶ。それより古いものは全部消える。
- ただし「残す価値があるもの」は別。AI が候補を出して、あなたが確認する。
- 無料。X の API キー不要。自分のブラウザからの削除リクエスト以外、何も外に出ない。

## いちばん簡単なやり方

このフォルダを AI コーディングアシスタント（Claude Code、Cursor など）で開いて、こう言う。

> README を読んで、手順を一緒に進めて。

README は AI が読んで一緒に進められるように書いてある。

## 必要なもの

- Chrome か Edge（Mac でも Windows でも）
- Python 3（Mac には最初から入っている。Windows は python.org から）
- 1 ステップだけ使う AI アシスタント（なくても動くが、あったほうがいい）
- 集中するのは 30 分くらい。あとは放置の長い待ち時間

## 手順

### 1. X のアーカイブをダウンロード

X → 設定 → アカウント → **データのアーカイブをダウンロード**。1 日ほどで zip がメールで届く。中の `data/tweets.js` を、このフォルダの `data/` にコピー。

### 2. 希望を書く

`config.example.json` を複製して `config.json` という名前にし、テキストエディタで開く。書くのは:

- `pivot_date` か `pivot_id`: 境界線。これ以降は触らない。
- `always_delete_users`: この人への言及・返信・RT は全部消す、という相手。
- `profile`: 自分が何者で、何が実績にあたるかを数行。AI がこれを読む。

### 3. 仕分け

ターミナルでこのフォルダに入って:

```
python3 curate.py prepare
```

ルールで明らかなもの（RT、返信、自動投稿、上で指定した相手）が消える側に回る。残りは `data/curation/batches/` の小さなファイルに分かれる。

**AI 判定。** AI に、`in_XX.jsonl` を 1 つずつ `data/curation/rubric.md` の基準で `out_XX.jsonl` に判定してもらう。Claude Code なら「rubric.md の基準で、全部の in_XX.jsonl を out_XX.jsonl に判定して」。終わったら:

```
python3 curate.py merge
```

AI がない場合はこの判定を飛ばす。ルールで残らなかったものは全部削除になる。

### 4. 確認

`review.html` をダブルクリック。`data/tweets.js`、次に `data/curation/decisions.json` を読み込む。

最初に **keep（残す）** の一覧が出る。keep / delete ボタンで好きに切り替える。delete 側も検索して、残したいものが混ざっていないか見る。**Export** を押して、ダウンロードされた `delete_list.json` を `data/` に移す。

### 5. 削除

1. Chrome で x.com にログイン。
2. コンソールを開く: **Mac** `⌘ Option J` ・ **Windows** `Ctrl Shift J`。コードが並ぶ画面が出る。それがコンソール。
3. `deleter.js` をテキストエディタで開いて全選択、コピー。コンソールをクリックして貼り付け、Enter。
   Chrome に「貼り付けはブロック」と言われたら、`allow pasting` と打って Enter、もう一度貼る。
4. 右下に緑のパネルが出る。**Load list** → `data/delete_list.json`。
5. **DRY RUN** にチェックして **START**。ログが流れるのを見る。この時点では何も消えていない。
6. チェックを外して、もう一度 **START**。ここから本番。

X の制限で 15 分に 200 件ほど。スクリプトが勝手に待って再開する。タブは開いたまま、PC はスリープさせない。止まったら、もう一度貼れば続きから動く。

### 6. 後日、確認

数日後にアーカイブを取り直して、手順 3 をもう一度。数字を見れば残りが分かる。

## うまくいかないとき

- **パネルに 404 が何度も出る。** X 側の内部 ID が変わった。ツイートを 1 件手で消しながら Network タブを見て、`DeleteTweet` という名前のリクエストを探し、URL 中の ID を `deleter.js` 冒頭の `QUERY_ID` に入れる。
- **「not logged in」と出る。** x.com を再読み込みしてログインし直し、もう一度貼る。
- **それ以外。** パネルのログを AI に貼る。ただのテキストなので読める。

## 自己責任で

自分のログインで X のサイトを操作する仕組み。同種のツールでアカウントが制限・ロックされた例はある。消したツイートは戻らない。アーカイブに入っていない投稿は消せない。

MIT ライセンス。フォークして、自分の AI に渡して、自分に合う形にして。
