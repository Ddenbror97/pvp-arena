-- Account self-exclusion request.
-- Already applied in production as schema_migrations version 20261016020000.
-- This file exists so a fresh database matches production. Do not apply it again there.
-- profiles.self_excluded_until already exists; game and cash-out functions already refuse
-- an account while that timestamp is in the future.

create or replace function public.request_self_exclusion(p_days integer)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur timestamptz;
  nxt timestamptz;
begin
  if uid is null then raise exception 'UNAUTHENTICATED'; end if;
  -- NULL is not true in PL/pgSQL, so `NOT IN` alone would skip this check and store a null timestamp.
  if p_days is null or p_days not in (180, 365, 1825) then raise exception 'EXCLUSION_PERIOD'; end if;
  select self_excluded_until into cur from public.profiles where id = uid for update;
  if not found then raise exception 'NO_PROFILE'; end if;
  nxt := clock_timestamp() + make_interval(days => p_days);
  if cur is not null and cur >= nxt then raise exception 'EXCLUSION_ALREADY_LONGER'; end if;
  update public.profiles set self_excluded_until = nxt where id = uid;
  perform public._audit(uid, 'self_exclusion', null::bigint, jsonb_build_object('until', nxt, 'days', p_days));
  return nxt;
end $$;

revoke all on function public.request_self_exclusion(integer) from public, anon;
grant execute on function public.request_self_exclusion(integer) to authenticated;
