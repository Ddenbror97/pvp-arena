-- Partner leaderboard campaigns.
-- Qualifying activity is settled real-money stakes only:
--   jackpot_entries on COMPLETED real jackpot_games
--   coinflip_entries on COMPLETED real coinflip_games
--   roulette_bets WON/LOST on COMPLETED real roulette_games (stake, not payout)
--   slot_entries on COMPLETED real slot_games (the match stake, not spins or bonus)
-- Cancelled games, refunded roulette bets, and test-credit games are excluded.
-- The campaign host's own stakes do not qualify.
-- One source row can be counted once per campaign (unique source identity).
-- Prize payouts debit house_bankroll and credit user_available. They are not
-- reserved beforehand: approval stores a bankroll snapshot, and a shortfall
-- must be acknowledged. A payout is "paid" only after the ledger transaction
-- commits. This does not bypass partner withdrawal holds.

alter type public.tx_kind add value if not exists 'leaderboard_prize';

insert into public.worker_tick_gate (name) values ('leaderboards') on conflict do nothing;

create table public.leaderboard_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 500),
  version integer not null default 1 check (version >= 1),
  status text not null default 'active' check (status in ('active', 'archived')),
  min_duration_seconds integer not null check (min_duration_seconds >= 3600),
  max_duration_seconds integer not null,
  max_prize_pool_cents bigint not null check (max_prize_pool_cents between 100 and 10000000000),
  allowed_games text[] not null,
  max_tiers integer not null default 10 check (max_tiers between 1 and 20),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint leaderboard_templates_duration check (
    max_duration_seconds >= min_duration_seconds and max_duration_seconds <= 7776000
  ),
  constraint leaderboard_templates_games check (
    cardinality(allowed_games) > 0
    and allowed_games <@ array['jackpot', 'coinflip', 'roulette', 'slott']::text[]
  )
);
alter table public.leaderboard_templates enable row level security;
revoke all on public.leaderboard_templates from public, anon, authenticated;
grant all on public.leaderboard_templates to service_role;

insert into public.leaderboard_templates (
  name, description, min_duration_seconds, max_duration_seconds, max_prize_pool_cents, allowed_games, max_tiers
) values (
  'Turnover race',
  'Rank players by settled real-money stakes. The host does not qualify. Prizes are fixed USD amounts.',
  3600, 2592000, 100000,
  array['jackpot', 'coinflip', 'roulette', 'slott'],
  10
);

create table public.leaderboard_campaigns (
  id uuid primary key default gen_random_uuid(),
  partner_user_id uuid not null references public.partners (user_id),
  template_id uuid not null references public.leaderboard_templates (id),
  template_version integer not null check (template_version >= 1),
  name text not null check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 800),
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'scheduled', 'active', 'closing', 'settling',
    'under_review', 'completed', 'cancelled', 'rejected', 'suspended'
  )),
  visibility text not null default 'public' check (visibility in ('public', 'unlisted')),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  min_wager_cents bigint not null default 0 check (min_wager_cents >= 0 and min_wager_cents <= 100000000),
  games text[] not null,
  prize_pool_cents bigint not null check (prize_pool_cents > 0),
  funding_status text not null default 'unsecured' check (funding_status in ('unsecured', 'checked')),
  bankroll_at_check_cents bigint,
  funding_shortfall boolean not null default false,
  config_snapshot jsonb,
  rules_frozen_at timestamptz,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  cancel_requested_at timestamptz,
  awards_created boolean not null default false,
  ranked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  started_at timestamptz,
  closed_at timestamptz,
  finalized_at timestamptz,
  constraint leaderboard_campaigns_window check (ends_at > starts_at),
  constraint leaderboard_campaigns_games check (
    cardinality(games) > 0
    and games <@ array['jackpot', 'coinflip', 'roulette', 'slott']::text[]
  )
);
create index leaderboard_campaigns_partner_idx on public.leaderboard_campaigns (partner_user_id, updated_at desc);
create index leaderboard_campaigns_status_idx on public.leaderboard_campaigns (status, starts_at, ends_at);
create index leaderboard_campaigns_public_idx on public.leaderboard_campaigns (visibility, status, starts_at desc);
alter table public.leaderboard_campaigns enable row level security;
revoke all on public.leaderboard_campaigns from public, anon, authenticated;
grant all on public.leaderboard_campaigns to service_role;

create table public.leaderboard_prize_tiers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.leaderboard_campaigns (id),
  rank_start integer not null check (rank_start >= 1),
  rank_end integer not null check (rank_end >= rank_start and rank_end <= 1000),
  reward_cents bigint not null check (reward_cents > 0),
  unique (campaign_id, rank_start)
);
create index leaderboard_prize_tiers_campaign_idx on public.leaderboard_prize_tiers (campaign_id, rank_start);
alter table public.leaderboard_prize_tiers enable row level security;
revoke all on public.leaderboard_prize_tiers from public, anon, authenticated;
grant all on public.leaderboard_prize_tiers to service_role;

create table public.leaderboard_wager_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.leaderboard_campaigns (id),
  player_id uuid not null references public.profiles (id),
  source_game_type text not null check (source_game_type in ('jackpot', 'coinflip', 'roulette', 'slott')),
  source_event_id uuid not null,
  source_game_id bigint not null,
  qualifying_cents bigint not null check (qualifying_cents > 0),
  event_at timestamptz not null,
  voided boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  unique (campaign_id, source_game_type, source_event_id)
);
create index leaderboard_wager_events_player_idx on public.leaderboard_wager_events (campaign_id, player_id) where not voided;
create index leaderboard_wager_events_time_idx on public.leaderboard_wager_events (campaign_id, event_at);
alter table public.leaderboard_wager_events enable row level security;
revoke all on public.leaderboard_wager_events from public, anon, authenticated;
grant all on public.leaderboard_wager_events to service_role;

create table public.leaderboard_entries (
  campaign_id uuid not null references public.leaderboard_campaigns (id),
  player_id uuid not null references public.profiles (id),
  qualifying_cents bigint not null check (qualifying_cents >= 0),
  last_event_at timestamptz not null,
  rank integer check (rank is null or rank >= 1),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (campaign_id, player_id)
);
create index leaderboard_entries_rank_idx on public.leaderboard_entries (campaign_id, rank) where rank is not null;
alter table public.leaderboard_entries enable row level security;
revoke all on public.leaderboard_entries from public, anon, authenticated;
grant all on public.leaderboard_entries to service_role;

create table public.leaderboard_prize_awards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.leaderboard_campaigns (id),
  player_id uuid not null references public.profiles (id),
  final_rank integer not null check (final_rank >= 1),
  reward_cents bigint not null check (reward_cents > 0),
  payout_status text not null default 'pending' check (payout_status in ('pending', 'paid', 'failed')),
  ledger_tx_id uuid unique references public.ledger_transactions (id),
  last_error text check (last_error is null or char_length(last_error) <= 180),
  created_at timestamptz not null default clock_timestamp(),
  paid_at timestamptz,
  unique (campaign_id, player_id)
);
create index leaderboard_prize_awards_status_idx on public.leaderboard_prize_awards (campaign_id, payout_status);
alter table public.leaderboard_prize_awards enable row level security;
revoke all on public.leaderboard_prize_awards from public, anon, authenticated;
grant all on public.leaderboard_prize_awards to service_role;

