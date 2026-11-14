-- Pausing enforcement must also pause automatic restrictions already issued.
-- Historical decisions and moderator bans are preserved. No production data is rewritten.
begin;

create or replace function fps_private.ac_should_enforce(p_source text, p_kind text)
returns boolean language sql stable security invoker set search_path = pg_catalog
as $fn$
  select p_source = 'admin' or exists (
    select 1 from public.fps_ac_config c
    where c.id and c.safety_tripped_at is null
      and (c.mode = 'full' or (c.mode = 'validated' and p_kind = 'competitive'))
  );
$fn$;
revoke all on function fps_private.ac_should_enforce(text, text) from public, anon, authenticated;
grant execute on function fps_private.ac_should_enforce(text, text) to service_role;

create or replace function fps_private.check_sessions_v2(p_sessions jsonb, p_scope text)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog
as $fn$
begin
  if jsonb_typeof(p_sessions) is distinct from 'array'
     or jsonb_array_length(p_sessions) > 18 then
    raise exception 'INVALID_SESSION_BATCH';
  end if;
  if p_scope not in ('competitive', 'practice') then
    raise exception 'INVALID_SESSION_SCOPE';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'sessionId', q.session_id, 'userId', q.user_id,
      'active', a.active is not null and x.kind is null,
      'restricted', x.kind,
      'until', x.ends_at
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
    left join lateral (
      select r.kind, r.ends_at
      from public.fps_ac_restrictions r
      where r.user_id = q.user_id and r.enforced and r.revoked_at is null
        and fps_private.ac_should_enforce(r.source, r.kind)
        and r.starts_at <= statement_timestamp()
        and (r.ends_at is null or r.ends_at > statement_timestamp())
        and (r.kind = 'ban' or p_scope = 'competitive')
      order by (r.kind = 'ban') desc, r.ends_at desc nulls first
      limit 1
    ) x on true
  ), '[]'::jsonb);
end;
$fn$;

create or replace function public.fps_ac_my_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r public.fps_ac_restrictions;
  ap public.fps_ac_appeals;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  select * into r from public.fps_ac_restrictions x
  where x.user_id = uid and x.enforced and x.revoked_at is null and x.starts_at <= now()
    and fps_private.ac_should_enforce(x.source, x.kind)
    and (x.ends_at is null or x.ends_at > now())
  order by (x.kind = 'ban') desc, x.ends_at desc nulls first limit 1;
  if not found then return jsonb_build_object('restricted', false); end if;
  select * into ap from public.fps_ac_appeals where restriction_id = r.id;
  return jsonb_build_object(
    'restricted', true,
    'id', r.id,
    'kind', r.kind,
    'permanent', r.ends_at is null,
    'until', r.ends_at,
    'since', r.starts_at,
    'reason', case r.reason
      when 'tampering' then 'The game received data our official client does not send.'
      when 'admin' then 'A moderator reviewed this account.'
      else 'Our fair-play systems found repeated evidence of unfair play on this account.' end,
    'appeal', case when ap.id is null then null else jsonb_build_object(
      'status', ap.status, 'created_at', ap.created_at, 'decided_at', ap.decided_at) end,
    'can_appeal', ap.id is null);
end;
$$;

