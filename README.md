# Tweet Afterglow

Delete everything you posted before a tweet you choose, except the posts worth keeping. An LLM proposes what to keep, you get the final say, then one script deletes exactly that list.

Free, no X API key, no third-party service. Runs in your own browser session and on your own machine.

## Why another one

Free console scripts (TweetXer, tweetdelete and friends) wipe your whole history. Paid services (TweetDelete, Redact, Circleboom) filter by date, keyword or like count. Neither can tell "I was selected for a residency" from "lunch was good". This one can, because the judging is done by an LLM against a rubric you write, and you review the result before anything is deleted.

What you control:

- **Pivot**: a tweet id or a date. Everything on or after it is left alone.
- **Always delete**: people and words that must never stay (mentions, replies, retweets of them).
- **Keep list**: what the LLM proposes as achievements, announcements, your own work, milestones, press. You flip anything in a review page.
- **Delete list**: everything else. The deleter only ever touches this list.

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
2. `cp config.example.json config.json` and edit: the pivot, people whose mentions should always go, and a short profile of yourself for the AI pass.
3. `python3 curate.py prepare` → writes `data/curation/batches/in_XX.jsonl` and `data/curation/rubric.md`.
4. AI pass: for each `in_XX.jsonl`, have an LLM write `out_XX.jsonl` following `data/curation/rubric.md`. With Claude Code: *"Judge data/curation/batches/in_00.jsonl into out_00.jsonl using data/curation/rubric.md"*, one agent per batch. Any model that can read a file and follow the output format works. Skip this step and everything not ruled out is deleted.
5. `python3 curate.py merge` → `data/curation/decisions.json` and a `report.md` listing what is kept.
6. Open `review.html`, load `data/tweets.js` and `data/curation/decisions.json`, look through the kept tweets, flip anything, export. Move `delete_list.json` and `keep_list.json` into `data/`.
7. Log in to x.com, open the DevTools console, paste `deleter.js`, load `data/delete_list.json`, run once with DRY RUN, then for real. X throttles deletions to roughly 200 per 15 minutes; the script waits and resumes by itself. Closing the tab is fine; pasting again continues where it stopped.
8. A day or two later, download a fresh archive and run `prepare` again to see what is left.

`viewer.html` is a plain offline browser for `tweets.js` if you just want to look.

## Notes

- The deleter calls X's internal GraphQL `DeleteTweet` with your logged-in session. If it starts returning 404s, X rotated the query id: delete one tweet by hand with the Network tab open, find the `DeleteTweet` request, and update `QUERY_ID` in `deleter.js`.
- Tweets missing from the archive cannot be deleted this way. Search-engine caches are outside anyone's control.
- This automates actions against X's web client. Use at your own risk; accounts have been rate-limited or locked by similar tools.

MIT. Fork it, change it, ship it.
