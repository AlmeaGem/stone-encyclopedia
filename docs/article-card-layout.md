# 記事カードのレイアウト修正

対象は公開図鑑のみ。Manager、210項目の内容、12カテゴリー、SEO設定、無料／有料の境界は変更していません。

## 原因と変更

- 画像エリアの数字はFlexによる縮小を受け、横幅と折り返し防止が未指定でした。共通CSSをGridにし、数字を2文字分の幅・nowrap・可変文字サイズで右に配置しました。
- カードがblock配置で、文章量に応じてCTA位置が変わっていました。縦Flexとmargin-top:autoで同じ行の下端に揃えました。
- タイトルの文字サイズを18pxに調整し、鉱物名・流通名・形状名を語の途中で分割しないようにしました。元の文章は維持しています。
- PCは3列、701〜1000pxは2列、スマートフォンは既存の1列を維持。説明文のブラウンも読みやすく調整しました。

## 変更ファイル

- src/tactile.css：トップと記事一覧で共有するカードのレイアウト
- src/components/ArticleTitle.astro：タイトル内の語の保護
- tests/e2e/article-cards.spec.ts：6画面幅での数字・重なり・ボタン位置・横スクロールの回帰テスト
- docs/screenshots/article-cards/：修正前後24枚（トップと記事一覧×6画面幅×前後）

## スクリーンショット

| 幅   | トップ修正前                                         | トップ修正後                                        | 記事一覧修正前                                           | 記事一覧修正後                                          |
| ---- | ---------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| 375  | [前](screenshots/article-cards/before-home-375.png)  | [後](screenshots/article-cards/after-home-375.png)  | [前](screenshots/article-cards/before-articles-375.png)  | [後](screenshots/article-cards/after-articles-375.png)  |
| 390  | [前](screenshots/article-cards/before-home-390.png)  | [後](screenshots/article-cards/after-home-390.png)  | [前](screenshots/article-cards/before-articles-390.png)  | [後](screenshots/article-cards/after-articles-390.png)  |
| 430  | [前](screenshots/article-cards/before-home-430.png)  | [後](screenshots/article-cards/after-home-430.png)  | [前](screenshots/article-cards/before-articles-430.png)  | [後](screenshots/article-cards/after-articles-430.png)  |
| 768  | [前](screenshots/article-cards/before-home-768.png)  | [後](screenshots/article-cards/after-home-768.png)  | [前](screenshots/article-cards/before-articles-768.png)  | [後](screenshots/article-cards/after-articles-768.png)  |
| 1280 | [前](screenshots/article-cards/before-home-1280.png) | [後](screenshots/article-cards/after-home-1280.png) | [前](screenshots/article-cards/before-articles-1280.png) | [後](screenshots/article-cards/after-articles-1280.png) |
| 1440 | [前](screenshots/article-cards/before-home-1440.png) | [後](screenshots/article-cards/after-home-1440.png) | [前](screenshots/article-cards/before-articles-1440.png) | [後](screenshots/article-cards/after-articles-1440.png) |

画像はローカル本番ビルドで取得しました。実機撮影ではありません。画像はドキュメント用で公開サイトの配信画像には追加しません。

## 検証

トップ、記事一覧、記事詳細、石一覧、願望カテゴリー一覧、診断紹介、サンプルの7ルート×6画面幅（375 / 390 / 430 / 768 / 1280 / 1440px）の42チェックで横スクロールと2桁番号の分割はありませんでした。

公開は既存のDeploy independent previewを使用します。PR #1のマージは行いません。noindexと販売準備中の状態は維持します。

最終結果：単体テスト31件、ブラウザテスト36件成功。lint・Astro/TypeScriptチェックはエラー・警告0件。本番ビルドおよび210石データ・公開出力監査成功。カード専用テストは全6画面幅で番号1行・ブランド文字との非重複・同じ行のCTA下端一致を検証しています。PC／スマートフォンはChromiumの画面幅エミュレーションで確認しました。
