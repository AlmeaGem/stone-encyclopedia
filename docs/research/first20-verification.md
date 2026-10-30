# 先頭20種類の検証記録（2026年10月30日）

対象：s001 オブシディアン〜s020 ラヴァ。作業ブランチ `feat/phase-one-encyclopedia`、PR #1。

## 結論

**データ構造・表示・参照先の内部整合性の検証は完了。外部出典本文との照合は未完了です。** 技術テストの成功を、歴史的記述やスピリチュアルな伝承が出典で裏付けられた証拠として扱いません。

既存の参考URL41件へ通常のHTTPSアクセスを試しましたが、全件で接続前に `Tunnel connection failed: 403 Forbidden` となりました。通常のChromiumでもバージニア州立公園の公式ページを開こうとしましたが、`ERR_TUNNEL_CONNECTION_FAILED` でした。アクセス制限の回避、代替プロキシ、有料検索の契約は行っていません。

これは**参照先サイトが404・削除・誤記だったという判定ではありません**。この実行環境から本文を取得できなかったという結果です。[URLごとの接続記録](first20-source-access.json)を残しました。

既存の`checkedAt`は過去の作業で記録された参照日として保持しています。今回の独立した確認成功日へ更新していません。既存の出典や移行資料の記録自体も削除していません。

## 今回修正した点

1. **ブラックオニキス（s015）**：爪の物語の直下リンクが歴史・装飾の資料へ向いていたため、既存の参考資料一覧で爪の物語として登録されていたThe Jewelry Magazineのリンクへ統一しました。ヴィーナス・キューピッドをギリシャ神話の神名とする混同を避け、ローマ神話の神名として整理。古代の原典が特定できたという断定をせず、現代の宝石紹介に見られる物語として表現しました。これは当該サイト本文を今回再読できたという意味ではありません。
2. **スタウロライト（s006）**：交差形を「単結晶の組み合わせ」としていた説明を、双晶の説明へ整理しました。
3. **スティブナイト（s007）**：柔らかく脆い原石の組み合わせを、ビーズ制作の推奨と誤認しないよう、鑑賞用標本の取り合わせであることを明示しました。
4. **デザートローズ（s011）**：セレナイトとの鉱物上の関係は石膏質の場合であり、重晶石質とは区別する説明へ整理。壊れやすい結晶を他の石と接触させない取り合わせにしました。
5. **共通の詳細テンプレート**：「伝説」と呼ぶ欄に地質的背景・文化史も含まれていたため、「来歴・伝説・言い伝え」に整理。「相乗効果」を実証された作用の増大と受け取らないよう、「相性を考えた組み合わせ」「意味やテーマを重ねる石」に変更しました。意味は伝承・現代のクリスタル文化、組み合わせはALMÉA GEMの提案だと短く説明しています。共通ラベルは全詳細ページに適用されますが、21番以降の本文データは変更していません。

新しい伝説を作ったり、未確認の硬度・鉱物名・年代を推測で埋めたりはしていません。写真・写真manifest・公開用画像・Macの仮保存候補は変更していません。

## 石ごとの確認と残る照合

「内部確認済み」は名称・ID・段落の区別・参照リンクの登録・組み合わせIDなどの確認を意味します。各行の**出典本文は未照合**です。

