import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { createHandler } from '../src/handler.mjs';
import { readConfig } from '../src/config.mjs';

const config = {
  publicOrigin: 'https://almeagem.github.io',
  singlePrice: 'price_Single',
  monthlyPrice: 'price_Month',
  stripeWebhook: 'whsec_test_fixture',
};
const orderId = '00000000-0000-4000-8000-000000000001';
function fixtures() {
  const state = {
    events: new Set(),
    orders: new Map(),
    grants: [],
    periods: [],
    refunds: new Set(),
    reads: [],
    now: 1700000050,
    accountActions: [],
    published: new Set(['chapter-one']),
  };
  const db = {
    async createOrder(o) {
      state.orders.set(o.id, {
        id: o.id,
        user_id: o.userId,
        article_id: o.articleId,
        kind: o.kind,
        expected_price_id: o.priceId,
        expected_amount: o.amount,
        currency: 'jpy',
        stripe_session_id: null,
      });
    },
    async bindSession(id, s) {
      state.orders.get(id).stripe_session_id = s;
    },
    async getOrder(id) {
      return state.orders.get(id) || null;
    },
    async applyEvent(id, action, data) {
      if (state.events.has(id)) return 'duplicate';
      state.events.add(id);
      if (action === 'refund') {
        state.refunds.add(data.payment_intent_id);
        for (const x of [...state.grants, ...state.periods])
          if (x.pi === data.payment_intent_id) x.revoked = true;
        return 'applied';
      }
      const o = state.orders.get(data.order_id);
      if (!o || !o.stripe_session_id) throw Error('missing order');
      if (
        action === 'single_paid' &&
        !state.grants.some((x) => x.order === o.id)
      )
        state.grants.push({
          order: o.id,
          uid: o.user_id,
          article: o.article_id,
          pi: data.payment_intent_id,
          revoked: state.refunds.has(data.payment_intent_id),
        });
      if (
        action === 'invoice_paid' &&
        !state.periods.some((x) => x.invoice === data.invoice_id)
      )
        state.periods.push({
          uid: o.user_id,
          pi: data.payment_intent_id,
          invoice: data.invoice_id,
          start: data.starts_at,
          end: data.ends_at,
          revoked: state.refunds.has(data.payment_intent_id),
        });
      return 'applied';
    },
    async canView(uid, article) {
      return (
        state.published.has(article) &&
        (state.grants.some(
          (x) => x.uid === uid && x.article === article && !x.revoked,
        ) ||
          state.periods.some(
            (x) =>
              x.uid === uid &&
              !x.revoked &&
              x.start <= state.now &&
              x.end > state.now,
          ))
      );
    },
    async accountSummary() {
      return { purchased_articles: [], membership_until: null };
    },
    async activeSubscription() {
      return null;
    },
  };
  const auth = {
    async getUser(token) {
      if (token === 'alice' || token === 'bob') return { id: token };
      throw Error('bad token');
    },
    async signUp() {
      state.accountActions.push('signup');
      return { session: null };
    },
    async signIn() {
      state.accountActions.push('login');
      return {
        session: {
          access_token: 'alice',
          refresh_token: 'refresh',
          expires_at: 1,
        },
      };
    },
    async refresh() {
      return {
        session: {
          access_token: 'alice',
          refresh_token: 'rotated',
          expires_at: 2,
        },
      };
    },
    async signOut() {
      state.accountActions.push('logout');
    },
  };
  const sdk = new Stripe('sk_test_fixture');
  const records = {
    sessions: new Map(),
    invoices: new Map(),
    subs: new Map(),
    charges: new Map(),
    payments: new Map(),
  };
  const stripe = {
    webhooks: sdk.webhooks,
    prices: {
      async retrieve(id) {
        return {
          livemode: false,
          active: true,
          currency: 'jpy',
          unit_amount: id === config.singlePrice ? 150 : 580,
          tax_behavior: 'inclusive',
          recurring:
            id === config.monthlyPrice
              ? { interval: 'month', interval_count: 1 }
              : null,
        };
      },
    },
    checkout: {
      sessions: {
        async create(opts) {
          const value = {
            id: 'cs_test_Example',
            url: 'https://checkout.stripe.com/test',
            livemode: false,
            opts,
          };
          records.sessions.set(value.id, value);
          return value;
        },
        async retrieve(id) {
          if (!records.sessions.has(id)) throw Error('missing');
          return records.sessions.get(id);
        },
      },
    },
    invoices: {
      async retrieve(id) {
        return records.invoices.get(id);
      },
    },
    subscriptions: {
      async retrieve(id) {
        return records.subs.get(id);
      },
      async update() {
        return {};
      },
    },
    invoicePayments: {
      async list({ invoice }) {
        return records.payments.get(invoice);
      },
    },
    charges: {
      async retrieve(id) {
        return records.charges.get(id);
      },
    },
  };
  const storage = {
    async download(key) {
      state.reads.push(key);
      return new Blob([key], { type: 'application/octet-stream' });
    },
  };
  const handler = createHandler({ auth, db, storage, stripe }, config);
  const request = (
    path,
    { token, method = 'GET', body, signature, origin } = {},
  ) =>
    handler(
      new Request('https://backend.example' + path, {
        method,
        headers: {
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(signature ? { 'Stripe-Signature': signature } : {}),
          ...(origin ? { Origin: origin } : {}),
        },
        ...(body !== undefined
          ? { body: typeof body === 'string' ? body : JSON.stringify(body) }
          : {}),
      }),
    );
  const webhook = async (event) => {
    const payload = JSON.stringify(event);
    const signature = sdk.webhooks.generateTestHeaderString({
      payload,
      secret: config.stripeWebhook,
    });
    return request('/api/stripe/webhook', {
      method: 'POST',
      body: payload,
      signature,
    });
  };
  return { state, db, auth, stripe, records, handler, request, webhook };
}
const event = (id, type, object) => ({
  id,
  type,
  livemode: false,
  data: { object },
});
function singleFixture(f) {
  f.state.orders.set(orderId, {
    id: orderId,
    user_id: 'alice',
    article_id: 'chapter-one',
    kind: 'single',
    stripe_session_id: 'cs_test_One',
    expected_price_id: config.singlePrice,
    expected_amount: 150,
    currency: 'jpy',
  });
  f.records.sessions.set('cs_test_One', {
    id: 'cs_test_One',
    livemode: false,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    client_reference_id: orderId,
    currency: 'jpy',
    amount_total: 150,
    payment_intent: 'pi_One',
    line_items: { data: [{ quantity: 1, price: { id: config.singlePrice } }] },
  });
}
function monthlyFixture(f) {
  f.state.orders.set(orderId, {
    id: orderId,
    user_id: 'alice',
    article_id: null,
    kind: 'subscription',
    stripe_session_id: 'cs_test_Sub',
    expected_price_id: config.monthlyPrice,
    expected_amount: 580,
    currency: 'jpy',
  });
  f.records.sessions.set('cs_test_Sub', {
    id: 'cs_test_Sub',
    livemode: false,
    mode: 'subscription',
    status: 'complete',
    client_reference_id: orderId,
    subscription: 'sub_One',
    line_items: { data: [{ quantity: 1, price: { id: config.monthlyPrice } }] },
  });
  f.records.subs.set('sub_One', {
    id: 'sub_One',
    livemode: false,
    metadata: { order_id: orderId },
  });
  f.records.invoices.set('in_One', {
    id: 'in_One',
    livemode: false,
    status: 'paid',
    currency: 'jpy',
    amount_paid: 580,
    parent: { subscription_details: { subscription: 'sub_One' } },
    lines: {
      data: [
        {
          pricing: { price_details: { price: config.monthlyPrice } },
          period: { start: 1700000000, end: 1700000100 },
        },
      ],
    },
  });
  f.records.payments.set('in_One', {
    has_more: false,
    data: [
      {
        livemode: false,
        status: 'paid',
        amount_paid: 580,
        currency: 'jpy',
        payment: { type: 'payment_intent', payment_intent: 'pi_Month' },
      },
    ],
  });
}

