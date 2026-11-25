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
  const db={createOrder:async()=>{},bindSession:async()=>{}};
  const stripe={prices:{retrieve:async()=>({livemode:priceLive,active:true,currency:'jpy',unit_amount:150,tax_behavior:'inclusive',recurring:null})},checkout:{sessions:{create:async()=>({livemode:true,id:sessionId,url:'https://checkout.stripe.com/fixture'})}}};
  const handle=createHandler({auth,db,stripe},config);
  const request=()=>handle(new Request('https://members.example.com/api/checkout',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({kind:'single',article_id:'chapter-one'})}));
  assert.equal((await request()).status,200);
  priceLive=false;assert.equal((await request()).status,503);
  priceLive=true;sessionId='cs_test_Fixture';assert.equal((await request()).status,503);
});
