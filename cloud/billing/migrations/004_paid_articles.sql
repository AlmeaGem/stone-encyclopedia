-- Private storage: never bundle paid bodies into public Astro pages.
create schema if not exists billing_private;
revoke all on schema billing_private from public, anon, authenticated;

create table if not exists billing_private.paid_articles (
  article_key text primary key
    check (article_key ~ '^[a-z0-9][a-z0-9_-]{0,99}$'),
  product_key text not null references public.billing_products(product_key),
  title text not null,
  body text not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

revoke all on billing_private.paid_articles from public, anon, authenticated;
alter table billing_private.paid_articles enable row level security;

create or replace function public.billing_read_paid_article(p_article_key text)
returns table(article_key text, title text, body text)
language sql stable security definer set search_path = ''
as $$
  select a.article_key, a.title, a.body
  from billing_private.paid_articles a
  where a.article_key = p_article_key
    and a.published
    and auth.uid() is not null
    and (
      exists (
        select 1 from public.billing_one_time_purchases p
        where p.user_id = auth.uid()
          and p.status = 'paid'
          and p.product_key = a.product_key
      )
      or (
        a.product_key = 'membership'
        and exists (
          select 1 from public.billing_subscriptions s
          where s.user_id = auth.uid()
            and s.status in ('active', 'trialing')
            and s.current_period_end > now()
        )
      )
    );
$$;

revoke all on function public.billing_read_paid_article(text)
  from public, anon, authenticated;
grant execute on function public.billing_read_paid_article(text)
  to authenticated, service_role;
