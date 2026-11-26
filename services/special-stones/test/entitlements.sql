-- Run only against an isolated throwaway database after the migration.
-- Requires an auth.users test fixture and anon/authenticated/service_role roles.
begin;
insert into auth.users (id) values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
insert into special_stones.articles (id,published) values ('chapter-one',true), ('unpublished',false);
insert into special_stones.orders (id,user_id,kind,expected_price_id,expected_amount,currency,stripe_session_id)
values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','subscription','price_test',580,'jpy','cs_test_sub');
insert into special_stones.member_periods (invoice_id,order_id,user_id,subscription_id,payment_intent_id,starts_at,ends_at)
values ('in_test','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','sub_test','pi_month',now()-interval '1 day',now()+interval '1 day');
do $$ begin
  if not public.special_stones_can_view('00000000-0000-4000-8000-000000000001','chapter-one') then raise exception 'active member denied'; end if;
  if public.special_stones_can_view('00000000-0000-4000-8000-000000000002','chapter-one') then raise exception 'other user allowed'; end if;
  if public.special_stones_can_view('00000000-0000-4000-8000-000000000001','unpublished') then raise exception 'unpublished allowed'; end if;
  if public.special_stones_can_view('00000000-0000-4000-8000-000000000001','chapter-two') then raise exception 'unregistered allowed'; end if;
end $$;
-- Added after the subscription: no membership registration for this article.
insert into special_stones.articles (id,published) values ('chapter-two',true);
do $$ begin
  if not public.special_stones_can_view('00000000-0000-4000-8000-000000000001','chapter-two') then raise exception 'future published article denied'; end if;
  if has_function_privilege('anon','public.special_stones_can_view(uuid,text)','EXECUTE') or has_function_privilege('authenticated','public.special_stones_can_view(uuid,text)','EXECUTE') then raise exception 'client can invoke privileged RPC'; end if;
end $$;
insert into special_stones.orders (id,user_id,article_id,kind,expected_price_id,expected_amount,currency,stripe_session_id)
values ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','chapter-one','single','price_test',150,'jpy','cs_test_one');
select public.special_stones_apply_event('evt_single','single_paid','{"order_id":"20000000-0000-4000-8000-000000000001","payment_intent_id":"pi_one"}');
update special_stones.member_periods set ends_at=now()-interval '1 second' where invoice_id='in_test';
do $$ begin
  if not public.special_stones_can_view('00000000-0000-4000-8000-000000000001','chapter-one') then raise exception 'single purchase lost on expiry'; end if;
  if public.special_stones_can_view('00000000-0000-4000-8000-000000000001','chapter-two') then raise exception 'expired member allowed'; end if;
end $$;
select public.special_stones_apply_event('evt_refund','refund','{"payment_intent_id":"pi_one"}');
select public.special_stones_apply_event('evt_refund','refund','{"payment_intent_id":"pi_one"}');
do $$ begin
  if public.special_stones_can_view('00000000-0000-4000-8000-000000000001','chapter-one') then raise exception 'refunded purchase allowed'; end if;
end $$;
rollback;
