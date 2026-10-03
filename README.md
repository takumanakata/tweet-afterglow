# Tweet Afterglow

Delete your old tweets, but keep the ones worth keeping.

Most bulk deleters wipe everything older than a date. This one deletes everything by default and keeps only what reads as an achievement, an announcement or a piece of your own work. Rules handle the obvious (retweets, replies, auto-posts, people you never want to be seen with), an LLM judges the rest, and you get a review page to overrule it before anything is deleted.

Free, local, no API key for X. Uses your own browser session, the same way TweetXer and Cyd do.

## How it works

```
X data export (tweets.js)
   └─ curate.py prepare   rules + candidate batches for the AI pass
   └─ (LLM judges each batch using RUBRIC.md)
   └─ curate.py merge     -> data/curation/decisions.json
   └─ review.html         check, flip keep/delete, export data/delete_list.json
   └─ deleter.js          paste into the x.com console, deletes only that list
```

## Use

1. Request your archive: X → Settings → Your account → Download an archive of your data. Put `data/tweets.js` from the zip into `data/`.
2. `cp config.example.json config.json` and edit: the pivot date (nothing on or after it is touched), people whose mentions should always go, and a short profile of yourself for the AI pass.
3. `python3 curate.py prepare` → writes `data/curation/batches/in_XX.jsonl` and `data/curation/rubric.md`.
4. AI pass: for each `in_XX.jsonl`, have an LLM write `out_XX.jsonl` following `data/curation/rubric.md`. With Claude Code: *"Judge data/curation/batches/in_00.jsonl into out_00.jsonl using data/curation/rubric.md"*, one agent per batch. Any model that can read a file and follow the output format works. Skip this step and everything not ruled out is deleted.
5. `python3 curate.py merge` → `data/curation/decisions.json` and a `report.md` listing what is kept.
6. Open `review.html`, load `data/tweets.js` and `data/curation/decisions.json`, look through the kept tweets, flip anything, export. Move `delete_list.json` and `keep_list.json` into `data/`.
7. Log in to x.com, open the DevTools console, paste `deleter.js`, load `data/delete_list.json`, run once with DRY RUN, then for real. ~1.5 s per tweet. Closing the tab is fine; pasting again resumes.
8. A day or two later, download a fresh archive and run `prepare` again to see what is left.

`viewer.html` is a plain offline browser for `tweets.js` if you just want to look.

## Notes

- The deleter calls X's internal GraphQL `DeleteTweet` with your logged-in session. If it starts returning 404s, X rotated the query id: delete one tweet by hand with the Network tab open, find the `DeleteTweet` request, and update `QUERY_ID` in `deleter.js`.
- Tweets missing from the archive cannot be deleted this way. Search-engine caches are outside anyone's control.
- This automates actions against X's web client. Use at your own risk; accounts have been rate-limited or locked by similar tools.

MIT. Fork it, change it, ship it.
