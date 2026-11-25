// Production is separately provisioned and disabled until release approval.
const required = (env, key) => {
  const value = env[key];
  if (typeof value !== 'string' || !value.trim()) throw Error('Missing ' + key);
  return value.trim();
};
const checkedUrl = (raw) => {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash) throw Error('Invalid HTTPS URL');
  return u;
};
export function readProductionConfig(env) {
  if (env.SPECIAL_STONES_LIVE_SALES_ENABLED !== 'true') throw Error('Live sales disabled');
  if (env.SPECIAL_STONES_FIXED_PRICE_TAX_APPROVED !== 'true') throw Error('Tax configuration approval required');
  const stripeSecret = required(env, 'STRIPE_LIVE_SECRET_KEY');
  if (!stripeSecret.startsWith('sk_live_')) throw Error('Live Stripe key required');
  const stripeWebhook = required(env, 'STRIPE_LIVE_WEBHOOK_SECRET');
  if (!stripeWebhook.startsWith('whsec_')) throw Error('Webhook secret required');
  const projectRef = required(env, 'SUPABASE_LIVE_PROJECT_REF');
  if (!/^[a-z0-9]+$/.test(projectRef) || projectRef === 'rsjxnobjrrcxlmxxfqlq' || projectRef !== required(env, 'SUPABASE_APPROVED_LIVE_PROJECT_REF')) throw Error('Independent live project required');
  const supabaseUrl = checkedUrl(required(env, 'SUPABASE_LIVE_URL'));
  if (supabaseUrl.hostname !== projectRef + '.supabase.co' || supabaseUrl.pathname !== '/') throw Error('Project URL mismatch');
  const publicOrigin = checkedUrl(required(env, 'SPECIAL_STONES_LIVE_ORIGIN'));
  if (publicOrigin.pathname !== '/' || publicOrigin.hostname.endsWith('.workers.dev') || publicOrigin.hostname.endsWith('.github.io') || publicOrigin.hostname !== required(env, 'SPECIAL_STONES_APPROVED_LIVE_HOST')) throw Error('Approved custom domain required');
  const returnUrl = checkedUrl(required(env, 'SPECIAL_STONES_LIVE_RETURN_URL'));
  if (returnUrl.origin !== publicOrigin.origin) throw Error('Return origin mismatch');
  const singlePrice = required(env, 'STRIPE_LIVE_SINGLE_PRICE_ID');
  const monthlyPrice = required(env, 'STRIPE_LIVE_MONTHLY_PRICE_ID');
  const sandboxPrices = ['price_1UdfnmD1dZuoT6Ah5Q9XqBwO','price_1UdfviD1dZuoT6AhRzCHVH9C'];
  if (singlePrice === monthlyPrice || [singlePrice,monthlyPrice].some(p => !/^price_[A-Za-z0-9]+$/.test(p) || sandboxPrices.includes(p))) throw Error('Independent live prices required');
  const bucket = required(env, 'SUPABASE_LIVE_PRIVATE_BUCKET');
  if (bucket !== 'special-stones-live-private') throw Error('Live private bucket required');
  return Object.freeze({
    livemode:true, stripeSecret, stripeWebhook, supabaseUrl:supabaseUrl.origin,
    supabaseAnon:required(env,'SUPABASE_LIVE_ANON_KEY'),
    supabaseService:required(env,'SUPABASE_LIVE_SERVICE_ROLE_KEY'),
    publicOrigin:publicOrigin.origin, testReturnUrl:returnUrl.href, singlePrice, monthlyPrice, bucket,
  });
}
