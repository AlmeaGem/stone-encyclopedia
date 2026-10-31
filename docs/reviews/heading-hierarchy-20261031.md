# 見出し階層の改善（2026-10-31）

基準: main `7e93148`。原稿・写真・検索データには変更を加えず、表示スタイルと見出しのマークアップを調整。

## デザイン

- 石210ページの6セクションで共通の `SectionHeading` を使用。H2は26〜34px、600、行間1.4。文字の下部に淡いピンクベージュのマーカー。インライン要素に `box-decoration-break: clone` を指定し、複数行にも適用。
- 長い見出しは行長を均等にし、「スピリチュアルな意味」は途中で分割しない。
- H3は20〜23px、600、左に3pxのくすみローズ線、文字まで12px。本文15px、行間1.85と区別。
- 英語セクションラベルは12px、控えめなブラウン、字間0.14em。
- 詳細セクションはスマホ48px、その他52pxの上下余白と1pxベージュの区切り線。
- 目次は読みやすい行間と折り返しを維持。モバイルは通常フローで表示。
- トップの主要な日本語セクションと記事本文H2にも共通の方向性を適用。カード・検索フォーム・願望絞り込み・モーダルにはマーカーを追加しない。
- 一覧・願望ページは既存のページH1とカード見出しの区別を維持。英字の図鑑見出し、診断カードの独自スタイルも維持。

## 左端の矢印状UI

公開サイトのCSSでは、固定配置はキーボード操作時の「本文へ」スキップリンク、追従配置はPCの目次のみ。常設のグレー矢印状フローティングUIは実装されていない。ブラウザ・端末由来かをこの環境だけでは確定できないため、それを避けるための不自然な余白や位置補正は追加していない。

## 比較画像

`docs/screenshots/heading-hierarchy/` に before/after × nature/quality/story × 375/390/1440px の18枚。
各画像には見出しと本文、quality/storyには小見出しも含む。

| 幅・箇所          | 変更前                                                         | 変更後                                                        |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| 375px 鉱物情報    | [前](../screenshots/heading-hierarchy/before-nature-375.png)   | [後](../screenshots/heading-hierarchy/after-nature-375.png)   |
| 375px 品質        | [前](../screenshots/heading-hierarchy/before-quality-375.png)  | [後](../screenshots/heading-hierarchy/after-quality-375.png)  |
| 375px 伝説・意味  | [前](../screenshots/heading-hierarchy/before-story-375.png)    | [後](../screenshots/heading-hierarchy/after-story-375.png)    |
| 390px 鉱物情報    | [前](../screenshots/heading-hierarchy/before-nature-390.png)   | [後](../screenshots/heading-hierarchy/after-nature-390.png)   |
| 390px 品質        | [前](../screenshots/heading-hierarchy/before-quality-390.png)  | [後](../screenshots/heading-hierarchy/after-quality-390.png)  |
| 390px 伝説・意味  | [前](../screenshots/heading-hierarchy/before-story-390.png)    | [後](../screenshots/heading-hierarchy/after-story-390.png)    |
| 1440px 鉱物情報   | [前](../screenshots/heading-hierarchy/before-nature-1440.png)  | [後](../screenshots/heading-hierarchy/after-nature-1440.png)  |
| 1440px 品質       | [前](../screenshots/heading-hierarchy/before-quality-1440.png) | [後](../screenshots/heading-hierarchy/after-quality-1440.png) |
| 1440px 伝説・意味 | [前](../screenshots/heading-hierarchy/before-story-1440.png)   | [後](../screenshots/heading-hierarchy/after-story-1440.png)   |

## 保護対象

`src/content/` の全ファイル、`assets/approved-images/`、正式アイコン、既存210項目のID・slug・名称・原稿・出典・写真25件、12カテゴリー、noindex・決済無効設定を変更しない。Macの `.editor/` およびManagerは作業対象外。

## 検証

- `npm run lint`: 成功（Astro 0 errors / 0 warnings）。
- `npm run validate`: 成功（210項目）。
- `npm test`: 24ファイル・85件成功。
- `npm run build`: 成功（210種類の詳細ページ生成、公開用データ・CSP・アイコン監査成功）。
- `npm run test:e2e`: 82件成功、11.0分。追加テストでは6幅で見出しサイズ・太さ・マーカー・左線・目次境界・トップの適用とカード/検索欄の除外を確認。
- 公開241ページを375/390/430/768/1280/1440pxで検査（1,446ケース）。横はみ出し・文字コントラストの問題なし。測定対象176,088件、最小比5.08:1。集計: [監査JSON](heading-hierarchy-audit.json)。
- GitHub Pages用 `BASE_PATH=/stone-encyclopedia` ビルド: 成功。noindex・サブパスのアイコン監査も成功。
- 通常/サブパスそれぞれの内部リンク・画像・アンカー10,876参照、欠落なし。外部サイトのリンク先本文・可用性は対象外。
- Git差分で `src/content/`、`assets/approved-images/`、`public/` の変更なしを確認。

コントラスト検査はCSSの文字色と背景色・グラデーションに基づく自動検査であり、WCAG全項目の認証ではない。実機Safari・Androidでの確認とは区別し、ブラウザ検証はChromiumによる表示・操作確認。

## 変更ファイル

- `src/heading-hierarchy.css`: 見出し・本文・ラベル・目次の共通スタイル。
- `src/components/SectionHeading.astro`: 行単位マーカー用の共通H2。
- `src/components/ArticleTitle.astro`: 記事本文H2だけを装飾する任意プロパティ。
- `src/layouts/Page.astro`: 共通CSS読み込み。
- `src/pages/stones/[slug].astro`: 6見出しに共通H2を適用、長い語の途中折り返しを防止。
- `src/pages/articles/[slug].astro`: 本文H2への適用。
- `src/pages/index.astro`: 主要な日本語セクションへの適用。
- `tests/e2e/heading-hierarchy.spec.ts`: 表示階層・レスポンシブ範囲・装飾対象を検証。
- この報告、監査集計JSON、比較スクリーンショット18枚。

## GitHub・公開確認

GitHub APIはForbidden、公開URLはプロキシのCONNECT段階で403。GitHub CLIの認証確認も成功せず、リモートCI・マージ・公開デプロイ・公開画面確認は未完了。ブランチへのPushとPR作成結果は最終報告に記載。mainへの直接PushやCI確認を省略したマージは行わない。
