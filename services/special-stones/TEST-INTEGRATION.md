# スペシャルストーン：テスト環境接続手順と未検証事項

この文書は接続準備の手順です。環境の作成・SQL適用・デプロイ・実データのアップロードは実施していません。既存の写真Worker・ALMÉA Managerとは別のプロジェクト、Worker、認証情報を使用してください。秘密情報の値をGit、ブラウザ、チャット、ログに書かないでください。

## 1. Supabaseの専用テスト環境

1. 専用テストプロジェクトを作り、ダッシュボードでプロジェクト名と参照IDを確認する。コードの `TEST` 接頭辞やURL形式だけでは、プロジェクトが本番でないことは証明できません。
2. Authのメール認証、リダイレクト先、パスワード、セッション期限を設定する。実際のメール送信方式と、後述するログアウト時の即時失効を検証する。
3. `supabase/migrations/001_special_stones.sql` を確認し、対象プロジェクトを再確認してから適用する。`special_stones` スキーマの各テーブルにRLSを有効化し、権限判定・注文・Webhook処理のRPCは `service_role` 専用。匿名・通常会員からDBテーブルや特権RPCにアクセスできないことを、実トークンで検証する。SQLの実PostgreSQL適用は未実施。
4. Storageの `special-stones-test-private` を**非公開**で作成し、`anon` や `authenticated` に対象オブジェクトを直接読むポリシーを作らない。認可APIはサービス側だけが保持するservice roleで取得する。APIは各読込前にバケットが非公開か確認するが、公開設定されたバケットへの直接アクセスを事後的に防ぐものではない。空バケットとダミーデータで、公開URL・Storage API両方の拒否を確認してから進める。
5. ダミーの `chapter-one` 記事を `special_stones.articles` に作成し、テストでのみ `published` を設定する。公開記事は全て会員対象であり、記事ごとの会員権設定は不要。ダミー本文は `chapter-one/article.md`、ダミー画像は `chapter-one/02_sapphire.png`、`03_ruby.png`、`04_emerald.png` に配置する。正式素材のアップロードは、隔離と直接URL拒否の確認が済むまで行わない。
6. `.env.example` を参照し、`SUPABASE_TEST_URL`、`SUPABASE_TEST_PROJECT_REF`、`SUPABASE_APPROVED_TEST_PROJECT_REF`、`SUPABASE_TEST_ANON_KEY`、`SUPABASE_TEST_SERVICE_ROLE_KEY`、`SUPABASE_TEST_PRIVATE_BUCKET` を安全なテスト環境の秘密管理に設定する。サービスキーはサーバー専用。

## 2. Stripeテスト環境

1. Stripeダッシュボードでテストモードを確認し、単品 JPY 150・税込の一回払い価格、月額 JPY 580・税込の毎月更新価格を別々に作成する。実行コードは商品価格ID、通貨、金額、繰り返し間隔、テストモードをサーバー側で照合する。
2. テスト専用のWebhookを作り、`checkout.session.completed`、`checkout.session.async_payment_succeeded`、`invoice.paid`、`charge.refunded`、`invoice.payment_failed`、`customer.subscription.updated`、`customer.subscription.deleted` を配送する。現状、権限の付与は支払い完了と有効な請求期間の検証後のみ。失敗・解約イベントは支払い済み期間を延長しない。Webhook署名の検証、イベント再送、実際のAPI応答形式をStripe CLIまたはテスト環境で確認する。
3. `STRIPE_TEST_SECRET_KEY`、`STRIPE_TEST_WEBHOOK_SECRET`、`STRIPE_TEST_SINGLE_PRICE_ID`、`STRIPE_TEST_MONTHLY_PRICE_ID` を安全に設定する。`SPECIAL_STONES_TEST_ONLY=true` を必須とし、`sk_test_` 以外は受け付けない。実際のアカウントへの接続・課金テストは未実施。

## 3. Cloudflare Worker接続の設計上の注意

