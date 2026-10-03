# Tweet Afterglow

Clean up your old tweets without losing the good ones.
古いツイートを片付ける。でも、残したいものは残す。

**→ https://takumanakata.github.io/tweet-afterglow/**

- Pick one of your tweets. Everything older than it goes.
  自分のツイートを1つ選ぶ。それより古いものは全部消える。
- Except the posts worth keeping: an AI proposes them, you confirm.
  ただし「残す価値があるもの」は別。AI が候補を出して、あなたが確認する。
- Free. No X API key, no account, no install. One web page plus one script you paste into your browser.
  無料。X の API キーも登録もインストールも不要。Web ページ1枚と、ブラウザに貼るスクリプト1つ。

## How it goes　流れ

1. **Get your archive.** X → Settings → Your account → Download an archive of your data. A zip arrives by email a day later.
   **アーカイブを取る。** X → 設定 → アカウント → データのアーカイブをダウンロード。1日ほどで zip がメールで届く。
2. **Open the page** and load `data/tweets.js` from the zip. The page walks you through the rest: pivot, people to always delete, a few lines about you, the optional AI pass, review, export.
   **ページを開いて** zip の中の `data/tweets.js` を読み込む。あとはページが案内する: 境界、必ず消す相手、自己紹介、任意の AI 判定、確認、書き出し。
3. **Delete.** Log in to x.com, open the browser console, paste the script the page gives you, load the exported list, START. X allows about 200 deletions per 15 minutes; the script waits and resumes by itself. Expect hours for a big archive.
   **削除。** x.com にログインし、ブラウザのコンソールを開いて、ページが渡すスクリプトを貼り、書き出したリストを読ませて START。X の制限で 15 分に 200 件ほど。スクリプトが勝手に待って再開する。大きなアーカイブなら数時間〜。

The AI pass is copy-and-paste: the page gives you a block of text, you paste it into whatever AI chat you use (ChatGPT, Claude, Gemini…), and paste the reply back. Skip it and everything the rules didn't rule out is deleted.
AI 判定はコピペ。ページがテキストの塊をくれるので、使っている AI チャット（ChatGPT、Claude、Gemini…）に貼り、返事を貼り戻す。飛ばすと、ルールで残らなかったものは全部削除になる。

## Privacy　プライバシー

No server. The page is a static file; your archive is read inside your browser and never uploaded. Settings and progress stay in your browser. The deleter talks only to x.com, with the login you already have. You never type a password or token anywhere. Open the Network tab if you want to check.
サーバーはない。ページは静的ファイルで、アーカイブはブラウザの中で読まれ、どこにもアップロードされない。設定と進捗はブラウザに残るだけ。削除スクリプトの通信先は x.com だけで、今あるログインをそのまま使う。パスワードやトークンをどこかに入力することはない。疑うなら Network タブを開いて確かめられる。

The one exception: the optional AI pass sends tweet text to the AI you choose. Skip it if you'd rather not.
唯一の例外は任意の AI 判定で、ツイート本文をあなたが選んだ AI に渡す。嫌なら飛ばせばいい。

## Use at your own risk　自己責任で

This drives X's website with your own login. Similar tools have gotten accounts rate-limited or locked. Deleted tweets don't come back. Tweets missing from the archive can't be deleted this way.
自分のログインで X のサイトを操作する仕組み。同種のツールでアカウントが制限・ロックされた例はある。消したツイートは戻らない。アーカイブに入っていない投稿は消せない。

## For engineers　エンジニア向け

Two files: `index.html` (everything but the deleting) and `deleter.js` (paste into the x.com console). No build, no dependencies. Download the ZIP from the green **Code** button or clone, and open `index.html` locally; it works offline. If the deleter starts returning 404s, X rotated the GraphQL query id: delete one tweet by hand with the Network tab open, find `DeleteTweet`, and update `QUERY_ID` at the top of `deleter.js`.
ファイルは2つ。`index.html`（削除以外の全部）と `deleter.js`（x.com のコンソールに貼る）。ビルドも依存もなし。緑の **Code** ボタンから ZIP を落とすか clone して、`index.html` をローカルで開けばオフラインでも動く。404 が続いたら X 側の GraphQL の ID が変わっている。ツイートを1件手で消しながら Network タブで `DeleteTweet` を探し、`deleter.js` 冒頭の `QUERY_ID` を更新する。

MIT license. Fork it, hand it to your own AI, make it fit you.
MIT ライセンス。フォークして、自分の AI に渡して、自分に合う形にして。
