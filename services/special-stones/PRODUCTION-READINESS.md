# 本番販売準備（未公開）

- テストWorker・テストDB・テストStripeは変更しない。
- 本番用Worker entrypoint: src/production-worker.mjs。wrangler.production.jsonc は販売停止・公開ルートなしで開始する。
- 同一オリジンで認証・有料記事閲覧・購入者ナビゲーションを提供する正式フロントエンドが必要。現状のテスト画面は公開しない。
- 本番専用Supabaseプロジェクトで既存の権限SQLを検証・適用し、private bucket special-stones-live-private を作成。公開ポリシーは設定しない。
- 本番素材は原稿と専用画像をStorageへ直接登録する。GitHub、公開ビルド、テストDBに正式有料素材を置かない。無料表紙のみ公開素材。
- 本番Stripeの単品150円・月額580円、Webhook、支払い手段を確認。Managed Paymentsを明示的に無効化する固定価格設計を採用するには、税務・販売条件の確認が必要。
- 環境変数は production-config.mjs で検証する。鍵はWorker Secretsのみ。テストプロジェクト・テスト価格は拒否する。
- 月額の実テスト、更新・解約・返金、重複購入防止、正式記事の表示、直接URL拒否、認証復元、メール設定、法定表示を確認してから販売開始。
- 本番公開ルート追加、販売有効化、実課金はこのブランチの作成では行わない。

## 公開導線

- PR #76 の承認済み無料紹介とトップ・PC/スマホナビを統合。本文は変更しない。
- 公開用の表紙だけを public/special-stones/01_chapter_cover.png に配置すること（元PNGのGit blob SHA: 8eac2d9700ef806608d83cf1ba2edfaf1945cae6）。正式表紙がないと販売フラグ付きビルドは拒否。
- 公開サイトと会員Workerは同一オリジン https://almeagem.com を想定（ドメインとルーティング未確認）。/members/、/**special-members**/app.js、必要な /api/ のみ会員Workerへ割り当て、既存サービスを上書きしない。
- PUBLIC_SPECIAL_STONES_SALES_ENABLED=false を初期値にする。本番の秘密情報を公開サイトに入れない。
- 既存法定表示・返金規約・利用規約の内容をスペシャルストーンの販売条件に照合する。

## 決済審査中の会員機能

- SPECIAL_STONES_LIVE_MEMBERS_ENABLED=true を明示した場合のみ、Stripe未接続で会員画面・認証・権限確認を動かせる。SALES_ENABLED=false / BILLING_ENABLED=false のまま開始。全フラグ既定false。
- 決済開始後に新規購入のみ止める場合は MEMBERS_ENABLED=true / BILLING_ENABLED=true / SALES_ENABLED=false とし、Stripe秘密情報と既存購入者のWebhook・解約を維持する。
- 正式記事は private bucket に article.md と画像を登録。パスワード再設定UI、本番メール認証、ルート、法定表示は別途検証。

## プレミアム拡張

- 公開メタデータのみを src/catalog.mjs に登録。プレミアム入口 /premium/ → /special-stones/ → 各章。第二章以降はメタデータから静的ページ生成。診断・占いは別サービスとして準備中、料金や会員特典は未確定のものを表示しない。
- 002_catalog_summary.sql を対象DBに適用・権限確認してから会員画面を使用。公開済みIDのみ一覧・購入候補。正式原稿はprivate bucket、公開表紙のみpublic配下。原稿Markdownのフロントマターは表示せず、表・見出し・太字を保持する。
- 追加記事はIDを永続固定、公開メタデータ、表紙、private bucketの article.md と assets/<key>.png を登録、未公開DB行から検証して公開する。将来の診断・占いは別の権限・利用回数設計を追加する。既存購入権限を流用して自動解放しない。