| ID・石                        | 本文の性格と今回の確認                                               | 外部本文で再確認する点                                                                                 | 登録済みの主な参照先                                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| s001 オブシディアン           | 天然ガラスの一般説明と鏡の文化史を区別。内部確認済み                 | テスカトリポカ、鏡の用途、ジョン・ディーの記述がどの資料に載るか                                       | [Getty](https://www.getty.edu/research/exhibitions_events/exhibitions/obsidian_mirror/through_the_mirror.html)、[Institute of Making](https://www.instituteofmaking.org.uk/materials-library/library/obsidian-mirror)                                                       |
| s002 キャストライト           | アンダリュサイトの変種と十字の象徴を区別。内部確認済み               | 十字包有物の説明、語源、旅のお守り・チリの呼称の根拠。商店紹介を歴史資料と同一視しない                 | [WAKOU](https://www.wakou-stone.co.jp/view/item/000000010202)、[紹介ページ](https://taslar.bumba.tr/en/stones/chiastolite/)                                                                                                                                                 |
| s003 ジェット                 | 有機質素材と追悼装身具の文化史を区別。内部確認済み                   | ヴィクトリア女王・1861年・普及に関する記述                                                             | [Whitby Museum](https://whitbymuseum.org.uk/collection/jet-and-jet-jewellery/)、[GIA](https://www.gia.edu/gia-website/whitby-jet-reading-list)                                                                                                                              |
| s004 シャーマナイト           | 標準鉱物名でなく流通名。特定共同体の史実として断定しない表現を確認   | 素材の範囲、先住民・シャーマンに関する紹介の一次的な根拠                                               | [Pascle](https://pascle.net/stone/shamanite)、[意味辞典](https://www.ishi-imi.com/2009/05/post_394.html)                                                                                                                                                                    |
| s005 シュンガイト             | 炭素質岩石と現代の象徴を区別。医療・電磁波遮断の保証を追加していない | 地名・命名史、保養地の逸話。地域事業者の説明と自然科学の根拠を区別                                     | [コトバンク](https://kotobank.jp/word/%E3%81%97%E3%82%86%E3%82%93%E3%81%8C%E3%81%84%E3%81%A8-3249354)、[地域史の紹介](https://shungitnpk.ru/en/history)                                                                                                                     |
| s006 スタウロライト           | 双晶の説明を修正。妖精の涙は土地の民話として扱う                     | 州立公園が掲載する伝説の具体的な文脈、護符の説明                                                       | [州立公園](https://www.dcr.virginia.gov/state-parks/fairystones)、[公園ブログ](https://www.dcr.virginia.gov/state-parks/blog/legend-of-the-fairy-stone?id=legend-of-the-fairy-stone)                                                                                        |
| s007 スティブナイト           | 輝安鉱の性質と現代の象徴を区別。鑑賞用の組み合わせへ修正             | コール原料の地域・時代差と当該論文の記述。化粧史の論文はスピリチュアルな作用の証明ではない             | [DOI](https://doi.org/10.3390/cosmetics10030071)、[現代の意味紹介](https://www.spiritofisis.org/knowledge/crystal_files/stibnite.htm)                                                                                                                                       |
| s008 スモーキークォーツ       | 石英の変種と装飾史を区別。ケアンゴームの別名がこちらにあることを確認 | 18世紀の記述、装飾用途、ドルイドの話の出所。商店による伝承紹介を古代史実として扱わない                 | [National Museums Scotland](https://www.nms.ac.uk/discover-catalogue/geology-to-jewellery-the-history-and-science-of-cairngorm-quartz)、[宝石紹介](https://www.countyargyle.com/a-guide-to-scottish-gemstones/5/)                                                           |
| s009 スレイマンアゲート       | 流通名と邪視除けの紹介を区別。内部確認済み                           | スレイマニ・アキークの呼称と地域習俗の具体的な根拠                                                     | [紹介記事](https://naturalgems.pk/blog/sulemani-agate-guide)、[販売テーマ](https://gemstore.pk/purpose/protection)                                                                                                                                                          |
| s010 テクタイト               | 衝突ガラスであり隕石自体とは異なる説明を確認                         | 地質的な成因と「天から来た石」という表現の資料上の位置付け                                             | [TSHA](https://www.tshaonline.org/handbook/entries/tektites)、[現代の意味紹介](https://www.nornenthal.net/index.php?id=136&language=en&page=1&site=edelsteinlexikon.php&sub=details)                                                                                        |
| s011 デザートローズ           | 石膏質／重晶石質を区別。セレナイトとの関係と鑑賞用の提案を修正       | 各資料がどちらの素材を扱っているか。「願望成就」は現代の象徴として読む                                 | [意味辞典](https://www.ishi-imi.com/2009/05/post_416.html)、[ANAHITA STONES](https://www.anahitastones.com/en/stone-library/wish/details/desert_rose.html)                                                                                                                  |
| s012 ヌーマイト               | 岩石の説明と「魔術師の石」という現代の表現を区別                     | 1810年・1982年・約30億年という具体的な年代と、産地／試料の範囲                                         | [国際宝石学会議](https://www.igc-gemmology.org/igc-2023/a-nuummite-occurrence-from-kangerluarsuk-in-the-maniitsoq-region-west-greenland/)、[Crystal Vaults](https://www.crystalvaults.com/crystal-encyclopedia/nuummite/)                                                   |
| s013 ピクチャーサンドストーン | 砂岩とジャスパーの流通上の混同を避ける説明を確認                     | ブログのカテゴリURL内の該当記事を特定する必要あり。商品名だけで組成を断定しない                        | [工房ブログ](https://stonecage.blog.shinobi.jp/Category/7/)、[流通名の紹介](https://bodhitreejp.com/natural-stone/picture-stone/)                                                                                                                                           |
| s014 レッドサンドストーン     | 天然砂岩と人工ガラスのゴールドストーンを区別                         | Astrology.comのsandstoneが天然砂岩・人工素材のどちらを指すか。素材の根拠に使えるかは未判定             | [NPS](https://www.nps.gov/zion/learn/nature/navajo-colors.htm)、[象徴の紹介](https://www.astrology.com/crystals/sandstone-crystal)                                                                                                                                          |
| s015 ブラックオニキス         | 爪の物語のリンク・神名・流通品との関係を整理。旧表記も別名として保持 | 宝石紹介の物語と古代の原典を区別。爪の物語の具体的な内容と引用先                                       | [爪の物語](https://www.thejewelrymagazine.com/jewelry-information-center/about-gemstones/onyx/)、[Sotheby's](https://www.sothebys.com/en/articles/the-a-z-of-jewelry-o-is-for-onyx)、[IGS](https://www.gemsociety.org/article/black-onyx-jewelry-and-gemstone-information/) |
| s016 フリント                 | 火打石・石器と現代の意味づけを区別。鋼との火花の説明を確認           | NPSの記事に載る用途・時代の具体的な範囲                                                                | [NPS記事](https://www.nps.gov/articles/flint-part-2.htm)、[火打石と鋼](https://www.nps.gov/pisp/learn/historyculture/flint-and-steel.htm)                                                                                                                                   |
| s017 ヘマタイト               | 酸化鉄の一般説明と護符の文化史を区別。内部確認済み                   | 美術館の各オブジェクトIDの材質・名称・用途が本文と一致するか。取り扱いの記述も素材・加工別に確認が必要 | [Met 552959](https://www.metmuseum.org/art/collection/search/552959)、[Met 545370](https://www.metmuseum.org/art/collection/search/545370)                                                                                                                                  |
| s018 メテオライト             | 隕石の総称と鉄隕石の特定事例を区別。内部確認済み                     | ツタンカーメン短剣の論文の分析対象・結論と紹介記事の対応                                               | [DOI](https://doi.org/10.1111/maps.12664)、[Nature](https://www.nature.com/articles/d41586-022-00436-5)                                                                                                                                                                     |
| s019 モリオン                 | 独立した鉱物種でないこと、古代の名称との同一視を避ける表現を確認     | GemdatのページID・定義と、モルモリオンという古語の解説元。語源と現在の流通名を区別                     | [Gemdat](https://www.gemdat.org/gem-6270.html)、[語彙解説](https://www.edelsteine.at/en/glossaries/lexicon/smoky-quartz/)                                                                                                                                                   |
| s020 ラヴァ                   | 火山岩の流通名と現代の再生の象徴を区別。内部確認済み                 | USGSの気泡跡の解説と流通素材の範囲、商業的な意味紹介の記述                                             | [USGS](https://www.usgs.gov/educational-resources/find-feature-vesicles)、[意味の紹介](https://jeffreyburroughs.com/lava-stone/)                                                                                                                                            |

## 検証範囲と保護対象

- 210項目、12カテゴリー、固定ID・slug・関連石ID・組み合わせIDを検証。
- 先頭20種類の参照リンクが、各石の参考資料一覧に登録された同一URL・ラベルへ対応することを確認。
- 20種類すべての詳細画面で、来歴・意味・組み合わせ・参照リンク・鉱物情報が表示されることを確認。
- 375/390/430/768/1280/1440pxで、長い名前や説明を持つ代表ページの横はみ出しを確認。PC・スマホ幅のChromiumで全20ページを確認するテストを追加。
- 鉱物名・硬度の空欄を推測で補完しない。元の移行記録や既存の出典は消さない。
- 写真manifestと画像原本、Macの`.editor/`、Managerは変更しない。

## 出典確認を完了するために残る作業

出典本文を閲覧できる環境で、表の具体的な主張と資料を照合し、必要に応じて著者・資料名・該当箇所を記録する必要があります。店舗の象徴紹介は、鉱物学・考古学・医学の根拠として扱いません。美術館や公的機関のページも、名称だけで本文との一致を推定しません。

この再照合ができるまでは、「最初の20種類の根拠検証がすべて完了」「出典41件を確認済み」とは報告しません。PRは未マージ、公開デプロイも行っていません。21〜40番への追加調査には進んでいません。

## 実行した技術テスト

- データ検証：210種類・写真2件を正常確認。
- ユニットテスト：57件成功。
- ブラウザテスト：54件成功。先頭20種類の全詳細画面をPC・スマホ幅で巡回し、本文・意味・組み合わせ・参照リンクを照合する2件を追加しました。既存の写真管理・一括採用・ゴミ箱などの回帰テストも含みます。
- lint・Astro/TypeScript：エラー・警告・ヒント0。
- 本番ビルド：210詳細ページのID・URL・SEO・非公開ファイル除外監査に成功。
- 画面例：[スマホの来歴・意味](../screenshots/first20-audit/onyx-story-390.png)、[PCの来歴・意味](../screenshots/first20-audit/onyx-story-1440.png)、[スマホの組み合わせ](../screenshots/first20-audit/onyx-pairing-390.png)、[PCの組み合わせ](../screenshots/first20-audit/onyx-pairing-1440.png)。

これらは、外部参考ページの本文を取得できたという検証ではありません。根拠の本文照合は上記のとおり保留です。
