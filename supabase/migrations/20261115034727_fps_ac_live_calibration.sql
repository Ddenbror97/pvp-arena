begin;

-- Live calibration is deliberately separate from match-based enforcement votes.
-- A segment is one in-memory human tally: reconnects to the same room continue it;
-- a bot takeover or Worker restart starts another. Retries update, never append shots.
create table public.fps_ac_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id text not null check (length(match_id) between 1 and 64),
  segment_id uuid not null,
  mode text not null check (mode in ('duel', 'bomb', 'br')),
  sequence bigint not null check (sequence > 0),
  reason text not null check (reason in ('kill', 'periodic', 'leave', 'completed')),
  shots integer not null check (shots between 0 and 10000000),
  hits integer not null check (hits between 0 and 10000000),
  heads integer not null check (heads between 0 and hits),
  kills integer not null check (kills between 0 and 1000000),
  detail jsonb not null check (pg_column_size(detail) <= 8192),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id, segment_id)
);
create index fps_ac_progress_recent on public.fps_ac_progress(updated_at desc);
alter table public.fps_ac_progress enable row level security;
revoke all on public.fps_ac_progress from public, anon, authenticated;
grant select, insert, update, delete on public.fps_ac_progress to service_role;

-- The trusted room supplies the counters, never the browser. This function does not
-- call _fps_ac_evaluate or alter restrictions/config/account match counters.
create or replace function public.fps_ac_checkpoint(p_rows jsonb)
-- Supabase service_role cannot read auth.users directly. Definer access is limited
-- to this existence check/write; EXECUTE remains revoked from every browser role.
returns void language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 120 then
    raise exception 'INVALID_CALIBRATION_BATCH';
  end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if not exists (select 1 from auth.users where id = (r->>'user')::uuid) then continue; end if;
    insert into public.fps_ac_progress as p
      (user_id, match_id, segment_id, mode, sequence, reason, shots, hits, heads, kills, detail)
    values ((r->>'user')::uuid, r->>'match', (r->>'segment')::uuid, r->>'mode',
      (r->>'sequence')::bigint, r->>'reason',
      coalesce((r->'detail'->>'shots')::int, 0), coalesce((r->'detail'->>'hits')::int, 0),
      coalesce((r->'detail'->>'heads')::int, 0), coalesce((r->'detail'->>'kills')::int, 0), r)
    on conflict (user_id, match_id, segment_id) do update set
      sequence = excluded.sequence, reason = excluded.reason, shots = excluded.shots,
      hits = excluded.hits, heads = excluded.heads, kills = excluded.kills,
      detail = excluded.detail, updated_at = now()
    where excluded.sequence > p.sequence and excluded.mode = p.mode
      and excluded.shots >= p.shots and excluded.hits >= p.hits
      and excluded.heads >= p.heads and excluded.kills >= p.kills;
  end loop;
end;
$$;
revoke all on function public.fps_ac_checkpoint(jsonb) from public, anon, authenticated;
grant execute on function public.fps_ac_checkpoint(jsonb) to service_role;

-- One calibration row per HUMAN and match. Never union a finished report with
-- that match's progress: both describe the same shots. Historical matches remain usable.
create view public.fps_ac_calibration with (security_invoker = true) as
  select user_id, match_id, mode, sum(shots)::bigint shots, sum(hits)::bigint hits,
    sum(heads)::bigint heads, sum(kills)::bigint kills,
    min(created_at) created_at, max(updated_at) updated_at,
    bool_or(reason = 'completed') completed, count(*)::int segments
  from public.fps_ac_progress group by user_id, match_id, mode
  union all
  select e.user_id, e.match_id, e.mode, coalesce((e.detail->>'shots')::bigint, 0),
    coalesce((e.detail->>'hits')::bigint, 0), coalesce((e.detail->>'heads')::bigint, 0),
    null::bigint, e.created_at, e.created_at, true, 0
  from public.fps_ac_evidence e where not exists
    (select 1 from public.fps_ac_progress p where p.user_id = e.user_id and p.match_id = e.match_id);
revoke all on public.fps_ac_calibration from public, anon, authenticated;
grant select on public.fps_ac_calibration to service_role;

create or replace function public.fps_ac_admin_calibration(p_user uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin_stepup();
  return coalesce((select jsonb_agg(to_jsonb(c) order by c.updated_at desc) from (
    select c.*, p.username from public.fps_ac_calibration c
    left join public.profiles p on p.id = c.user_id
    where (p_user is null or c.user_id = p_user)
    order by c.updated_at desc limit 100
  ) c), '[]'::jsonb);
end;
$$;
revoke all on function public.fps_ac_admin_calibration(uuid) from public, anon;
grant execute on function public.fps_ac_admin_calibration(uuid) to authenticated, service_role;
comment on table public.fps_ac_progress is 'Human-only live calibration segments; cumulative checkpoints, not enforcement votes. Latest evidence payload preserves aim/canary context.';

commit;
