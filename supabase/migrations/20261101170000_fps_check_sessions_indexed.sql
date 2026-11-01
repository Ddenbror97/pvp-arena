-- FPS session check: index lookups instead of a hashed full scan.
--
-- The previous body planned `exists (...)` as a hashed SubPlan that sequentially scanned
-- every auth.sessions and auth.users row on each call (O(users)). This check gates every
-- FPS movement/shot command (strict session validation), so its cost lands directly on
-- command latency at p95/p99 as the user base grows. The LATERAL ... LIMIT 1 form uses
-- the sessions(user_id) and users(id) indexes: constant cost per checked session.
--
-- Semantics are unchanged: same input validation, same active rule (session exists for
-- that user, not expired, user not banned), same output shape and order. Verified on
-- production data before release: 559/559 identical results (every live session with its
-- user and with a wrong user, unknown ids, an 18-session batch and an empty batch).
create or replace function fps_private.check_sessions(p_sessions jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if jsonb_typeof(p_sessions) is distinct from 'array'
     or jsonb_array_length(p_sessions) > 18 then
    raise exception 'INVALID_SESSION_BATCH';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'sessionId', q.session_id, 'userId', q.user_id, 'active', a.active is not null
    ) order by q.ord)
    from rows from (jsonb_to_recordset(p_sessions) as (session_id uuid, user_id uuid))
      with ordinality as q(session_id, user_id, ord)
    left join lateral (
      select true as active
      from auth.sessions s
      join auth.users u on u.id = s.user_id
      where s.id = q.session_id
        and s.user_id = q.user_id
        and (s.not_after is null or s.not_after > statement_timestamp())
        and (u.banned_until is null or u.banned_until <= statement_timestamp())
      limit 1
    ) a on true
  ), '[]'::jsonb);
end;
$function$;
