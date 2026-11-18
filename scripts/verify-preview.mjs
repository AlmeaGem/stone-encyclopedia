import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base='https://almeagem.github.io/stone-encyclopedia/';
const stones=[{"name": "アルマンディン", "slug": "almandine", "story": "深い葡萄酒色の奥には、幾つもの季節を越えて守られてきた約束が眠るよう。時を重ねるほどに深まる輝きは、簡単には消えない愛と、未来への誓いを思わせます。", "pairings": ["ガーネット", "スモーキークォーツ", "ルビー"]}, {"name": "キュープライト", "slug": "cuprite", "story": "まるで夜の闇に隠された深紅の宝石。光が差し込む瞬間、その奥に眠っていた秘密が静かに姿を現します。", "pairings": ["カーネリアン", "ガーネット", "ブラックオニキス"]}, {"name": "ユーディアライト", "slug": "eudialyte", "story": "その複雑な模様は、夜の世界に描かれた秘密の紋章のよう。誰にも知られていなかった願いが、運命の扉を開く鍵へと変わっていく物語を感じさせます。", "pairings": ["ルベライト", "ラブラドライト", "ブラックオニキス"]}, {"name": "トパーズ", "slug": "topaz", "story": "朝の空の青、陽だまりの金、夕映えの淡い紅。一粒ごとに異なる色は、これから出会う未来にいくつもの扉があることを思わせます。", "pairings": ["モルガナイト", "インペリアルトパーズ", "ブルートパーズ"]}, {"name": "インペリアルトパーズ", "slug": "imperial-topaz", "story": "黄金の光がゆっくりと夕陽の色に染まるような、気高いきらめき。その一粒に、自分の物語を堂々と歩む姿が映るかのようです。", "pairings": ["シトリン", "ルベライト", "ゴールデンルチルクォーツ"]}, {"name": "クリソプレーズ", "slug": "chrysoprase", "story": "柔らかな青緑の奥には、まだ誰も足を踏み入れていない秘密の庭が広がるよう。そこには、新しい出会いや思いがけない幸運が、静かに訪れる予感が漂います。", "pairings": ["エメラルド", "ムーンストーン", "ローズクォーツ"]}, {"name": "グリーンフローライト", "slug": "green-fluorite", "story": "若葉を透かす光のような緑は、閉ざしていた窓を開けた朝を思わせます。新しい風とともに、まだ知らない出会いや学びが部屋へ舞い込むようです。", "pairings": ["アベンチュリン", "ムーンストーン", "ロッククリスタル"]}, {"name": "ブルーカルセドニー", "slug": "blue-chalcedony", "story": "白い霧の向こうに海が静かに広がるような青。その柔らかな光は、途切れてしまった会話にも、もう一度言葉を渡せる朝を思わせます。", "pairings": ["ローズクォーツ", "パール", "アクアマリン"]}, {"name": "ピンクカルセドニー", "slug": "pink-chalcedony", "story": "淡い桃色を眺めていると、春の日に交わした何気ない笑顔がよみがえるよう。大切な人と過ごす時間を、一枚ずつ花びらに閉じ込めたかのような石です。", "pairings": ["ピンクトルマリン", "ローズクォーツ", "ムーンストーン"]}, {"name": "セレスタイト", "slug": "celestite", "story": "小さな結晶が集まる青は、夜明け前の空に星の光が残るひとときのよう。そっと眺めれば、遠い天へ向けた祈りが静かに広がっていくようです。", "pairings": ["アンハイドライト", "ムーンストーン", "ロッククリスタル"]}];
const b=await chromium.launch({headless:true});const results=[];await mkdir('test-results/live-preview',{recursive:true});
try {
 for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await b.newPage({viewport:{width,height},isMobile:device==='mobile'});
  for(const stone of stones){
   const response=await page.goto(base+'stones/'+stone.slug+'/',{waitUntil:'networkidle'});if(!response||response.status()!==200)throw Error(stone.slug+' HTTP '+response?.status());
   if((await page.locator('h1').innerText())!==stone.name)throw Error(stone.slug+' wrong title');
   const present=await page.locator('#story').innerText().then(t=>t.replace(/\s/g,'').includes(stone.story.replace(/\s/g,'')));
   const images=await page.locator('main img').count();if(!images)throw Error(stone.slug+' no image');
   await page.locator('main img').first().scrollIntoViewIfNeeded();await page.waitForTimeout(150);
   if(!await page.locator('main img').first().evaluate(i=>i.complete&&i.naturalWidth>0))throw Error(stone.slug+' image not loaded');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(stone.slug+' overflow');
   for(const name of stone.pairings){const a=page.locator('#pairing a').filter({hasText:name});if(await a.count()!==1)throw Error(stone.slug+' pair '+name);const href=await a.getAttribute('href');const r=await page.request.get(new URL(href,base).href);if(!r.ok())throw Error(stone.slug+' pair link '+href);}
   const nav=page.locator('nav[aria-label="石のページ移動"] a');if(!(await nav.count()))throw Error(stone.slug+' missing navigation');
   for(const href of await nav.evaluateAll(as=>as.map(a=>a.href))){const r=await page.request.get(href);if(!r.ok())throw Error(stone.slug+' nav link '+href);}
   await page.screenshot({path:`test-results/live-preview/${device}-${stone.slug}.png`,fullPage:true});
   await page.goto(base+'stones/',{waitUntil:'networkidle'});const search=page.getByRole('searchbox',{name:'石名・英語名・別名'});await search.fill(stone.name);await page.waitForTimeout(400);if(!await page.locator('[data-stone]:visible').filter({hasText:stone.name}).count())throw Error(stone.slug+' search');
   results.push({device,slug:stone.slug,addition:present,image:'ok',pairings:'ok',navigation:'ok',search:'ok'});
  }
  await page.close();
 }
 const counts=results.filter(x=>x.addition).length;if(counts!==0&&counts!==20)throw Error('partial additions: '+counts+'/20');
 await writeFile('test-results/live-preview/results.json',JSON.stringify(results,null,2));console.log('LIVE_RESULTS '+JSON.stringify({additionChecks:counts,total:results.length,results}));
} finally {await b.close()}
