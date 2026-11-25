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
- 公開サイトと会員Workerは同一オリジン https://almeagem.com を想定（ドメインとルーティング未確認）。/members/、/__special-members__/app.js、必要な /api/ のみ会員Workerへ割り当て、既存サービスを上書きしない。
- PUBLIC_SPECIAL_STONES_SALES_ENABLED=false を初期値にする。本番の秘密情報を公開サイトに入れない。
- 既存法定表示・返金規約・利用規約の内容をスペシャルストーンの販売条件に照合する。
