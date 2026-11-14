-- FPS anti-cheat: evidence, automatic decisions, restrictions, appeals and the admin console
-- (owner, 2026-11-14: "Build Automatic Anti-Cheat Enforcement — All Three FPS Games").
--
-- The game rooms (Cloudflare Workers) score each human per match (anticheat/evidence.ts) and
-- submit one row per player when the match ends: never per tick. Everything here is
-- server-side: the browser can read only its own restriction notice and file an appeal.
--
-- Independent evidence families, each counted once per match (the correlated aim statistics
-- are one family, never several votes):
--   aim      flicks, reactions, head share, smoothing, trigger timing   (statistical; max L2)
--   tracking following hidden enemies' bearing                         (statistical; max L2)
--   canary   wallhack canaries: randomised, exact e-value               (L1-L4)
--   protocol messages the official client never sends                  (server-verified; L1-L4)
-- Levels: 1 suspicious (record), 2 high suspicion (prioritised), 3 high confidence (temporary
-- competitive restriction), 4 confirmed (ban: 7 d, 30 d, permanent). Aim or tracking alone can
-- never pass level 2; level 3 needs an exact or server-verified family, or two independent
-- statistical families together. Permanent needs particularly strong canary or protocol
-- evidence after an earlier ban.
--
-- Rollout: `fps_ac_config.mode` 'shadow' (default: decisions recorded as "would", nothing
-- enforced), 'validated' (temporary competitive restrictions enforced, bans recorded only),
-- 'full'. A safety switch drops to shadow on an unusual number of decisions. The Workers also
-- read restrictions only with FPS_AC_ENFORCE=1 (default off): until both are turned on, play is
-- exactly as before. Thresholds live in `fps_ac_config.thresholds` and are NOT calibrated on
-- real players yet.
begin;

-- ---------------------------------------------------------------- tables

create table public.fps_ac_config (
  id boolean primary key default true check (id),
  mode text not null default 'shadow' check (mode in ('shadow', 'validated', 'full')),
  thresholds jsonb not null,
  safety_tripped_at timestamptz,
  safety_reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.fps_ac_config (thresholds) values (jsonb_build_object(
  -- Statistical families: matches with a strong (level 2) or notable (1) aim/tracking result.
  'aim_l2_matches', 3,
  'track_l2_matches', 2,
  -- Canary: ln(e) thresholds (e-value: honest play reaches 1/alpha with probability <= alpha)
  -- and the decisive trials each needs.
  'canary_l1', ln(10), 'canary_l2', ln(1000),
  'canary_l3', ln(1e6), 'canary_l3_min', 30,
  'canary_l4', ln(1e9), 'canary_l4_min', 50,
  'canary_perm', ln(1e12), 'canary_perm_min', 80,
  -- Protocol tampering: matches with rejected messages, and rejects in all.
  'proto_l2_matches', 2, 'proto_l3_matches', 3,
  'proto_l4_matches', 5, 'proto_l4_rejects', 20,
  -- A second decision needs this much new evidence since the last one.
  'repeat_canary_trials', 20, 'repeat_proto_matches', 2,
  -- Safety switch: enforced automatic decisions per hour / per day, accounts newly at level 2+
  -- per hour.
  'safety_per_hour', 10, 'safety_per_day', 60, 'safety_flags_per_hour', 100
));

/** One row per player per match: what the room measured. */
create table public.fps_ac_evidence (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id text not null check (length(match_id) between 1 and 64),
  mode text not null check (mode in ('duel', 'bomb', 'br')),
  created_at timestamptz not null default now(),
  aim_level smallint not null default 0 check (aim_level between 0 and 2),
  tracking_level smallint not null default 0 check (tracking_level between 0 and 2),
  canary_trials integer not null default 0 check (canary_trials between 0 and 1000),
  canary_decisive integer not null default 0 check (canary_decisive between 0 and canary_trials),
  canary_won integer not null default 0 check (canary_won between 0 and canary_decisive),
  protocol_rejects integer not null default 0 check (protocol_rejects between 0 and 10000),
  detail jsonb not null default '{}'::jsonb check (pg_column_size(detail) <= 8192),
  unique (user_id, match_id)
);
create index fps_ac_evidence_user on public.fps_ac_evidence (user_id, created_at desc);
create index fps_ac_evidence_time on public.fps_ac_evidence (created_at desc);

/** Per account: the running totals the decision reads (one indexed row, no scans). */
create table public.fps_ac_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  matches integer not null default 0,
  modes text[] not null default '{}',
  aim_notable_matches integer not null default 0,
  aim_strong_matches integer not null default 0,
  tracking_notable_matches integer not null default 0,
  tracking_strong_matches integer not null default 0,
  canary_trials integer not null default 0,
  canary_decisive integer not null default 0,
  canary_won integer not null default 0,
  canary_log_e double precision not null default 0,
  protocol_matches integer not null default 0,
  protocol_rejects integer not null default 0,
  level smallint not null default 0 check (level between 0 and 4),
  families jsonb not null default '{}'::jsonb,
  -- The evidence at the last automatic decision (a new one needs new evidence).
  last_action_at timestamptz,
  last_action_canary_decisive integer not null default 0,
  last_action_protocol_matches integer not null default 0,
  cleared_at timestamptz,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fps_ac_accounts_level on public.fps_ac_accounts (level desc, updated_at desc)
  where level > 0;

create table public.fps_ac_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('competitive', 'ban')),
  level smallint not null check (level between 1 and 4),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  -- false: recorded only ("would have"), in shadow mode or with the safety switch tripped.
  enforced boolean not null,
  source text not null check (source in ('auto', 'admin')),
  reason text not null default 'fair_play' check (reason in ('fair_play', 'tampering', 'admin')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_note text,
  check (ends_at is null or ends_at > starts_at)
);
-- The join check: an enforced, unrevoked restriction of this user (a handful of rows at most).
create index fps_ac_restrictions_live on public.fps_ac_restrictions (user_id, ends_at)
  where enforced and revoked_at is null;
