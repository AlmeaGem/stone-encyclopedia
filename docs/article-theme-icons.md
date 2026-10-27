# 読みもの6記事のオリジナルSVG

トップページの3記事と記事一覧の6記事に共通のArticleCoverを適用しました。記事タイトル・説明・リンク・ボタンは変更していません。Manager、図鑑210項目、カテゴリー、販売準備中・noindex設定も変更していません。

## アイコン

1. 宝石と虫眼鏡：観察
2. 宝石と3つのラベル：呼び名の違い
3. 針状の内包物・模様を持つ結晶：個性
4. 宝石と柔らかいクロス：お手入れ
5. 淡いピンクの丸い石と濃いローズ色のカット石：色・透明感・形の比較
6. 開いた本と小さな光：意味・伝承

同じ線幅・ローズブラウン・淡い塗りで制作したオリジナルSVGです。ライブラリ、外部画像、画像API、課金素材、アニメーション、画像読み込み通信は追加していません。各カバーには該当するSVGのみをインライン出力します。装飾はaria-hidden、SVGはfocusable=falseとし、記事リンクの読み上げ名を重複させません。

## 変更ファイル

- src/components/ArticleCover.astro：記事slugごとの6種類のSVGと共通カバー
- src/pages/index.astro：共通カバーを使用
- src/pages/articles/index.astro：共通カバーを使用
- src/tactile.css：ブランド文字・中央アイコン・右番号の3列Grid
- tests/e2e/article-cards.spec.ts：6画面幅で各記事のSVG・装飾属性・重なり・番号・ボタン位置を検証

## 確認結果

- 375 / 390 / 430 / 768 / 1280 / 1440px、トップと記事一覧をChromiumで確認。
- 01〜06の横書き、文字・SVG・数字の非重複、アイコン6種類の描画、横スクロールなし、同じ行のボタン下端揃えを確認。
- 単体テスト31件、ブラウザテスト36件成功。
- lint・型チェック：エラー・警告0件。
- 本番ビルド成功、210石ページ・SEO・公開ファイル分離監査成功。
- 実機・公開サイトの描画確認ではなく、ローカル本番ビルドでの画面幅エミュレーションです。

## スクリーンショット

全6記事の一覧とトップを各画面幅で保存しています。個別アイコン01〜06の拡大画像も390px・1440pxで保存しました。

| 幅   | トップ                                          | 記事一覧（全6記事）                                 |
| ---- | ----------------------------------------------- | --------------------------------------------------- |
| 375  | [画像](screenshots/article-icons/home-375.png)  | [画像](screenshots/article-icons/articles-375.png)  |
| 390  | [画像](screenshots/article-icons/home-390.png)  | [画像](screenshots/article-icons/articles-390.png)  |
| 430  | [画像](screenshots/article-icons/home-430.png)  | [画像](screenshots/article-icons/articles-430.png)  |
| 768  | [画像](screenshots/article-icons/home-768.png)  | [画像](screenshots/article-icons/articles-768.png)  |
| 1280 | [画像](screenshots/article-icons/home-1280.png) | [画像](screenshots/article-icons/articles-1280.png) |
| 1440 | [画像](screenshots/article-icons/home-1440.png) | [画像](screenshots/article-icons/articles-1440.png) |

画像はdocs内の検証資料であり、公開サイトの画像配信量には追加されません。公開には既存のDeploy independent preview（実行元main、入力refはfeat/phase-one-encyclopedia）を使用します。PR #1はマージしません。
