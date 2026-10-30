# ALMÉA GEMのサイトアイコン

添付 `almea-gem-icon-assets.zip` の画像をそのまま使用。再圧縮・再配色・トリミングは行っていません。1024px画像は配信せず、用途に合った提供済みサイズだけを使います。

| 用途                    | ファイル                               | サイズ            |
| ----------------------- | -------------------------------------- | ----------------- |
| iPhone / iPadホーム画面 | public/apple-touch-icon.png            | 180×180           |
| Android / manifest      | public/icon-192.png / icon-512.png     | 192×192 / 512×512 |
| PC等のfavicon           | public/favicon.ico                     | 16 / 32 / 48      |
| PNG favicon             | public/favicon-32.png / favicon-48.png | 32×32 / 48×48     |

旧「天」の `favicon.svg` は削除し、参照も外しました。ヘッダーの線画アイコン、図鑑本文、写真は変更しません。

## パス・安全性

共通レイアウトから `pathTo()` でリンクを生成し、`site.webmanifest` もビルド時のbaseでid・scope・start_url・アイコンURLを生成します。GitHub Pagesではすべて `/stone-encyclopedia/` 以下です。額縁を含む元デザインが切れないよう、maskableにはせずpurposeはanyです。

オフライン用のService Workerや決済機能は追加しません。既存のnoindexを維持します。PRの作成だけではPagesへの公開は行わず、mainへのマージはユーザー確認後です。

## 確認結果

- 単体テスト58件、アイコンと公開機能のブラウザテスト36件成功。
- lint・型チェック・通常ビルド成功。GitHub Pagesサブパスビルドとアイコン監査を実施。
- 配置した6ファイルをZIP原本とバイト比較し、全て一致。
- ChromiumのPC・iPhone・Android端末プロファイルで、画像の200応答・寸法・manifest内容・旧SVG参照なしを確認。
- [PC](screenshots/app-icons/desktop.png)・[iPhoneプロファイル](screenshots/app-icons/iphone.png)・[Androidプロファイル](screenshots/app-icons/android.png)は画像自体をブラウザ表示した記録です。OSホーム画面のスクリーンショットではありません。
- WebKitの導入は配信ドメインへの403で失敗。実際のSafariエンジン、iPhone/Android実機のホーム画面登録は未確認です。Chromeの端末エミュレーションをSafari実機確認済みとは扱いません。

## 承認・公開後の確認手順

1. PRを確認し、承認後にmainへマージすると既存の無料Pagesプレビューが自動更新されます。今回はマージ・公開を行いません。
2. iPhoneのSafariでサイトを開き、共有 → ホーム画面に追加。ALMÉA GEMの画像と名前を確認します。
3. AndroidのChromeでサイトを開き、メニュー → ホーム画面に追加。端末により「アプリをインストール」など表示名が異なります。
4. PCで再読み込みし、タブのfaviconを確認します。
5. すでに追加したホーム画面の旧アイコンは、サイト更新だけで即時差し替わらない場合があります。古いショートカットを削除し、Safari/Chromeでサイトを開き直してから追加し直してください。これは写真や図鑑データを削除する操作ではありません。

アイコンの新規リクエストはfavicon・manifest用途だけで、石カード等に大きい画像を追加していません。画像ライセンスや写真登録の挙動には変更がありません。