create or replace function public._lb_campaign_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD leaderboard_campaigns'; end if;
  if old.rules_frozen_at is not null then
    if new.partner_user_id is distinct from old.partner_user_id
       or new.template_id is distinct from old.template_id
       or new.template_version is distinct from old.template_version
       or new.name is distinct from old.name
       or new.description is distinct from old.description
       or new.visibility is distinct from old.visibility
       or new.timezone is distinct from old.timezone
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.min_wager_cents is distinct from old.min_wager_cents
       or new.games is distinct from old.games
       or new.prize_pool_cents is distinct from old.prize_pool_cents
       or new.config_snapshot is distinct from old.config_snapshot
       or new.rules_frozen_at is distinct from old.rules_frozen_at
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at
    then raise exception 'CAMPAIGN_FROZEN'; end if;
  end if;
  if old.awards_created and not new.awards_created then raise exception 'AWARDS_FROZEN'; end if;
  if old.status = 'completed' and new.status is distinct from old.status then raise exception 'CAMPAIGN_FINAL'; end if;
  return new;
end $$;
create trigger leaderboard_campaign_guard before update or delete on public.leaderboard_campaigns
  for each row execute function public._lb_campaign_guard();

create or replace function public._lb_tier_guard() returns trigger
language plpgsql set search_path = public as $$
declare frozen timestamptz;
begin
  select rules_frozen_at into frozen from leaderboard_campaigns
    where id = coalesce(new.campaign_id, old.campaign_id);
  if frozen is not null then raise exception 'CAMPAIGN_FROZEN'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger leaderboard_tier_guard before insert or update or delete on public.leaderboard_prize_tiers
  for each row execute function public._lb_tier_guard();

create or replace function public._lb_event_guard() returns trigger
language plpgsql set search_path = public as $$
declare st text;
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD leaderboard_wager_events'; end if;
  if new.campaign_id is distinct from old.campaign_id
     or new.player_id is distinct from old.player_id
     or new.source_game_type is distinct from old.source_game_type
     or new.source_event_id is distinct from old.source_event_id
     or new.source_game_id is distinct from old.source_game_id
     or new.qualifying_cents is distinct from old.qualifying_cents
     or new.event_at is distinct from old.event_at
  then raise exception 'IMMUTABLE_FIELD'; end if;
  if new.voided and not old.voided then
    select status into st from leaderboard_campaigns where id = new.campaign_id;
    if st not in ('active', 'closing') then raise exception 'RANKINGS_FROZEN'; end if;
  elsif new.voided is distinct from old.voided then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  return new;
end $$;
create trigger leaderboard_event_guard before update or delete on public.leaderboard_wager_events
  for each row execute function public._lb_event_guard();

create or replace function public._lb_award_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD leaderboard_prize_awards'; end if;
  if new.campaign_id is distinct from old.campaign_id
     or new.player_id is distinct from old.player_id
     or new.final_rank is distinct from old.final_rank
     or new.reward_cents is distinct from old.reward_cents
  then raise exception 'IMMUTABLE_FIELD'; end if;
  if old.payout_status = 'paid' and (new.payout_status is distinct from 'paid' or new.ledger_tx_id is distinct from old.ledger_tx_id) then
    raise exception 'PAYOUT_FINAL';
  end if;
  return new;
end $$;
create trigger leaderboard_award_guard before update or delete on public.leaderboard_prize_awards
  for each row execute function public._lb_award_guard();

create or replace function public._lb_require_admin() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  return uid;
end $$;

create or replace function public._lb_require_partner() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from partners where user_id = uid and active) then raise exception 'NOT_A_PARTNER'; end if;
  return uid;
end $$;

create or replace function public._lb_check_timezone(p_tz text) returns void
language plpgsql stable set search_path = public as $$
begin
  if p_tz is null or p_tz !~ '^[A-Za-z0-9_+-/]{1,64}$' then raise exception 'BAD_TIMEZONE'; end if;
  begin
    perform (clock_timestamp() at time zone p_tz);
  exception when invalid_parameter_value then
    raise exception 'BAD_TIMEZONE';
  end;
end $$;

