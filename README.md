# 天然石・パワーストーン大図鑑 by ALMÉA GEM

独立した一般公開向け図鑑のフェーズ1。Astro・TypeScript・静的HTMLで構築しています。`AlmeaGem/Amule-manager` のコード・DB・Storage・認証・公開設定は使わず、変更しません。

- 210項目の固定URL、和名／英語名／別名検索、テーマ・色の絞り込みとページ分割
- 12の願いカテゴリ、質問画面（選択は画面内のみ。決済・個人向け結果は未提供）
- オリジナル記事6本、基礎知識・品質・伝承・取り扱いを分けた詳細ページ
- 非公開のローカル編集サーバー、下書き→確認→公開用ファイルへの反映
- Wikimedia Commonsの候補収集、ライセンス・石の一致を人が確認した写真だけ採用
- canonical・OGP・構造化データ・サイトマップ・robots・内部リンク
- PC／スマホテスト、データ検証、公開ビルドからの非公開データ除外チェック

**プレビューはnoindexです。有料販売や本番公開は自動で有効になりません。** 写真は承認済みのものだけを掲載します。未確認の鉱物名・硬度・出典は推測で埋めず、図鑑上で明示しています。書籍画像・元の長文・私有在庫データは含みません。

## ローカルで動かす

Node.js 24以上を使用します。

```bash
npm ci
npm run dev
# http://127.0.0.1:4321/
```

```bash
npm run validate
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

クラウド環境の既存Chromiumでは `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e` も利用できます。公開先は `SITE_URL`、`BASE_PATH`、`PUBLIC_LAUNCH` でビルド時に設定します。秘密情報をGitに追加しないでください。

## 編集と写真

**Macの仮保存写真をまとめて採用**する場合は、[一括アップロード・一括採用の手順](docs/bulk-photo-registration.md)を参照してください。既存の`.editor/`を保持し、公開はGitHub Desktop・Actionsを使います。

管理画面の「保存して公開」だけで更新するCloudflare写真サービスも実装しています。初回のAccess・R2・D1接続は未実施です。[設計・費用・初回設定と操作手順](docs/cloud-photo-publishing.md)を参照してください。既存のローカル管理画面は引き続き使えます。

1. `.env.example` を `.env` にコピー。
2. `EDITOR_PASSWORD` に20〜256文字の専用パスフレーズを自分の端末で設定。既存のManagerのパスワードやAPIキーは使用しません。
3. `npm run admin` → `http://127.0.0.1:4322/login`。
4. 石・記事・願いを編集し、下書き保存。確認後「公開用データへ反映」。
5. テスト・ビルドとGit差分を確認して、新リポジトリのPRで承認します。

編集サーバーは127.0.0.1だけに待ち受け、公開サイトには存在しません。インターネットへポート公開しないでください。公開データは `src/content/`、未承認の候補・下書きはGit除外の `.editor/` に分離しています。[編集・画像管理](docs/editor-and-images.md)を参照してください。

## 公開・費用・次のフェーズ

- [新リポジトリとプレビューの準備](docs/deployment.md)
- [構成の比較と費用](docs/costs.md)
- [移行状況・情報の確認待ち・フェーズ2](docs/content-and-roadmap.md)

本番候補はCloudflare Pagesです。GitHub Pagesは無料図鑑の一時プレビュー用で、将来の決済・商用取引の本番ホストには使用しません。課金・ドメイン購入・本番切り替えは行っていません。
