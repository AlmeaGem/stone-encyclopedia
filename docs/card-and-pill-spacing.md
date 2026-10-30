# 記事カバーと願望タブの余白調整

## 原因と修正

記事カバーは左列の1frが余白をすべて吸収し、英字とSVGの間が広く見えていました。左・右は内容幅、中央は可変幅とし、space-evenlyで余白を3要素の周囲へ分配しました。大きなmarginや個別記事の位置補正は使用していません。

願望タブはvisibility:hiddenのチェックが幅とgapを占有していました。非選択時はdisplay:none、選択時は既存の左右padding内に絶対配置し、文字を中央に保ちます。文字数に応じた幅、左右均等padding、letter-spacing:0、同じfont-weightにより、選択前後の幅・文字位置の変化を防ぎます。ぷっくりした背景・影・フォーカス表示は維持しています。

## 変更ファイル

- src/tactile.css
- src/pages/wishes/[id].astro（文字をwish-labelで囲み、中央位置を検証可能に）
- tests/e2e/spacing.spec.ts

SVG6種類、記事文章、横書き番号、カード下端のCTA、願望のAND絞り込み・解除・全件表示・件数更新、図鑑210項目、カテゴリー12件は維持しています。Manager・DBには変更を加えていません。

## 画面確認資料

Chromiumで375 / 390 / 430 / 768 / 1280 / 1440pxを確認。トップと記事一覧の全6記事、12カテゴリーすべてのタブを対象にしました。実機や公開ページでの撮影ではなく、ローカル本番ビルドです。

- [PC修正前・記事](screenshots/spacing/before-articles-1440.png) / [修正後](screenshots/spacing/after-articles-1440.png)
- [スマホ修正前・記事](screenshots/spacing/before-articles-390.png) / [修正後](screenshots/spacing/after-articles-390.png)
- [PC修正前・タブ](screenshots/spacing/before-wishes-1440.png) / [修正後](screenshots/spacing/after-wishes-1440.png) / [選択中](screenshots/spacing/selected-wishes-1440.png)
- [スマホ修正前・タブ](screenshots/spacing/before-wishes-390.png) / [修正後](screenshots/spacing/after-wishes-390.png) / [選択中](screenshots/spacing/selected-wishes-390.png)

その他の指定画面幅の画像もscreenshots/spacing/に保存しています。検証資料は公開サイトの画像配信には追加されません。

公開は既存のDeploy independent preview（実行元main、入力ref:feat/phase-one-encyclopedia）で行います。PR #1はマージしません。noindex、販売準備中の状態を維持します。

検証結果：単体テスト31件、ブラウザテスト38件成功。タブ専用テストでは12カテゴリー×6幅×2ブラウザ設定で中央配置・未選択マークの非占有・選択前後の幅一致・解除を検証しました。既存の絞り込み・件数・リセットのテストも成功。lint・Astro/TypeScriptはエラー・警告0件。本番ビルド・210項目とSEO監査成功。