-- Inserts newly settled stakes, voids any that no longer qualify, and recomputes ranks.
-- Returns true when no source still has a full unread batch.
create or replace function public._lb_sync(p_campaign uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c public.leaderboard_campaigns;
  n integer;
  caught boolean := true;
begin
  select * into c from leaderboard_campaigns where id = p_campaign for update;
  if not found or c.status not in ('active', 'closing') then return true; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'jackpot', e.id, e.game_id, e.amount, e.created_at
  from jackpot_entries e
  join jackpot_games g on g.id = e.game_id
  where 'jackpot' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'jackpot' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'coinflip', e.id, e.game_id, e.amount, e.created_at
  from coinflip_entries e
  join coinflip_games g on g.id = e.game_id
  where 'coinflip' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'coinflip' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, b.user_id, 'roulette', b.id, b.game_id, b.amount, b.created_at
  from roulette_bets b
  join roulette_games g on g.id = b.game_id
  where 'roulette' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and b.status in ('WON', 'LOST')
    and b.created_at >= c.starts_at and b.created_at < c.ends_at
    and b.amount >= c.min_wager_cents and b.user_id <> c.partner_user_id
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'roulette' and w.source_event_id = b.id
    )
  order by b.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'slott', e.id, e.game_id, e.amount, e.created_at
  from slot_entries e
  join slot_games g on g.id = e.game_id
  where 'slott' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'slott' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  update leaderboard_wager_events w set voided = true
  where w.campaign_id = c.id and not w.voided and (
    (w.source_game_type = 'jackpot' and not exists (
      select 1 from jackpot_entries e join jackpot_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
    or (w.source_game_type = 'coinflip' and not exists (
      select 1 from coinflip_entries e join coinflip_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
    or (w.source_game_type = 'roulette' and not exists (
      select 1 from roulette_bets b join roulette_games g on g.id = b.game_id
      where b.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real' and b.status in ('WON', 'LOST')))
    or (w.source_game_type = 'slott' and not exists (
      select 1 from slot_entries e join slot_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
  );

  insert into leaderboard_entries (campaign_id, player_id, qualifying_cents, last_event_at)
  select w.campaign_id, w.player_id, sum(w.qualifying_cents), max(w.event_at)
  from leaderboard_wager_events w
  where w.campaign_id = c.id and not w.voided
  group by w.campaign_id, w.player_id
  on conflict (campaign_id, player_id) do update
    set qualifying_cents = excluded.qualifying_cents,
        last_event_at = excluded.last_event_at,
        updated_at = clock_timestamp();

  update leaderboard_entries e set qualifying_cents = 0, rank = null, updated_at = clock_timestamp()
  where e.campaign_id = c.id and not exists (
    select 1 from leaderboard_wager_events w
    where w.campaign_id = e.campaign_id and w.player_id = e.player_id and not w.voided
  );

  with ranked as (
    select player_id, row_number() over (
      order by qualifying_cents desc, last_event_at asc, player_id asc
    ) as n
    from leaderboard_entries
    where campaign_id = c.id and qualifying_cents > 0
  )
  update leaderboard_entries e
    set rank = ranked.n, updated_at = clock_timestamp()
  from ranked
  where e.campaign_id = c.id and e.player_id = ranked.player_id and e.rank is distinct from ranked.n;

  update leaderboard_campaigns set ranked_at = clock_timestamp(), updated_at = clock_timestamp() where id = c.id;
  return caught;
end $$;

create or replace function public._lb_inflight(p_campaign uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c public.leaderboard_campaigns;
begin
  select * into c from leaderboard_campaigns where id = p_campaign;
  if not found then return false; end if;
  if 'jackpot' = any (c.games) and exists (
    select 1 from jackpot_entries e join jackpot_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
  ) then return true; end if;
  if 'coinflip' = any (c.games) and exists (
    select 1 from coinflip_entries e join coinflip_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
  ) then return true; end if;
  if 'roulette' = any (c.games) and exists (
    select 1 from roulette_bets b join roulette_games g on g.id = b.game_id
    where g.account_type = 'real' and b.status = 'ACCEPTED' and g.status not in ('COMPLETED', 'CANCELLED')
      and b.created_at >= c.starts_at and b.created_at < c.ends_at
      and b.amount >= c.min_wager_cents and b.user_id <> c.partner_user_id
  ) then return true; end if;
  if 'slott' = any (c.games) and exists (
    select 1 from slot_entries e join slot_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
  ) then return true; end if;
  return false;
end $$;

create or replace function public._lb_pay_campaign(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a public.leaderboard_prize_awards;
  tx uuid;
  avail uuid;
  house uuid;
begin
  house := public._system_account('house_bankroll', 'USD', 'real');
  for a in
    select * from leaderboard_prize_awards
    where campaign_id = p_campaign and payout_status = 'pending'
    order by final_rank
    limit 25
  loop
    begin
      select id into tx from ledger_transactions where idempotency_key = 'lb-prize:' || a.id::text;
      if tx is null then
        avail := public._user_account(a.player_id, 'user_available', 'USD', 'real');
        if avail is null then
          insert into wallet_accounts (owner_id, kind, asset, account_type)
            values (a.player_id, 'user_available', 'USD', 'real')
            returning id into avail;
        end if;
        insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
          values ('leaderboard_prize', 'lb-prize:' || a.id::text, 'real', a.player_id, 'Leaderboard prize')
          returning id into tx;
        perform public._post(tx, house, -a.reward_cents);
        perform public._post(tx, avail, a.reward_cents);
      end if;
      update leaderboard_prize_awards
        set payout_status = 'paid', ledger_tx_id = tx, paid_at = coalesce(paid_at, clock_timestamp()), last_error = null
        where id = a.id and payout_status = 'pending';
      perform public._audit(null, 'leaderboard_prize_paid', null,
        jsonb_build_object('campaign_id', p_campaign, 'award_id', a.id, 'cents', a.reward_cents, 'ledger_tx_id', tx));
    exception when others then
      update leaderboard_prize_awards
        set payout_status = 'failed', last_error = left(sqlerrm, 160)
        where id = a.id and payout_status = 'pending';
      perform public._audit(null, 'leaderboard_prize_failed', null,
        jsonb_build_object('campaign_id', p_campaign, 'award_id', a.id, 'error', left(sqlerrm, 160)));
    end;
  end loop;
end $$;

create or replace function public.leaderboard_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c public.leaderboard_campaigns;
  ok boolean;
  caught boolean;
  pending integer;
  failed integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('leaderboard_tick')) then
    return jsonb_build_object('ok', true, 'skipped', 'busy');
  end if;
  update worker_tick_gate set last_run_at = clock_timestamp()
    where name = 'leaderboards' and last_run_at <= clock_timestamp() - interval '15 seconds'
    returning true into ok;
  if not coalesce(ok, false) then
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  update leaderboard_campaigns
    set status = 'active', started_at = clock_timestamp(), updated_at = clock_timestamp()
    where status = 'scheduled' and funding_status = 'checked' and rules_frozen_at is not null
      and starts_at <= clock_timestamp();

  update leaderboard_campaigns
    set status = 'closing', closed_at = coalesce(closed_at, clock_timestamp()), updated_at = clock_timestamp()
    where status = 'active' and ends_at <= clock_timestamp();

  for c in
    select * from leaderboard_campaigns
    where status in ('active', 'closing')
    order by case when status = 'closing' then 0 else 1 end, ends_at
    limit 10
  loop
    caught := public._lb_sync(c.id);
    if c.status = 'closing' and caught and (
      not public._lb_inflight(c.id) or clock_timestamp() > c.ends_at + interval '2 hours'
    ) then
      insert into leaderboard_prize_awards (campaign_id, player_id, final_rank, reward_cents)
      select e.campaign_id, e.player_id, e.rank, t.reward_cents
      from leaderboard_entries e
      join leaderboard_prize_tiers t
        on t.campaign_id = e.campaign_id and e.rank between t.rank_start and t.rank_end
      where e.campaign_id = c.id and e.qualifying_cents > 0 and e.rank is not null
      on conflict (campaign_id, player_id) do nothing;
      update leaderboard_campaigns
        set status = 'settling', awards_created = true, updated_at = clock_timestamp()
        where id = c.id and status = 'closing';
      perform public._audit(null, 'leaderboard_rankings_frozen', null, jsonb_build_object('campaign_id', c.id));
    end if;
  end loop;

  for c in select * from leaderboard_campaigns where status = 'settling' order by closed_at limit 10 loop
    perform public._lb_pay_campaign(c.id);
    select count(*) filter (where payout_status = 'pending'), count(*) filter (where payout_status = 'failed')
      into pending, failed
    from leaderboard_prize_awards where campaign_id = c.id;
    if coalesce(pending, 0) = 0 and coalesce(failed, 0) = 0 then
      update leaderboard_campaigns
        set status = 'completed', finalized_at = clock_timestamp(), updated_at = clock_timestamp()
        where id = c.id and status = 'settling';
      perform public._audit(null, 'leaderboard_completed', null, jsonb_build_object('campaign_id', c.id));
    elsif coalesce(pending, 0) = 0 and failed > 0 then
      update leaderboard_campaigns
        set status = 'under_review', updated_at = clock_timestamp()
        where id = c.id and status = 'settling';
      perform public._audit(null, 'leaderboard_under_review', null,
        jsonb_build_object('campaign_id', c.id, 'failed', failed));
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'skipped', false);
end $$;

create or replace function public._lb_rules(c public.leaderboard_campaigns) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_array(
    'Window: ' || to_char(c.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC to '
      || to_char(c.ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC (' || c.timezone || ' is the display zone).',
    'Eligible games: ' || array_to_string(c.games, ', ') || '.',
    'A qualifying wager is the stake on a completed real-money game in that window.',
    'Cancelled games, refunded roulette bets, reversed settlements, and test-credit games do not count.',
    'Slott spins and house-funded bonuses are not extra wagers. Only the match stake counts.',
    'Promo credits, referral credits, and partner credits are not wagers. A real stake placed with money from those credits still counts, because the settled stake is real money.',
    'The campaign host''s own stakes do not count.',
    case when c.min_wager_cents > 0
      then 'Each stake must be at least ' || trim(to_char(c.min_wager_cents / 100.0, 'FM999999990.00')) || ' USD.'
      else 'There is no minimum stake beyond the game''s own minimum.' end,
    'Currency is USD. Stake amounts are the game''s USD cents. There is no conversion.',
    'Ties: the higher qualifying total places higher. If the totals match, the player whose last qualifying wager was earlier places higher. If that time also matches, the lower account id places higher.',
    'Prizes are fixed USD amounts for a rank or a rank range. They are not a percentage of the pool.',
    'The prize pool is a commitment. It is not held in a separate escrow. When the campaign settles, each prize is posted from the house bankroll to the winner''s available balance.',
    'Rankings and prizes freeze when the campaign finishes accepting late settlements. They are not edited after that.',
    'Payout status is pending until the ledger transaction exists, paid after it commits, or failed if it did not.'
  )
$$;

create or replace function public._lb_public_row(p_campaign uuid, p_limit integer, p_offset integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c public.leaderboard_campaigns;
  partner_name text;
  partner_avatar text;
  total integer;
  me uuid := auth.uid();
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'BAD_PAGE';
  end if;
  select * into c from leaderboard_campaigns where id = p_campaign;
  if not found or c.status in ('draft', 'pending_approval', 'rejected') then raise exception 'NOT_FOUND'; end if;
  select username, avatar_url into partner_name, partner_avatar from profiles where id = c.partner_user_id;
  select count(*) into total from leaderboard_entries where campaign_id = c.id and qualifying_cents > 0;
  return jsonb_build_object(
    'campaign', jsonb_build_object(
      'id', c.id, 'name', c.name, 'description', c.description, 'status', c.status,
      'visibility', c.visibility, 'timezone', c.timezone, 'starts_at', c.starts_at, 'ends_at', c.ends_at,
      'games', c.games, 'min_wager_cents', c.min_wager_cents, 'prize_pool_cents', c.prize_pool_cents,
      'ranked_at', c.ranked_at, 'finalized_at', c.finalized_at
    ),
    'partner', jsonb_build_object('username', partner_name, 'avatar_url', partner_avatar),
    'participants', total,
    'rules', public._lb_rules(c),
    'tiers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank_start', t.rank_start, 'rank_end', t.rank_end, 'reward_cents', t.reward_cents
      ) order by t.rank_start)
      from leaderboard_prize_tiers t where t.campaign_id = c.id
    ), '[]'::jsonb),
    'podium', coalesce((
      select jsonb_agg(row_to_json(x) order by x.rank) from (
        select e.rank, p.username, p.avatar_url, e.qualifying_cents,
          t.reward_cents as prize_cents, a.payout_status, coalesce(e.player_id = me, false) as is_me
        from leaderboard_entries e
        join profiles p on p.id = e.player_id
        left join leaderboard_prize_tiers t on t.campaign_id = e.campaign_id and e.rank between t.rank_start and t.rank_end
        left join leaderboard_prize_awards a on a.campaign_id = e.campaign_id and a.player_id = e.player_id
        where e.campaign_id = c.id and e.rank between 1 and 3
        order by e.rank
      ) x
    ), '[]'::jsonb),
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.rank) from (
        select e.rank, p.username, p.avatar_url, e.qualifying_cents,
          t.reward_cents as prize_cents, a.payout_status, coalesce(e.player_id = me, false) as is_me
        from leaderboard_entries e
        join profiles p on p.id = e.player_id
        left join leaderboard_prize_tiers t on t.campaign_id = e.campaign_id and e.rank between t.rank_start and t.rank_end
        left join leaderboard_prize_awards a on a.campaign_id = e.campaign_id and a.player_id = e.player_id
        where e.campaign_id = c.id and e.rank is not null
        order by e.rank
        limit p_limit offset p_offset
      ) x
    ), '[]'::jsonb),
    'total', total,
    'me', (
      select jsonb_build_object('rank', e.rank, 'qualifying_cents', e.qualifying_cents, 'prize_cents', t.reward_cents, 'payout_status', a.payout_status)
      from leaderboard_entries e
      left join leaderboard_prize_tiers t on t.campaign_id = e.campaign_id and e.rank between t.rank_start and t.rank_end
      left join leaderboard_prize_awards a on a.campaign_id = e.campaign_id and a.player_id = e.player_id
      where e.campaign_id = c.id and e.player_id = me and e.qualifying_cents > 0
    )
  );
end $$;

create or replace function public.leaderboard_public_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.starts_at desc), '[]'::jsonb) from (
    select c.id, c.name, c.status, c.starts_at, c.ends_at, c.timezone, c.prize_pool_cents, c.ranked_at,
      p.username as partner_username,
      (select count(*) from leaderboard_entries e where e.campaign_id = c.id and e.qualifying_cents > 0) as participants
    from leaderboard_campaigns c
    join profiles p on p.id = c.partner_user_id
    where c.visibility = 'public'
      and c.status in ('scheduled', 'active', 'closing', 'settling', 'under_review', 'completed', 'cancelled', 'suspended')
    order by c.starts_at desc
    limit 50
  ) x
$$;

create or replace function public.leaderboard_public_board(p_campaign uuid, p_limit integer, p_offset integer) returns jsonb
language sql stable security definer set search_path = public as $$
  select public._lb_public_row(p_campaign, p_limit, p_offset)
$$;

create or replace function public.leaderboard_my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'partner', exists (select 1 from partners where user_id = auth.uid() and active),
    'admin', public.has_role(auth.uid(), 'admin')
  )
$$;

create or replace function public.leaderboard_partner_templates() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._lb_require_partner();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id, 'name', t.name, 'description', t.description, 'version', t.version,
      'min_duration_seconds', t.min_duration_seconds, 'max_duration_seconds', t.max_duration_seconds,
      'max_prize_pool_cents', t.max_prize_pool_cents, 'allowed_games', t.allowed_games, 'max_tiers', t.max_tiers
    ) order by t.name)
    from leaderboard_templates t where t.status = 'active'
  ), '[]'::jsonb);
