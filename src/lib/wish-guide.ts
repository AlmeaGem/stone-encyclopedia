/** Editorial interpretations of the eleven supplied reference pages.
 * Stone identifiers remain internal; absent varieties are not treated as confirmed matches. */
export type WishGuideStone = { name: string; id?: string; meaning: string };
export type WishGuide = { title: string; category: string; introduction: string; stones: WishGuideStone[] };
export const wishGuides: WishGuide[] = [
 {title:'金運',category:'prosperity',introduction:'金色の輝きを、豊かさや仕事に向き合う気持ちの象徴として楽しみます。',stones:[
  {name:'ルチルクォーツ',id:'s064',meaning:'金色の針を含む姿から、豊かさや活力、組み合わせる石の魅力を引き立てる象徴として親しまれています。'},
  {name:'パイライト',id:'s062',meaning:'金属のような輝きから、蓄えや豊かさ、災いから身を守るお守りに結び付けられています。'},
  {name:'シトリン',id:'s048',meaning:'黄金色は希望や豊かさの象徴。仕事に向き合うときや、気持ちを明るく整えたいときのお守りとして親しまれます。'}]},
 {title:'恋愛運',category:'love',introduction:'出会いや変化を願う気持ちと、自分や相手を大切にする思いに寄り添う石を紹介します。',stones:[
  {name:'ロードクロサイト',id:'s108',meaning:'華やかな色から、恋愛や出会い、情熱や豊かな感情を象徴する石として親しまれています。'},
  {name:'ピンクオパール',id:'s150',meaning:'キューピッドストーンとも呼ばれ、出会いや関係の変化、新しいときめきを象徴します。'},
  {name:'ローズクォーツ',id:'s107',meaning:'淡いピンクは愛情や優しさの象徴。自分らしい魅力や穏やかな関係を大切にしたいときに選ばれます。'}]},
 {title:'結婚運',category:'love',introduction:'互いを知り、思いやりや信頼を育てる関係を象徴する石です。',stones:[
  {name:'アクアマリン',id:'s110',meaning:'穏やかな青から、対話やパートナーとのつながり、家族の絆を象徴する石として親しまれています。'},
  {name:'ムーンストーン',id:'s063',meaning:'乳白色の光が美しく、信じ合う気持ちや二人の結びつきを象徴すると伝えられます。'},
  {name:'モルガナイト',id:'s206',meaning:'ピーチ色からピンクへの色合いに、愛情や互いを思いやる心を重ねて楽しめます。'}]},
 {title:'妊娠・出産',category:'home',introduction:'新しい命や家族を迎える願いに寄り添う、お守りとしての象徴を紹介します。',stones:[
  {name:'ブラッドストーン',id:'s041',meaning:'緑に赤い模様が見られる姿から、生命や新しい始まりの象徴として語られます。'},
  {name:'オレンジムーンストーン',meaning:'資料では、月の結びつきとオレンジ色の活力を、新しい命を迎える願いに重ねています。'},
  {name:'マザーオブパール',id:'s175',meaning:'真珠を包む貝殻に、母のように温かく守るイメージや家族への願いが重ねられます。'}]},
 {title:'健康運',category:'wellbeing',introduction:'健やかな日々や休息を大切にする気持ちに添える、お守りとしての紹介です。',stones:[
  {name:'ブラックスピネル',meaning:'資料では、黒い輝きに活力や日々のバランスを大切にする意味が重ねられています。'},
  {name:'ガーネット',id:'s028',meaning:'深い赤色から、生命力や活力を象徴する石として親しまれています。'},
  {name:'プレナイト',id:'s096',meaning:'みずみずしい淡い色に、健やかさや自分の意志を大切にする思いが重ねられます。'}]},
 {title:'人間関係',category:'relationships',introduction:'対話や心地よい距離、新しいつながりを考えるための象徴として親しまれています。',stones:[
  {name:'アメジスト',id:'s134',meaning:'紫色の水晶。落ち着いた気持ちで相手を理解し、関係を見つめる象徴として親しまれます。'},
  {name:'ブルーレースアゲート',id:'s124',meaning:'フレンドリーストーンとも呼ばれ、人との縁や穏やかな対話を象徴するとされます。'},
  {name:'シーブルーカルセドニー',id:'s116',meaning:'海を思わせる青に、穏やかな交流や人と人とのつながりのイメージが重ねられます。'}]},
 {title:'厄除け',category:'protection',introduction:'日々の安心や自分の境界線を大切にするお守りとして親しまれる石です。',stones:[
  {name:'オニキス',id:'s015',meaning:'黒い色から、身を守るお守りや、落ち着いて自分を保つ象徴として親しまれています。'},
  {name:'ラピスラズリ',id:'s132',meaning:'深い青に、古くからお守りや精神性を大切にする象徴が重ねられてきました。'},
  {name:'マラカイト',id:'s103',meaning:'鮮やかな緑の縞模様に、周囲の影響から距離を置き、自分を保つお守りの意味が結び付けられます。'}]},
 {title:'ヒーリング',category:'wellbeing',introduction:'自然の色を眺めながら、休息や穏やかな時間を大切にするための象徴です。',stones:[
  {name:'アベンチュリン',id:'s069',meaning:'森林を思わせる緑から、休息や落ち着きを象徴する石として親しまれています。'},
  {name:'ラリマー',id:'s126',meaning:'カリブ海を思わせる青い模様に、穏やかさや休息のイメージが重ねられます。'},
  {name:'フローライト',id:'s097',meaning:'透明感のある色合いから、気持ちを整理し、静かな時間を持つ象徴として親しまれます。'}]},
 {title:'トラウマの解消',category:'protection',introduction:'つらい経験を抱えるとき、無理に前向きになるのではなく、自分のペースを大切にするための象徴として親しまれています。',stones:[
  {name:'クリスタルクォーツ',id:'s187',meaning:'透明な水晶。資料では、過去の出来事を振り返り、新たな一歩を考える象徴とされています。'},
  {name:'ガーデンクォーツ',id:'s073',meaning:'苔や庭園のような内包物から、自然や過去を包み込むイメージが重ねられます。'},
  {name:'クンツァイト',id:'s077',meaning:'透明感のあるピンク色に、愛情や自分の感情をいたわる意味が結び付けられています。'}]},
 {title:'自信をつける',category:'wellbeing',introduction:'周りと比べず、自分の力や可能性を見つめるためのお守りとして親しまれています。',stones:[
  {name:'アマゾナイト',id:'s070',meaning:'明るい緑に、自分のペースや希望、自信を大切にする意味が重ねられます。'},
  {name:'スモーキークォーツ',id:'s008',meaning:'落ち着いた茶色に、不安と向き合い、持っている力を見つめる象徴が結び付けられます。'},
  {name:'ラブラドライト',id:'s133',meaning:'灰色の中に現れる青い光から、落ち着きや自分の可能性を意識する象徴として親しまれます。'}]},
 {title:'目標達成',category:'prosperity',introduction:'努力を重ねる気持ちや、変化を見つめる姿勢を象徴する石です。',stones:[
  {name:'ジェダイト',id:'s080',meaning:'翡翠として親しまれ、繁栄や成功、成長を願うお守りの象徴とされてきました。'},
  {name:'サンストーン',id:'s047',meaning:'きらめく内包物から太陽を連想させ、リーダーシップや新しい流れの象徴とされます。'},
  {name:'タイガーアイ',id:'s057',meaning:'虎の目のような光に、洞察や行動、仕事に向き合う気持ちの象徴が重ねられています。'}]},
];
export const guidesForCategory = (category: string) => wishGuides.filter((guide) => guide.category === category);
export const guidesForStone = (id: string) => wishGuides.flatMap((guide) => guide.stones.filter((stone) => stone.id === id).map((stone) => ({title:guide.title, category:guide.category, meaning:stone.meaning})));
