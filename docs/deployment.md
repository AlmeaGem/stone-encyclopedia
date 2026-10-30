# 新サイトのプレビューと本番公開

## GitHubの接続

新規リポジトリ https://github.com/AlmeaGem/stone-encyclopedia への送信とPR #1の作成は完了しました。既存 `Amule-manager` の権限・コード・設定は変更していません。

Pages有効化APIはGitHub連携の権限不足で403でしたが、所有者によるSource設定が完了し、無料プレビューの初回デプロイに成功しました。トークンやAPIキーの共有は不要です。

確認用URL：https://almeagem.github.io/stone-encyclopedia/ 。以下は再設定・更新時の手順です。

## GitHub Pagesの一時プレビュー

フェーズ1の無料図鑑だけを、別のURLで確認するための環境です。`PUBLIC_LAUNCH=false` 固定で、noindexとrobotsのDisallowを出力します。販売や決済はありません。**GitHub Pagesは商用取引サイトの本番ホストには採用しません。** [GitHub Pagesの利用制限](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)を確認してください。

1. 新リポジトリのSettings → Pages → Build and deployment → Sourceを **GitHub Actions** にする。
2. Actionsで `Deploy independent preview` を選び、Run workflow。
3. `ref` に `feat/phase-one-encyclopedia` を指定。
4. 成功時の `github-pages` Environment URLを開く。候補URLは `https://almeagem.github.io/stone-encyclopedia/`（実際の成功URLを最終報告で確認）。

最初にREADMEだけのmainとプレビュー起動用ワークフローを置き、実装は作業ブランチからPRで確認する構成にできます。ワークフローは手動実行のみで、本番の自動公開は行いません。

## 推奨する本番構成：Cloudflare Pages

1. CloudflareアカウントでWorkers & Pages → Create → Pages → Gitへ接続。
2. **新しい `stone-encyclopedia` だけ**を選び、新プロジェクトを作成。既存Managerは選択しない。
3. Build command `npm run build`、output `dist`、Node.js 24に設定。
4. `SITE_URL=https://新プロジェクト.pages.dev`、`BASE_PATH=/`、`PUBLIC_LAUNCH=false` を設定。
5. 初回プレビューを確認。必要なら本番ブランチの自動デプロイを停止し、公開前レビューを必須にする。
6. 運営者表示、問い合わせ窓口、権利・書誌情報、コンテンツを確認後、運営者が本番公開の最終判断を行う。

公開するときだけ、正しい本番 `SITE_URL` と `PUBLIC_LAUNCH=true` で再ビルドします。課金プランを自動購入する設定はありません。

## 独自ドメイン・DNS

未取得の候補：`stones.almeagem.com`、`library.almeagem.com`、`almea-stones.jp`。取得可否・所有権は未確認です。既存ドメインのDNSを今回変更していません。

Cloudflare PagesのCustom domainsから所有するドメインを登録し、案内された新規CNAME等を設定します。既存サイト・メールのA／CNAME／MX／TXTを上書きしないでください。ドメインの購入・DNS変更は所有者が内容と費用を確認して行います。

## Search Console・計測

1. 本番ドメインが決まってからSearch ConsoleでDomain propertyを追加。
2. 指定のTXTをDNSに**追加**して所有権確認。既存TXTは削除しない。
3. 本番URLの `robots.txt` にDisallowが残っていないこと、canonicalが本番に揃うことを確認。
4. `https://本番ドメイン/sitemap.xml` を登録し、代表的な石ページをURL検査。
5. フェーズ3でCloudflare Web Analytics等を選択し、プライバシーポリシーの委託先・利用目的を更新して導入。初期版にはアクセス解析・広告・Cookie同意が必要なトラッカーを埋め込んでいません。

SEOの構造は実装済みですが、未確認情報を多く含むプレビューを検索流入用の完成コンテンツとして扱わず、編集確認後にインデックスを有効にしてください。