end $$;

create or replace function public._lb_replace_tiers(p_campaign uuid, p_tiers jsonb, p_max integer) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  rs integer; re integer; cents bigint;
  pool bigint := 0;
  n integer := 0;
  prev_end integer := 0;
begin
  if jsonb_typeof(p_tiers) <> 'array' then raise exception 'BAD_PRIZES'; end if;
  delete from leaderboard_prize_tiers where campaign_id = p_campaign;
  for item in
    select elem.value from jsonb_array_elements(p_tiers) as elem(value)
    order by (elem.value ->> 'rank_start')::integer
  loop
    n := n + 1;
    if n > p_max then raise exception 'TOO_MANY_TIERS'; end if;
    rs := (item ->> 'rank_start')::integer;
    re := (item ->> 'rank_end')::integer;
    cents := (item ->> 'reward_cents')::bigint;
    if rs is null or re is null or cents is null or rs < 1 or re < rs or re > 1000 or cents <= 0 or cents > 10000000000 then
      raise exception 'BAD_PRIZES';
    end if;
    if rs <= prev_end then raise exception 'PRIZE_OVERLAP'; end if;
    prev_end := re;
    pool := pool + cents * (re - rs + 1);
    insert into leaderboard_prize_tiers (campaign_id, rank_start, rank_end, reward_cents)
      values (p_campaign, rs, re, cents);
  end loop;
  if n < 1 or pool <= 0 then raise exception 'BAD_PRIZES'; end if;
  return pool;
exception when invalid_text_representation then
  raise exception 'BAD_PRIZES';
end $$;

create or replace function public.leaderboard_partner_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._lb_require_partner();
  t public.leaderboard_templates;
  c public.leaderboard_campaigns;
  cid uuid;
  g text[];
  seconds numeric;
  pool bigint;
  expected timestamptz;
