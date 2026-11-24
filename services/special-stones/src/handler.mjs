import { randomUUID } from 'node:crypto';
import { processStripeEvent } from './stripe-events.mjs';
const MAX_BODY = 64 * 1024;
const validArticleId = (value) =>
  typeof value === 'string' &&
  value.length <= 64 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const assetKeys = Object.freeze({
  sapphire: 'chapter-one/02_sapphire.png',
  ruby: 'chapter-one/03_ruby.png',
  emerald: 'chapter-one/04_emerald.png',
});
const json = (status, data, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
const bearer = (request) => {
  const match = /^Bearer ([A-Za-z0-9_.-]{1,8192})$/.exec(
    request.headers.get('authorization') || '',
  );
  return match?.[1] || null;
};
const getJson = async (req) => {
  if (
    !/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type') || '')
  )
    throw Error('invalid body');
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > MAX_BODY) throw Error('body too large');
  return JSON.parse(new TextDecoder().decode(bytes));
};
const validCredentials = (email, password) =>
  typeof email === 'string' &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
  typeof password === 'string' &&
  password.length >= 8 &&
  password.length <= 128;
const sessionResponse = (data) =>
  data.session
    ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      }
    : { confirmation_required: true };
export function createHandler(
  { auth, db, storage, stripe, cryptoProvider },
  config,
) {
  return async function handle(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    if (origin && origin !== config.publicOrigin)
      return json(403, { error: 'Forbidden origin' });
    const cors = origin
      ? { 'Access-Control-Allow-Origin': config.publicOrigin, Vary: 'Origin' }
      : {};
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Cache-Control': 'no-store',
        },
      });
    const response = (status, data) => json(status, data, cors);
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY)
      return response(413, { error: 'Request too large' });
    if (url.pathname === '/api/stripe/webhook' && request.method === 'POST') {
      let event;
      try {
        const raw = await request.arrayBuffer();
        if (raw.byteLength > MAX_BODY)
          return response(413, { error: 'Request too large' });
        event = await stripe.webhooks.constructEventAsync(
          Buffer.from(raw),
          request.headers.get('stripe-signature') || '',
          config.stripeWebhook,
          300,
          cryptoProvider,
        );
        if (event.livemode !== false) throw Error('Live events forbidden');
      } catch {
        return response(400, { error: 'Invalid webhook' });
      }
      try {
        await processStripeEvent(event, { stripe, db }, config);
        return response(200, { received: true });
      } catch {
        return response(503, { error: 'Webhook processing unavailable' });
      }
    }
    if (
      ['/api/auth/signup', '/api/auth/login'].includes(url.pathname) &&
      request.method === 'POST'
    ) {
      try {
        const body = await getJson(request);
        if (!validCredentials(body.email, body.password))
          return response(400, { error: 'Invalid input' });
        const data = url.pathname.endsWith('signup')
          ? await auth.signUp(body.email, body.password)
          : await auth.signIn(body.email, body.password);
        return response(200, sessionResponse(data));
      } catch {
        return response(400, { error: 'Unable to authenticate' });
      }
    }
    if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
      try {
        const body = await getJson(request);
        if (
          typeof body.refresh_token !== 'string' ||
          body.refresh_token.length > 8192
        )
          return response(400, { error: 'Invalid input' });
        return response(
          200,
          sessionResponse(await auth.refresh(body.refresh_token)),
        );
      } catch {
        return response(400, { error: 'Unable to authenticate' });
      }
    }
    const token = bearer(request);
    if (!token) return response(401, { error: 'Authentication required' });
    let user;
    try {
      user = await auth.getUser(token);
      if (!user?.id) throw Error('No user');
    } catch {
      return response(401, { error: 'Authentication required' });
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      try {
        await auth.signOut(token);
        return response(200, { signed_out: true });
      } catch {
        return response(503, { error: 'Unable to sign out' });
      }
    }
    if (url.pathname === '/api/account' && request.method === 'GET') {
      try {
        return response(200, await db.accountSummary(user.id));
      } catch {
        return response(503, { error: 'Account unavailable' });
      }
    }
    if (
      url.pathname === '/api/subscription/cancel' &&
      request.method === 'POST'
    ) {
      try {
        const current = await db.activeSubscription(user.id);
        if (!current)
          return response(404, { error: 'Active membership not found' });
        const sub = await stripe.subscriptions.retrieve(
          current.subscription_id,
        );
        if (
          sub.livemode !== false ||
          sub.metadata?.order_id !== current.order_id
        )
          throw Error('Subscription verification failed');
        const session = await stripe.checkout.sessions.retrieve(
          current.session_id,
        );
        if (
          session.livemode !== false ||
          session.mode !== 'subscription' ||
          session.client_reference_id !== current.order_id ||
          (typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id) !== current.subscription_id
        )
          throw Error('Session verification failed');
        await stripe.subscriptions.update(current.subscription_id, {
          cancel_at_period_end: true,
        });
        return response(200, { cancel_at_period_end: true });
      } catch {
        return response(503, { error: 'Unable to cancel' });
      }
    }
    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      try {
        const body = await getJson(request);
        const kind = body.kind;
        if (
          !['single', 'subscription'].includes(kind) ||
          Object.keys(body).some((k) => !['kind', 'article_id'].includes(k)) ||
          (kind === 'single' && !validArticleId(body.article_id)) ||
          (kind === 'subscription' && body.article_id != null)
        )
          return response(400, { error: 'Invalid product' });
        const priceId =
          kind === 'single' ? config.singlePrice : config.monthlyPrice;
        const amount = kind === 'single' ? 150 : 580;
        const price = await stripe.prices.retrieve(priceId);
        if (
          price.livemode !== false ||
          price.active !== true ||
          price.currency !== 'jpy' ||
          price.unit_amount !== amount ||
          price.tax_behavior === 'exclusive' ||
          (kind === 'single' && price.recurring) ||
          (kind === 'subscription' &&
            (!price.recurring ||
              price.recurring.interval !== 'month' ||
              price.recurring.interval_count !== 1))
        )
          throw Error('Invalid test price');
        const orderId = randomUUID();
        await db.createOrder({
          id: orderId,
          userId: user.id,
          kind,
          articleId: kind === 'single' ? body.article_id : null,
          priceId,
          amount,
        });
        const opts = {
          mode: kind === 'single' ? 'payment' : 'subscription',
          client_reference_id: orderId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${config.testReturnUrl}?checkout=return`,
          cancel_url: `${config.testReturnUrl}?checkout=cancel`,
          allow_promotion_codes: false,
          automatic_tax: { enabled: false },
        };
        if (kind === 'subscription')
          opts.subscription_data = { metadata: { order_id: orderId } };
        const session = await stripe.checkout.sessions.create(opts, {
          idempotencyKey: orderId,
        });
        if (
          session.livemode !== false ||
          !session.url ||
          !/^cs_test_[A-Za-z0-9]+$/.test(session.id)
        )
          throw Error('Invalid test session');
        await db.bindSession(orderId, session.id);
        return response(200, { checkout_url: session.url });
      } catch {
        return response(503, { error: 'Checkout is unavailable' });
      }
    }
    const m =
      /^\/api\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/assets\/([a-z0-9]+(?:-[a-z0-9]+)*))?$/.exec(
        url.pathname,
      );
    if (
      m &&
      validArticleId(m[1]) &&
      (!m[2] || validArticleId(m[2])) &&
      request.method === 'GET'
    ) {
      try {
        if ((await db.canView(user.id, m[1])) !== true)
          return response(403, {
            error: 'Purchase or active membership required',
          });
        if (m[1] === 'chapter-one' && m[2] && !Object.hasOwn(assetKeys, m[2]))
          return response(404, { error: 'Not found' });
        const object = await storage.download(
          m[2]
            ? m[1] === 'chapter-one'
              ? assetKeys[m[2]]
              : `${m[1]}/assets/${m[2]}.png`
            : `${m[1]}/article.md`,
        );
        return new Response(object, {
          status: 200,
          headers: {
            ...cors,
            'Content-Type': m[2] ? 'image/png' : 'text/markdown; charset=utf-8',
            'Content-Disposition': 'inline',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch {
        return response(503, { error: 'Content unavailable' });
      }
    }
    return response(404, { error: 'Not found' });
  };
}
