-- A waiting 8-ball table stays open for 24 hours, the same wait coinflip and
-- slott use. The creator cannot cancel it. The worker refunds the stake when
-- that wait ends and nobody has joined. Tables already waiting keep a full day
-- from the moment they were opened.

update public.pool_config set waiting_seconds = 86400;
alter table public.pool_config alter column waiting_seconds set default 86400;

update public.pool_matches
set expires_at = created_at + interval '24 hours'
where status = 'WAITING';

create or replace function public.pool_cancel(p_match bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._assert_live_session();
  raise exception 'CANCEL_DISABLED';
end $$;

revoke all on function public.pool_cancel(bigint) from public, anon, authenticated;