begin
  if jsonb_typeof(p) <> 'object' or jsonb_typeof(p -> 'games') <> 'array' or jsonb_typeof(p -> 'tiers') <> 'array' then
    raise exception 'BAD_INPUT';
  end if;
  if p ->> 'name' is null or char_length(btrim(p ->> 'name')) not between 3 and 60 or (p ->> 'name') ~ '[[:cntrl:]]' then
    raise exception 'BAD_NAME';
  end if;
  if coalesce(char_length(p ->> 'description'), 0) > 800 or coalesce(p ->> 'description', '') ~ '[[:cntrl:]]' then
    raise exception 'BAD_DESCRIPTION';
  end if;
  if coalesce(p ->> 'visibility', 'public') not in ('public', 'unlisted') then raise exception 'BAD_VISIBILITY'; end if;
  perform public._lb_check_timezone(coalesce(p ->> 'timezone', 'UTC'));
  select * into t from leaderboard_templates where id = (p ->> 'template_id')::uuid and status = 'active';
  if not found then raise exception 'TEMPLATE_UNAVAILABLE'; end if;
  select coalesce(array_agg(distinct x order by x), '{}') into g
  from jsonb_array_elements_text(p -> 'games') as x;
  if g is null or cardinality(g) = 0 or exists (select 1 from unnest(g) game where game <> all (t.allowed_games)) then
    raise exception 'GAME_NOT_ALLOWED';
  end if;
  if (p ->> 'starts_at')::timestamptz is null or (p ->> 'ends_at')::timestamptz is null then raise exception 'BAD_SCHEDULE'; end if;
  seconds := extract(epoch from ((p ->> 'ends_at')::timestamptz - (p ->> 'starts_at')::timestamptz));
  if seconds < t.min_duration_seconds or seconds > t.max_duration_seconds then raise exception 'BAD_DURATION'; end if;
  if coalesce((p ->> 'min_wager_cents')::bigint, 0) < 0 or coalesce((p ->> 'min_wager_cents')::bigint, 0) > 100000000 then
    raise exception 'BAD_MIN_WAGER';
  end if;
  if jsonb_array_length(coalesce(p -> 'tiers', '[]'::jsonb)) > t.max_tiers then raise exception 'TOO_MANY_TIERS'; end if;

  cid := nullif(p ->> 'id', '')::uuid;
  if cid is null then
    insert into leaderboard_campaigns (
      partner_user_id, template_id, template_version, name, description, visibility, timezone,
      starts_at, ends_at, min_wager_cents, games, prize_pool_cents
    ) values (
      uid, t.id, t.version, btrim(p ->> 'name'), coalesce(p ->> 'description', ''),
      coalesce(p ->> 'visibility', 'public'), p ->> 'timezone',
      (p ->> 'starts_at')::timestamptz, (p ->> 'ends_at')::timestamptz,
      coalesce((p ->> 'min_wager_cents')::bigint, 0), g, 1
    ) returning * into c;
    pool := public._lb_replace_tiers(c.id, p -> 'tiers', t.max_tiers);
    if pool > t.max_prize_pool_cents then raise exception 'PRIZE_CAP'; end if;
    update leaderboard_campaigns set prize_pool_cents = pool, updated_at = clock_timestamp() where id = c.id;
  else
    select * into c from leaderboard_campaigns where id = cid and partner_user_id = uid for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    if c.status not in ('draft', 'rejected') then raise exception 'NOT_EDITABLE'; end if;
    if nullif(p ->> 'expected_updated_at', '') is not null
       and c.updated_at is distinct from (p ->> 'expected_updated_at')::timestamptz then
      raise exception 'CONFLICT';
    end if;
    expected := c.updated_at;
    update leaderboard_campaigns set
      template_id = t.id, template_version = t.version, name = btrim(p ->> 'name'),
      description = coalesce(p ->> 'description', ''), visibility = coalesce(p ->> 'visibility', 'public'),
      timezone = p ->> 'timezone', starts_at = (p ->> 'starts_at')::timestamptz, ends_at = (p ->> 'ends_at')::timestamptz,
      min_wager_cents = coalesce((p ->> 'min_wager_cents')::bigint, 0), games = g,
      status = 'draft', rejection_reason = null, updated_at = clock_timestamp()
    where id = c.id and updated_at = expected;
    if not found then raise exception 'CONFLICT'; end if;
    pool := public._lb_replace_tiers(c.id, p -> 'tiers', t.max_tiers);
    if pool > t.max_prize_pool_cents then raise exception 'PRIZE_CAP'; end if;
    update leaderboard_campaigns set prize_pool_cents = pool where id = c.id;
  end if;
  perform public._audit(uid, 'leaderboard_saved', null, jsonb_build_object('campaign_id', coalesce(cid, c.id), 'pool', pool));
  return public.leaderboard_partner_get(coalesce(cid, c.id));
exception when invalid_text_representation then
  raise exception 'BAD_INPUT';
end $$;

