// PUBLIC metadata only. Never add paid copy, private image bytes, or user data here.
export const premiumCategories = Object.freeze([
  {id:'special-stones',title:'スペシャルストーン',english:'SPECIAL STONES',description:'宝石の物語と、願いに寄り添う石の組み合わせ。',path:'special-stones/',status:'preview'},
  {id:'diagnosis',title:'パーソナル診断',english:'PERSONAL SELECTION',description:'願いや好みに合わせた天然石選定。',path:'diagnosis/',status:'coming-soon'},
  {id:'fortune',title:'占いコンテンツ',english:'FORTUNE & GUIDANCE',description:'自分を見つめるための占い・スピリチュアルな読みもの。',status:'coming-soon'},
]);
export const specialChapters = Object.freeze([
  {id:'chapter-one',number:'01',title:'宝石に秘められた、もうひとつの力',headline:'三つの宝石が教えてくれる、願いの叶え方',description:'サファイア・ルビー・エメラルドの物語。成功、魅力、愛と繁栄を象徴する三つの輝き。',cover:'special-stones/01_chapter_cover.png',width:1086,height:1448,price:150,sellable:true,
    themes:['成功・守護','魅力・情熱','愛・繁栄'],
    intro:['成功を手にしたいとき。','誰かの心に、忘れられない印象を残したいとき。','そして、手にした愛や豊かさを、いつまでも大切に育てたいとき。','もし、それぞれの願いに寄り添う宝石があるとしたら……。','**サファイア、ルビー、エメラルド。**','古くから王族や権力者たちを魅了してきた三つの宝石には、美しさの奥に、それぞれ異なる神秘的な意味が伝えられています。','そして、パワーストーンの世界では、石を単独で選ぶだけでなく、**異なる意味を持つ石を組み合わせること**も大切にされてきました。','成功を象徴する青い宝石に、情熱を象徴する赤い宝石を添えたら？','愛を育てる緑の宝石と、月の神秘を象徴する石を合わせたら？','その組み合わせには、どんな物語が生まれるのでしょうか。','この特別な章では、三つの宝石が秘める象徴と、願望に合わせた組み合わせを紐解いていきます。'],
    preview:[{name:'サファイア',theme:'成功を導く象徴と特別な組み合わせ',slug:'sapphire'},{name:'ルビー',theme:'愛される魅力と情熱の石選び',slug:'ruby'},{name:'エメラルド',theme:'良縁と繁栄を育てる組み合わせ',slug:'emerald'}],
    bonus:'三つの宝石を組み合わせる特別な物語',illustrations:[{key:'sapphire',heading:'サファイア'},{key:'ruby',heading:'ルビー'},{key:'emerald',heading:'エメラルド'}]},
{
  "id": "chapter-two",
  "number": "02",
  "title": "宇宙から届いた、運命を拓く石",
  "headline": "宇宙と地球の出会いを、一粒に。",
  "description": "ギベオン、モルダバイト、リビアングラスを中心に、七つの宇宙ストーンの誕生と神秘を紐解く特集。",
  "cover": "special-stones/02_chapter_starlight.svg",
  "width": 1086,
  "height": 1448,
  "price": 150,
  "sellable": false,
  "contentSource": "private-db",
  "themes": [
    "変容・転機",
    "再生・成長",
    "意志・現実化"
  ],
  "intro": [
    "人生を変えたい。今までの自分では想像できなかった未来へ進みたい。",
    "遠い宇宙から地球へ届いた物質と、宇宙との出会いによって地球上に生まれた天然ガラス。",
    "ギベオン、モルダバイト、リビアングラス。三つの石を中心に、さらに四つの宇宙ストーンの物語をご紹介します。",
    "同じ宇宙系の石でも、誕生の背景や石に重ねられる象徴はそれぞれ異なります。",
    "七つの特別な石から、これからの自分に寄り添う一粒を見つけてみませんか。"
  ],
  "preview": [
    {
      "name": "ギベオン",
      "theme": "鉄隕石",
      "slug": "gibeon"
    },
    {
      "name": "モルダバイト",
      "theme": "テクタイト",
      "slug": "moldavite"
    },
    {
      "name": "リビアングラス",
      "theme": "インパクトガラス",
      "slug": "libyan-glass"
    },
    {
      "name": "ムオニナルスタ",
      "theme": "鉄隕石",
      "slug": "muonionalusta"
    },
    {
      "name": "カンポ・デル・シエロ",
      "theme": "鉄隕石",
      "slug": "campo-del-cielo"
    },
    {
      "name": "セイムチャン",
      "theme": "石鉄隕石",
      "slug": "seymchan"
    },
    {
      "name": "ブラックテクタイト",
      "theme": "テクタイト",
      "slug": "tektite"
    }
  ],
  "bonus": "宇宙の三石チャート、選択式ミニ診断と石選びのヒント",
  "illustrations": []
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
  {
    id: 'chapter-six',
    number: '06',
    title: '見えない邪気を払い、運命を守る石たち',
    headline: '邪を祓い、悪縁を断ち、自分を守る。',
    description:
      'ブラックダイヤモンド、モリオン、オブシディアンを中心に、十四の石と破邪・邪視除け・悪縁切りの伝承を読み解く特集。',
    cover: 'special-stones/06_chapter_protection.svg',
    width: 1086,
    height: 1448,
    price: 150,
    sellable: false,
    contentSource: 'private-db',
    themes: ['魔除け・破邪', '霊的守護・邪視除け', '悪縁切り'],
    intro: [
      '人は古くから、石に大切な人の無事や災いを避けたいという祈りを託してきました。',
      '黒い宝石、目の形の瑪瑙、自然が形づくる十字石。十四の石から、破邪と守護の物語を紐解きます。',
      '悪魔祓い・霊祓いの伝承と現代のお守り文化を区別し、守る・祓う・断つという願いに寄り添う一粒をご紹介します。',
    ],
    preview: [
      {
        name: 'ブラックダイヤモンド',
        theme: '守護・揺るがない意志',
        slug: 'black-diamond',
      },
      {
        name: 'モリオン',
        theme: '破邪・邪気払い',
        slug: 'morion',
      },
      {
        name: 'オブシディアン',
        theme: '悪縁切り・断絶',
        slug: 'obsidian',
      },
      {
        name: 'ブラックトルマリン',
        theme: '邪気除け・防御',
        slug: 'black-tourmaline',
      },
      {
        name: 'エジリン',
        theme: '破邪・境界線',
        slug: 'aegirine',
      },
      {
        name: 'ブラックスギライト',
        theme: '霊的守護・静けさ',
        slug: 'black-sugilite',
      },
      {
        name: 'ジェット',
        theme: '邪視除け・巡礼の祈り',
        slug: 'jet',
      },
      {
        name: 'スタウロライト',
        theme: '十字石・神聖な守護',
        slug: 'staurolite',
      },
      {
        name: 'ペリドット',
        theme: '悪霊除けの伝承',
        slug: 'peridot',
      },
      {
        name: '天眼石',
        theme: '邪視除け・守りの目',
        slug: 'eye-agate',
      },
      {
        name: 'ラピスラズリ',
        theme: '厄除け・護符',
        slug: 'lapis-lazuli',
      },
      {
        name: 'マラカイト',
        theme: '反射・災い除けの象徴',
        slug: 'malachite',
      },
      {
        name: 'オニキス',
        theme: '悪縁切り・決意',
        slug: 'black-onyx',
      },
      {
        name: 'ブラックルチルクォーツ',
        theme: '守護・前進',
        slug: 'black-rutile',
      },
    ],
    bonus:
      '五つの守り方、邪視除けの歴史、願い別レシピ、空間の守護とミニ診断',
    illustrations: [],
  },
  {
    id: 'chapter-seven',
    number: '07',
    title: '水晶に封じられた、天賦の造形美',
    headline: '悠久の歳月が織りなす、比類なき景観。',
    description:
      '内包結晶、幻想的な光、鉱物の共生。二十七の水晶に秘められた造形と象徴を紐解く特集。',
    cover: 'special-stones/07_chapter_quartz_edition2.jpg',
    width: 1086,
    height: 1448,
    price: 150,
    sellable: false,
    contentSource: 'private-db',
    themes: ['希少な水晶', '成長・自己実現', '共生・光彩'],
    intro: [
      '透明なる結晶の深奥には、ときに想像を凌駕する光景が広がります。',
      '群青の花房、黄金の薄片、幾重にも連なる山影。水晶の内部に残された異質な存在こそが、比類なき美しさの源泉です。',
      '二十七の水晶を通して、結晶成長と鉱物の共生、光の妙、そして願いに重ねられる象徴を紐解きます。',
    ],
    preview: [
      {
        name: 'クォーツインクォーツ',
        theme: '自己実現・飛躍',
        slug: 'quartz-in-quartz',
      },
      {
        name: 'エンジェルラダークォーツ',
        theme: '希望・導き',
        slug: 'angel-ladder-quartz',
      },
      {
        name: 'オーロラクォーツ',
        theme: '繁栄・結実',
        slug: 'aurora-quartz',
      },
      {
        name: 'アゲートインクォーツ',
        theme: '再生・対話',
        slug: 'agate-in-quartz',
      },
      {
        name: 'スティブナイトインクォーツ',
        theme: '決断・悪縁切り',
        slug: 'stibnite-in-quartz',
      },
      {
        name: 'ヘマタイトインクォーツ',
        theme: '挑戦・信念',
        slug: 'hematite-in-quartz',
      },
      {
        name: 'ファントムクォーツ',
        theme: '成長・再起',
        slug: 'phantom-quartz',
      },
      {
        name: 'ガーデンクォーツ',
        theme: '蓄積・繁栄',
        slug: 'garden-quartz',
      },
      {
        name: 'デュモルチェライトインクォーツ',
        theme: '研鑽・才能',
        slug: 'dumortierite-in-quartz',
      },
      {
        name: 'アホーアイトインクォーツ',
        theme: '静謐・再生',
        slug: 'ajoite-in-quartz',
      },
      {
        name: 'パパゴアイトインクォーツ',
        theme: '解放・柔軟性',
        slug: 'papagoite-in-quartz',
      },
      {
        name: 'ギラライトインクォーツ',
        theme: '創造性・個性',
        slug: 'gilalite-in-quartz',
      },
      {
        name: 'フローライトインクォーツ',
        theme: '発想・学び',
        slug: 'fluorite-in-quartz',
      },
      {
        name: 'トルマリンインクォーツ',
        theme: '守護・境界線',
        slug: 'tourmaline-in-quartz',
      },
      {
        name: 'パイライトインクォーツ',
        theme: '繁栄・実行',
        slug: 'pyrite-in-quartz',
      },
      {
        name: 'エピドートインクォーツ',
        theme: '変容・成長',
        slug: 'epidote-in-quartz',
      },
      {
        name: 'アクチノライトインクォーツ',
        theme: '安定・意志',
        slug: 'actinolite-in-quartz',
      },
      {
        name: 'レピドクロサイトインクォーツ',
        theme: '情熱・魅力',
        slug: 'lepidocrocite-in-quartz',
      },
      {
        name: 'スーパーセブン',
        theme: '調和・統合',
        slug: 'super-seven',
      },
      {
        name: '水入り水晶（エンハイドロクォーツ）',
        theme: '時間・再生',
        slug: 'enhydro-quartz',
      },
      {
        name: 'ピンクエンジェルラダー',
        theme: '愛情・希望',
        slug: 'pink-angel-ladder',
      },
      {
        name: 'レインボークォーツ',
        theme: '好機・可能性',
        slug: 'rainbow-quartz',
      },
      {
        name: 'ホーランダイトインクォーツ',
        theme: '個性・方向性',
        slug: 'hollandite-in-quartz',
      },
      {
        name: 'トラピッチェクォーツ',
        theme: '秩序・調和',
        slug: 'trapiche-quartz',
      },
      {
        name: 'セプタークォーツ',
        theme: '主体性・意志',
        slug: 'scepter-quartz',
      },
      {
        name: 'エレスチャルクォーツ',
        theme: '変容・統合',
        slug: 'elestial-quartz',
      },
      {
        name: 'スタールチルクォーツ',
        theme: '飛躍・発展',
        slug: 'star-rutilated-quartz',
      },
    ],
    bonus: '内包と共生の違い、願い別レシピ、希少性と真贋、選択式ミニ診断',
    illustrations: [],
  },
]);
export const membershipPrice = 580;
export const chapterById = id => specialChapters.find(c=>c.id===id);

const ids=new Set();
for(const c of specialChapters){
  if(ids.has(c.id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)||c.price!==150||!c.title||!c.intro.length||!c.cover.startsWith('special-stones/')||c.cover.includes('..'))throw Error('Invalid public chapter metadata');
  ids.add(c.id);
  if(new Set(c.illustrations.map(x=>x.key)).size!==c.illustrations.length||c.illustrations.some(x=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.key)||!x.heading))throw Error('Invalid chapter illustrations');
}
