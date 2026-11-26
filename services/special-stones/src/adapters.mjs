import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
export function createAdapters(c) {
  const stripe = c.stripeSecret ? new Stripe(c.stripeSecret, {
    maxNetworkRetries: 2,
    httpClient: Stripe.createFetchHttpClient(),
  }) : null;
  const makeAuth = () =>
    createClient(c.supabaseUrl, c.supabaseAnon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  const service = createClient(c.supabaseUrl, c.supabaseService, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const rpc = async (name, params) => {
    const { data, error } = await service.rpc(name, params);
    if (error) throw new Error('Database operation failed');
    return data;
  };
  return {
    stripe,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
    auth: {
      signUp: async (email, password) => {
        const { data, error } = await makeAuth().auth.signUp({
          email,
          password,
        });
        if (error) throw new Error('Auth failed');
        return data;
      },
      refresh: async (refreshToken) => {
        const { data, error } = await makeAuth().auth.refreshSession({
          refresh_token: refreshToken,
        });
        if (error) throw new Error('Auth failed');
        return data;
      },
      signIn: async (email, password) => {
        const { data, error } = await makeAuth().auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw new Error('Auth failed');
        return data;
      },
      getUser: async (token) => {
        const { data, error } = await makeAuth().auth.getUser(token);
        if (error || !data.user) throw new Error('Auth failed');
        return data.user;
      },
      signOut: async (token) => {
        const { error } = await service.auth.admin.signOut(token, 'global');
        if (error) throw new Error('Auth failed');
      },
    },
    db: {
      createOrder: (o) =>
        rpc('special_stones_create_order', {
          p_id: o.id,
          p_user_id: o.userId,
          p_kind: o.kind,
          p_article_id: o.articleId,
          p_price_id: o.priceId,
          p_amount: o.amount,
        }),
      bindSession: (id, session) =>
        rpc('special_stones_bind_session', {
          p_order_id: id,
          p_session_id: session,
        }),
      getOrder: (id) => rpc('special_stones_get_order', { p_order_id: id }),
      applyEvent: (id, action, data) =>
        rpc('special_stones_apply_event', {
          p_event_id: id,
          p_action: action,
          p_data: data,
        }),
      canView: (uid, id) =>
        rpc('special_stones_can_view', { p_user_id: uid, p_article_id: id }),
      accountSummary: (uid) =>
        rpc('special_stones_account_summary', { p_user_id: uid }),
      activeSubscription: (uid) =>
        rpc('special_stones_active_subscription', { p_user_id: uid }),
    },
    storage: {
      async download(key) {
        const bucket = await service.storage.getBucket(c.bucket);
        if (bucket.error || !bucket.data || bucket.data.public !== false)
          throw new Error('Private bucket required');
        const { data, error } = await service.storage
          .from(c.bucket)
          .download(key);
        if (error || !data) throw new Error('Storage unavailable');
        return data;
      },
    },
  };
}
