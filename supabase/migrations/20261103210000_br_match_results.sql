-- Battle royale practice results (PLAN §7 Phase 3, §11.2 "Database"): one row per match and
-- one per participant, written once per match by the BrRoom Durable Object when the match
-- ends, idempotent by match id (a retried write changes nothing). Free practice only: no
-- money, no ledger, no rewards (paid matches are Phase 5).
--
-- Applied to production on 2026-11-13 (owner's go-ahead; docs/DATABASE-RELEASES.md).

create table if not exists public.br_matches (
  id uuid primary key,
  mode text not null default 'practice' check (mode in ('practice')),
  winner_user uuid references auth.users (id) on delete set null,
  winner_name text,
  players integer not null check (players between 1 and 150),
  humans integer not null check (humans between 0 and 150),
  ended_at timestamptz not null default now(),
  version integer not null default 1
);

create table if not exists public.br_match_players (
  match_id uuid not null references public.br_matches (id) on delete cascade,
  seat integer not null check (seat between 0 and 149),
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  bot boolean not null,
  place integer not null check (place between 1 and 150),
  kills integer not null check (kills >= 0),
  damage integer not null check (damage >= 0),
  survived_ms integer not null check (survived_ms >= 0),
  primary key (match_id, seat)
);
create index if not exists br_match_players_user_idx
  on public.br_match_players (user_id, match_id) where user_id is not null;

alter table public.br_matches enable row level security;
alter table public.br_match_players enable row level security;

-- Signed-in players read match summaries and their own rows; nobody writes from the client.
create policy br_matches_read on public.br_matches
  for select to authenticated using (true);
create policy br_match_players_read_own on public.br_match_players
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.br_matches, public.br_match_players from anon, authenticated;

-- The room's single write: the whole result in one transaction; a second call is a no-op.
create or replace function public.br_record_result(p_match uuid, p_result jsonb)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  inserted boolean;
begin
  if jsonb_typeof(p_result -> 'players') is distinct from 'array'
     or jsonb_array_length(p_result -> 'players') not between 1 and 150 then
    raise exception 'INVALID_RESULT';
  end if;
  insert into public.br_matches (id, winner_user, winner_name, players, humans)
  values (
    p_match,
    nullif(p_result ->> 'winnerUser', '')::uuid,
    left(p_result ->> 'winnerName', 40),
    jsonb_array_length(p_result -> 'players'),
    (select count(*) from jsonb_array_elements(p_result -> 'players') p where not (p ->> 'bot')::boolean)
  )
  on conflict (id) do nothing
  returning true into inserted;
  if inserted is null then
    return false;
  end if;
  insert into public.br_match_players
    (match_id, seat, user_id, name, bot, place, kills, damage, survived_ms)
  select p_match, r.seat, case when r.bot then null else r.id::uuid end, left(r.name, 40), r.bot,
         r.place, r.kills, r.damage, least(r.survived_ms, 2147483647)
  from jsonb_to_recordset(p_result -> 'players')
    as r(seat integer, id text, name text, bot boolean, place integer, kills integer,
         damage integer, survived_ms bigint);
  return true;
end;
$function$;
revoke all on function public.br_record_result(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.br_record_result(uuid, jsonb) to service_role;
