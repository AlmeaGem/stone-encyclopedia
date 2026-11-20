# 専用テストWorkerの準備（デプロイ前）

この設定は `almea-special-stones-test` 専用です。既存の `suzuki-workspace`、写真管理Worker、ALMÉA Managerには触れません。現在 `workers_dev` と `preview_urls` は false で、ルートも設定していません。実際のデプロイ、ダッシュボードでのWorker作成、テスト用URLの有効化は、ユーザーの確認後に行います。未承認の有料素材は投入しません。

## 実行に必要な準備

Cloudflare管理画面で、以下を確認してください。表示名は管理画面の更新により変わる場合があります。

1. Cloudflareにログインし、対象アカウントの「Workers & Pages」を開く。既存の `suzuki-workspace` は選択・編集・削除しない。
2. **まだ作成・デプロイを押さない。** 確認後、別名 `almea-special-stones-test` が既存Workerと重複しないこと、テスト専用であることを確かめ、新規Workerを作成する。管理画面上の新規作成がサンプルコードのデプロイを伴う場合も、事前の確認を待つ。
3. 専用Workerの「Settings」→「Variables and Secrets」（表示名は環境によって異なる）で、次の変数を登録する。実際の値はチャット・Git・ログに書かない。
   - 通常変数: `SPECIAL_STONES_TEST_ONLY=true`、`SPECIAL_STONES_PUBLIC_ORIGIN=https://almeagem.github.io`、`SUPABASE_TEST_PRIVATE_BUCKET=special-stones-test-private`、`SUPABASE_TEST_URL`、`SUPABASE_TEST_PROJECT_REF`、`STRIPE_TEST_SINGLE_PRICE_ID`、`STRIPE_TEST_MONTHLY_PRICE_ID`。
   - Secret: `SUPABASE_TEST_ANON_KEY`、`SUPABASE_TEST_SERVICE_ROLE_KEY`、`STRIPE_TEST_SECRET_KEY`、`STRIPE_TEST_WEBHOOK_SECRET`。ダッシュボードで「Secret」を選び、各サービスの管理画面から直接入力する。値をCodexに送らない。
4. Stripe鍵は `sk_test_` のテストモード用のみ。SupabaseのURLと参照IDが、専用テストプロジェクトと一致することを管理画面で確認する。コード上の名前やURL形式の検証だけでは、本番用ではないことを保証できない。
5. Stripe Webhook署名秘密値はテストWebhook作成後に発行される。テスト用URLが有効になってから作成し、対象エンドポイント `/api/stripe/webhook` に設定する。初回デプロイ時にWebhook Secretをまだ設定できない場合、コードは設定不足で503を返す。プレースホルダーを有効な設定として扱わない。
6. `workers_dev` は現状false。確認後、専用Workerに限ってテスト用到達手段と厳密な許可元を決め、設定する。`SPECIAL_STONES_PUBLIC_ORIGIN` は現在の実装では指定の既存オリジンに固定されており、独立テスト画面のオリジンでは動作しない。テスト画面と認証UIの接続は別途実装・検証する。

## SupabaseとStripeの検証手順

- `supabase/migrations/001_special_stones.sql` はまだSupabaseに適用していない。対象プロジェクトを再確認してSQLをレビューし適用する。既存環境へ適用しない。
- `special-stones-test-private` バケットが非公開であることを再確認し、匿名およびログイン済みの未購入者がStorageの直接URL・APIを読めないことをダミー素材で検証する。コードは取得時にも非公開バケットか確認するが、誤って公開されたバケットはコードだけでは保護できない。
- Stripeのテスト用Webhookを作り、`checkout.session.completed`、`checkout.session.async_payment_succeeded`、`invoice.paid`、`charge.refunded`、`invoice.payment_failed`、`customer.subscription.updated`、`customer.subscription.deleted` を登録する。Webhook署名・再送・順序逆転をテストする。
- ダミー素材とテスト決済で、未購入・購入済み・別ユーザー、会員の有効期間・解約・期限切れ、返金、決済失敗、単品権と月額権の独立を通しで確認する。実Stripe・Supabaseとの接続は未検証。

## 現状と残件

WorkerはFetch形式、StripeはFetch HTTPクライアントと非同期Web Crypto署名検証を使用する。特権キーはWorker側に限り、コンテンツは毎回サーバー側で購入権を確認してから非公開Storageから取得する。月額は公開済みスペシャルストーン全記事を対象にする。

月3回のパーソナル診断は現時点では設計段階で、回数管理のDB・API・同時実行防止・失敗時復元は**未実装**。請求期間ごとに枠を管理する計画を保ち、実装するまで診断機能を提供しない。ログアウト時の発行済みトークンの即時失効、部分返金ポリシー、Webhook漏れの照合、認証UI、レート制限も未完了。部分返金は現在、安全側として該当権限を全停止する。
