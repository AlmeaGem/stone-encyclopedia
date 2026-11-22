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

    if (pathname === '/webhook/stripe') {
      return json({ error: 'Billing is not enabled' }, 503);
    }

    return json({ error: 'Not found' }, 404);
  },
};
