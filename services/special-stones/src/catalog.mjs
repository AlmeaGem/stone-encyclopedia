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
    cover: 'special-stones/03_chapter_cover.svg',
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
]);
export const membershipPrice = 580;
export const chapterById = id => specialChapters.find(c=>c.id===id);

const ids=new Set();
for(const c of specialChapters){
  if(ids.has(c.id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)||c.price!==150||!c.title||!c.intro.length||!c.cover.startsWith('special-stones/')||c.cover.includes('..'))throw Error('Invalid public chapter metadata');
  ids.add(c.id);
  if(new Set(c.illustrations.map(x=>x.key)).size!==c.illustrations.length||c.illustrations.some(x=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.key)||!x.heading))throw Error('Invalid chapter illustrations');
}
