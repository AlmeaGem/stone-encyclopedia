-- Atomic, idempotent processing of a verified paid Checkout event.
-- Execute only after reviewing against the deployed schema.
create or replace function public.billing_record_paid_checkout(
  p_event_id text,
  p_session_id text,
  p_user_id uuid,
  p_product_key text,
  p_payment_intent_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_id is null or p_event_id !~ '^evt_' or
     p_session_id is null or p_session_id !~ '^cs_test_' or
     p_product_key not in ('stone', 'report') or
     p_payment_intent_id is null or p_payment_intent_id !~ '^pi_' then
    raise exception 'Invalid paid Checkout event';
  end if;

  insert into public.billing_stripe_events (stripe_event_id, event_type)
  values (p_event_id, 'checkout.session.completed')
  on conflict (stripe_event_id) do nothing;

  if not found then
    return false;
  end if;

  insert into public.billing_one_time_purchases (
    user_id, product_key, stripe_checkout_session_id,
    stripe_payment_intent_id, status, purchased_at
  ) values (
    p_user_id, p_product_key, p_session_id,
    p_payment_intent_id, 'paid', now()
  )
  on conflict (stripe_checkout_session_id) do nothing;

  if not found then
    raise exception 'Checkout session already assigned';
  end if;

  return true;
end;
$$;

revoke all on function public.billing_record_paid_checkout(text,text,uuid,text,text)
from public, anon, authenticated;
grant execute on function public.billing_record_paid_checkout(text,text,uuid,text,text)
to service_role;
