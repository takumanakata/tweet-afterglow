# Tweet Afterglow

Delete everything you posted before a tweet you choose, except the posts worth keeping. An LLM proposes what to keep, you make the final call, one script deletes exactly that list.

Free. No X API key, no service. Runs in your own browser and on your own machine.

Other free scripts wipe everything. Paid services filter by date or likes. This one reads the posts.

*日本語は下にあります。*

## Steps

1. **Get your archive.** X → Settings → Your account → Download an archive of your data. From the zip, copy `data/tweets.js` into this repo's `data/` folder.
2. **Configure.** `cp config.example.json config.json` and edit it: the pivot tweet id or date (nothing on or after it is touched), people whose mentions must always go, a few lines about who you are.
3. **Rules.** `python3 curate.py prepare`
4. **AI pass.** For each `data/curation/batches/in_XX.jsonl`, have an LLM write `out_XX.jsonl` following `data/curation/rubric.md`. With Claude Code, say: *"Judge in_00.jsonl into out_00.jsonl using rubric.md"*, one per batch. Any LLM that can read a file works. Skip this and everything not ruled out is deleted.
5. **Merge.** `python3 curate.py merge`
6. **Review.** Open `review.html`, load `data/tweets.js` and `data/curation/decisions.json`. Flip anything. Export, then move `delete_list.json` into `data/`.
7. **Delete.** Log in to x.com. Open the console: **Mac** `⌘ + Option + J`, **Windows** `Ctrl + Shift + J` (Chrome / Edge). Copy the whole of `deleter.js`, paste it into the console, press Enter. If Chrome refuses, type `allow pasting`, Enter, paste again. A panel appears bottom-right: **Load list** → `data/delete_list.json` → tick **DRY RUN** → **START**. Looks right? Untick DRY RUN, START again.
   X allows roughly 200 deletions per 15 minutes. The script waits and resumes on its own. Closing the tab is fine; paste again and it continues.
8. Days later, download a fresh archive and run step 3 to see what is left.

If the script reports 404s, X changed its internal query id. Delete one tweet by hand with the Network tab open, find `DeleteTweet` in the URL, put the new id into `QUERY_ID` in `deleter.js`.

## Use at your own risk

This drives X's web client with your own session. Accounts have been rate-limited or locked by similar tools. Deleted tweets do not come back. Tweets missing from the archive cannot be deleted this way.

MIT. Fork it, feed it to your own AI, make it fit you.

---

# 日本語

選んだツイートより前の投稿を全部消す。ただし「残したいもの」は残す。何を残すかは AI が提案し、最終判断はあなた。消すのはそのリストだけ。

無料。X の API キーも外部サービスも不要。自分のブラウザと自分の PC だけで動く。

無料の既存スクリプトは全消し、有料サービスは日付やいいね数のフィルタ止まり。これは中身を読んで選ぶ。

## 手順

1. **アーカイブを取る。** X → 設定 → アカウント → データのアーカイブをダウンロード。zip の中の `data/tweets.js` をこのフォルダの `data/` に入れる。
2. **設定。** `config.example.json` をコピーして `config.json` を作り、基準にするツイートの ID か日付（それ以降は触らない）、絶対に消したい相手、自分が何者かを数行書く。
3. **ルール判定。** `python3 curate.py prepare`
4. **AI 判定。** `data/curation/batches/in_XX.jsonl` を1つずつ、`data/curation/rubric.md` の基準で `out_XX.jsonl` に判定させる。Claude Code なら「rubric.md の基準で in_00.jsonl を判定して out_00.jsonl に書いて」とバッチごとに頼む。ファイルを読める LLM なら何でもいい。飛ばすと、ルールで残らなかったものは全部削除になる。
5. **統合。** `python3 curate.py merge`
6. **確認。** `review.html` を開いて `data/tweets.js` と `data/curation/decisions.json` を読み込む。気になるものは「keep / delete」を切り替える。書き出した `delete_list.json` を `data/` に移す。
7. **削除。** x.com にログイン。コンソールを開く: **Mac** `⌘ + Option + J`、**Windows** `Ctrl + Shift + J`（Chrome / Edge）。`deleter.js` の中身を全部コピーしてコンソールに貼り、Enter。Chrome に拒否されたら `allow pasting` と打って Enter、もう一度貼る。右下にパネルが出るので **Load list** → `data/delete_list.json` → **DRY RUN** にチェック → **START**。問題なければチェックを外して再度 START。
   X の制限で 15 分に 200 件ほど。スクリプトが勝手に待って再開する。タブを閉じても、貼り直せば続きから。
8. 数日後にアーカイブを取り直して手順 3 を回すと、残りが分かる。

404 が続いたら X 側の内部 ID が変わっている。ツイートを1件手で消しながら Network タブで `DeleteTweet` を探し、URL 中の ID を `deleter.js` の `QUERY_ID` に入れる。

## 自己責任で

自分のログインセッションで X の Web クライアントを操作する仕組みなので、同種のツールでアカウントが制限・ロックされた例はある。消したツイートは戻らない。アーカイブに入っていない投稿は消せない。

MIT ライセンス。フォークして、自分の AI に食わせて、好きに使いやすくして。
