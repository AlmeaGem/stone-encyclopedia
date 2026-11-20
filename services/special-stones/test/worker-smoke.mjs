// Local workerd smoke test. Uses fake credentials, no external API calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import Stripe from 'stripe';

const scriptPath = process.argv[2];
if (!scriptPath) throw new Error('Specify the local dry-run bundle path');
const bindings = {
  SPECIAL_STONES_TEST_ONLY: 'true',
  SPECIAL_STONES_PUBLIC_ORIGIN: 'https://almeagem.github.io',
  SUPABASE_TEST_PRIVATE_BUCKET: 'special-stones-test-private',
  SUPABASE_TEST_URL: 'https://testproject.supabase.co',
  SUPABASE_TEST_PROJECT_REF: 'testproject',
  SUPABASE_TEST_ANON_KEY: 'dummy_anon',
  SUPABASE_TEST_SERVICE_ROLE_KEY: 'dummy_service',
  STRIPE_TEST_SECRET_KEY: 'sk_test_dummy',
  STRIPE_TEST_WEBHOOK_SECRET: 'whsec_dummy',
  STRIPE_TEST_SINGLE_PRICE_ID: 'price_Single',
  STRIPE_TEST_MONTHLY_PRICE_ID: 'price_Monthly',
};
const mf = new Miniflare({
  modules: true,
  script: readFileSync(scriptPath, 'utf8').replace(
    /\/\/# sourceMappingURL=.*$/m,
    '',
  ),
  compatibilityDate: '2026-08-01',
  compatibilityFlags: ['nodejs_compat'],
  bindings,
});
try {
  for (const path of [
    '/api/articles/chapter-one',
    '/api/articles/chapter-one/assets/sapphire',
    '/api/articles/chapter-one/assets/ruby',
    '/api/articles/chapter-one/assets/emerald',
  ]) {
    assert.equal(
      (await mf.dispatchFetch(`https://worker.example${path}`)).status,
      401,
    );
  }
  const payload = JSON.stringify({
    id: 'evt_Dummy',
    type: 'customer.subscription.updated',
    livemode: false,
    data: { object: {} },
  });
  assert.equal(
    (
      await mf.dispatchFetch('https://worker.example/api/stripe/webhook', {
        method: 'POST',
        body: payload,
        headers: { 'Stripe-Signature': 'bad' },
      })
    ).status,
    400,
  );
  const signature = new Stripe(
    'sk_test_dummy',
  ).webhooks.generateTestHeaderString({
    payload,
    secret: bindings.STRIPE_TEST_WEBHOOK_SECRET,
  });
  const valid = await mf.dispatchFetch(
    'https://worker.example/api/stripe/webhook',
    {
      method: 'POST',
      body: payload,
      headers: { 'Stripe-Signature': signature },
    },
  );
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { received: true });
  const blocked = await mf.dispatchFetch(
    'https://worker.example/api/articles/chapter-one',
    { headers: { Origin: 'https://other.example' } },
  );
  assert.equal(blocked.status, 403);
  console.log(
    'Worker smoke: 4 unauthenticated content requests rejected; unsigned webhook rejected; valid signed test event accepted; foreign origin rejected.',
  );
} finally {
  await mf.dispose();
}
