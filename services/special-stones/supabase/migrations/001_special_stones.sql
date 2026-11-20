-- Independent Supabase project only. No ALMÉA Manager or photo tables.
-- Apply to a test project only after reviewing roles and policies.
create schema if not exists special_stones;
revoke all on schema special_stones from public, anon, authenticated;
grant usage on schema special_stones to service_role;

create table special_stones.articles (
  id text primary key,
  published boolean not null default false
);
create table special_stones.orders (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  article_id text references special_stones.articles(id),
  kind text not null check (kind in ('single', 'subscription')),
  expected_price_id text not null,
  expected_amount integer not null check ((kind='single' and expected_amount=150) or (kind='subscription' and expected_amount=580)),
  currency text not null check (currency='jpy'),
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  check ((kind='single' and article_id is not null) or (kind='subscription' and article_id is null))
);
create table special_stones.purchase_grants (
  order_id uuid primary key references special_stones.orders(id),
  user_id uuid not null references auth.users(id),
  article_id text not null references special_stones.articles(id),
  payment_intent_id text not null unique,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create table special_stones.member_periods (
  invoice_id text primary key,
  order_id uuid not null references special_stones.orders(id),
  user_id uuid not null references auth.users(id),
  subscription_id text not null,
  payment_intent_id text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  revoked boolean not null default false,
  check (ends_at > starts_at)
);
create table special_stones.refunded_payments (
  payment_intent_id text primary key,
  created_at timestamptz not null default now()
);
create table special_stones.processed_events (
  event_id text primary key,
  kind text not null,
  processed_at timestamptz not null default now()
);
alter table special_stones.articles enable row level security;
alter table special_stones.orders enable row level security;
alter table special_stones.purchase_grants enable row level security;
alter table special_stones.member_periods enable row level security;
alter table special_stones.refunded_payments enable row level security;
alter table special_stones.processed_events enable row level security;
revoke all on all tables in schema special_stones from public, anon, authenticated;
grant select, insert, update on all tables in schema special_stones to service_role;

-- Backend-only, transactional and idempotent; signed/provider-verified data only.
create or replace function public.special_stones_apply_event(p_event_id text, p_action text, p_data jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare o special_stones.orders%rowtype; pi text; inserted integer;
begin
  insert into special_stones.processed_events(event_id,kind) values (p_event_id,p_action)
    on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;
  if p_action='refund' then
    pi := p_data->>'payment_intent_id';
    if pi is null or pi='' then raise exception 'missing payment intent'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pi,0));
    insert into special_stones.refunded_payments(payment_intent_id) values(pi) on conflict do nothing;
    update special_stones.purchase_grants set revoked=true where payment_intent_id=pi;
    update special_stones.member_periods set revoked=true where payment_intent_id=pi;
  elsif p_action in ('single_paid','invoice_paid') then
    select * into strict o from special_stones.orders where id=(p_data->>'order_id')::uuid for update;
    if o.stripe_session_id is null then raise exception 'session not bound'; end if;
    pi := p_data->>'payment_intent_id';
    if pi is null or pi='' then raise exception 'missing payment intent'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pi,0));
    if p_action='single_paid' then
      if o.kind <> 'single' then raise exception 'wrong order'; end if;
      insert into special_stones.purchase_grants(order_id,user_id,article_id,payment_intent_id,revoked)
        values(o.id,o.user_id,o.article_id,pi,exists(select 1 from special_stones.refunded_payments where payment_intent_id=pi))
        on conflict(order_id) do nothing;
    else
      if o.kind <> 'subscription' then raise exception 'wrong order'; end if;
      insert into special_stones.member_periods(invoice_id,order_id,user_id,subscription_id,payment_intent_id,starts_at,ends_at,revoked)
        values(p_data->>'invoice_id',o.id,o.user_id,p_data->>'subscription_id',pi,
          to_timestamp((p_data->>'starts_at')::double precision),to_timestamp((p_data->>'ends_at')::double precision),
          exists(select 1 from special_stones.refunded_payments where payment_intent_id=pi))
        on conflict(invoice_id) do nothing;
    end if;
  else raise exception 'unknown action'; end if;
  return 'applied';
end $$;
revoke all on function public.special_stones_apply_event(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.special_stones_apply_event(text,text,jsonb) to service_role;

create or replace function public.special_stones_can_view(p_user_id uuid, p_article_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from special_stones.articles a
    where a.id=p_article_id and a.published and (
      exists(select 1 from special_stones.purchase_grants g where g.user_id=p_user_id and g.article_id=a.id and not g.revoked)
      or exists(select 1 from special_stones.member_periods m where m.user_id=p_user_id and not m.revoked and m.starts_at<=now() and m.ends_at>now())
    )
  )
$$;
revoke all on function public.special_stones_can_view(uuid,text) from public, anon, authenticated;
grant execute on function public.special_stones_can_view(uuid,text) to service_role;

create or replace function public.special_stones_create_order(p_id uuid,p_user_id uuid,p_kind text,p_article_id text,p_price_id text,p_amount integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_kind='single' and not exists(select 1 from special_stones.articles where id=p_article_id and published) then raise exception 'article unavailable'; end if;
  insert into special_stones.orders(id,user_id,kind,article_id,expected_price_id,expected_amount,currency)
    values(p_id,p_user_id,p_kind,p_article_id,p_price_id,p_amount,'jpy');
end $$;
create or replace function public.special_stones_bind_session(p_order_id uuid,p_session_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update special_stones.orders set stripe_session_id=p_session_id where id=p_order_id and stripe_session_id is null;
  if not found then raise exception 'session binding failed'; end if;
end $$;
create or replace function public.special_stones_get_order(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(o) from special_stones.orders o where id=p_order_id
$$;
revoke all on function public.special_stones_create_order(uuid,uuid,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.special_stones_bind_session(uuid,text) from public, anon, authenticated;
revoke all on function public.special_stones_get_order(uuid) from public, anon, authenticated;
grant execute on function public.special_stones_create_order(uuid,uuid,text,text,text,integer) to service_role;
grant execute on function public.special_stones_bind_session(uuid,text) to service_role;
grant execute on function public.special_stones_get_order(uuid) to service_role;

create or replace function public.special_stones_account_summary(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'purchased_articles', coalesce((select jsonb_agg(distinct g.article_id) from special_stones.purchase_grants g where g.user_id=p_user_id and not g.revoked),'[]'::jsonb),
    'membership_until', (select max(m.ends_at) from special_stones.member_periods m where m.user_id=p_user_id and not m.revoked and m.starts_at<=now() and m.ends_at>now())
  )
$$;
create or replace function public.special_stones_active_subscription(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('subscription_id',m.subscription_id,'order_id',o.id,'session_id',o.stripe_session_id)
  from special_stones.member_periods m join special_stones.orders o on o.id=m.order_id
  where m.user_id=p_user_id and not m.revoked and m.starts_at<=now() and m.ends_at>now()
  order by m.ends_at desc limit 1
$$;
revoke all on function public.special_stones_account_summary(uuid) from public, anon, authenticated;
revoke all on function public.special_stones_active_subscription(uuid) from public, anon, authenticated;
grant execute on function public.special_stones_account_summary(uuid) to service_role;
grant execute on function public.special_stones_active_subscription(uuid) to service_role;
