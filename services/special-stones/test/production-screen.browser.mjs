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
  if(req.headers().authorization!=='Bearer fixture'||!signed)return json(401,{});
  if(url.pathname==='/api/auth/logout'){signed=false;return json(200,{});}
  if(url.pathname==='/api/account')return json(200,{purchased_articles:purchased?['chapter-one']:[],available_articles:['chapter-one'],membership_until:active?'2099-12-31T00:00:00Z':null});
  if(url.pathname==='/api/checkout'){checkoutKind=req.postDataJSON().kind;return json(200,{checkout_url:'https://checkout.stripe.com/fake'});}
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
 console.log('Production browser: login, checkout return, library, safe reader, PC/mobile and logout passed.');
}finally{await browser.close();}
