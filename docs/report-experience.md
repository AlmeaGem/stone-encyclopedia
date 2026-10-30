# 全ページUI監査・無料／有料の明確化（第1段階）

## 現在の状態

第1段階だけを実装しています。無料図鑑・記事・検索・12カテゴリー・質問／回答確認は引き続き無料です。790円（税込・買い切り）の個別レポートは**販売準備中**。個人向けの選定、決済、PDF保存、購入後の再閲覧を実装済みとは表示していません。

作業開始時にGitのリモートを確認し、作業ブランチが前回の `8f6153e` と一致することを確認しました。既存の願望ANDフィルター、カード下端の操作位置、日本語の見出し、内部メモの非公開を保持しています。既存Managerにはアクセス・変更していません。

この実行環境ではGitHub APIと公開URLへの接続が403で拒否されています。公開画面の直接取得、PRメタデータ更新、手動デプロイ起動・GitHub CIの結果確認はできません。以下の画面は、リモートと一致するコードの変更前／変更後をローカルで本番ビルドして確認したものです。検索公開・Search Console登録・販売開始とは扱いません。

## ページ別の改善

| ページ           | 改善                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| トップ           | 上部に「石を調べる／願いから探す／パーソナル診断」の3導線。無料と結果790円・販売準備中を区別。専用レポート紹介と無料／有料の比較を追加。ブランドコピーは一箇所に絞り、説明を具体化                                             |
| 石一覧           | 210項目の石名・別名・色・願望検索を維持。既存の整列・余白を監査                                                                                                                                                                |
| 石詳細210項目    | 見出しを「石の意味と伝承」「関連する基礎知識」などに整理。本文を遮断せず末尾に控えめな診断・サンプル導線                                                                                                                       |
| 12カテゴリー一覧 | 全番号・余白・リンクを監査。既存の番号1〜12の横書き対策を保持                                                                                                                                                                  |
| カテゴリー詳細   | 願望タグのAND絞り込み・選択・解除・件数表示・ゼロ件案内を維持。末尾に一般検索と個別7選／3案の違いを示す診断導線                                                                                                                |
| 記事一覧         | 見出しを「天然石の選び方・基礎知識」に変更                                                                                                                                                                                     |
| 記事詳細         | 関連石に加え、登録済み関連石から導いた願望テーマ・別の記事・診断リンクを末尾に追加。本文中に有料広告を挟まない                                                                                                                 |
| 診断             | 開始前に無料の質問／790円の結果と販売準備中を明示。6ステップの進行表示を維持。最後は「回答が完了しました」、無料の整理・確認と「ここから先は有料です」を分離。購入ボタンは無効。完了時は重複する大きな紹介カードを隠して簡潔化 |
| 無料サンプル     | `/sample-report/` を追加。架空の回答、固定の石7選・理由・品質、組み合わせ3案、お手入れ、PDFレイアウト例を公開。利用者の回答では生成しない                                                                                      |

## 無料／有料の表示

紹介・比較は共通コンポーネントで統一しています。有料の提供予定は、おすすめ7選、選定理由・優先順位、組み合わせ3案、品質・形状・お手入れ、PDF保存・購入後の再閲覧です。

トップの有料案内は無料図鑑を主役にしたコンパクトな導線とし、詳細紹介は下部に配置。スマホでは比較を縦積み、PCでは2カラムにします。強制ポップアップ、購入可能なリンク、個人向けの石名・順位・組み合わせの生成は追加していません。

質問回答は画面内のみ。サンプルはサーバー側の静的ページで、質問用クライアントには読み込まず、入力やpaidパラメーターで内容を変えません。現在のGitHub Pagesで有料結果の保護を実装したとは扱いません。

## 検証