create or replace function public.leaderboard_partner_get(p_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := public._lb_require_partner();
  c public.leaderboard_campaigns;
  board jsonb;
begin
  select * into c from leaderboard_campaigns where id = p_campaign and partner_user_id = uid;
  if not found then raise exception 'NOT_FOUND'; end if;
  if c.status in ('draft', 'pending_approval', 'rejected') then
    board := jsonb_build_object(
      'campaign', jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description, 'status', c.status,
        'visibility', c.visibility, 'timezone', c.timezone, 'starts_at', c.starts_at, 'ends_at', c.ends_at,
        'games', c.games, 'min_wager_cents', c.min_wager_cents, 'prize_pool_cents', c.prize_pool_cents,
        'ranked_at', c.ranked_at
      ),
      'tiers', coalesce((
        select jsonb_agg(jsonb_build_object('rank_start', t.rank_start, 'rank_end', t.rank_end, 'reward_cents', t.reward_cents) order by t.rank_start)
        from leaderboard_prize_tiers t where t.campaign_id = c.id
      ), '[]'::jsonb),
      'rules', public._lb_rules(c),
      'participants', 0, 'rows', '[]'::jsonb, 'podium', '[]'::jsonb, 'total', 0
    );
  else
    board := public._lb_public_row(c.id, 50, 0);
  end if;
  return board || jsonb_build_object(
    'updated_at', c.updated_at,
    'template_id', c.template_id,
    'rejection_reason', c.rejection_reason,
    'cancel_requested_at', c.cancel_requested_at,
    'funding', jsonb_build_object(
      'status', c.funding_status,
      'bankroll_at_check_cents', c.bankroll_at_check_cents,
      'shortfall', c.funding_shortfall,
      'note', case
        when c.funding_status <> 'checked' then 'Not checked. This prize pool is not reserved.'
        when c.funding_shortfall then 'When this was approved, the house bankroll did not cover the prize pool. Funds are not reserved. Settlement can still post prizes and increase the shortfall.'
        else 'When this was approved, the house bankroll covered the prize pool. Funds are not reserved.'
      end
    ),
    'paid_cents', coalesce((select sum(reward_cents) from leaderboard_prize_awards where campaign_id = c.id and payout_status = 'paid'), 0),
    'failed_awards', coalesce((select count(*) from leaderboard_prize_awards where campaign_id = c.id and payout_status = 'failed'), 0),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'qualifying_cents', d.cents, 'players', d.players) order by d.day)
      from (
        select to_char(date_trunc('day', event_at at time zone 'UTC'), 'YYYY-MM-DD') as day,
          sum(qualifying_cents) as cents, count(distinct player_id) as players
        from leaderboard_wager_events
        where campaign_id = c.id and not voided
        group by 1
      ) d
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.leaderboard_partner_list(p_status text, p_sort text, p_limit integer, p_offset integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._lb_require_partner();
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 or p_offset is null or p_offset < 0 then raise exception 'BAD_PAGE'; end if;
  if coalesce(p_status, '') <> '' and p_status not in (
    'draft', 'pending_approval', 'scheduled', 'active', 'closing', 'settling', 'under_review', 'completed', 'cancelled', 'rejected', 'suspended'
  ) then raise exception 'BAD_STATUS'; end if;
  if coalesce(p_sort, 'updated') not in ('updated', 'starts', 'name') then raise exception 'BAD_SORT'; end if;
  return jsonb_build_object(
    'total', (select count(*) from leaderboard_campaigns c where c.partner_user_id = uid and (coalesce(p_status, '') = '' or c.status = p_status)),
    'stats', (
      select jsonb_build_object(
        'active', count(*) filter (where c.status = 'active'),
        'scheduled', count(*) filter (where c.status = 'scheduled'),
        'completed', count(*) filter (where c.status = 'completed'),
        'qualifying_cents', coalesce(sum(s.qualifying_cents), 0),
        'participants', (
          select count(distinct e.player_id) from leaderboard_entries e
          join leaderboard_campaigns c2 on c2.id = e.campaign_id
          where c2.partner_user_id = uid and e.qualifying_cents > 0
        ),
        'prize_pool_cents', coalesce(sum(c.prize_pool_cents) filter (where c.status not in ('draft', 'rejected', 'cancelled')), 0),
        'paid_cents', coalesce(sum(s.paid_cents), 0)
      )
      from leaderboard_campaigns c
      left join lateral (
        select
          coalesce(sum(e.qualifying_cents), 0) as qualifying_cents,
          count(*) filter (where e.qualifying_cents > 0) as participants,
          coalesce((select sum(a.reward_cents) from leaderboard_prize_awards a where a.campaign_id = c.id and a.payout_status = 'paid'), 0) as paid_cents
        from leaderboard_entries e
        where e.campaign_id = c.id
      ) s on true
      where c.partner_user_id = uid
    ),
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.rn) from (
        select row_number() over (order by
          case when p_sort = 'name' then c.name end asc,
          case when p_sort = 'starts' then c.starts_at end desc,
          case when p_sort = 'updated' then c.updated_at end desc
        ) as rn, c.id, c.name, c.status, c.starts_at, c.ends_at, c.timezone, c.prize_pool_cents,
          c.funding_status, c.funding_shortfall, c.cancel_requested_at, c.visibility, c.updated_at,
          coalesce((select count(*) from leaderboard_entries e where e.campaign_id = c.id and e.qualifying_cents > 0), 0) as participants,
          coalesce((select sum(e.qualifying_cents) from leaderboard_entries e where e.campaign_id = c.id), 0) as qualifying_cents,
          coalesce((select sum(a.reward_cents) from leaderboard_prize_awards a where a.campaign_id = c.id and a.payout_status = 'paid'), 0) as paid_cents
        from leaderboard_campaigns c
        where c.partner_user_id = uid and (coalesce(p_status, '') = '' or c.status = p_status)
        order by
          case when p_sort = 'name' then c.name end asc,
          case when p_sort = 'starts' then c.starts_at end desc,
          case when p_sort = 'updated' then c.updated_at end desc
        limit p_limit offset p_offset
      ) x
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.leaderboard_partner_submit(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._lb_require_partner(); c public.leaderboard_campaigns; t public.leaderboard_templates; seconds numeric;
begin
  select * into c from leaderboard_campaigns where id = p_campaign and partner_user_id = uid for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if c.status <> 'draft' then raise exception 'NOT_EDITABLE'; end if;
  if c.starts_at <= clock_timestamp() + interval '5 minutes' then raise exception 'START_TOO_SOON'; end if;
  select * into t from leaderboard_templates where id = c.template_id and status = 'active';
  if not found then raise exception 'TEMPLATE_UNAVAILABLE'; end if;
  seconds := extract(epoch from (c.ends_at - c.starts_at));
  if seconds < t.min_duration_seconds or seconds > t.max_duration_seconds then raise exception 'BAD_DURATION'; end if;
  if c.prize_pool_cents > t.max_prize_pool_cents then raise exception 'PRIZE_CAP'; end if;
  if exists (select 1 from unnest(c.games) g where g <> all (t.allowed_games)) then raise exception 'GAME_NOT_ALLOWED'; end if;
  update leaderboard_campaigns
    set status = 'pending_approval', updated_at = clock_timestamp()
    where id = c.id and status = 'draft';
  perform public._audit(uid, 'leaderboard_submitted', null, jsonb_build_object('campaign_id', c.id));
  return public.leaderboard_partner_get(c.id);
end $$;

create or replace function public.leaderboard_partner_duplicate(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._lb_require_partner();
  c public.leaderboard_campaigns;
  n uuid;
  start_at timestamptz;
begin
  select * into c from leaderboard_campaigns where id = p_campaign and partner_user_id = uid;
  if not found then raise exception 'NOT_FOUND'; end if;
  start_at := clock_timestamp() + interval '1 day';
  insert into leaderboard_campaigns (
    partner_user_id, template_id, template_version, name, description, visibility, timezone,
    starts_at, ends_at, min_wager_cents, games, prize_pool_cents
  ) values (
    uid, c.template_id, c.template_version, left(c.name, 52) || ' copy', c.description, c.visibility, c.timezone,
    start_at, start_at + (c.ends_at - c.starts_at), c.min_wager_cents, c.games, c.prize_pool_cents
  ) returning id into n;
  insert into leaderboard_prize_tiers (campaign_id, rank_start, rank_end, reward_cents)
  select n, rank_start, rank_end, reward_cents from leaderboard_prize_tiers where campaign_id = c.id;
  perform public._audit(uid, 'leaderboard_duplicated', null, jsonb_build_object('campaign_id', n, 'from', c.id));
  return public.leaderboard_partner_get(n);
end $$;

create or replace function public.leaderboard_partner_cancel(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._lb_require_partner(); c public.leaderboard_campaigns;
begin
  select * into c from leaderboard_campaigns where id = p_campaign and partner_user_id = uid for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if c.status in ('draft', 'pending_approval', 'rejected', 'scheduled') then
    update leaderboard_campaigns
      set status = 'cancelled', closed_at = clock_timestamp(), updated_at = clock_timestamp()
      where id = c.id;
    perform public._audit(uid, 'leaderboard_cancelled', null, jsonb_build_object('campaign_id', c.id, 'by', 'partner'));
  elsif c.status in ('active', 'closing') then
    update leaderboard_campaigns set cancel_requested_at = clock_timestamp(), updated_at = clock_timestamp() where id = c.id;
    perform public._audit(uid, 'leaderboard_cancel_requested', null, jsonb_build_object('campaign_id', c.id));
  else
    raise exception 'NOT_ALLOWED';
  end if;
  return public.leaderboard_partner_get(c.id);
end $$;

create or replace function public.leaderboard_admin_templates() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._lb_require_admin();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id, 'name', t.name, 'description', t.description, 'version', t.version, 'status', t.status,
      'min_duration_seconds', t.min_duration_seconds, 'max_duration_seconds', t.max_duration_seconds,
      'max_prize_pool_cents', t.max_prize_pool_cents, 'allowed_games', t.allowed_games, 'max_tiers', t.max_tiers,
      'updated_at', t.updated_at
    ) order by t.status, t.name)
    from leaderboard_templates t
  ), '[]'::jsonb);
end $$;

