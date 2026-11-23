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

const persistSubscription = async (event, env) => {
  if (
    !env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.SUPABASE_URL
  ) {
    return json({ error: 'Subscription unavailable' }, 503);
  }

  const subscriptionId = event.data?.object?.id;
  if (
    typeof subscriptionId !== 'string' ||
    !/^sub_[A-Za-z0-9]+$/.test(subscriptionId)
  ) {
    return json({ error: 'Invalid subscription' }, 503);
  }

  // Fetch current state from Stripe instead of trusting potentially
  // out-of-order webhook snapshots.
  const response = await fetch(
    'https://api.stripe.com/v1/subscriptions/' +
      encodeURIComponent(subscriptionId),
    { headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } },
  ).catch(() => null);
  if (!response?.ok) return json({ error: 'Stripe unavailable' }, 503);
  const subscription = await response.json().catch(() => null);
  const userId = subscription?.metadata?.user_id;
  const items = subscription?.items;
  if (
    !uuidPattern.test(userId || '') ||
    subscription.metadata.product_key !== 'membership' ||
    subscription.id !== subscriptionId ||
    !Array.isArray(items?.data) ||
    items.data.length !== 1 ||
    items.has_more !== false ||
    items.data[0].price?.id !== env.STRIPE_PRICE_MEMBERSHIP
  ) {
    return json({ error: 'Subscription validation failed' }, 503);
  }

  const periodEnd = items.data[0].current_period_end;
  if (!Number.isSafeInteger(periodEnd) || periodEnd <= 0) {
    return json({ error: 'Invalid billing period' }, 503);
  }

  const saved = await fetch(
    new URL('/rest/v1/rpc/billing_record_subscription', env.SUPABASE_URL),
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        p_subscription_id: subscription.id,
        p_user_id: userId,
        p_price_id: items.data[0].price.id,
        p_status: subscription.status,
        p_period_end: new Date(periodEnd * 1000).toISOString(),
        p_cancel_at_period_end: subscription.cancel_at_period_end === true,
      }),
    },
  ).catch(() => null);
  if (!saved?.ok) {
    return json({ error: 'Subscription persistence failed' }, 503);
  }
  return json({ received: true });
};

const allowedOrigin = 'https://almeagem.com';

const entitlements = async (request, env) => {
  if (request.headers.get('origin') !== allowedOrigin) {
    return json({ error: 'Origin not allowed' }, 403);
  }
  const authorization = request.headers.get('authorization') || '';
  if (
    !/^Bearer\\s+\\S+$/.test(authorization) ||
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY
  ) {
    return json({ error: 'Authentication required' }, 401);
  }
  const identity = await fetch(new URL('/auth/v1/user', env.SUPABASE_URL), {
    headers: {
      authorization,
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
    },
  }).catch(() => null);
  if (!identity?.ok) return json({ error: 'Invalid session' }, 401);
  const user = await identity.json().catch(() => null);
  if (!uuidPattern.test(user?.id || '')) {
    return json({ error: 'Invalid session' }, 401);
  }
  const response = await fetch(
    new URL('/rest/v1/rpc/billing_my_entitlements', env.SUPABASE_URL),
    {
      method: 'POST',
      headers: {
        authorization,
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        'content-type': 'application/json',
      },
      body: '{}',
    },
  ).catch(() => null);
  if (!response?.ok) {
    return json({ error: 'Entitlements unavailable' }, 503);
  }
  const rows = await response.json().catch(() => null);
  if (
    !Array.isArray(rows) ||
    rows.some(
      (row) =>
        typeof row.product_key !== 'string' ||
        typeof row.access_granted !== 'boolean',
    )
  ) {
    return json({ error: 'Invalid entitlements' }, 503);
  }
  return json({
    entitlements: rows.map((row) => ({
      product: row.product_key,
      granted: row.access_granted,
      until: row.access_until || null,
    })),
  });
};

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

  if (product.mode === 'subscription') {
    params.set('subscription_data[metadata][user_id]', user.id);
    params.set('subscription_data[metadata][product_key]', body.product);
  }

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

    if (pathname === '/entitlements' && request.method === 'GET') {
      return entitlements(request, env);
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
      if (
        [
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
        ].includes(event.type)
      ) {
        return persistSubscription(event, env);
      }
      if (event.type !== 'checkout.session.completed') {
        return json({ error: 'Event handler unavailable' }, 503);
      }
      return persistPaidCheckout(event, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};
