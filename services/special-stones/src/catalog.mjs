// PUBLIC metadata only. Never add paid copy, private image bytes, or user data here.
export const premiumCategories = Object.freeze([
  {
    id: 'special-stones',
    title: 'スペシャルストーン',
    english: 'SPECIAL STONES',
    description:
      '組み合わせたら最強かも？！\nまだ知られていない神秘的な石の組み合わせや、希少なスペシャルストーン。\n石好きなら絶対に知っておきたい宝石の秘話、願いに合わせた石選びまで。\n知れば知るほど、手に入れたくなる石の世界へ',
    path: 'special-stones/',
    status: 'preview',
  },
  {
    id: 'diagnosis',
    title: 'パーソナル診断',
    english: 'PERSONAL SELECTION',
    description:
      '今のあなたに、本当に必要な石は？\n恋愛、金運、仕事、願望実現…。あなたの願いや悩み、好みに合わせて天然石7種類を厳選。\nおすすめの優先順位から、相性の良い組み合わせ3案、購入時に見るべき品質まで。\n石選びにもう迷わない、あなただけの天然石選定レポート\n790円（税込・買い切り）',
    path: 'diagnosis/',
    status: 'coming-soon',
  },
  {
    id: 'fortune',
    title: '占い/四柱推命',
    english: 'FORTUNE & GUIDANCE',
    description:
      'どこよりも詳しい四柱推命レポート\n対面鑑定以上の深い内容にしております！圧巻の情報量\n\n自分に合う仕事は？お子さまの才能や特性は？\n命式から読み解く強みや注意点、気をつけたいことへの具体的な対策まで。\n人生計画や相性占いも、これ一つで♡',
    status: 'coming-soon',
  },
]);
export const specialChapters = Object.freeze([
  {
    id: 'chapter-one',
    number: '01',
    title: '宝石に秘められた、もうひとつの力',
    headline: '三つの宝石が教えてくれる、願いの叶え方',
    description:
      'サファイア・ルビー・エメラルドの物語。成功、魅力、愛と繁栄を象徴する三つの輝き。',
    cover: 'special-stones/01_chapter_cover.png',
    width: 1086,
    height: 1448,
    price: 150,
    sellable: true,
    themes: ['成功・守護', '魅力・情熱', '愛・繁栄'],
    intro: [
      '成功を手にしたいとき。',
      '誰かの心に、忘れられない印象を残したいとき。',
      'そして、手にした愛や豊かさを、いつまでも大切に育てたいとき。',
      'もし、それぞれの願いに寄り添う宝石があるとしたら……。',
      '**サファイア、ルビー、エメラルド。**',
      '古くから王族や権力者たちを魅了してきた三つの宝石には、美しさの奥に、それぞれ異なる神秘的な意味が伝えられています。',
      'そして、パワーストーンの世界では、石を単独で選ぶだけでなく、**異なる意味を持つ石を組み合わせること**も大切にされてきました。',
      '成功を象徴する青い宝石に、情熱を象徴する赤い宝石を添えたら？',
      '愛を育てる緑の宝石と、月の神秘を象徴する石を合わせたら？',
      'その組み合わせには、どんな物語が生まれるのでしょうか。',
      'この特別な章では、三つの宝石が秘める象徴と、願望に合わせた組み合わせを紐解いていきます。',
    ],
    preview: [
      {
        name: 'サファイア',
        theme: '成功を導く象徴と特別な組み合わせ',
        slug: 'sapphire',
      },
      { name: 'ルビー', theme: '愛される魅力と情熱の石選び', slug: 'ruby' },
      {
        name: 'エメラルド',
        theme: '良縁と繁栄を育てる組み合わせ',
        slug: 'emerald',
      },
    ],
    bonus: '三つの宝石を組み合わせる特別な物語',
    illustrations: [
      { key: 'sapphire', heading: 'サファイア' },
      { key: 'ruby', heading: 'ルビー' },
      { key: 'emerald', heading: 'エメラルド' },
    ],
  },
  {
    id: 'chapter-two',
    number: '02',
    title: '宇宙から届いた、運命を拓く石',
    headline: '宇宙と地球の出会いを、一粒に。',
    description:
      'ギベオン、モルダバイト、リビアングラスを中心に、七つの宇宙ストーンの誕生と神秘を紐解く特集。',
    cover: 'special-stones/02_chapter_starlight.svg',
    width: 1086,
    height: 1448,
    price: 150,
    sellable: false,
    contentSource: 'private-db',
    themes: ['変容・転機', '再生・成長', '意志・現実化'],
    intro: [
      '人生を変えたい。今までの自分では想像できなかった未来へ進みたい。',
      '遠い宇宙から地球へ届いた物質と、宇宙との出会いによって地球上に生まれた天然ガラス。',
      'ギベオン、モルダバイト、リビアングラス。三つの石を中心に、さらに四つの宇宙ストーンの物語をご紹介します。',
      '同じ宇宙系の石でも、誕生の背景や石に重ねられる象徴はそれぞれ異なります。',
      '七つの特別な石から、これからの自分に寄り添う一粒を見つけてみませんか。',
    ],
    preview: [
      {
        name: 'ギベオン',
        theme: '鉄隕石',
        slug: 'gibeon',
      },
      {
        name: 'モルダバイト',
        theme: 'テクタイト',
        slug: 'moldavite',
      },
      {
        name: 'リビアングラス',
        theme: 'インパクトガラス',
        slug: 'libyan-glass',
      },
      {
        name: 'ムオニナルスタ',
        theme: '鉄隕石',
        slug: 'muonionalusta',
      },
      {
        name: 'カンポ・デル・シエロ',
        theme: '鉄隕石',
        slug: 'campo-del-cielo',
      },
      {
        name: 'セイムチャン',
        theme: '石鉄隕石',
        slug: 'seymchan',
      },
      {
        name: 'ブラックテクタイト',
        theme: 'テクタイト',
        slug: 'tektite',
      },
    ],
    bonus: '宇宙の三石チャート、選択式ミニ診断と石選びのヒント',
    illustrations: [],
  },
  {
    id: 'chapter-three',
    number: '03',
    title: '黄金の石が秘める、繁栄への鍵',
    headline: '好機をつかみ、豊かさを育てる。',
    description:
      'ゴールドルチル、インペリアルトパーズ、サンストーンを中心に、十種類の石と五つのルチルの違いを紐解く金運・成功の特集。',
    cover: 'special-stones/03_chapter_silky.svg',
    width: 1086,
    height: 1448,
    price: 150,
    sellable: false,
    contentSource: 'private-db',
    themes: ['金運・好機', '仕事・成功', '繁栄・守護'],
    intro: [
      '黄金の輝きに、豊かさへの願いを重ねる。',
      '好機を見つけること。自分の力を発揮すること。手にした成果を育て、守ること。',
      '同じ金運の石でも、象徴する願いは少しずつ異なります。',
      '黄金の針を宿す水晶から帝王の宝石、太陽の輝きまで。五つのルチルの違いと、十種類の石を巡る特別な章です。',
    ],
    preview: [
      {
        name: 'ゴールドルチルクォーツ',
        theme: '財運・好機',
        slug: 'golden-rutilated-quartz',
      },
      {
        name: 'インペリアルトパーズ',
        theme: '繁栄・自己実現',
        slug: 'imperial-topaz',
      },
      {
        name: 'サンストーン',
        theme: '人気・自信',
        slug: 'sunstone',
      },
      {
        name: 'プラチナルチルクォーツ',
        theme: '転機・変容',
        slug: 'platinum-rutilated-quartz',
      },
      {
        name: 'ブラックルチルクォーツ',
        theme: '継続・安定',
        slug: 'black-rutilated-quartz',
      },
      {
        name: 'レッドルチルクォーツ',
        theme: '情熱・行動',
        slug: 'red-rutilated-quartz',
      },
      {
        name: 'タイチンルチルクォーツ',
        theme: '飛躍・目標',
        slug: 'taichin-rutilated-quartz',
      },
      {
        name: 'シトリン',
        theme: '商売・豊かさ',
        slug: 'citrine',
      },
      {
        name: 'パイライト',
        theme: '守護・意志',
        slug: 'pyrite',
      },
      {
        name: 'ゴールデンタイガーアイ',
        theme: '判断・決断',
        slug: 'tiger-eye',
      },
    ],
    bonus: '五つのルチル比較、願い別レシピ、黄金の三石チャートとミニ診断',
    illustrations: [],
  },
  {
    id: 'chapter-four',
    number: '04',
    title: '愛を惹き寄せる、魅惑の宝石たち',
    headline: '誰かの心に、忘れられない輝きを。',
    description:
      'ルベライト、ピンクスピネル、ピンクサファイアを中心に、十二種類の石となりたい女性像、恋愛の段階別の石選びを紹介。',
    cover: 'special-stones/04_chapter_love.svg',
    width: 1086,
    height: 1448,
    price: 150,
    sellable: false,
    contentSource: 'private-db',
    themes: ['魅力・情熱', '出会い・良縁', '愛・自尊心'],
    intro: [
      '誰かの心に、忘れられない輝きを。',
      '愛することだけではなく、愛されること。自分の魅力を大切にしながら、心から望む恋へ。',
      '恋愛の段階によって、大切にしたい願いは少しずつ変わります。',
      '十二種類の石と、あなたがなりたい女性像。愛の物語を紐解く特別な章です。',
    ],
    preview: [
      {
        name: 'ルベライト',
        theme: '情熱・色気',
        slug: 'rubellite',
      },
      {
        name: 'ピンクスピネル',
        theme: '個性・華やかさ',
        slug: 'pink-spinel',
      },
      {
        name: 'ピンクサファイア',
        theme: '品格・誠実な愛',
        slug: 'pink-sapphire',
      },
      {
        name: 'ピンクトルマリン',
        theme: '愛される魅力',
        slug: 'pink-tourmaline',
      },
      {
        name: 'モルガナイト',
        theme: '深い愛情',
        slug: 'morganite',
      },
      {
        name: 'ストロベリークォーツ',
        theme: '人気・親しみやすさ',
        slug: 'strawberry-quartz',
      },
      {
        name: 'インカローズ',
        theme: '情熱・ときめき',
        slug: 'rhodochrosite',
      },
      {
        name: 'ローズクォーツ',
        theme: '自己愛',
        slug: 'rose-quartz',
      },
      {
        name: 'ピンクシラームーンストーン',
        theme: '良縁・出会い',
        slug: 'pink-schiller-moonstone',
      },
      {
        name: 'ピンクオパール',
        theme: '柔らかな魅力',
        slug: 'pink-opal',
      },
      {
        name: 'ラブラドライト',
        theme: '神秘性・自分の世界',
        slug: 'labradorite',
      },
      {
        name: 'クンツァイト',
        theme: '慈愛・調和',
        slug: 'kunzite',
      },
    ],
    bonus: '恋愛の四段階、願い別レシピ、なりたい女性像から選ぶミニ診断',
    illustrations: [],
  },
  {
    id: 'chapter-five',
    number: '05',
    title: '奇跡を呼び込む、運命を変える石たち',
    headline: 'まだ見ぬ未来に、幸運の扉を。',
    description:
      'フェナカイト、ハーキマーダイヤモンド、アメトリンを中心に、十四種類の石と強運・願望実現、世界三大ヒーリングストーンを紐解く特集。',
    cover: 'special-stones/05_chapter_miracle.svg',
    width: 1086,
    height: 1448,
    price: 150,
    sellable: false,
    contentSource: 'private-db',
    themes: ['強運・好機', '願望実現・転機', '癒し・問題解決'],
    intro: [
      '何気ない出会いや思いがけない知らせが、人生の新しい扉になることがあります。',
      '強運、願望実現、人生の好転。似ているようで、それぞれ少しずつ違う願い。',
      '三つの主役となる宝石と、さらに七つの幸運ストーン。行き詰まった現状を切り開くカイヤナイト、世界三大ヒーリングストーンから、願いに寄り添う石選びを紐解きます。',
    ],
    preview: [
      {
        name: 'フェナカイト',
        theme: '願望実現・可能性',
        slug: 'phenakite',
      },
      {
        name: 'ハーキマーダイヤモンド',
        theme: '夢・思いがけない好機',
        slug: 'herkimer-diamond',
      },
      {
        name: 'アメトリン',
        theme: '理想の現実化',
        slug: 'ametrine',
      },
      {
        name: 'モルダバイト',
        theme: '人生の転機・変容',
        slug: 'moldavite',
      },
      {
        name: 'リビアングラス',
        theme: '大きな希望・幸運',
        slug: 'libyan-glass',
      },
      {
        name: 'アイオライト',
        theme: '人生の方向性',
        slug: 'iolite',
      },
      {
        name: 'プレシャスオパール',
        theme: '予想外の幸運',
        slug: 'precious-opal',
      },
      {
        name: 'ペリドット',
        theme: '幸運・成長',
        slug: 'peridot',
      },
      {
        name: 'サンストーン',
        theme: '行動・チャンス',
        slug: 'sunstone',
      },
      {
        name: 'ダンビュライト',
        theme: '希望・心の余裕',
        slug: 'danburite',
      },
      {
        name: 'カイヤナイト',
        theme: '問題解決・現実化・突破',
        slug: 'kyanite',
      },
      {
        name: 'スギライト',
        theme: '守護・深い癒し',
        slug: 'sugilite',
      },
      {
        name: 'ラリマー',
        theme: '安らぎ・調和',
        slug: 'larimar',
      },
      {
        name: 'チャロアイト',
        theme: '恐れの克服・変容',
        slug: 'charoite',
      },
    ],
    bonus:
      '幸運の四段階、世界三大ヒーリングストーン、カイヤナイト、願い別レシピと選択式ミニ診断',
    illustrations: [],
  },
]);
export const membershipPrice = 580;
export const chapterById = (id) => specialChapters.find((c) => c.id === id);

const ids = new Set();
for (const c of specialChapters) {
  if (
    ids.has(c.id) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id) ||
    c.price !== 150 ||
    !c.title ||
    !c.intro.length ||
    !c.cover.startsWith('special-stones/') ||
    c.cover.includes('..')
  )
    throw Error('Invalid public chapter metadata');
  ids.add(c.id);
  if (
    new Set(c.illustrations.map((x) => x.key)).size !==
      c.illustrations.length ||
    c.illustrations.some(
      (x) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.key) || !x.heading,
    )
  )
    throw Error('Invalid chapter illustrations');
}
