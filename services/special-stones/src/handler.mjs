import { randomUUID } from 'node:crypto';
import { processStripeEvent } from './stripe-events.mjs';
import { chapterById } from './catalog.mjs';
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
// A short-lived refresh cookie is scoped to auth endpoints, never exposed to JS.
const TEST_REFRESH_COOKIE = '__Secure-almea-test-refresh';
const LIVE_REFRESH_COOKIE = '__Secure-almea-member-refresh';
const cookieOptions = '; Path=/api/auth; HttpOnly; Secure; SameSite=Lax';
const clearRefreshCookie = (name) => name + '=' + cookieOptions + '; Max-Age=0';
const refreshFromCookie = (request, name) => {
  const values = (request.headers.get('cookie') || '').split(';');
  const matches = values.map((v) => v.trim()).filter((v) => v.startsWith(name + '='));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9._~-]{1,3500}$/.test(token) ? token : null;
};
const browserSession = (data, headers, name) => {
  if (!data.session)
    return json(200, { confirmation_required: true }, { ...headers, 'Set-Cookie': clearRefreshCookie(name) });
  const { access_token, refresh_token, expires_at } = data.session;
  if (typeof refresh_token !== 'string' || !/^[A-Za-z0-9._~-]{1,3500}$/.test(refresh_token))
    throw Error('Invalid refresh token');
  return json(
    200,
    { access_token, expires_at, email: data.user?.email || data.session.user?.email || '' },
    { ...headers, 'Set-Cookie': name + '=' + refresh_token + cookieOptions + '; Max-Age=7200' },
  );
};
export function createHandler(
  { auth, db, storage, stripe, cryptoProvider },
  config,
) {
  const cookieName = config.livemode === true ? LIVE_REFRESH_COOKIE : TEST_REFRESH_COOKIE;
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
    // Fail closed before any billing adapter or order is touched.
    if (config.livemode === true && (
      (url.pathname === '/api/checkout' && config.salesEnabled !== true) ||
      (['/api/stripe/webhook','/api/subscription/cancel'].includes(url.pathname) && config.billingEnabled !== true)
    )) return response(503, { error: 'Billing unavailable' });
    if (config.livemode === true && request.method === 'POST' &&
      ['/api/auth/recovery-request','/api/auth/recovery-complete'].includes(url.pathname)) {
      if (origin !== config.publicOrigin) return response(403, { error: 'Forbidden origin' });
      let body;
      try { body = await getJson(request); } catch { return response(400, { error: 'Invalid input' }); }
      if (!body || typeof body.email !== 'string' || body.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return response(400, { error: 'Invalid input' });
      if (url.pathname === '/api/auth/recovery-request') {
        // Never reveal whether the address belongs to an account.
        try { await auth.requestPasswordReset(body.email); } catch {}
        return response(200, { accepted: true });
      }
      if (!validCredentials(body.email, body.password) || typeof body.code !== 'string' || !/^\d{8}$/.test(body.code))
        return response(400, { error: 'Invalid input' });
      try {
        await auth.completePasswordReset(body.email, body.code, body.password);
        return json(200, { password_reset: true }, { ...cors, 'Set-Cookie': clearRefreshCookie(cookieName) });
      } catch {
        return response(400, { error: 'Unable to reset password' });
      }
    }
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
        if (event.livemode !== (config.livemode === true)) throw Error('Live events forbidden');
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
        if (config.livemode === true && url.pathname === '/api/auth/signup' && body.terms_accepted !== true)
          return response(400, { error: 'Terms acceptance required' });
        if (body.browser_session === true && origin !== config.publicOrigin)
          return response(403, { error: 'Forbidden origin' });
        const data = url.pathname.endsWith('signup')
          ? await auth.signUp(body.email, body.password)
          : await auth.signIn(body.email, body.password);
        if (body.browser_session === true) {
          if (origin !== config.publicOrigin)
            return response(403, { error: 'Forbidden origin' });
          return browserSession(data, cors, cookieName);
        }
        return response(200, sessionResponse(data));
      } catch {
        return response(400, { error: 'Unable to authenticate' });
      }
    }
    if (url.pathname === '/api/auth/restore' && request.method === 'POST') {
      if (origin !== config.publicOrigin)
        return response(403, { error: 'Forbidden origin' });
      const refresh = refreshFromCookie(request, cookieName);
      if (!refresh)
        return response(401, { error: 'Authentication required' });
      try {
        return browserSession(await auth.refresh(refresh), cors, cookieName);
      } catch {
        return json(401, { error: 'Authentication required' }, { ...cors, 'Set-Cookie': clearRefreshCookie(cookieName) });
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
    const isLogout = url.pathname === '/api/auth/logout' && request.method === 'POST';
    const authFailure = () =>
      isLogout && origin === config.publicOrigin
        ? json(401, { error: 'Authentication required' }, { ...cors, 'Set-Cookie': clearRefreshCookie(cookieName) })
        : response(401, { error: 'Authentication required' });
    if (!token) return authFailure();
    let user;
    try {
      user = await auth.getUser(token);
      if (!user?.id) throw Error('No user');
    } catch {
      return authFailure();
    }
    if (isLogout) {
      try {
        await auth.signOut(token);
        return json(200, { signed_out: true }, { ...cors, 'Set-Cookie': clearRefreshCookie(cookieName) });
      } catch {
        return json(503, { error: 'Unable to sign out' }, { ...cors, 'Set-Cookie': clearRefreshCookie(cookieName) });
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
          sub.livemode !== (config.livemode === true) ||
          sub.metadata?.order_id !== current.order_id
        )
          throw Error('Subscription verification failed');
        const session = await stripe.checkout.sessions.retrieve(
          current.session_id,
        );
        if (
          session.livemode !== (config.livemode === true) ||
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
        if (config.livemode === true) {
          if (kind === 'single' && chapterById(body.article_id)?.sellable !== true) return response(404, { error: 'Article unavailable' });
          const account = await db.accountSummary(user.id);
          const active = account?.membership_until && Date.parse(account.membership_until) > Date.now();
          if ((kind === 'single' && account?.purchased_articles?.includes(body.article_id)) || (kind === 'subscription' && active))
            return response(409, { error: 'Already entitled' });
        }
        const priceId =
          kind === 'single' ? config.singlePrice : config.monthlyPrice;
        const amount = kind === 'single' ? 150 : 580;
        const price = await stripe.prices.retrieve(priceId);
        if (
          price.livemode !== (config.livemode === true) ||
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
          success_url: `${config.testReturnUrl}?checkout=return&article=${encodeURIComponent(kind === 'single' ? body.article_id : 'chapter-one')}`,
          cancel_url: `${config.testReturnUrl}?checkout=cancel`,
          allow_promotion_codes: false,
          managed_payments: { enabled: false },
          automatic_tax: { enabled: false },
        };
        if (config.livemode === true) {
          opts.custom_text = { submit: { message: kind === 'single'
            ? '単品記事150円（税込・買い切り）。決済と閲覧権限確認後に提供します。閲覧・提供開始後のお客様都合による返品・返金・キャンセルは原則不可です。二重決済・提供不良等および法令上の権利は別途対応します。詳細：https://almeagem.com/refund/'
            : '月額580円（税込）。初回申込み時から毎月自動更新。決済と閲覧権限確認後に提供します。次回更新前にマイアカウントから解約できます。支払い済み期間は閲覧可能で、日割り返金は原則ありません。法令上の権利は別途対応します。詳細：https://almeagem.com/refund/' } };
        }
        if (kind === 'subscription')
          opts.subscription_data = { metadata: { order_id: orderId } };
        const session = await stripe.checkout.sessions.create(opts, {
          idempotencyKey: orderId,
        });
        if (
          session.livemode !== (config.livemode === true) ||
          !session.url ||
          !(config.livemode === true ? /^cs_live_[A-Za-z0-9]+$/ : /^cs_test_[A-Za-z0-9]+$/).test(session.id)
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
        if (config.livemode === true && (!chapterById(m[1]) || (m[2] && !chapterById(m[1]).illustrations.some(a=>a.key===m[2])))) return response(404, { error: 'Not found' });
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