test('configuration is test-only and fails closed for live or missing settings', () => {
  assert.throws(() => readConfig({}), /Test-only/);
  assert.throws(
    () =>
      readConfig({
        SPECIAL_STONES_TEST_ONLY: 'true',
        STRIPE_TEST_SECRET_KEY: 'sk_live_secret',
      }),
    /live/,
  );
});
test('signup, login, refresh, logout use auth adapter and no-store responses', async () => {
  const f = fixtures();
  for (const path of ['signup', 'login']) {
    const r = await f.request('/api/auth/' + path, {
      method: 'POST',
      body: { email: 'person@example.test', password: 'test-password-123' },
    });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('cache-control'), /no-store/);
  }
  assert.equal(
    (
      await f.request('/api/auth/refresh', {
        method: 'POST',
        body: { refresh_token: 'refresh' },
      })
    ).status,
    200,
  );
  assert.equal(
    (await f.request('/api/auth/logout', { method: 'POST', token: 'alice' }))
      .status,
    200,
  );
  assert.deepEqual(f.state.accountActions, ['signup', 'login', 'logout']);
});
test('direct article and all image URLs deny unauthenticated, unpurchased and other users', async () => {
  const f = fixtures();
  for (const p of [
    '/api/articles/chapter-one',
    '/api/articles/chapter-one/assets/sapphire',
    '/api/articles/chapter-one/assets/ruby',
    '/api/articles/chapter-one/assets/emerald',
  ]) {
    assert.equal((await f.request(p)).status, 401);
    assert.equal((await f.request(p, { token: 'alice' })).status, 403);
    assert.equal((await f.request(p, { token: 'bob' })).status, 403);
  }
  assert.equal(f.state.reads.length, 0);
  assert.equal(
    (
      await f.request('/api/articles/chapter-one/assets/../../article.md', {
        token: 'alice',
      })
    ).status,
    404,
  );
});
test('checkout rejects client prices, cross-origin and allows only server test catalog', async () => {
  const f = fixtures();
  assert.equal(
    (
      await f.request('/api/checkout', {
        method: 'POST',
        token: 'alice',
        body: { kind: 'single', article_id: 'chapter-one', amount: 1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request('/api/checkout', {
        method: 'POST',
        token: 'alice',
        origin: 'https://evil.example',
        body: { kind: 'subscription' },
      })
    ).status,
    403,
  );
  const r = await f.request('/api/checkout', {
    method: 'POST',
    token: 'alice',
    body: { kind: 'single', article_id: 'chapter-one' },
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await r.json()).checkout_url,
    'https://checkout.stripe.com/test',
  );
  assert.equal([...f.state.orders.values()][0].expected_amount, 150);
});
test('valid signed single checkout grants only purchaser; duplicate and refund revoke', async () => {
  const f = fixtures();
  singleFixture(f);
  const e = event('evt_One', 'checkout.session.completed', {
    id: 'cs_test_One',
  });
  assert.equal((await f.webhook(e)).status, 200);
  assert.equal((await f.webhook(e)).status, 200);
  assert.equal(f.state.grants.length, 1);
  for (const p of [
    '/api/articles/chapter-one',
    '/api/articles/chapter-one/assets/sapphire',
  ]) {
    const r = await f.request(p, { token: 'alice' });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('cache-control'), /no-store/);
    assert.equal((await f.request(p, { token: 'bob' })).status, 403);
  }
  f.records.charges.set('ch_One', {
    livemode: false,
    amount_refunded: 150,
    payment_intent: 'pi_One',
  });
  assert.equal(
    (await f.webhook(event('evt_Refund', 'charge.refunded', { id: 'ch_One' })))
      .status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    403,
  );
});
test('refund before paid event prevents later grant; unsigned and live webhooks rejected', async () => {
  const f = fixtures();
  singleFixture(f);
  f.records.charges.set('ch_One', {
    livemode: false,
    amount_refunded: 150,
    payment_intent: 'pi_One',
  });
  assert.equal(
    (await f.webhook(event('evt_First', 'charge.refunded', { id: 'ch_One' })))
      .status,
    200,
  );
  assert.equal(
    (
      await f.webhook(
        event('evt_Later', 'checkout.session.completed', { id: 'cs_test_One' }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    403,
  );
  assert.equal(
    (
      await f.request('/api/stripe/webhook', {
        method: 'POST',
        body: '{}',
        signature: 'bad',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.webhook({
        ...event('evt_Live', 'charge.refunded', { id: 'ch_One' }),
        livemode: true,
      })
    ).status,
    400,
  );
});
test('wrong price or return URL cannot create entitlement', async () => {
  const f = fixtures();
  singleFixture(f);
  f.records.sessions.get('cs_test_One').amount_total = 1;
  assert.equal(
    (
      await f.webhook(
        event('evt_Wrong', 'checkout.session.completed', { id: 'cs_test_One' }),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await f.request('/api/articles/chapter-one?checkout=return', {
        token: 'alice',
      })
    ).status,
    403,
  );
  assert.equal(f.state.grants.length, 0);
});
test('paid subscription works until end, survives scheduled cancellation, expires, and refunds revoke', async () => {
  const f = fixtures();
  monthlyFixture(f);
  assert.equal(
    (await f.webhook(event('evt_Invoice', 'invoice.paid', { id: 'in_One' })))
      .status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    200,
  );
  assert.equal(
    (
      await f.webhook(
        event('evt_Cancel', 'customer.subscription.deleted', { id: 'sub_One' }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await f.webhook(
        event('evt_Failed', 'invoice.payment_failed', { id: 'in_One' }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    200,
  );
  f.state.now = 1700000100;
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    403,
  );
  f.state.now = 1700000050;
  f.records.charges.set('ch_Month', {
    livemode: false,
    amount_refunded: 580,
    payment_intent: 'pi_Month',
  });
  assert.equal(
    (
      await f.webhook(
        event('evt_SubRefund', 'charge.refunded', { id: 'ch_Month' }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    403,
  );
});
test('single grant remains after a separate subscription expires or is refunded', async () => {
  const f = fixtures();
  f.state.grants.push({
    uid: 'alice',
    article: 'chapter-one',
    pi: 'pi_Single',
    revoked: false,
  });
  f.state.periods.push({
    uid: 'alice',
    pi: 'pi_Month',
    start: 1,
    end: 2,
    revoked: true,
  });
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    200,
  );
});
test('subscription checkout completion does not grant access without paid invoice', async () => {
  const f = fixtures();
  monthlyFixture(f);
  assert.equal(
    (
      await f.webhook(
        event('evt_Session', 'checkout.session.completed', {
          id: 'cs_test_Sub',
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    403,
  );
});

test('cancellation updates only the verified owner subscription and leaves paid access intact', async () => {
  const f = fixtures();
  monthlyFixture(f);
  await f.webhook(event('evt_InvoiceCancel', 'invoice.paid', { id: 'in_One' }));
  f.db.activeSubscription = async (uid) =>
    uid === 'alice'
      ? {
          subscription_id: 'sub_One',
          order_id: orderId,
          session_id: 'cs_test_Sub',
        }
      : null;
  const updates = [];
  f.stripe.subscriptions.update = async (id, opts) => {
    updates.push({ id, opts });
  };
  assert.equal(
    (
      await f.request('/api/subscription/cancel', {
        method: 'POST',
        token: 'bob',
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await f.request('/api/subscription/cancel', {
        method: 'POST',
        token: 'alice',
      })
    ).status,
    200,
  );
  assert.deepEqual(updates, [
    { id: 'sub_One', opts: { cancel_at_period_end: true } },
  ]);
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    200,
  );
  f.records.subs.get('sub_One').metadata.order_id = 'other';
  assert.equal(
    (
      await f.request('/api/subscription/cancel', {
        method: 'POST',
        token: 'alice',
      })
    ).status,
    503,
  );
  assert.equal(updates.length, 1);
});

test('database errors fail closed without reading any private object', async () => {
  const f = fixtures();
  f.db.canView = async () => {
    throw new Error('unavailable');
  };
  for (const path of [
    '/api/articles/chapter-one',
    '/api/articles/chapter-one/assets/sapphire',
    '/api/articles/chapter-one/assets/ruby',
    '/api/articles/chapter-one/assets/emerald',
  ]) {
    assert.equal((await f.request(path, { token: 'alice' })).status, 503);
  }
  assert.equal(f.state.reads.length, 0);
});

test('a partial refund currently revokes the entire associated purchase', async () => {
  const f = fixtures();
  singleFixture(f);
  await f.webhook(
    event('evt_PartialPurchase', 'checkout.session.completed', {
      id: 'cs_test_One',
    }),
  );
  f.records.charges.set('ch_Partial', {
    livemode: false,
    amount_refunded: 1,
    payment_intent: 'pi_One',
  });
  assert.equal(
    (
      await f.webhook(
        event('evt_PartialRefund', 'charge.refunded', { id: 'ch_Partial' }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    403,
  );
});

test('active monthly access includes future published articles without per-article grants', async () => {
  const f = fixtures();
  monthlyFixture(f);
  await f.webhook(event('evt_FutureInvoice', 'invoice.paid', { id: 'in_One' }));
  assert.equal(
    (await f.request('/api/articles/chapter-two', { token: 'alice' })).status,
    403,
  );
  f.state.published.add('chapter-two');
  assert.equal(
    (await f.request('/api/articles/chapter-two', { token: 'alice' })).status,
    200,
  );
  assert.equal(
    (
      await f.request('/api/articles/chapter-two/assets/gem', {
        token: 'alice',
      })
    ).status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-two', { token: 'bob' })).status,
    403,
  );
  assert.equal(f.state.grants.length, 0);
  f.state.now = 1700000100;
  assert.equal(
    (await f.request('/api/articles/chapter-two', { token: 'alice' })).status,
    403,
  );
});

test('a single purchase only grants its own published article', async () => {
  const f = fixtures();
  f.state.published.add('chapter-two');
  singleFixture(f);
  await f.webhook(
    event('evt_IsolatedPurchase', 'checkout.session.completed', {
      id: 'cs_test_One',
    }),
  );
  assert.equal(
    (await f.request('/api/articles/chapter-one', { token: 'alice' })).status,
    200,
  );
  assert.equal(
    (await f.request('/api/articles/chapter-two', { token: 'alice' })).status,
    403,
  );
  const checkout = await f.request('/api/checkout', {
    method: 'POST',
    token: 'alice',
    body: { kind: 'single', article_id: 'chapter-two' },
  });
  assert.equal(checkout.status, 200);
  assert.ok(
    [...f.state.orders.values()].some((o) => o.article_id === 'chapter-two'),
  );
});
