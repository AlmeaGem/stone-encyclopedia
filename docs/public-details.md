# 図鑑見出しと公開情報の整理

トップの図鑑見出しを、小見出し「STONE LIBRARY」、主見出し「POWER STONE ENCYCLOPEDIA」へ変更しました。ローカルのクラシックなセリフ体を使用し、外部フォントを追加していません。スマホは単語の途中で分割せず「POWER STONE」「ENCYCLOPEDIA」の2行、PCは1行で表示します。

210項目すべての詳細から、移行資料の参照記録・出典確認状況・内部の確認メモを公開HTMLに出力しないよう変更しました。公開用の参考文献がなければ、空の出典欄や目次リンクも表示しません。正式な参考文献はURLのない書籍も含めて表示できます。写真の撮影者・ライセンス表示を扱うVisualコンポーネントは変更していません。

`src/content/stones.json` のsources、reviewNote、handlingを含む内部データは変更せず、非公開編集機能から引き続き確認・編集できます。取り扱い注意は、移行作業用のラベルだけを表示時に置き換え、注意内容を保持します。未確認の鉱物学的情報を確定済みとして表示する変更はありません。

単体26件・画面22件成功。210ページのSEO・検索・内部情報の非表示を確認し、375／390／430／1440pxで見出しを確認しています。整形チェック・Astro／TypeScript・本番ビルドの監査も実施します。追加SQL・環境変数・既存Managerの変更はありません。

画面：[375px](screenshots/library-heading/375.png) ／ [390px](screenshots/library-heading/390.png) ／ [430px](screenshots/library-heading/430.png) ／ [PC](screenshots/library-heading/1440.png)
