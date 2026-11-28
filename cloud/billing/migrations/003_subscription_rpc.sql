-- Apply only after reviewing schema and Stripe event ordering.
-- This RPC is service-role only; callers must verify Stripe events first.
create or replace function public.billing_record_subscription(
  p_subscription_id text,
  p_user_id uuid,
  p_price_id text,
  p_status text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_subscription_id is null or
     p_subscription_id !~ '^sub_' or
     p_user_id is null or
     p_price_id is null or
     p_price_id !~ '^price_' or
     p_status not in (
       'active', 'trialing', 'past_due', 'unpaid', 'canceled',
       'incomplete', 'incomplete_expired', 'paused'
     ) then
    raise exception 'Invalid subscription update';
  end if;

  insert into public.billing_subscriptions (
    stripe_subscription_id, user_id, stripe_price_id, status,
    current_period_end, cancel_at_period_end, updated_at
  )
  values (
    p_subscription_id, p_user_id, p_price_id, p_status,
    p_period_end, coalesce(p_cancel_at_period_end, false), now()
  )
  on conflict (stripe_subscription_id)
  do update set
    stripe_price_id = excluded.stripe_price_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = now()
  where public.billing_subscriptions.user_id = excluded.user_id;

  if not found then
    raise exception 'Subscription owner mismatch';
  end if;
end;
$$;

revoke all on function public.billing_record_subscription(
  text, uuid, text, text, timestamptz, boolean
) from public, anon, authenticated;

grant execute on function public.billing_record_subscription(
  text, uuid, text, text, timestamptz, boolean
) to service_role;
