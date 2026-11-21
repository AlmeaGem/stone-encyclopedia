/**
 * ALMÉA GEM billing Worker entrypoint.
 * Safe foundation only: checkout and webhook handlers are deliberately disabled
 * until authenticated checkout, Stripe signature verification, and durable
 * Supabase event processing have been implemented and tested.
 *
 * Deploying this file does NOT enable payments.
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

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname === '/health' && request.method === 'GET') {
      return json({ service: 'almeagem-billing-api', status: 'ok' });
    }

    if (pathname === '/checkout' || pathname === '/webhook/stripe') {
      return json({ error: 'Billing is not enabled' }, 503);
    }

    return json({ error: 'Not found' }, 404);
  },
};
