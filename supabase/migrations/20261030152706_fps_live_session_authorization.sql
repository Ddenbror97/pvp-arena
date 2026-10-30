begin;
create schema if not exists fps_private;
revoke all on schema fps_private from public, anon, authenticated;
grant usage on schema fps_private to service_role;

-- Only the match service may inspect Auth session liveness. The exposed wrapper
-- is an invoker; the minimal Auth privilege boundary stays outside API schemas.
create or replace function fps_private.check_sessions(p_sessions jsonb)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog
as $fn$
begin
  if jsonb_typeof(p_sessions) is distinct from 'array'
     or jsonb_array_length(p_sessions) > 18 then
    raise exception 'INVALID_SESSION_BATCH';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'sessionId', q.session_id, 'userId', q.user_id,
      'active', exists (
        select 1 from auth.sessions s join auth.users u on u.id = s.user_id
        where s.id = q.session_id and s.user_id = q.user_id
          and (s.not_after is null or s.not_after > statement_timestamp())
          and (u.banned_until is null or u.banned_until <= statement_timestamp())
      )
    )) from jsonb_to_recordset(p_sessions) as q(session_id uuid, user_id uuid)
  ), '[]'::jsonb);
end;
$fn$;
revoke all on function fps_private.check_sessions(jsonb) from public, anon, authenticated;
grant execute on function fps_private.check_sessions(jsonb) to service_role;

create or replace function public.fps_check_sessions(p_sessions jsonb)
returns jsonb language sql stable security invoker
set search_path = pg_catalog
as $fn$ select fps_private.check_sessions(p_sessions) $fn$;
revoke all on function public.fps_check_sessions(jsonb) from public, anon, authenticated;
grant execute on function public.fps_check_sessions(jsonb) to service_role;
comment on function public.fps_check_sessions(jsonb) is
  'Service-only current Auth session status; no positive authorization lease.';
commit;