create index fps_ac_restrictions_time on public.fps_ac_restrictions (created_at desc);

create table public.fps_ac_appeals (
  id uuid primary key default gen_random_uuid(),
  restriction_id uuid not null references public.fps_ac_restrictions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null check (length(message) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'upheld', 'overturned')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid,
  decision_note text check (decision_note is null or length(decision_note) <= 2000),
  unique (restriction_id)
);
create index fps_ac_appeals_open on public.fps_ac_appeals (created_at) where status = 'open';
create index fps_ac_appeals_user on public.fps_ac_appeals (user_id, created_at desc);

/** Append-only audit trail of every automatic and manual decision. */
create table public.fps_ac_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  kind text not null check (kind in (
    'level', 'restriction', 'would_restrict', 'safety_switch', 'admin', 'appeal', 'config')),
  level smallint,
  automated boolean not null,
  actor uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index fps_ac_events_user on public.fps_ac_events (user_id, created_at desc);
create index fps_ac_events_time on public.fps_ac_events (created_at desc);
create index fps_ac_events_kind on public.fps_ac_events (kind, created_at desc);

create or replace function public._fps_ac_append_only()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'FPS_AC_AUDIT_APPEND_ONLY';
end;
$$;
create trigger fps_ac_events_append_only before update or delete on public.fps_ac_events
  for each row execute function public._fps_ac_append_only();

-- RLS on, no policies: browsers reach these only through the functions below.
alter table public.fps_ac_config enable row level security;
alter table public.fps_ac_evidence enable row level security;
alter table public.fps_ac_accounts enable row level security;
alter table public.fps_ac_restrictions enable row level security;
alter table public.fps_ac_appeals enable row level security;
alter table public.fps_ac_events enable row level security;
revoke all on public.fps_ac_config, public.fps_ac_evidence, public.fps_ac_accounts,
  public.fps_ac_restrictions, public.fps_ac_appeals, public.fps_ac_events
  from public, anon, authenticated;
grant all on public.fps_ac_config, public.fps_ac_evidence, public.fps_ac_accounts,
  public.fps_ac_restrictions, public.fps_ac_appeals, public.fps_ac_events to service_role;

-- ---------------------------------------------------------------- decision

/** ln of the canary e-value (mixture over p = 0.6, 0.75, 0.9; the same as canary.ts). */
create or replace function public._fps_ac_canary_log_e(p_decisive integer, p_won integer)
returns double precision language sql immutable set search_path = public as $$
  select m + ln((exp(t1 - m) + exp(t2 - m) + exp(t3 - m)) / 3)
  from (select t1, t2, t3, greatest(t1, t2, t3) m
        from (select p_won * ln(1.2) + (p_decisive - p_won) * ln(0.8) t1,
                     p_won * ln(1.5) + (p_decisive - p_won) * ln(0.5) t2,
                     p_won * ln(1.8) + (p_decisive - p_won) * ln(0.2) t3) a) b
