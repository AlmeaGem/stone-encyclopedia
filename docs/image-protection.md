# 画像表示・公開用画像と透かしの確認

共通の `Visual.astro` で「※ イメージ画像」を画像直下の右側に表示します。AI生成区分や撮影・生成・権利の管理情報は変更せず、詳細ページでは実物写真ではない説明も残しています。Cloudflare写真サービスの差し替え画像にも同じ表示を使います。

画像面だけの右クリックと画像ドラッグを補助的に制限します。リンクのクリック・キーボード操作・リンク自身のメニュー、文字選択、タッチスクロールは制限しません。保存を完全に防止するものではありません。Publicリポジトリの原本や既存履歴、配信された画像URL、画面キャプチャから画像を取得できるという限界があります。Git履歴や原本は削除・書き換えしていません。

## 公開用の解像度と原本

`npm run images:prepare`（通常ビルドでも実行）で、採用済み画像だけを `public/images/` に出力します。長辺960pxを超える画像のみ、縦横比・構図・透明度・ICCプロファイルを保って縮小し、WebP品質88で保存します。小さい画像は拡大しません。現在の詳細画像の表示高250〜330pxに対しRetina表示に十分な画素数を確保します。リサイズと再圧縮に伴う画素の差はありますが、色調補正・切り抜き・回転・背景合成は行いません。

`assets/approved-images/` と `src/content/images.json` は変更しません。元のURL・ファイル名を保持して関連付けを維持し、承認済み原本SHA256と公開用ファイルSHA256は `.astro/public-images.json` に別々に記録します。ファイル名中のハッシュは承認済み原本の識別子であり、縮小後のバイト列のハッシュとは異なります。この記録は配信しません。ビルド監査で公開画像のSHA256・サイズ・採用数、原本・管理記録・透かし試作の混入を検査します。

## 透かし6種類の比較（承認待ち）

**現行サイトの画像には透かしを適用していません。全210種類への適用は別工程で、事前承認が必要です。**

再生成：`npm run images:watermark-preview`。通常ビルドとは独立した処理です。対象は `scripts/watermark-preview.ts` の6種類に限定しています。同ファイルの `corner` と `color`（任意の `#RRGGBB`）で各画像の位置と文字色を調整できます。色を指定しない場合は隅の明るさから白か淡いブラウンを選びます。生成した画像を確認し、石の特徴と重なる場合は位置を調整してください。

右側が透かし試作、左側が公開サイズの透かしなし画像です。比較画像は確認用に600pxずつ並べており、配信画像としては使用しません。

| 石                                      | 比較                                               |
| --------------------------------------- | -------------------------------------------------- |
| s001 オブシディアン（黒色）             | [比較画像](watermark-preview/s001-comparison.webp) |
| s007 スティブナイト（金属光沢）         | [比較画像](watermark-preview/s007-comparison.webp) |
| s048 シトリン（黄色）                   | [比較画像](watermark-preview/s048-comparison.webp) |
| s107 ローズクォーツ（ピンク）           | [比較画像](watermark-preview/s107-comparison.webp) |
| s180 ペタライト（透明・白色）           | [比較画像](watermark-preview/s180-comparison.webp) |
| s210 スターローズクォーツ（模様・光沢） | [比較画像](watermark-preview/s210-comparison.webp) |

透かし入り単体画像はGit除外の `.editor/watermark-preview/`、比較画像と最小限のハッシュ記録は `docs/watermark-preview/` に生成します。原本・公開用縮小画像・透かし入り画像・比較画像のSHA256を `manifest.json` で区別します。元の生成・編集・ライセンス記録は複製せず保持します。これらの試作は `public/` や `dist/` に含めません。AI生成画像の著作権成立を一律に断定するものではありません。

## 表示変更の比較

| 対象（390px幅） | 変更前                                               | 変更後                                              |
| --------------- | ---------------------------------------------------- | --------------------------------------------------- |
| トップのカード  | [前](screenshots/image-protection/before-card.png)   | [後](screenshots/image-protection/after-card.png)   |
| 石の詳細画像    | [前](screenshots/image-protection/before-detail.png) | [後](screenshots/image-protection/after-detail.png) |

詳細ページの前後ナビゲーションは実装を変更せず、320・375・390・430・768・1280・1440pxとセーフエリアで継続検証します。

## ローカル検証記録

- lint：フォーマット・型検査とも成功、エラー・警告0。
- validate：石210項目、採用画像210枚。
- 単体テスト：25ファイル・87件成功。
- E2E全体：90件成功、2件スキップ。スキップは静的HTML・全7幅検証のmobile側重複分で、検証対象の削除ではありません。
- 通常ビルド：241ページ生成。内部情報・画像SHA256・原本混入・CSP・アイコン監査成功。
- GitHub Pagesサブパスビルド：241ページ生成、全URL・画像・内部情報の監査成功。320px・1440pxの実ブラウザで画像の復号・ラベル・前後移動・検索・noindexを確認。
- 公開画像：210枚、長辺最大960px。28,352,356バイトから23,202,684バイトへ約18%削減。
- 原本、210項目の本文・ID・slug・カテゴリ、検索実装、前後ナビゲーション本体、見出し装飾、アイコンに差分なし。
- 320・375・390・430・768・1280・1440pxでラベル位置・横スクロール・コントラストを確認。タップとキーボード、端の制御、34pxセーフエリアも検証。

透かしの全210種類への適用は承認待ちです。GitHub APIが403を返しているため、CIの成功確認を条件とするmainへのマージとデプロイは、その確認ができるまで未実施です。

## 変更ファイル一覧

- `docs/image-protection.md`
- `docs/screenshots/image-protection/after-card.png`
- `docs/screenshots/image-protection/after-detail.png`
- `docs/screenshots/image-protection/before-card.png`
- `docs/screenshots/image-protection/before-detail.png`
- `docs/watermark-preview/manifest.json`
- `docs/watermark-preview/s001-comparison.webp`
- `docs/watermark-preview/s007-comparison.webp`
- `docs/watermark-preview/s048-comparison.webp`
- `docs/watermark-preview/s107-comparison.webp`
- `docs/watermark-preview/s180-comparison.webp`
- `docs/watermark-preview/s210-comparison.webp`
- `package.json`
- `scripts/audit-build.mjs`
- `scripts/prepare-images.ts`
- `scripts/public-image.ts`
- `scripts/watermark-preview.ts`
- `src/components/Visual.astro`
- `src/layouts/Page.astro`
- `src/pages/[legal].astro`
- `src/styles.css`
- `tests/e2e/cloud-photo.spec.ts`
- `tests/e2e/image-protection.spec.ts`
- `tests/e2e/public.spec.ts`
- `tests/e2e/stone-navigation.spec.ts`
- `tests/image-output.test.ts`