create or replace function public.leaderboard_admin_save_template(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._lb_require_admin();
  t public.leaderboard_templates;
  g text[];
  min_s integer; max_s integer; cap bigint; tiers integer;
  saved uuid;
begin
  if jsonb_typeof(p) <> 'object' or jsonb_typeof(p -> 'allowed_games') <> 'array' then raise exception 'BAD_INPUT'; end if;
  if p ->> 'name' is null or char_length(btrim(p ->> 'name')) not between 3 and 60 then raise exception 'BAD_NAME'; end if;
  if coalesce(char_length(p ->> 'description'), 0) > 500 then raise exception 'BAD_DESCRIPTION'; end if;
  if coalesce(p ->> 'status', 'active') not in ('active', 'archived') then raise exception 'BAD_STATUS'; end if;
  min_s := (p ->> 'min_duration_seconds')::integer;
  max_s := (p ->> 'max_duration_seconds')::integer;
  cap := (p ->> 'max_prize_pool_cents')::bigint;
  tiers := coalesce((p ->> 'max_tiers')::integer, 10);
  if min_s is null or max_s is null or min_s < 3600 or max_s < min_s or max_s > 7776000 then raise exception 'BAD_DURATION'; end if;
  if cap is null or cap < 100 or cap > 10000000000 then raise exception 'BAD_CAP'; end if;
  if tiers < 1 or tiers > 20 then raise exception 'TOO_MANY_TIERS'; end if;
  select coalesce(array_agg(distinct x order by x), '{}') into g from jsonb_array_elements_text(p -> 'allowed_games') x;
  if g is null or cardinality(g) = 0 or exists (select 1 from unnest(g) game where game not in ('jackpot', 'coinflip', 'roulette', 'slott')) then
    raise exception 'BAD_GAMES';
  end if;
  if nullif(p ->> 'id', '') is null then
    insert into leaderboard_templates (name, description, status, min_duration_seconds, max_duration_seconds, max_prize_pool_cents, allowed_games, max_tiers, created_by)
    values (btrim(p ->> 'name'), coalesce(p ->> 'description', ''), p ->> 'status', min_s, max_s, cap, g, tiers, uid)
    returning id into saved;
  else
    select * into t from leaderboard_templates where id = (p ->> 'id')::uuid for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    update leaderboard_templates set
      name = btrim(p ->> 'name'), description = coalesce(p ->> 'description', ''), status = p ->> 'status',
      min_duration_seconds = min_s, max_duration_seconds = max_s, max_prize_pool_cents = cap,
      allowed_games = g, max_tiers = tiers, version = version + 1, updated_at = clock_timestamp()
    where id = t.id;
    saved := t.id;
  end if;
  perform public._audit(uid, 'leaderboard_template_saved', null, jsonb_build_object('template_id', saved, 'version_bump', t.id is not null));
  return public.leaderboard_admin_templates();
exception when invalid_text_representation then
  raise exception 'BAD_INPUT';
end $$;

create or replace function public.leaderboard_admin_campaigns(p_status text, p_search text, p_limit integer, p_offset integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._lb_require_admin(); q text := left(btrim(coalesce(p_search, '')), 60);
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 or p_offset is null or p_offset < 0 then raise exception 'BAD_PAGE'; end if;
  if coalesce(p_status, '') <> '' and p_status not in (
    'draft', 'pending_approval', 'scheduled', 'active', 'closing', 'settling', 'under_review', 'completed', 'cancelled', 'rejected', 'suspended'
  ) then raise exception 'BAD_STATUS'; end if;
  return jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.rn) from (
        select row_number() over (order by c.updated_at desc) as rn, c.id, c.name, c.status, c.starts_at, c.ends_at, c.prize_pool_cents, c.funding_status, c.funding_shortfall,
          c.bankroll_at_check_cents, c.cancel_requested_at, c.visibility, p.username as partner_username,
          coalesce((select count(*) from leaderboard_entries e where e.campaign_id = c.id and e.qualifying_cents > 0), 0) as participants,
          coalesce((select sum(e.qualifying_cents) from leaderboard_entries e where e.campaign_id = c.id), 0) as qualifying_cents,
          coalesce((select count(*) from leaderboard_prize_awards a where a.campaign_id = c.id and a.payout_status = 'failed'), 0) as failed_awards,
          coalesce((select sum(a.reward_cents) from leaderboard_prize_awards a where a.campaign_id = c.id and a.payout_status = 'paid'), 0) as paid_cents
        from leaderboard_campaigns c
        join profiles p on p.id = c.partner_user_id
        where (coalesce(p_status, '') = '' or c.status = p_status)
          and (q = '' or c.name ilike '%' || q || '%' or p.username ilike '%' || q || '%')
        order by c.updated_at desc
        limit p_limit offset p_offset
      ) x
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.leaderboard_admin_get(p_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._lb_require_admin(); c public.leaderboard_campaigns; board jsonb;
begin
  select * into c from leaderboard_campaigns where id = p_campaign;
  if not found then raise exception 'NOT_FOUND'; end if;
  if c.status in ('draft', 'pending_approval', 'rejected') then
    board := jsonb_build_object(
      'campaign', jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description, 'status', c.status, 'visibility', c.visibility,
        'timezone', c.timezone, 'starts_at', c.starts_at, 'ends_at', c.ends_at, 'games', c.games,
        'min_wager_cents', c.min_wager_cents, 'prize_pool_cents', c.prize_pool_cents, 'ranked_at', c.ranked_at
      ),
      'tiers', coalesce((
        select jsonb_agg(jsonb_build_object('rank_start', t.rank_start, 'rank_end', t.rank_end, 'reward_cents', t.reward_cents) order by t.rank_start)
        from leaderboard_prize_tiers t where t.campaign_id = c.id
      ), '[]'::jsonb),
      'rules', public._lb_rules(c)
    );
  else
    board := public._lb_public_row(c.id, 50, 0);
  end if;
  return board || jsonb_build_object(
    'partner_user_id', c.partner_user_id,
    'funding', jsonb_build_object(
      'status', c.funding_status, 'bankroll_at_check_cents', c.bankroll_at_check_cents, 'shortfall', c.funding_shortfall
    ),
    'rejection_reason', c.rejection_reason,
    'cancel_requested_at', c.cancel_requested_at,
    'awards_created', c.awards_created,
    'failed', coalesce((
      select jsonb_agg(jsonb_build_object('rank', a.final_rank, 'username', p.username, 'reward_cents', a.reward_cents, 'last_error', a.last_error))
      from leaderboard_prize_awards a join profiles p on p.id = a.player_id
      where a.campaign_id = c.id and a.payout_status = 'failed'
    ), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object('action', l.action, 'created_at', l.created_at, 'actor_id', l.actor_id, 'details', l.details) order by l.id desc)
      from (
        select id, action, created_at, actor_id, details from audit_logs
        where action like 'leaderboard_%' and details ->> 'campaign_id' = c.id::text
        order by id desc limit 40
      ) l
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.leaderboard_admin_decide(p_campaign uuid, p_action text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._lb_require_admin();
  c public.leaderboard_campaigns;
  t public.leaderboard_templates;
  bank bigint;
  short boolean;
  reason text := btrim(coalesce(p_reason, ''));
begin
  if p_action not in ('approve', 'reject', 'suspend', 'resume', 'cancel', 'retry') then raise exception 'BAD_ACTION'; end if;
  select * into c from leaderboard_campaigns where id = p_campaign for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_action = 'approve' then
    if c.status <> 'pending_approval' then raise exception 'NOT_ALLOWED'; end if;
    if c.starts_at <= clock_timestamp() then raise exception 'START_PASSED'; end if;
    select * into t from leaderboard_templates where id = c.template_id and status = 'active';
    if not found then raise exception 'TEMPLATE_UNAVAILABLE'; end if;
    if c.prize_pool_cents > t.max_prize_pool_cents then raise exception 'PRIZE_CAP'; end if;
    select coalesce(balance, 0) into bank from wallet_accounts
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real';
    bank := coalesce(bank, 0);
    short := bank < c.prize_pool_cents;
    if short and char_length(reason) < 8 then raise exception 'BANKROLL_SHORT'; end if;
    update leaderboard_campaigns set
      status = 'scheduled', funding_status = 'checked', bankroll_at_check_cents = bank, funding_shortfall = short,
      rules_frozen_at = clock_timestamp(), approved_by = uid, approved_at = clock_timestamp(),
      config_snapshot = jsonb_build_object(
        'games', c.games, 'min_wager_cents', c.min_wager_cents, 'starts_at', c.starts_at, 'ends_at', c.ends_at,
        'timezone', c.timezone, 'prize_pool_cents', c.prize_pool_cents, 'template_version', t.version,
        'ranking', 'wager_turnover', 'tie_break', 'total desc, last wager asc, player id asc'
      ),
      template_version = t.version, updated_at = clock_timestamp()
    where id = c.id and status = 'pending_approval';
    perform public._audit(uid, 'leaderboard_approved', null,
      jsonb_build_object('campaign_id', c.id, 'bankroll_cents', bank, 'shortfall', short, 'reason', nullif(reason, '')));
  elsif p_action = 'reject' then
    if c.status <> 'pending_approval' then raise exception 'NOT_ALLOWED'; end if;
    if char_length(reason) < 8 then raise exception 'REASON_REQUIRED'; end if;
    update leaderboard_campaigns
      set status = 'rejected', rejection_reason = reason, updated_at = clock_timestamp()
      where id = c.id and status = 'pending_approval';
    perform public._audit(uid, 'leaderboard_rejected', null, jsonb_build_object('campaign_id', c.id, 'reason', reason));
  elsif p_action = 'suspend' then
    if c.status not in ('scheduled', 'active') then raise exception 'NOT_ALLOWED'; end if;
    if char_length(reason) < 8 then raise exception 'REASON_REQUIRED'; end if;
    update leaderboard_campaigns set status = 'suspended', rejection_reason = reason, updated_at = clock_timestamp() where id = c.id;
    perform public._audit(uid, 'leaderboard_suspended', null, jsonb_build_object('campaign_id', c.id, 'reason', reason));
  elsif p_action = 'resume' then
    if c.status <> 'suspended' then raise exception 'NOT_ALLOWED'; end if;
    if clock_timestamp() >= c.ends_at then raise exception 'WINDOW_CLOSED'; end if;
    update leaderboard_campaigns
      set status = case when clock_timestamp() >= c.starts_at then 'active' else 'scheduled' end,
          rejection_reason = null, updated_at = clock_timestamp()
      where id = c.id and status = 'suspended';
    perform public._audit(uid, 'leaderboard_resumed', null, jsonb_build_object('campaign_id', c.id));
  elsif p_action = 'cancel' then
    if c.awards_created or c.status in ('settling', 'under_review', 'completed') then raise exception 'AWARDS_EXIST'; end if;
    if c.status not in ('pending_approval', 'scheduled', 'active', 'suspended', 'closing', 'rejected', 'draft') then
      raise exception 'NOT_ALLOWED';
    end if;
    if char_length(reason) < 8 then raise exception 'REASON_REQUIRED'; end if;
    update leaderboard_campaigns
      set status = 'cancelled', rejection_reason = reason, closed_at = coalesce(closed_at, clock_timestamp()), updated_at = clock_timestamp()
      where id = c.id;
    perform public._audit(uid, 'leaderboard_cancelled', null, jsonb_build_object('campaign_id', c.id, 'by', 'admin', 'reason', reason));
  elsif p_action = 'retry' then
    if c.status <> 'under_review' then raise exception 'NOT_ALLOWED'; end if;
    update leaderboard_prize_awards set payout_status = 'pending', last_error = null
      where campaign_id = c.id and payout_status = 'failed';
    update leaderboard_campaigns set status = 'settling', updated_at = clock_timestamp() where id = c.id and status = 'under_review';
    perform public._audit(uid, 'leaderboard_retry', null, jsonb_build_object('campaign_id', c.id, 'reason', nullif(reason, '')));
  end if;
  return public.leaderboard_admin_get(c.id);
end $$;

revoke all on function public._lb_campaign_guard() from public, anon, authenticated;
revoke all on function public._lb_tier_guard() from public, anon, authenticated;
revoke all on function public._lb_event_guard() from public, anon, authenticated;
revoke all on function public._lb_award_guard() from public, anon, authenticated;
revoke all on function public._lb_require_admin() from public, anon, authenticated;
revoke all on function public._lb_require_partner() from public, anon, authenticated;
revoke all on function public._lb_check_timezone(text) from public, anon, authenticated;
revoke all on function public._lb_sync(uuid) from public, anon, authenticated;
revoke all on function public._lb_inflight(uuid) from public, anon, authenticated;
revoke all on function public._lb_pay_campaign(uuid) from public, anon, authenticated;
revoke all on function public._lb_rules(public.leaderboard_campaigns) from public, anon, authenticated;
revoke all on function public._lb_public_row(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public._lb_replace_tiers(uuid, jsonb, integer) from public, anon, authenticated;

revoke all on function public.leaderboard_tick() from public;
grant execute on function public.leaderboard_tick() to anon, authenticated, service_role;
revoke all on function public.leaderboard_public_list() from public;
grant execute on function public.leaderboard_public_list() to anon, authenticated, service_role;
revoke all on function public.leaderboard_public_board(uuid, integer, integer) from public;
grant execute on function public.leaderboard_public_board(uuid, integer, integer) to anon, authenticated, service_role;

revoke all on function public.leaderboard_my_access() from public, anon;
grant execute on function public.leaderboard_my_access() to authenticated, service_role;
revoke all on function public.leaderboard_partner_templates() from public, anon;
grant execute on function public.leaderboard_partner_templates() to authenticated, service_role;
revoke all on function public.leaderboard_partner_save(jsonb) from public, anon;
grant execute on function public.leaderboard_partner_save(jsonb) to authenticated, service_role;
revoke all on function public.leaderboard_partner_get(uuid) from public, anon;
grant execute on function public.leaderboard_partner_get(uuid) to authenticated, service_role;
revoke all on function public.leaderboard_partner_list(text, text, integer, integer) from public, anon;
grant execute on function public.leaderboard_partner_list(text, text, integer, integer) to authenticated, service_role;
revoke all on function public.leaderboard_partner_submit(uuid) from public, anon;
grant execute on function public.leaderboard_partner_submit(uuid) to authenticated, service_role;
revoke all on function public.leaderboard_partner_duplicate(uuid) from public, anon;
grant execute on function public.leaderboard_partner_duplicate(uuid) to authenticated, service_role;
revoke all on function public.leaderboard_partner_cancel(uuid) from public, anon;
grant execute on function public.leaderboard_partner_cancel(uuid) to authenticated, service_role;
revoke all on function public.leaderboard_admin_templates() from public, anon;
grant execute on function public.leaderboard_admin_templates() to authenticated, service_role;
revoke all on function public.leaderboard_admin_save_template(jsonb) from public, anon;
grant execute on function public.leaderboard_admin_save_template(jsonb) to authenticated, service_role;
revoke all on function public.leaderboard_admin_campaigns(text, text, integer, integer) from public, anon;
grant execute on function public.leaderboard_admin_campaigns(text, text, integer, integer) to authenticated, service_role;
revoke all on function public.leaderboard_admin_get(uuid) from public, anon;
grant execute on function public.leaderboard_admin_get(uuid) to authenticated, service_role;
revoke all on function public.leaderboard_admin_decide(uuid, text, text) from public, anon;
grant execute on function public.leaderboard_admin_decide(uuid, text, text) to authenticated, service_role;

-- prod-only:begin
select cron.schedule(
  'pvp-leaderboard-worker',
  '* * * * *',
  'select public.leaderboard_tick()'
);
-- prod-only:end