$$;

/**
 * The level of an account and what it means now. Pure: reads the account and the thresholds,
 * decides; `_fps_ac_evaluate` acts. Returns {level, families, action, kind, days}.
 */
create or replace function public._fps_ac_assess(a public.fps_ac_accounts, t jsonb)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  aim smallint := case when a.aim_strong_matches >= (t->>'aim_l2_matches')::int then 2
                       when a.aim_strong_matches + a.aim_notable_matches > 0 then 1 else 0 end;
  track smallint := case when a.tracking_strong_matches >= (t->>'track_l2_matches')::int then 2
                         when a.tracking_strong_matches + a.tracking_notable_matches > 0 then 1
                         else 0 end;
  canary smallint := case
    when a.canary_log_e >= (t->>'canary_l4')::float8 and a.canary_decisive >= (t->>'canary_l4_min')::int then 4
    when a.canary_log_e >= (t->>'canary_l3')::float8 and a.canary_decisive >= (t->>'canary_l3_min')::int then 3
    when a.canary_log_e >= (t->>'canary_l2')::float8 then 2
    when a.canary_log_e >= (t->>'canary_l1')::float8 then 1 else 0 end;
  proto smallint := case
    when a.protocol_matches >= (t->>'proto_l4_matches')::int and a.protocol_rejects >= (t->>'proto_l4_rejects')::int then 4
    when a.protocol_matches >= (t->>'proto_l3_matches')::int then 3
    when a.protocol_matches >= (t->>'proto_l2_matches')::int then 2
    when a.protocol_matches > 0 then 1 else 0 end;
  lvl smallint;
  fresh boolean;
begin
  -- Statistical families stop at 2; two of them together (aim with tracking, or with a canary
  -- record already at 2) make 3. Never more from statistics alone.
  lvl := greatest(aim, track, canary, proto);
  if aim = 2 and (track = 2 or canary >= 2) then lvl := greatest(lvl, 3); end if;
  -- A new decision needs new evidence since the last one.
  fresh := a.last_action_at is null
    or a.canary_decisive - a.last_action_canary_decisive >= (t->>'repeat_canary_trials')::int
    or a.protocol_matches - a.last_action_protocol_matches >= (t->>'repeat_proto_matches')::int;
  return jsonb_build_object(
    'level', lvl, 'fresh', fresh,
    'families', jsonb_build_object('aim', aim, 'tracking', track, 'canary', canary,
      'protocol', proto, 'canary_log_e', round(a.canary_log_e::numeric, 2)),
    -- A ban only from an exact or server-verified family; permanent only with a very strong
    -- record (checked against the history in `_fps_ac_evaluate`).
    'ban', lvl >= 4 and (canary >= 4 or proto >= 4),
    'permanent_eligible',
      (a.canary_log_e >= (t->>'canary_perm')::float8 and a.canary_decisive >= (t->>'canary_perm_min')::int)
      or (proto >= 4 and canary >= 3));
end;
$$;

