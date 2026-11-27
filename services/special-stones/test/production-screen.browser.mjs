import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { productionHtml, productionScript } from '../src/production-screen.mjs';
import { specialChapters } from '../src/catalog.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_CHROMIUM_PATH||undefined});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 let salesEnabled=true, signed=false, purchased=false, pending=0, active=false, loginCount=0, checkoutKind='';
 const origin='https://almeagem.com';
 await page.route('**/*',async route=>{
  const req=route.request(), url=new URL(req.url());
  const json=(status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.origin==='https://checkout.stripe.com')return route.fulfill({status:200,body:'Mock checkout'});
  if(url.origin!==origin)return route.abort();
  if(url.pathname==='/members/')return route.fulfill({status:200,contentType:'text/html',body:productionHtml});
  if(url.pathname==='/__special-members__/app.js')return route.fulfill({status:200,contentType:'text/javascript',body:'const ALMEA_SALES_ENABLED = '+JSON.stringify(salesEnabled)+';\nconst ALMEA_CHAPTERS = '+JSON.stringify(specialChapters)+';\n'+productionScript});
  if(url.pathname==='/api/auth/login'){signed=true;loginCount++;return json(200,{access_token:'fixture',email:'user@example.test'});}
  if(url.pathname==='/api/auth/restore')return signed?json(200,{access_token:'fixture',email:'user@example.test'}):json(401,{});
  if(url.pathname==='/special-stones/05_chapter_miracle.svg')return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1086" height="1448"><rect width="100%" height="100%" fill="#e5d9f0"/></svg>'});
  if(req.headers().authorization!=='Bearer fixture'||!signed)return json(401,{});
  if(url.pathname==='/api/auth/logout'){signed=false;return json(200,{});}
  if(url.pathname==='/api/account')return json(200,{purchased_articles:purchased?['chapter-one']:[],available_articles:['chapter-one'],membership_until:active?'2099-12-31T00:00:00Z':null});
  if(url.pathname==='/api/checkout'){checkoutKind=req.postDataJSON().kind;return json(200,{checkout_url:'https://checkout.stripe.com/fake'});}
  if(url.pathname==='/api/articles/chapter-five'){
   if(!active)return json(403,{});
   return route.fulfill({status:200,contentType:'text/markdown',body:'# 第五章テスト\n## PROLOGUE｜テスト\n## HEALING & RESET｜世界三大ヒーリングストーン\n:::triangle\nスギライト|守る|安心\nラリマー|ほどく|余白\nチャロアイト|変容|希望\n心の土台|三つの関係\n:::\n## THE MIRACLE TRINITY｜願い\n:::triangle\nフェナカイト|願い|意志\nハーキマーダイヤモンド|可能性|好機\nアメトリン|現実化|行動\n未来への鍵|描く・開く・育てる\n:::\n:::pair\nフェナカイト × ハーキマーダイヤモンド × アメトリン|組み合わせテスト|本文|扱い方\n:::\n## ミニ診断｜テスト\n:::choice\n未来を描きたい|ハーキマーダイヤモンド × アメトリン|診断結果テスト\n:::\n## 保存版｜比較\n| 石 | 願い | 象徴 |\n|---|---|---|\n| ハーキマーダイヤモンド | 好機 | 可能性 |\n## EPILOGUE｜テスト\n完了\n### 鉱物学・宝石学の参考資料\n非表示テスト'});
  }
  if(url.pathname==='/api/articles/chapter-one'){
   if(pending>0){pending--;return json(403,{});}
   if(!purchased&&!active)return json(403,{});
   return route.fulfill({status:200,contentType:'text/markdown',body:'# 見出し\n## サファイア\n**安全な文章**\n\n| 願い | 象徴 |\n|---|---|\n| 恋愛 | 信頼 |\n\n<img src=x onerror="window.xss=true">\n## ルビー\n## エメラルド'});
  }
  if(url.pathname.startsWith('/api/articles/chapter-one/assets/'))return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
  return json(404,{});
 });
 await page.goto(origin+'/members/');
 await page.locator('#auth-section').waitFor();
 assert.equal(await page.locator('#member-nav').isVisible(),false);
 await page.locator('#email').fill('user@example.test');await page.locator('#password').fill('Test1234');await page.locator('#login').click();
 await page.locator('#member-nav').waitFor();
 await page.getByText('お好きなプランをお選びください。',{exact:true}).waitFor();
 await page.locator('#single').click();await page.waitForURL('https://checkout.stripe.com/fake');assert.equal(checkoutKind,'single');
 purchased=true;pending=1;
 await page.goto(origin+'/members/?checkout=return&article=chapter-one');
 await page.locator('#reader-section').waitFor();assert.equal(loginCount,1);
 assert.equal(await page.locator('#reader-copy img').count(),3);
 assert.equal(await page.locator('#reader-copy strong').textContent(),'安全な文章');
 assert.equal(await page.locator('#reader-copy table td').count(),2);
 assert.equal(await page.locator('#reader-toc a').count(),3);
 assert.equal(await page.evaluate(()=>window.xss===true),false);
 await page.locator('#nav-library').click();await page.getByText('単品購入済み・期限なし',{exact:true}).waitFor();
 await page.getByRole('link',{name:'記事を読む',exact:true}).click();await page.locator('#reader-section').waitFor();
 assert.equal(loginCount,1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.setViewportSize({width:1440,height:900});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#nav-store').click();await page.locator('#read-owned').waitFor();
 assert.equal(await page.locator('#single').isDisabled(),true);
 await page.locator('#monthly').click();await page.waitForURL('https://checkout.stripe.com/fake');assert.equal(checkoutKind,'subscription');
 active=true;
 await page.goto(origin+'/members/?checkout=return&article=chapter-one');await page.locator('#reader-section').waitFor();assert.equal(loginCount,1);
 await page.locator('#nav-account').click();await page.locator('#cancel-subscription').waitFor();
 await page.locator('#logout').click();await page.locator('#auth-section').waitFor();assert.equal(await page.locator('#member-nav').isVisible(),false);
 salesEnabled=false;
 await page.goto(origin+'/members/');await page.getByText('販売開始準備中です。会員登録・ログインはご利用いただけます。',{exact:true}).waitFor();
 await page.locator('#email').fill('user@example.test');await page.locator('#password').fill('Test1234');await page.locator('#login').click();await page.locator('#member-nav').waitFor();
 assert.equal(await page.locator('#single').isDisabled(),true);assert.equal(await page.locator('#monthly').isDisabled(),true);
 await page.goto(origin+'/members/?view=reader&article=chapter-five');
 await page.locator('#reader-section.miracle-reader').waitFor();
 assert.equal(await page.locator('#reader-copy .supp-triangle').count(),2);
 for(const chart of await page.locator('#reader-copy .supp-triangle').all())assert.equal(await chart.locator('.supp-gem-svg').count(),3);
 assert.equal(await page.locator('#reader-copy .supp-pair-gems .supp-gem-svg').count(),3);
 assert.equal(await page.locator('#reader-copy').getByText('非表示テスト').count(),0);
 assert.equal(await page.locator('#reader-toc').getByText('鉱物学・宝石学の参考資料').count(),0);
 assert.match(await page.locator('#reader-cover img').getAttribute('src'),/05_chapter_miracle\.svg\?v=/);
 assert.equal(await page.locator('#reader-copy table th').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(118, 91, 140)');
 await page.locator('#reader-copy .supp-choice-button').first().click();
 assert.equal(await page.locator('#reader-copy .supp-result .supp-gem-svg').count(),2);
 assert.equal(await page.locator('#reader-copy .supp-result').isVisible(),true);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 console.log('Chapter V: lavender table, refreshed cover, six triangle icons, pair and diagnosis icons, reference filtering, mobile/desktop overflow passed.');
 console.log('Production browser: login, checkout return, library, safe reader, PC/mobile and logout passed.');
}finally{await browser.close();}
