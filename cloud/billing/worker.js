import { verifyStripeSignature } from './stripe-signature.js';

/**
 * ALMÉA GEM billing Worker.
 * Test-mode Checkout only. Webhook and paid entitlements remain disabled.
 * Do not deploy as a complete payment service.
 */
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

const products = {
  membership: { priceEnv: 'STRIPE_PRICE_MEMBERSHIP', mode: 'subscription' },
  stone: { priceEnv: 'STRIPE_PRICE_STONE', mode: 'payment' },
  report: { priceEnv: 'STRIPE_PRICE_REPORT', mode: 'payment' },
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const persistPaidCheckout = async (event, env) => {
  if (
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.SUPABASE_URL ||
    !env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
  ) {
    return json({ error: 'Persistence unavailable' }, 503);
  }

  const session = event.data?.object;
  if (
    !event.id?.startsWith('evt_') ||
    !session?.id?.startsWith('cs_test_') ||
    session.mode !== 'payment' ||
    session.payment_status !== 'paid' ||
    !uuidPattern.test(session.client_reference_id || '') ||
    session.metadata?.user_id !== session.client_reference_id ||
    !['stone', 'report'].includes(session.metadata?.product_key) ||
    !session.payment_intent?.startsWith('pi_')
  ) {
    return json({ error: 'Unsupported Checkout event' }, 503);
  }

  const product = products[session.metadata.product_key];
  const expectedPrice = env[product.priceEnv];
  if (!expectedPrice?.startsWith('price_')) {
    return json({ error: 'Price unavailable' }, 503);
  }

  // Never trust the price or amount in client-provided metadata.
  const stripeResponse = await fetch(
    'https://api.stripe.com/v1/checkout/sessions/' +
      encodeURIComponent(session.id) +
      '/line_items?limit=2',
    { headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } },
  ).catch(() => null);
  if (!stripeResponse?.ok) {
    return json({ error: 'Stripe verification failed' }, 503);
  }
  const items = await stripeResponse.json().catch(() => null);
  if (
    items?.data?.length !== 1 ||
    items.has_more !== false ||
    items.data[0].price?.id !== expectedPrice ||
    items.data[0].quantity !== 1
  ) {
    return json({ error: 'Price mismatch' }, 503);
  }

  const endpoint = new URL(
    '/rest/v1/rpc/billing_record_paid_checkout',
    env.SUPABASE_URL,
  );
  const saved = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_event_id: event.id,
      p_session_id: session.id,
      p_user_id: session.client_reference_id,
      p_product_key: session.metadata.product_key,
      p_payment_intent_id: session.payment_intent,
    }),
  }).catch(() => null);

  if (!saved?.ok) return json({ error: 'Persistence failed' }, 503);
  return json({ received: true });
};

const allowedOrigin = 'https://almeagem.com';

const checkout = async (request, env) => {
  if (request.headers.get('origin') !== allowedOrigin) {
    return json({ error: 'Origin not allowed' }, 403);
  }

  const auth = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/.test(auth)) {
    return json({ error: 'Authentication required' }, 401);
  }

  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY ||
    !env.STRIPE_SECRET_KEY ||
    !env.STRIPE_SECRET_KEY.startsWith('sk_test_')
  ) {
    return json({ error: 'Checkout unavailable' }, 503);
  }

  const identity = await fetch(new URL('/auth/v1/user', env.SUPABASE_URL), {
    headers: {
      authorization: auth,
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
    },
  }).catch(() => null);
  if (!identity?.ok) return json({ error: 'Invalid session' }, 401);

  const user = await identity.json().catch(() => null);
  if (!user?.id || typeof user.id !== 'string') {
    return json({ error: 'Invalid session' }, 401);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Invalid request' }, 400);
  }
  const product = products[body.product];
  if (!product) return json({ error: 'Unknown product' }, 400);

  const price = env[product.priceEnv];
  if (typeof price !== 'string' || !/^price_[A-Za-z0-9]+$/.test(price)) {
    return json({ error: 'Product unavailable' }, 503);
  }

  const params = new URLSearchParams({
    mode: product.mode,
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'metadata[product_key]': body.product,
    success_url:
      allowedOrigin + '/payment/success/?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: allowedOrigin + '/payment/cancel/',
  });

  const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': crypto.randomUUID(),
    },
    body: params,
  }).catch(() => null);

  if (!stripe?.ok) return json({ error: 'Checkout unavailable' }, 502);
  const session = await stripe.json().catch(() => null);
  if (
    !session?.id?.startsWith('cs_test_') ||
    typeof session.url !== 'string' ||
    !session.url.startsWith('https://checkout.stripe.com/')
  ) {
    return json({ error: 'Invalid checkout response' }, 502);
  }

  return json({ checkout_url: session.url });
};

export default {
  async fetch(request, env = {}) {
    const { pathname } = new URL(request.url);

    if (pathname === '/health' && request.method === 'GET') {
      return json({ service: 'almeagem-billing-api', status: 'ok' });
    }

    if (pathname === '/checkout' && request.method === 'POST') {
      return checkout(request, env);
    }

    if (pathname === '/webhook/stripe' && request.method === 'POST') {
      if (!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
        return json({ error: 'Webhook unavailable' }, 503);
      }
      const rawBody = await request.text();
      const verified = await verifyStripeSignature(
        rawBody,
        request.headers.get('stripe-signature'),
        env.STRIPE_WEBHOOK_SECRET,
      );
      if (!verified) return json({ error: 'Invalid signature' }, 400);

      const event = await Promise.resolve()
        .then(() => JSON.parse(rawBody))
        .catch(() => null);
      if (!event) return json({ error: 'Invalid event' }, 400);
      if (event.type !== 'checkout.session.completed') {
        return json({ error: 'Event handler unavailable' }, 503);
      }
      return persistPaidCheckout(event, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};