/** Re-assess an account and act on it under the current mode and safety switch. */
create or replace function public._fps_ac_evaluate(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  cfg public.fps_ac_config;
  a public.fps_ac_accounts;
  r jsonb;
  lvl smallint;
  v_kind text;
  v_days integer;
  v_enforce boolean;
  v_prior integer;
  v_trip text;
  v_live text;
begin
  select * into cfg from public.fps_ac_config where id;
  select * into a from public.fps_ac_accounts where user_id = p_user for update;
  if not found then return null; end if;
  r := public._fps_ac_assess(a, cfg.thresholds);
  lvl := (r->>'level')::smallint;
  if lvl is distinct from a.level then
    insert into public.fps_ac_events (user_id, kind, level, automated, detail)
    values (p_user, 'level', lvl, true, jsonb_build_object('from', a.level, 'families', r->'families'));
  end if;
  update public.fps_ac_accounts set level = lvl, families = r->'families', updated_at = now()
  where user_id = p_user;
  if lvl < 3 or not (r->>'fresh')::boolean then return r; end if;

  -- What this level calls for, from the history of decisions of the same standing.
  if lvl >= 4 and (r->>'ban')::boolean then
    v_kind := 'ban';
  else
    v_kind := 'competitive';
  end if;
  -- Already restricted at least this much: nothing new.
  select x.kind into v_live from public.fps_ac_restrictions x
  where x.user_id = p_user and x.revoked_at is null and x.starts_at <= now()
    and (x.ends_at is null or x.ends_at > now())
  order by (x.kind = 'ban') desc limit 1;
  if v_live = 'ban' or v_live = v_kind then return r; end if;

  v_enforce := case cfg.mode when 'full' then true when 'validated' then v_kind = 'competitive' else false end
    and cfg.safety_tripped_at is null;
  select count(*) into v_prior from public.fps_ac_restrictions x
  where x.user_id = p_user and x.source = 'auto' and x.kind = v_kind and x.enforced = v_enforce;
  if v_kind = 'competitive' then
    v_days := case when v_prior = 0 then 1 else 7 end;
  else
    v_days := case when v_prior = 0 then 7
                   when v_prior >= 2 and (r->>'permanent_eligible')::boolean then null
                   else 30 end;
  end if;

  -- Safety switch: an unusual number of enforced decisions (or of accounts newly flagged)
  -- stops enforcement until an admin looks. A sudden wave is far likelier a bug than cheaters.
  if v_enforce then
    if (select count(*) from public.fps_ac_restrictions
        where source = 'auto' and enforced and created_at > now() - interval '1 hour')
        >= (cfg.thresholds->>'safety_per_hour')::int then
      v_trip := 'enforced decisions per hour';
    elsif (select count(*) from public.fps_ac_restrictions
        where source = 'auto' and enforced and created_at > now() - interval '1 day')
        >= (cfg.thresholds->>'safety_per_day')::int then
      v_trip := 'enforced decisions per day';
    elsif (select count(distinct user_id) from public.fps_ac_events
        where kind = 'level' and level >= 2 and created_at > now() - interval '1 hour')
        >= (cfg.thresholds->>'safety_flags_per_hour')::int then
      v_trip := 'accounts flagged per hour';
    end if;
    if v_trip is not null then
      update public.fps_ac_config set safety_tripped_at = now(), safety_reason = v_trip,
        updated_at = now() where id;
      insert into public.fps_ac_events (user_id, kind, automated, detail)
      values (null, 'safety_switch', true, jsonb_build_object('reason', v_trip));
      v_enforce := false;
    end if;
  end if;

  insert into public.fps_ac_restrictions (user_id, kind, level, ends_at, enforced, source, reason,
    evidence)
  values (p_user, v_kind, lvl, case when v_days is null then null else now() + make_interval(days => v_days) end,
    v_enforce, 'auto', case when (r->'families'->>'protocol')::int >= 3 then 'tampering' else 'fair_play' end,
    jsonb_build_object('families', r->'families', 'matches', a.matches,
      'canary', jsonb_build_object('decisive', a.canary_decisive, 'won', a.canary_won),
      'protocol', jsonb_build_object('matches', a.protocol_matches, 'rejects', a.protocol_rejects)));
  insert into public.fps_ac_events (user_id, kind, level, automated, detail)
  values (p_user, case when v_enforce then 'restriction' else 'would_restrict' end, lvl, true,
    jsonb_build_object('kind', v_kind, 'days', v_days, 'mode', cfg.mode, 'families', r->'families'));
  update public.fps_ac_accounts set last_action_at = now(),
    last_action_canary_decisive = canary_decisive, last_action_protocol_matches = protocol_matches
  where user_id = p_user;
  return r || jsonb_build_object('action', v_kind, 'days', v_days, 'enforced', v_enforce);
end;
$$;

-- ---------------------------------------------------------------- the rooms (service only)

/**
 * A finished match's evidence: one row per human player. Idempotent per (user, match): a
 * replayed submission changes nothing. Returns each player's assessment.
 */
create or replace function public.fps_ac_submit(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_user uuid;
  v_match text;
  v_mode text;
  v_aim smallint;
  v_track smallint;
  v_trials integer;
  v_decisive integer;
  v_won integer;
  v_rejects integer;
  v_out jsonb := '[]'::jsonb;
  v_inserted integer;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 120 then
    raise exception 'INVALID_EVIDENCE_BATCH';
  end if;
  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_user := (v_row->>'user')::uuid;
    v_match := v_row->>'match';
    v_mode := v_row->>'mode';
    v_aim := least(2, greatest(0, coalesce((v_row->>'aim')::int, 0)));
    v_track := least(2, greatest(0, coalesce((v_row->>'tracking')::int, 0)));
    v_trials := least(1000, greatest(0, coalesce((v_row->'canary'->>'trials')::int, 0)));
    v_decisive := least(v_trials, greatest(0, coalesce((v_row->'canary'->>'decisive')::int, 0)));
    v_won := least(v_decisive, greatest(0, coalesce((v_row->'canary'->>'won')::int, 0)));
    v_rejects := least(10000, greatest(0, coalesce((v_row->>'protocol')::int, 0)));
    if not exists (select 1 from auth.users where id = v_user) then continue; end if;
    insert into public.fps_ac_evidence (user_id, match_id, mode, aim_level, tracking_level,
      canary_trials, canary_decisive, canary_won, protocol_rejects, detail)
    values (v_user, v_match, v_mode, v_aim, v_track, v_trials, v_decisive, v_won, v_rejects,
      coalesce(v_row->'detail', '{}'::jsonb))
    on conflict (user_id, match_id) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then continue; end if;
    insert into public.fps_ac_accounts as a (user_id, matches, modes, aim_notable_matches,
      aim_strong_matches, tracking_notable_matches, tracking_strong_matches, canary_trials,
      canary_decisive, canary_won, protocol_matches, protocol_rejects)
    values (v_user, 1, array[v_mode], (v_aim = 1)::int, (v_aim = 2)::int, (v_track = 1)::int,
      (v_track = 2)::int, v_trials, v_decisive, v_won, (v_rejects > 0)::int, v_rejects)
    on conflict (user_id) do update set
      matches = a.matches + 1,
      modes = case when v_mode = any (a.modes) then a.modes else a.modes || v_mode end,
      aim_notable_matches = a.aim_notable_matches + (v_aim = 1)::int,
      aim_strong_matches = a.aim_strong_matches + (v_aim = 2)::int,
      tracking_notable_matches = a.tracking_notable_matches + (v_track = 1)::int,
      tracking_strong_matches = a.tracking_strong_matches + (v_track = 2)::int,
      canary_trials = a.canary_trials + v_trials,
      canary_decisive = a.canary_decisive + v_decisive,
      canary_won = a.canary_won + v_won,
      protocol_matches = a.protocol_matches + (v_rejects > 0)::int,
      protocol_rejects = a.protocol_rejects + v_rejects,
      updated_at = now();
    update public.fps_ac_accounts
    set canary_log_e = public._fps_ac_canary_log_e(canary_decisive, canary_won)
    where user_id = v_user;
    v_out := v_out || jsonb_build_array(jsonb_build_object('user', v_user, 'assessment',
      public._fps_ac_evaluate(v_user)));
  end loop;
  return v_out;
end;
$$;

/**
 * The join check with restrictions: the v1 check (session live, account not banned in Auth)
 * and no enforced anti-cheat restriction for this scope. 'competitive': matches with other
 * players (a competitive restriction or a ban refuses); 'practice': solo practice (only a ban
 * refuses). Expiry is the clock: an ended restriction stops counting the moment it ends, after
 * any restart or reconnect.
 */
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
        and r.starts_at <= statement_timestamp()
        and (r.ends_at is null or r.ends_at > statement_timestamp())
        and (r.kind = 'ban' or p_scope = 'competitive')
      order by (r.kind = 'ban') desc, r.ends_at desc nulls first
      limit 1
    ) x on true
  ), '[]'::jsonb);
