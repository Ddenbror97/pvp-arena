-- Leaderboard admin RPCs checked has_role but not a live auth session.
-- _assert_admin already calls _assert_live_session after the same admin check.
-- This function keeps that order. A missing JWT, a non-authenticated role
-- (service_role, cron, session-less server claims), or claims without
-- session_id still return from _assert_live_session without error. A browser
-- token that carries session_id must match a live auth.sessions row.
-- leaderboard_tick is unchanged. The function signature and grants are unchanged.

create or replace function public._lb_require_admin() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  return uid;
end $$;

revoke all on function public._lb_require_admin() from public, anon, authenticated;
