# スマートフォン版UIの改善

公開図鑑 `stone-encyclopedia` だけを変更しています。既存Managerのリポジトリ・DB・Storage・認証・データは変更していません。210項目と12カテゴリーのJSON、記事のタイトル本文は変更していません。

## 対応

- ヘッダー：カットされた宝石の細線SVG。絵文字や外部アイコン依存なし。
- トップ：生成球体イラストと注記を撤去。許諾確認済みの実物写真がないためタイポグラフィ中心。コピーとCTAは維持。
- 有料案内：シャンパンゴールドの二重細枠、ピンクからベージュの淡いグラデーション、静的な光。790円の予定価格、販売準備中、無料の質問体験を明示。決済・個別選定結果の提供は無効のまま。
- 3案内：各カード全体をリンクに変更。「鉱物として知る」は名称の解説記事、「宝石として選ぶ」は初めての石選びの記事、「想いを託す」は願い別一覧へ移動。詳しく見る・矢印・hover・キーボードfocusを追加。
- 記事：共通タイトルコンポーネントで句読点ごとのまとまりを維持。文言は変更せず、文字間隔とフォントサイズを調整。
- 検索：石名・別名・英語名に加え、既存の伝承タグ・カテゴリー名・仕事運などの検索語を派生インデックスに追加。元データやカテゴリ所属は変更せず、既存の一覧順を維持。12カテゴリーの検索導線と無料検索の説明を追加。
- 番号：願い別のカードは1〜12。先頭ゼロを除去し、数字欄を縮小。

## 確認

- 単体23件、画面20件成功。
- PC 1440px、スマホ相当375・390・430pxで表示・横はみ出しなし。
- 210ページの応答・canonical・title・サイトマップ、検索・色・テーマ、質問画面・無料／有料の境界・非公開編集情報の非露出を確認。
- 新規検索テスト：仕事運、金運、伝承タグ、別名、無関係なカテゴリを追加しないことを確認。
- 3案内先の200応答、12リンク、番号1〜12、価格と販売準備中、記事タイトルの句の一行維持、検索ボタンとの12px間隔を確認。
- `npm run format:check`（整形）、`npm run build`（Astro／TypeScriptチェック・240ページ生成・SEO／CSP／サブパス監査）、`npm test`、`npm run test:e2e`。ESLint専用コマンドは未導入。
- ブラウザでスマホ画面幅を再現したテストです。物理端末での検証ではありません。

## スクリーンショット

[修正前375px](screenshots/mobile-refinement/before-375.png) ／ [修正後375px](screenshots/mobile-refinement/after-375.png)

[修正前390px](screenshots/mobile-refinement/before-390.png) ／ [修正後390px](screenshots/mobile-refinement/after-390.png)

[修正前430px](screenshots/mobile-refinement/before-430.png) ／ [修正後430px](screenshots/mobile-refinement/after-430.png)

[修正前PC](screenshots/mobile-refinement/before-1440.png) ／ [修正後PC](screenshots/mobile-refinement/after-1440.png)

[790円案内](screenshots/mobile-refinement/after-390-report-teaser.png) ／ [3案内](screenshots/mobile-refinement/after-390-three-views.png) ／ [記事改行](screenshots/mobile-refinement/after-390-article-grid.png)

## 主な変更ファイル

`src/components/GemIcon.astro`、`ArticleTitle.astro`、`Card.astro`、`src/layouts/Page.astro`、`src/lib/search.ts`、`src/pages/index.astro`、`stones/index.astro`、`wishes/index.astro`、`articles/index.astro`、`src/tactile.css`、関連テスト・文書・スクリーンショット。生成イラストを公開ファイルから削除。

## 公開

PR #1に反映。無料プレビューは手動ワークフロー `Deploy independent preview` で対象refを指定して更新します。追加SQL・環境変数・有料契約・支払い情報の登録は不要です。プレビューはnoindexを維持します。