end;
$fn$;
revoke all on function fps_private.check_sessions_v2(jsonb, text) from public, anon, authenticated;
grant execute on function fps_private.check_sessions_v2(jsonb, text) to service_role;

create or replace function public.fps_check_sessions_v2(p_sessions jsonb, p_scope text)
returns jsonb language sql stable security invoker
set search_path = pg_catalog
as $fn$ select fps_private.check_sessions_v2(p_sessions, p_scope) $fn$;

-- ---------------------------------------------------------------- players

/**
 * The caller's own restriction, as the player may see it: temporary or permanent, until when,
 * a general reason, and the appeal. Never the evidence, the levels or any threshold.
 */
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

/** Appeal the caller's current restriction (one appeal per restriction). */
create or replace function public.fps_ac_appeal(p_restriction uuid, p_message text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  msg text := btrim(coalesce(p_message, ''));
  v_id uuid;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  if length(msg) < 10 or length(msg) > 2000 then raise exception 'APPEAL_LENGTH'; end if;
  if not exists (select 1 from public.fps_ac_restrictions x
      where x.id = p_restriction and x.user_id = uid and x.enforced and x.revoked_at is null
        and (x.ends_at is null or x.ends_at > now() - interval '30 days')) then
    raise exception 'NOT_FOUND';
  end if;
  insert into public.fps_ac_appeals (restriction_id, user_id, message)
  values (p_restriction, uid, msg)
  on conflict (restriction_id) do nothing
  returning fps_ac_appeals.id into v_id;
  if v_id is null then raise exception 'APPEAL_EXISTS'; end if;
  insert into public.fps_ac_events (user_id, kind, automated, actor, detail)
  values (uid, 'appeal', false, uid, jsonb_build_object('appeal', v_id, 'restriction', p_restriction));
  return jsonb_build_object('id', v_id, 'status', 'open');
end;
$$;

-- ---------------------------------------------------------------- admins

/** Flagged accounts, restrictions, appeals and recent automatic decisions, filtered. */
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
        and revoked_at is null and (ends_at is null or ends_at > now())),
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
          when r.ends_at is not null and r.ends_at <= now() then 'expired' else 'active' end) x
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

