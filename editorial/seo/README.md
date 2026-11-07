# 検索公開準備・編集用メモ

`stone-metadata-proposals.csv` は210石の既存公開データを元に作成したレビュー用候補です。タイトルは英語名を省いた短縮案、説明文は既存の「鉱物・素材」の記述を引用した機械生成案であり、事実関係・読みやすさ・検索結果での表示を石ごとに編集確認してください。原稿や表示中のメタ情報には反映していません。検索順位や表示文字数を保証するものではありません。

このディレクトリは編集用で、公開ディレクトリや公開ビルドへ配置しません。承認済みの原稿、画像、ID、slug、相性リンクは変更しません。

## ページ別の方針

- `candidate`: トップ、石一覧・210石、願い一覧・12カテゴリ、歴史と物語の一覧・5記事、読みもの一覧・6記事、5テーマ、図鑑紹介。検索公開の候補であり、承認そのものではありません。
- `noindex`: 診断、サンプルレポート、書架、404。閲覧の可否や認証の代わりではありません。
- `review`: 利用規約、プライバシー、問い合わせ、販売・返金の案内。公開閲覧を維持し、検索対象とするか個別に決めます。
- `unknown`: 明示されていないルート。安全側でnoindexです。

2026-11-07に一般向けの244 URLが検索公開候補として明示的に承認されました。承認リストは `src/lib/approved-search-paths.ts` に固定保存し、候補の増減や新しい石・記事の追加時は自動で検索対象を増やさず、承認リストとの不一致でビルドを失敗させます。

**検索公開そのものは未開始です。** 現行のGitHub Pagesプレビューは `PUBLIC_LAUNCH=false`、`PUBLIC_SEARCH_INDEXING=false` のまま全ページ`noindex,nofollow`で、サイトマップは空です。将来の切り替え時は **`PUBLIC_LAUNCH=true` かつ `PUBLIC_SEARCH_INDEXING=true`** の両方を本番ビルドで指定して初めて、承認済み244件だけが`index,follow`になりサイトマップへ入ります。診断・サンプル・書架・404はnoindexのまま、法令関係等5ページは個別判断までnoindexのままです。単にPRをマージしても検索公開は始まりません。公開可否を`noindex`で代用してはいけません。

## robots.txtとGitHub Pages

プレビューの`robots.txt`はこれまでどおり`Disallow: /`です。プロジェクトのサブパスに生成される`/stone-encyclopedia/robots.txt`と、検索エンジンが参照するホスト直下`/robots.txt`は別物です。2026-11-07にブラウザからホスト直下の `https://almeagem.github.io/robots.txt` がGitHub Pagesの404を返すことを確認しました。GitHub Pagesプロジェクトの `https://almeagem.github.io/stone-encyclopedia/robots.txt` はホスト直下の制御には使えません。ホスト直下404の場合はGoogleは一般にrobotsによるクロール制限なしとして扱い、検索除外は各ページのmeta robotsで制御します。

robots.txtでクロールを拒否すると、検索エンジンがページ内のnoindexを取得できない場合があります。検索公開時には、ルートrobots.txtの実設定と個別のmeta robotsを合わせて検証してください。robots.txtもnoindexも秘密情報のアクセス制限には使えません。

404生成物からトップページのcanonicalとog:urlを除きます。公開環境で未知URLが実際にHTTP 404を返すかは未検証です。

5記事のArticle構造化データは、本文に既にあるタイトル・導入・正規URL・言語・無料閲覧情報のみを使用します。未確認の著者、公開日、更新日、記事固有画像は追加しません。検索結果の表示やリッチリザルトを保証するものではありません。

## Google Search Consoleと切り替え前の確認

- URLプレフィックス `https://almeagem.github.io/stone-encyclopedia/` の所有権はHTMLタグ方式で確認済みです。
- 244 URLの固定リストが承認され、プレビューの公開モードはまだ無効です。
- CIでは本番相当の検索公開ビルドを**成果物の検査だけに使用**し、GitHub Pagesへはデプロイしません。
- 今後、明示的な最終公開指示の後にのみ、GitHub Pagesのビルド環境、サイトマップ、noindex実レスポンス、Search Console URL検査を確認して切り替えてください。
- Search Consoleでの所有権確認は、Google検索のインデックス登録や順位を保証しません。

## 公開用ワークフローと影響

`preview.yml` はリポジトリ変数 `SEARCH_PUBLICATION_ENABLED` が未設定または `true` 以外の間、通常のmain pushと手動プレビューの両フラグをfalseに保ちます。最終承認後に限り、同変数を `true` に設定してから、手動実行で `ref=main` と `search_launch=true` を選ぶと、両フラグをtrueにして244 URLの検証を通過した成果物をGitHub Pagesにデプロイします。同変数がtrueの間、以後のmain pushでも公開設定を維持します。設定変更やワークフロー実行は今回行いません。

main以外のrefでの検索公開、変数がfalseの検索公開、変数がtrueの通常手動プレビューは失敗し、意図しない公開やnoindexへの上書きを防ぎます。変数の設定後は次のmain pushでも公開されるため、最終承認前に設定しないでください。ロールバックは変数をfalseに戻してmainの通常ワークフローを実行します。Search Consoleへの送信は公開後の確認を経て別途実施します。

`PUBLIC_LAUNCH=true` はSEO以外にも、共通ヘッダー上の「図鑑は無料で閲覧できます。個別選定レポートは販売準備中です。」というプレビュー帯を非表示にします。診断メニューの準備中表示や価格を変更するものではありません。また、本番HTTPSの `SITE_URL` が必要です。 `PUBLIC_SEARCH_INDEXING=true` と両方が有効な場合、サブパスのrobots.txtも `Allow: /` になりますが、検索エンジンが参照するホスト直下のrobots.txtは変更されません。
