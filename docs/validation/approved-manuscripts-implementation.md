# 承認済み210種類の原稿反映・第1段階

## 実装範囲

`editorial/manuscripts/approved-chatgpt/batch-01`〜`batch-11/MANUSCRIPTS.md` を唯一の正本として、詳細ページの旧導入・物語・意味・願望・相性・選び方を置き換えました。正本、石別の照合記録、既存の `src/content` は変更していません。検索・一覧・カテゴリの登録データも維持しています。

ビルド時に全210件のID・石名・slug、正本SHA256、本文バイト範囲、石別SHA256を照合します。不一致や不足がある場合はビルドを停止し、旧原稿へ黙って戻すことはありません。原稿内の冒頭メタデータ、末尾編集メモ、Codex向け指示は表示しません。

H1直下にキャッチコピーを配置し、正本の段落を維持します。「こんな願いに」の区切り記号を箇条書きの区切りに変換し、相性の石名を強調して説明ごとに区切ります。恋愛系5種類の追加節はH3で全文を表示します。H2には既存の淡いピンクのマーカー、H3にはローズ色の縦線を使います。本文の行間は1.85、PCの本文幅は最大48remです。フォント定義・読み込みは変更していません。

鉱物情報、処理情報、形状情報、浄化・取り扱いの注意、出典、既存の関連リンクを保持します。フェナカイトのベリリウム、水晶球の集光・火災等の注意も既存データから表示します。写真・画像保護・ナビゲーション・利用規約・noindexは変更していません。

## 変更ファイル

- `.prettierignore`：バイト単位で保持する正本・石別記録を自動整形から除外。
- `src/lib/approved-manuscripts.ts`：正本照合・読み込み・表示用の構造化。
- `src/components/ManuscriptBody.astro`：本文・願望リスト・相性の表示。任意HTMLは実行せず、原文はエスケープ。
- `src/pages/stones/[slug].astro`：詳細ページへの反映、旧本文の二重表示防止。
- `src/manuscript-layout.css`：文章幅・行間・余白と見出し階層。
- `scripts/audit-build.mjs`：承認済み読者向け段落と旧文面の編集用語ヒューリスティックを区別。内部情報・URL・配信ファイルの監査は全出力に継続適用。
- `tests/approved-manuscripts.test.ts`：210件の段落・節構成・IDの検証。
- `tests/helpers/approved-text.ts`：E2Eが照合する承認済み本文の取得。
- `tests/e2e/approved-manuscripts.spec.ts`：全210ページの全文・重複・安全注意、375/390/430/1440pxの表示確認。
- `tests/e2e/entries21-40.spec.ts`、`entries41-60.spec.ts`、`entries61-80.spec.ts`、`entries81-100.spec.ts`、`entries101-120.spec.ts`、`entries121-140.spec.ts`、`entries141-160.spec.ts`、`entries161-180.spec.ts`、`entries181-210.spec.ts`：旧本文への照合を承認済み本文への照合に更新。画像・検索・リンク・レイアウト検証は維持。
- `tests/e2e/first-twenty.spec.ts`、`final210.spec.ts`、`heading-hierarchy.spec.ts`、`public.spec.ts`、`readability.spec.ts`：新しい本文・見出し構造への対応。
- `docs/screenshots/approved-manuscripts/`：PC・スマホの確認画像4枚。
- 本書：作業範囲・確認結果。

## 確認画像

- [スマホ：ページ冒頭](../screenshots/approved-manuscripts/s210-390-header.png)
- [スマホ：長文・小見出し](../screenshots/approved-manuscripts/s210-390-reading.png)
- [PC：ページ冒頭](../screenshots/approved-manuscripts/s210-1440-header.png)
- [PC：長文・小見出し](../screenshots/approved-manuscripts/s210-1440-reading.png)

## 検証結果

- lint・validate・通常ビルド・GitHub Pagesサブパスビルド：成功。
- 単体テスト：299件成功。
- 全体E2E：98件成功、2件スキップ、2件は相性表示の空白比較で初回失敗。比較修正後、該当2件を含む重点E2E 8件がすべて成功。
- 最終版でPC・スマホの全210ページの本文・画像・安全注意を再確認。

## 公開状態

実装用ブランチでの検証のみです。mainへのマージ、公開デプロイ、フォント変更は実施しません。
