-- Server-side entitlement lookup. The caller is identified by auth.uid().
-- Never accept a user_id parameter from the browser.
create or replace function public.billing_my_entitlements()
returns table (product_key text, access_granted boolean, access_until timestamptz)
language sql stable security definer set search_path = ''
as $$
with viewer as (select auth.uid() as uid),
monthly as (
 select max(s.current_period_end) as until_at
 from public.billing_subscriptions s, viewer v
 where s.user_id=v.uid and s.status in ('active','trialing')
 and s.current_period_end > now()
),
owned as (
 select p.product_key
 from public.billing_one_time_purchases p, viewer v
 where p.user_id=v.uid and p.status='paid'
 group by p.product_key
)
select b.product_key,
  case when b.product_key='membership' then (select until_at is not null from monthly)
       else exists(select 1 from owned o where o.product_key=b.product_key) end,
  case when b.product_key='membership' then (select until_at from monthly)
       else null::timestamptz end
from public.billing_products b
where (select uid from viewer) is not null
$$;
revoke all on function public.billing_my_entitlements() from public,anon,authenticated;
grant execute on function public.billing_my_entitlements() to authenticated,service_role;