create or replace function public.fps_ac_admin_overview(p_filter jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  f_mode text := nullif(p_filter->>'mode', '');
  f_q text := nullif(btrim(coalesce(p_filter->>'q', '')), '');
  f_from timestamptz := nullif(p_filter->>'from', '')::timestamptz;
  f_to timestamptz := nullif(p_filter->>'to', '')::timestamptz;
  f_level smallint := coalesce(nullif(p_filter->>'min_level', '')::smallint, 1);
  f_limit integer := least(200, greatest(1, coalesce((p_filter->>'limit')::int, 100)));
  users uuid[];
begin
  perform public._require_admin_stepup();
  if f_q is not null then
    select array_agg(p.id) into users from public.profiles p
    where p.id::text = f_q or starts_with(lower(p.username), lower(f_q));
    users := coalesce(users, '{}');
  end if;
  return jsonb_build_object(
    'config', (select jsonb_build_object('mode', c.mode, 'thresholds', c.thresholds,
        'safety_tripped_at', c.safety_tripped_at, 'safety_reason', c.safety_reason,
        'updated_at', c.updated_at) from public.fps_ac_config c where c.id),
    'counts', jsonb_build_object(
      'flagged', (select count(*) from public.fps_ac_accounts where level >= 1),
      'high', (select count(*) from public.fps_ac_accounts where level >= 2),
      'restricted', (select count(*) from public.fps_ac_restrictions where enforced
        and fps_private.ac_should_enforce(source, kind) and revoked_at is null and (ends_at is null or ends_at > now())),
      'would', (select count(*) from public.fps_ac_restrictions where not enforced
        and created_at > now() - interval '7 days'),
      'appeals_open', (select count(*) from public.fps_ac_appeals where status = 'open'),
      'auto_24h', (select count(*) from public.fps_ac_events where automated
        and kind in ('restriction', 'would_restrict') and created_at > now() - interval '1 day')),
    'accounts', coalesce((select jsonb_agg(x order by x->>'level' desc, x->>'updated_at' desc) from (
      select jsonb_build_object('user_id', a.user_id, 'username', p.username, 'level', a.level,
        'families', a.families, 'matches', a.matches, 'modes', a.modes,
        'canary', jsonb_build_object('decisive', a.canary_decisive, 'won', a.canary_won,
          'log_e', round(a.canary_log_e::numeric, 2)),
        'protocol', jsonb_build_object('matches', a.protocol_matches, 'rejects', a.protocol_rejects),
        'updated_at', a.updated_at, 'cleared_at', a.cleared_at) x
      from public.fps_ac_accounts a left join public.profiles p on p.id = a.user_id
      where a.level >= f_level
        and (users is null or a.user_id = any (users))
        and (f_mode is null or f_mode = any (a.modes))
        and (f_from is null or a.updated_at >= f_from) and (f_to is null or a.updated_at < f_to)
      order by a.level desc, a.updated_at desc limit f_limit) s), '[]'::jsonb),
    'restrictions', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
      select jsonb_build_object('id', r.id, 'user_id', r.user_id, 'username', p.username,
        'kind', r.kind, 'level', r.level, 'starts_at', r.starts_at, 'ends_at', r.ends_at,
        'enforced', r.enforced, 'source', r.source, 'reason', r.reason, 'evidence', r.evidence,
        'created_at', r.created_at, 'revoked_at', r.revoked_at, 'revoke_note', r.revoke_note,
        'status', case when r.revoked_at is not null then 'revoked'
          when not r.enforced then 'recorded'
          when r.ends_at is not null and r.ends_at <= now() then 'expired'
          when not fps_private.ac_should_enforce(r.source, r.kind) then 'paused' else 'active' end) x
      from public.fps_ac_restrictions r left join public.profiles p on p.id = r.user_id
      where (users is null or r.user_id = any (users))
        and (f_from is null or r.created_at >= f_from) and (f_to is null or r.created_at < f_to)
        and r.level >= f_level
      order by r.created_at desc limit f_limit) s), '[]'::jsonb),
    'appeals', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
      select jsonb_build_object('id', ap.id, 'restriction_id', ap.restriction_id,
        'user_id', ap.user_id, 'username', p.username, 'message', ap.message,
        'status', ap.status, 'created_at', ap.created_at, 'decided_at', ap.decided_at,
        'decision_note', ap.decision_note) x
      from public.fps_ac_appeals ap left join public.profiles p on p.id = ap.user_id
      where (users is null or ap.user_id = any (users))
      order by (ap.status = 'open') desc, ap.created_at desc limit f_limit) s), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
      select jsonb_build_object('id', e.id, 'user_id', e.user_id, 'username', p.username,
        'kind', e.kind, 'level', e.level, 'automated', e.automated, 'actor', e.actor,
        'detail', e.detail, 'created_at', e.created_at) x
      from public.fps_ac_events e left join public.profiles p on p.id = e.user_id
      where (users is null or e.user_id = any (users))
        and (f_from is null or e.created_at >= f_from) and (f_to is null or e.created_at < f_to)
      order by e.created_at desc limit f_limit) s), '[]'::jsonb));
end;
$$;

commit;