/** One account in full: totals, match-by-match evidence, restrictions, appeals, audit trail. */
create or replace function public.fps_ac_admin_player(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin_stepup();
  return jsonb_build_object(
    'account', (select to_jsonb(a) || jsonb_build_object('username', p.username)
      from public.fps_ac_accounts a left join public.profiles p on p.id = a.user_id
      where a.user_id = p_user),
    'evidence', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (
      select * from public.fps_ac_evidence where user_id = p_user
      order by created_at desc limit 200) e), '[]'::jsonb),
    'restrictions', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from public.fps_ac_restrictions r where r.user_id = p_user), '[]'::jsonb),
    'appeals', coalesce((select jsonb_agg(to_jsonb(ap) order by ap.created_at desc)
      from public.fps_ac_appeals ap where ap.user_id = p_user), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (
      select * from public.fps_ac_events where user_id = p_user
      order by created_at desc limit 200) e), '[]'::jsonb));
end;
$$;

/**
 * An admin decision, always with a note, always in the audit trail:
 *  'revoke' (a restriction: unban), 'extend' (a restriction: +p_days, or permanent when null),
 *  'restrict' (an account: p_kind for p_days, permanent when null), 'clear' (an account: the
 *  evidence so far no longer counts), 'uphold' / 'overturn' (an appeal; overturn revokes).
 */
create or replace function public.fps_ac_admin_act(
  p_action text, p_target uuid, p_note text, p_days integer default null,
  p_kind text default 'competitive')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  note text := btrim(coalesce(p_note, ''));
  r public.fps_ac_restrictions;
  ap public.fps_ac_appeals;
  a public.fps_ac_accounts;
  target_user uuid;
begin
  perform public._require_admin_stepup();
  if length(note) < 3 or length(note) > 2000 then raise exception 'NOTE_REQUIRED'; end if;
  if p_days is not null and (p_days < 1 or p_days > 3650) then raise exception 'INVALID_DAYS'; end if;
  if p_action in ('revoke', 'extend') then
    select * into r from public.fps_ac_restrictions where id = p_target for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    target_user := r.user_id;
    if p_action = 'revoke' then
      update public.fps_ac_restrictions set revoked_at = now(), revoked_by = uid, revoke_note = note
      where id = r.id and revoked_at is null;
    else
      update public.fps_ac_restrictions
      set ends_at = case when p_days is null then null
                         else greatest(coalesce(ends_at, now()), now()) + make_interval(days => p_days) end,
          enforced = true
      where id = r.id;
    end if;
  elsif p_action = 'restrict' then
    if p_kind not in ('competitive', 'ban') then raise exception 'INVALID_KIND'; end if;
    if not exists (select 1 from auth.users where id = p_target) then raise exception 'NOT_FOUND'; end if;
    target_user := p_target;
    insert into public.fps_ac_restrictions (user_id, kind, level, ends_at, enforced, source,
      reason, created_by)
    values (p_target, p_kind, case when p_kind = 'ban' then 4 else 3 end,
      case when p_days is null then null else now() + make_interval(days => p_days) end,
      true, 'admin', 'admin', uid);
  elsif p_action = 'clear' then
    select * into a from public.fps_ac_accounts where user_id = p_target for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    target_user := p_target;
    update public.fps_ac_accounts set aim_notable_matches = 0, aim_strong_matches = 0,
      tracking_notable_matches = 0, tracking_strong_matches = 0, canary_trials = 0,
      canary_decisive = 0, canary_won = 0, canary_log_e = 0, protocol_matches = 0,
      protocol_rejects = 0, level = 0, families = '{}'::jsonb, last_action_at = null,
      last_action_canary_decisive = 0, last_action_protocol_matches = 0, cleared_at = now(),
      updated_at = now()
    where user_id = p_target;
  elsif p_action in ('uphold', 'overturn') then
    select * into ap from public.fps_ac_appeals where id = p_target for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    if ap.status <> 'open' then raise exception 'APPEAL_DECIDED'; end if;
    target_user := ap.user_id;
    update public.fps_ac_appeals set status = case when p_action = 'uphold' then 'upheld' else 'overturned' end,
      decided_at = now(), decided_by = uid, decision_note = note
    where id = ap.id;
    if p_action = 'overturn' then
      update public.fps_ac_restrictions set revoked_at = now(), revoked_by = uid,
        revoke_note = 'appeal overturned: ' || note
      where id = ap.restriction_id and revoked_at is null;
    end if;
  else
    raise exception 'INVALID_ACTION';
  end if;
  insert into public.fps_ac_events (user_id, kind, automated, actor, detail)
  values (target_user, 'admin', false, uid, jsonb_build_object('action', p_action,
    'target', p_target, 'days', p_days, 'kind', p_kind, 'note', note,
    'account_before', case when p_action = 'clear' then to_jsonb(a) end));
  return jsonb_build_object('ok', true);
