const required = (env, key) => {
  const value = env[key];
  if (!value || !value.trim()) throw new Error(`Missing ${key}`);
  return value.trim();
};
export function readConfig(env = process.env) {
  if (env.SPECIAL_STONES_TEST_ONLY !== 'true')
    throw new Error('Test-only mode required');
  const stripeSecret = required(env, 'STRIPE_TEST_SECRET_KEY');
  if (!stripeSecret.startsWith('sk_test_'))
    throw new Error('Stripe live or restricted keys are not permitted');
  const stripeWebhook = required(env, 'STRIPE_TEST_WEBHOOK_SECRET');
  if (!stripeWebhook.startsWith('whsec_'))
    throw new Error('Invalid test webhook secret');
  const supabaseUrl = new URL(required(env, 'SUPABASE_TEST_URL'));
  const projectRef = required(env, 'SUPABASE_TEST_PROJECT_REF');
  const approvedRef = required(env, 'SUPABASE_APPROVED_TEST_PROJECT_REF');
  if (
    !/^[a-z0-9-]+$/.test(projectRef) ||
    projectRef !== approvedRef ||
    supabaseUrl.protocol !== 'https:' ||
    supabaseUrl.hostname !== `${projectRef}.supabase.co` ||
    supabaseUrl.pathname !== '/' ||
    supabaseUrl.search ||
    supabaseUrl.hash ||
    supabaseUrl.username ||
    supabaseUrl.password ||
    supabaseUrl.port
  )
    throw new Error('Invalid test project URL');
  const publicOrigin = new URL(required(env, 'SPECIAL_STONES_PUBLIC_ORIGIN'));
  if (
    publicOrigin.protocol !== 'https:' ||
    publicOrigin.hostname === 'almeagem.github.io' ||
    publicOrigin.pathname !== '/' ||
    publicOrigin.search ||
    publicOrigin.hash ||
    publicOrigin.username ||
    publicOrigin.password
  )
    throw new Error('Invalid public origin');
  const testReturnUrl = new URL(
    required(env, 'SPECIAL_STONES_TEST_RETURN_URL'),
  );
  if (
    testReturnUrl.origin !== publicOrigin.origin ||
    testReturnUrl.username ||
    testReturnUrl.password ||
    testReturnUrl.search ||
    testReturnUrl.hash
  )
    throw new Error('Invalid test return URL');
  const singlePrice = required(env, 'STRIPE_TEST_SINGLE_PRICE_ID');
  const monthlyPrice = required(env, 'STRIPE_TEST_MONTHLY_PRICE_ID');
  if (
    !/^price_[A-Za-z0-9]+$/.test(singlePrice) ||
    !/^price_[A-Za-z0-9]+$/.test(monthlyPrice) ||
    singlePrice === monthlyPrice
  )
    throw new Error('Invalid test prices');
  const bucket = required(env, 'SUPABASE_TEST_PRIVATE_BUCKET');
  if (bucket !== 'special-stones-test-private')
    throw new Error('Test private bucket required');
  return Object.freeze({
    stripeSecret,
    stripeWebhook,
    supabaseUrl: supabaseUrl.origin,
    supabaseAnon: required(env, 'SUPABASE_TEST_ANON_KEY'),
    supabaseService: required(env, 'SUPABASE_TEST_SERVICE_ROLE_KEY'),
    publicOrigin: publicOrigin.origin,
    testReturnUrl: testReturnUrl.href,
    singlePrice,
    monthlyPrice,
    bucket,
  });
}