専用Worker向けのエントリとローカル実行設定を用意済みです。デプロイと実サービスへの接続は未実施です。導入時は独立Workerを作り、Workerの環境変数・SecretsでStripe/Supabaseの秘密値を渡します。SupabaseへHTTPSで接続し、ユーザーのアクセストークン検証、DBでの購読・購入権確認、非公開Storageの読み出しを順に行います。認可の失敗やサービス障害時は読み出さずに拒否します。既存Workerの設定・認証情報を共有しません。

既存コードの `node:http` サーバーはWorkerへそのまま配備しません。WorkerのFetch形式、Stripe SDKの非同期署名検証をローカルで確認済みです。実環境での互換性、タイムアウト・サイズ上限、CORSの許可元、ログの秘密情報除去、`Cache-Control: private, no-store`、CDNキャッシュ無効化をテスト環境で個別に検証します。許可元と戻り先は実在する専用テスト画面のHTTPS URLを設定し、両者のオリジンを一致させます。本番の `https://almeagem.github.io` は拒否し、未設定の場合は停止します。Workerや外部APIへの実接続は未実施です。

## 4. 実環境で必要な受け入れ試験

- 未ログイン、未購入、購入者、別アカウントで本文と画像3点のAPI・Storage直接URLを試す。未購入者はすべて拒否し、公開フォルダ、静的ビルド、JS、ネットワーク応答に有料素材を含めない。
- テストカードでの単品・月額決済、決済前・完了画面直アクセス、Webhook署名不正・再送・順序逆転、DB停止中の失敗時拒否を確認する。
- 有効月額、期間満了、解約後の支払い済み期限、更新失敗、全額・部分返金、単品と月額の同時保有を確認する。Stripeテストクロック等で実際の請求期間とWebhookの関係を確認する。
- 登録確認メール、ログイン、ログアウト、トークン更新・有効期限・他端末の挙動を実サービスで確認する。

## 5. 判断・実装が必要な事項

- **ログアウト**：Supabaseのログアウトで更新セッションが失効しても、すでに発行されたJWTは期限まで有効な場合がある。短いJWT有効期限だけでは即時失効にならない。サーバー側で失効可能なセッション識別子を各アクセス時に照合し、ログアウト・全端末ログアウトとデータベース障害時は拒否する設計を推奨。JWT署名検証後の識別情報を使用し、保存・失効期間、同時実行、復旧、他端末挙動をテストする。未実装。
- **部分返金**：現在は安全側として、その支払いに対応する単品権または月額期間を全停止する。顧客向け取扱いは未決定。全額返金のみ自動失効、部分返金は保留・手動審査とする案などについて、運用方針決定と再送・順序逆転・複数返金のテストが必要。実装を勝手に変更しない。
- 支払い異議申立て、Webhook欠落時の照合、復旧処理、同時決済、認証UI、レート制限、監視、事故対応は公開前に別途必要。決済の販売単位を変更せず、実データの投入前に利用者の購入フローを検証する。

## 6. 確定した会員範囲

単品権は記事単位、有効な月額期間は公開済みのスペシャルストーン全記事に適用する。新規記事は公開用のカタログ登録と非公開素材の準備が必要だが、各会員への権限再登録や記事単位の会員対象フラグは不要。未公開記事は月額会員にも返さない。単品権は月額の期間終了や解約とは独立している。

管理画面の準備手順は [WORKER-SETUP.md](./WORKER-SETUP.md) を参照。月3回の診断利用枠は設計段階であり未実装。

テスト用Supabaseのプロジェクト参照IDは、管理画面で専用テスト環境と確認したうえで `SUPABASE_TEST_PROJECT_REF` と `SUPABASE_APPROVED_TEST_PROJECT_REF` の両方に設定する。未設定・不一致では拒否する。ただし2つの設定値の一致だけでプロジェクトが本番でないことを自動証明できないため、操作担当者による環境確認が必須。実在する専用テスト画面のHTTPS URLを設定するまでWorkerは503を返す。
