-- Only the existing backend-only account-summary RPC changes. Unpublished content stays invisible.
create or replace function public.special_stones_account_summary(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'purchased_articles', coalesce((select jsonb_agg(distinct g.article_id) from special_stones.purchase_grants g where g.user_id=p_user_id and not g.revoked),'[]'::jsonb),
    'membership_until', (select max(m.ends_at) from special_stones.member_periods m where m.user_id=p_user_id and not m.revoked and m.starts_at<=now() and m.ends_at>now()),
    'available_articles', coalesce((select jsonb_agg(a.id order by a.id) from special_stones.articles a where a.published),'[]'::jsonb)
  )
$$;
revoke all on function public.special_stones_account_summary(uuid) from public, anon, authenticated;
grant execute on function public.special_stones_account_summary(uuid) to service_role;
