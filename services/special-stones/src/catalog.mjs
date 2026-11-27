// PUBLIC metadata only. Never add paid copy, private image bytes, or user data here.
export const premiumCategories = Object.freeze([
  {id:'special-stones',title:'スペシャルストーン',english:'SPECIAL STONES',description:'組み合わせたら最強かも？！\nまだ知られていない神秘的な石の組み合わせや、希少なスペシャルストーン。\n石好きなら絶対に知っておきたい宝石の秘話、願いに合わせた石選びまで。\n知れば知るほど、手に入れたくなる石の世界へ',path:'special-stones/',status:'preview'},
  {id:'diagnosis',title:'パーソナル診断',english:'PERSONAL SELECTION',description:'今のあなたに、本当に必要な石は？\n恋愛、金運、仕事、願望実現…。あなたの願いや悩み、好みに合わせて天然石7種類を厳選。\nおすすめの優先順位から、相性の良い組み合わせ3案、購入時に見るべき品質まで。\n石選びにもう迷わない、あなただけの天然石選定レポート\n790円（税込・買い切り）',path:'diagnosis/',status:'coming-soon'},
  {id:'fortune',title:'占い/四柱推命',english:'FORTUNE & GUIDANCE',description:'どこよりも詳しい四柱推命レポート\n対面鑑定以上の深い内容にしております！圧巻の情報量\n\n自分に合う仕事は？お子さまの才能や特性は？\n命式から読み解く強みや注意点、気をつけたいことへの具体的な対策まで。\n人生計画や相性占いも、これ一つで♡',status:'coming-soon'},
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
]);
export const membershipPrice = 580;
export const chapterById = id => specialChapters.find(c=>c.id===id);

const ids=new Set();
for(const c of specialChapters){
  if(ids.has(c.id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)||c.price!==150||!c.title||!c.intro.length||!c.cover.startsWith('special-stones/')||c.cover.includes('..'))throw Error('Invalid public chapter metadata');
  ids.add(c.id);
  if(new Set(c.illustrations.map(x=>x.key)).size!==c.illustrations.length||c.illustrations.some(x=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.key)||!x.heading))throw Error('Invalid chapter illustrations');
}