- 単体31件、画面34件を検証。
- 375／390／430／768／1280／1440pxを確認。
- 全240公開ルート（404を除く）×6幅＝1,440件のUI監査。横はみ出し、主な操作ボタンの文字切れ・タップ領域、JavaScriptエラーを確認。
- 内部リンクとアンカー1,326件を確認。詳細は [監査結果JSON](ui-audit-report.json)。
- 210項目・12カテゴリーの元JSONは変更なし。SEO・canonical・sitemap・robots・noindex、既存検索と願望AND、カード操作位置を回帰確認。
- 開始前料金、完了画面、無効な購入、回答の非送信、サンプルの固定7選・3案、購入済み偽装パラメーターで有料結果を取得できないことを確認。
- `npm test`、`npm run test:e2e`、`npm run lint`、`npm run build`、サブパス付き本番ビルドを使用。追加ライブラリ・外部フォント・実行時APIはなし。
- ブラウザで画面幅を再現した監査であり、物理端末・実決済のテストではありません。GitHub上のCI結果はAPI接続制限により未確認です。

UI監査の再実行：本番ビルド後に `npm run preview -- --port 4340` を起動し、別ターミナルで `npm run audit:ui`。ChromiumはPlaywrightで事前インストールします。`AUDIT_BASE_URL` と `PLAYWRIGHT_CHROMIUM_EXECUTABLE` は必要な場合だけ指定します。

## 比較・画面

[トップ変更前390px](screenshots/report-experience/before-390-home.png) ／ [変更後390px](screenshots/report-experience/after-390-home.png)

[トップ変更前PC](screenshots/report-experience/before-1440-home.png) ／ [変更後PC](screenshots/report-experience/after-1440-home.png)

[診断変更前390px](screenshots/report-experience/before-390-diagnosis.png) ／ [変更後390px](screenshots/report-experience/after-390-diagnosis.png)

[無料／有料の比較](screenshots/report-experience/detail-comparison-390.png) ／ [紹介カード](screenshots/report-experience/detail-offer-390.png) ／ [回答完了](screenshots/report-experience/after-390-completed.png)

[サンプル全文390px](screenshots/report-experience/after-390-sample.png) ／ [7選の紹介例](screenshots/report-experience/detail-sample-390.png) ／ [PDFレイアウト例](screenshots/report-experience/detail-pdf-390.png)

同フォルダに石一覧・詳細、カテゴリー一覧・詳細、記事一覧・詳細、PCの画面も保存しています。

## 主な変更ファイル

`ReportOffer.astro`、`ServiceComparison.astro`、`ReportNudge.astro`、`report-offer.ts`、`sample-report.ts`、`sample-report.astro`、`report-experience.css`、各ページ・共通レイアウト・質問画面の表示、サイトマップ、テスト、`scripts/audit-public-ui.mjs`。

## GitHub・プレビュー反映

既存PR #1の作業ブランチ `feat/phase-one-encyclopedia` に送信します。GitHub API接続が403のため、新しいPRの作成や既存PR本文の更新・デプロイ起動をこの環境から行えません。

GitHubで次を操作すると更新できます。

1. 新リポジトリのActions → **Deploy independent preview** を開く。
2. **Run workflow** → **Use workflow from: main** を選択。
3. 入力欄 `ref` を **feat/phase-one-encyclopedia** にして実行。
4. デプロイ成功後、`https://almeagem.github.io/stone-encyclopedia/` を再読み込み。サンプルは同URL配下の `sample-report/`。
5. CIはブランチへのpushで実行されます。成功状況はActionsで確認してください。

noindexと販売無効のプレビューです。本番公開や決済開始は行っていません。SQL・新規環境変数・APIキーの共有は不要です。

## 第2段階・決済開始前

[サーバー構成比較・費用・購入権限・Webhook・PDF・返金・本番公開条件](report-payment-design.md)に整理しています。今回の新規契約・課金は0円。第2段階の無料枠・商用条件・Stripe手数料は着手前に確認し、追加費用を提示してから判断します。

未実装：承認済みの選定ルールと細かな願望の関連付け、本人認証、購入権限、Stripe Checkout／署名検証Webhook、個別結果の安全な保存・配信、PDF生成、再閲覧、返金時の失効。本番販売はそれらの検証、法務・問い合わせ・内容・画像ライセンス・ドメイン・SEOの公開承認後です。