end;
$$;

/** The rollout mode and the safety switch's reset (audited). */
create or replace function public.fps_ac_admin_config(p_mode text, p_reset_safety boolean, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_before public.fps_ac_config;
begin
  perform public._require_admin_stepup();
  if p_mode not in ('shadow', 'validated', 'full') then raise exception 'INVALID_MODE'; end if;
  if length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'NOTE_REQUIRED'; end if;
  select * into v_before from public.fps_ac_config where id for update;
  update public.fps_ac_config set mode = p_mode,
    safety_tripped_at = case when p_reset_safety then null else safety_tripped_at end,
    safety_reason = case when p_reset_safety then null else safety_reason end,
    updated_at = now(), updated_by = uid
  where id;
  insert into public.fps_ac_events (kind, automated, actor, detail)
  values ('config', false, uid, jsonb_build_object('from', v_before.mode, 'to', p_mode,
    'reset_safety', p_reset_safety, 'note', p_note));
  return jsonb_build_object('mode', p_mode);
end;
$$;

-- ---------------------------------------------------------------- privileges

revoke all on function public._fps_ac_append_only() from public, anon, authenticated;
revoke all on function public._fps_ac_canary_log_e(integer, integer) from public, anon, authenticated;
revoke all on function public._fps_ac_assess(public.fps_ac_accounts, jsonb) from public, anon, authenticated;
revoke all on function public._fps_ac_evaluate(uuid) from public, anon, authenticated;
revoke all on function public.fps_ac_submit(jsonb) from public, anon, authenticated;
revoke all on function public.fps_check_sessions_v2(jsonb, text) from public, anon, authenticated;
revoke all on function public.fps_ac_my_status() from public, anon;
revoke all on function public.fps_ac_appeal(uuid, text) from public, anon;
revoke all on function public.fps_ac_admin_overview(jsonb) from public, anon;
revoke all on function public.fps_ac_admin_player(uuid) from public, anon;
revoke all on function public.fps_ac_admin_act(text, uuid, text, integer, text) from public, anon;
revoke all on function public.fps_ac_admin_config(text, boolean, text) from public, anon;
grant execute on function public.fps_ac_submit(jsonb) to service_role;
grant execute on function public.fps_check_sessions_v2(jsonb, text) to service_role;
grant execute on function public._fps_ac_evaluate(uuid) to service_role;
grant execute on function public.fps_ac_my_status() to authenticated;
grant execute on function public.fps_ac_appeal(uuid, text) to authenticated;
grant execute on function public.fps_ac_admin_overview(jsonb) to authenticated;
grant execute on function public.fps_ac_admin_player(uuid) to authenticated;
grant execute on function public.fps_ac_admin_act(text, uuid, text, integer, text) to authenticated;
grant execute on function public.fps_ac_admin_config(text, boolean, text) to authenticated;

commit;
