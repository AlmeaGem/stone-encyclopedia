import test from 'node:test';
import assert from 'node:assert/strict';
import { readProductionConfig } from '../src/production-config.mjs';
import { createHandler } from '../src/handler.mjs';
import { processStripeEvent } from '../src/stripe-events.mjs';
import worker from '../src/production-worker.mjs';

const env = {
  SPECIAL_STONES_LIVE_SALES_ENABLED:'true',
  SPECIAL_STONES_FIXED_PRICE_TAX_APPROVED:'true',
  STRIPE_LIVE_SECRET_KEY:'sk_live_fixture',
  STRIPE_LIVE_WEBHOOK_SECRET:'whsec_fixture',
  SUPABASE_LIVE_PROJECT_REF:'livefixture',
  SUPABASE_APPROVED_LIVE_PROJECT_REF:'livefixture',
  SUPABASE_LIVE_URL:'https://livefixture.supabase.co',
  SUPABASE_LIVE_ANON_KEY:'fixture',
  SUPABASE_LIVE_SERVICE_ROLE_KEY:'fixture',
  SPECIAL_STONES_LIVE_ORIGIN:'https://members.example.com',
  SPECIAL_STONES_APPROVED_LIVE_HOST:'members.example.com',
  SPECIAL_STONES_LIVE_RETURN_URL:'https://members.example.com/members/',
  STRIPE_LIVE_SINGLE_PRICE_ID:'price_LiveSingle',
  STRIPE_LIVE_MONTHLY_PRICE_ID:'price_LiveMonthly',
  SUPABASE_LIVE_PRIVATE_BUCKET:'special-stones-live-private'
};
test('production is closed by default and refuses sandbox values', async () => {
  assert.equal((await worker.fetch(new Request('https://members.example.com/'), {})).status,503);
  for (const bad of [
    {SPECIAL_STONES_LIVE_SALES_ENABLED:'false'},
    {SPECIAL_STONES_FIXED_PRICE_TAX_APPROVED:'false'},
    {STRIPE_LIVE_SECRET_KEY:'sk_test_fixture'},
    {SUPABASE_LIVE_PROJECT_REF:'rsjxnobjrrcxlmxxfqlq',SUPABASE_APPROVED_LIVE_PROJECT_REF:'rsjxnobjrrcxlmxxfqlq',SUPABASE_LIVE_URL:'https://rsjxnobjrrcxlmxxfqlq.supabase.co'},
    {STRIPE_LIVE_SINGLE_PRICE_ID:'price_1UdfnmD1dZuoT6Ah5Q9XqBwO'},
    {SUPABASE_LIVE_PRIVATE_BUCKET:'special-stones-test-private'},
    {SPECIAL_STONES_LIVE_ORIGIN:'https://test.workers.dev',SPECIAL_STONES_APPROVED_LIVE_HOST:'test.workers.dev'},
  ]) assert.throws(()=>readProductionConfig({...env,...bad}));
  const config=readProductionConfig(env);
  assert.equal(config.livemode,true);
  assert.equal(config.bucket,'special-stones-live-private');
});
test('live event processing rejects test events and test handler rejects live events', async () => {
  const live=readProductionConfig(env);
  const event={id:'evt_Fixture',livemode:false,type:'customer.subscription.updated'};
  await assert.rejects(processStripeEvent(event,{},live));
  await assert.rejects(processStripeEvent({...event,livemode:true},{},{}));
  assert.equal(await processStripeEvent({...event,livemode:true},{},live),'ignored');
});
test('live checkout checks live price and session, never accepts sandbox objects', async () => {
  const config=readProductionConfig(env);
  let priceLive=true, sessionId='cs_live_Fixture';
  const auth={getUser:async()=>({id:'fixture'})};
  const db={createOrder:async()=>{},bindSession:async()=>{},accountSummary:async()=>({purchased_articles:[],membership_until:null})};
  const stripe={prices:{retrieve:async()=>({livemode:priceLive,active:true,currency:'jpy',unit_amount:150,tax_behavior:'inclusive',recurring:null})},checkout:{sessions:{create:async()=>({livemode:true,id:sessionId,url:'https://checkout.stripe.com/fixture'})}}};
  const handle=createHandler({auth,db,stripe},config);
  const request=()=>handle(new Request('https://members.example.com/api/checkout',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({kind:'single',article_id:'chapter-one'})}));
  assert.equal((await request()).status,200);
  priceLive=false;assert.equal((await request()).status,503);
  priceLive=true;sessionId='cs_test_Fixture';assert.equal((await request()).status,503);
});

test('production member shell is separate from dummy and diagnostic UI', async () => {
 const r=await worker.fetch(new Request('https://members.example.com/members/'),env);
 assert.equal(r.status,200);
 assert.match(r.headers.get('cache-control'),/no-store/);
 const html=await r.text();
 assert.match(html,/購入記事一覧/);
 assert.doesNotMatch(html,/ダミー素材|テスト決済|未ログインで拒否/);
 const js=await worker.fetch(new Request('https://members.example.com/__special-members__/app.js'),env);
 assert.equal(js.status,200);
 const source=await js.text();
 assert.doesNotMatch(source,/innerHTML|localStorage|sessionStorage/);
 assert.doesNotThrow(()=>new Function(source));
});

test('live duplicate checks preserve independent single purchases and monthly rights', async () => {
 const config=readProductionConfig(env);
 let summary={purchased_articles:[],membership_until:new Date(Date.now()+3600000).toISOString()};
 const auth={getUser:async()=>({id:'fixture'})};
 const db={accountSummary:async()=>summary,createOrder:async()=>{},bindSession:async()=>{}};
 const stripe={prices:{retrieve:async()=>({livemode:true,active:true,currency:'jpy',unit_amount:150,tax_behavior:'inclusive',recurring:null})},checkout:{sessions:{create:async()=>({livemode:true,id:'cs_live_Fixture',url:'https://checkout.stripe.com/fixture'})}}};
 const handle=createHandler({auth,db,stripe},config);
 const call=body=>handle(new Request('https://members.example.com/api/checkout',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)}));
 assert.equal((await call({kind:'subscription'})).status,409);
 assert.equal((await call({kind:'single',article_id:'chapter-one'})).status,200);
 summary={...summary,purchased_articles:['chapter-one']};
 assert.equal((await call({kind:'single',article_id:'chapter-one'})).status,409);
});

test('members-only mode requires no Stripe credentials and rejects billing', async () => {
 const e={...env,SPECIAL_STONES_LIVE_MEMBERS_ENABLED:'true',SPECIAL_STONES_LIVE_SALES_ENABLED:'false',SPECIAL_STONES_FIXED_PRICE_TAX_APPROVED:'false'};
 for(const key of ['STRIPE_LIVE_SECRET_KEY','STRIPE_LIVE_WEBHOOK_SECRET','STRIPE_LIVE_SINGLE_PRICE_ID','STRIPE_LIVE_MONTHLY_PRICE_ID'])delete e[key];
 const c=readProductionConfig(e);
 assert.equal(c.salesEnabled,false);assert.equal(c.billingEnabled,false);assert.equal(c.stripeSecret,null);
 const html=await worker.fetch(new Request(c.testReturnUrl),e);assert.equal(html.status,200);
 const js=await worker.fetch(new Request(c.publicOrigin+'/__special-members__/app.js'),e);assert.equal(js.status,200);assert.match(await js.text(),/^const ALMEA_SALES_ENABLED = false;/);
 const handle=createHandler({},c);
 for(const path of ['/api/checkout','/api/stripe/webhook','/api/subscription/cancel'])assert.equal((await handle(new Request(c.publicOrigin+path,{method:'POST'}))).status,503);
 assert.throws(()=>readProductionConfig({...e,SPECIAL_STONES_LIVE_SALES_ENABLED:'true'}));
 assert.throws(()=>readProductionConfig({...e,SUPABASE_LIVE_PROJECT_REF:'rsjxnobjrrcxlmxxfqlq'}));
});
test('existing billing can remain enabled while new checkout is closed', async()=>{
 const c=readProductionConfig({...env,SPECIAL_STONES_LIVE_MEMBERS_ENABLED:'true',SPECIAL_STONES_LIVE_SALES_ENABLED:'false',SPECIAL_STONES_LIVE_BILLING_ENABLED:'true'});
 assert.equal(c.billingEnabled,true);assert.equal(c.salesEnabled,false);
 const h=createHandler({},c);
 assert.equal((await h(new Request(c.publicOrigin+'/api/checkout',{method:'POST'}))).status,503);
 assert.equal((await h(new Request(c.publicOrigin+'/api/subscription/cancel',{method:'POST'}))).status,401);
});

test('live catalog permits no undeclared article purchase or private illustration path', async()=>{
 const config=readProductionConfig(env);
 let downloads=0;
 const auth={getUser:async()=>({id:'fixture'})};
 const db={canView:async()=>true,accountSummary:async()=>({purchased_articles:[],membership_until:null})};
 const h=createHandler({auth,db,storage:{download:async()=>{downloads++;return new Blob(['fixture'])}}},config);
 const headers={Authorization:'Bearer fixture','Content-Type':'application/json'};
 const checkout=await h(new Request(config.publicOrigin+'/api/checkout',{method:'POST',headers,body:JSON.stringify({kind:'single',article_id:'not-in-catalog'})}));
 assert.equal(checkout.status,404);
 assert.equal((await h(new Request(config.publicOrigin+'/api/articles/chapter-one/assets/unknown',{headers}))).status,404);
 assert.equal(downloads,0);
 assert.equal((await h(new Request(config.publicOrigin+'/api/articles/chapter-one/assets/sapphire',{headers}))).status,200);
 assert.equal(downloads,1);
});
