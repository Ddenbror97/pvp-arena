-- Daily Reward Chest: one server-drawn reward per player every 24 hours.
-- The reward table, weights and cosmetic pools are server-only; players see
-- only what they won. Rewards reuse the existing systems: credits post to the
-- ledger like prestige loot boxes, XP lands in xp_events / user_prestige,
-- frames and crowns land in user_cosmetics, and the fee-free ticket is a
-- one-use entitlement consumed inside Jackpot, Coinflip and P2P Slott
-- settlement when its holder wins a game that would otherwise pay a fee.

-- ---------- chest-only cosmetics ----------
-- Hidden from the public catalog so the client cannot list what the chest can
-- drop. Owned ones are returned by prestige_state.
insert into public.cosmetics (type, name, description, rarity, asset_key, metadata) values
  ('frame', 'Vortex Frame', 'Clean. Modern. Timeless.', 'common', 'vortex', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Stone Frame', 'Built to last.', 'common', 'stone', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Nature Frame', 'Grow. Evolve. Belong.', 'common', 'nature', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Tidal Frame', 'Flow with the legend.', 'rare', 'tidal', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Glitch Frame', 'Reality is optional.', 'rare', 'glitch', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Void Frame', 'Nothing can hold you.', 'rare', 'void', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Nebula Frame', 'Dream. Fight. Win.', 'epic', 'nebula', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Dragonfire Frame', 'Power. Prestige. Eternal.', 'legendary', 'dragonfire', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Orbit Frame', 'Beyond the stars.', 'legendary', 'orbit', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('frame', 'Angel Frame', 'Pure. Noble. Unbreakable.', 'legendary', 'angel', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('crown', 'Steel Crown', 'Simple. Classic. Royal.', 'common', 'crown-steel', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('crown', 'Frost Crown', 'Bolder. Brighter. Royal.', 'rare', 'crown-frost', '{"catalog_hidden": true, "source": "daily_chest"}'),
  ('crown', 'Inferno Crown', 'The ultimate royalty.', 'legendary', 'crown-inferno', '{"catalog_hidden": true, "source": "daily_chest"}')
on conflict (asset_key) do nothing;

drop policy if exists prestige_catalog_read on public.cosmetics;
create policy prestige_catalog_read on public.cosmetics for select to anon, authenticated
  using (active and coalesce((metadata->>'catalog_hidden')::boolean, false) = false);

alter table public.xp_events drop constraint if exists xp_events_source_game_check;
alter table public.xp_events add constraint xp_events_source_game_check
  check (source_game in ('jackpot', 'coinflip', 'roulette', 'daily_chest'));

-- ---------- reward table (server-only) ----------
-- Weights are parts per million of one open. kind = cosmetic draws one
-- not-yet-owned item from `pool`; adding a row or a pool item extends the chest.
create table public.daily_chest_rewards (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  kind text not null check (kind in ('credits', 'xp', 'cosmetic', 'fee_ticket')),
  weight integer not null check (weight > 0),
  amount bigint,
  pool text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint daily_chest_reward_shape check (
    (kind in ('credits', 'xp') and amount > 0 and pool is null)
    or (kind = 'cosmetic' and amount is null and pool is not null)
    or (kind = 'fee_ticket' and amount = 1 and pool is null))
);

create table public.daily_chest_pool_items (
  pool text not null,
  cosmetic_id uuid not null references public.cosmetics (id),
  primary key (pool, cosmetic_id)
);

insert into public.daily_chest_rewards (key, kind, weight, amount, pool) values
  ('xp_25', 'xp', 300000, 25, null),
  ('xp_50', 'xp', 170000, 50, null),
  ('xp_100', 'xp', 60000, 100, null),
  ('xp_250', 'xp', 20000, 250, null),
  ('credits_10', 'credits', 250000, 10, null),
  ('credits_25', 'credits', 50000, 25, null),
  ('credits_50', 'credits', 25000, 50, null),
  ('credits_100', 'credits', 10000, 100, null),
  ('credits_200', 'credits', 3500, 200, null),
  ('credits_500', 'credits', 1400, 500, null),
  ('credits_1000', 'credits', 100, 1000, null),
  ('frame_basic', 'cosmetic', 50000, null, 'frame_basic'),
  ('frame_rare', 'cosmetic', 30000, null, 'frame_rare'),
  ('frame_legendary', 'cosmetic', 10000, null, 'frame_legendary'),
  ('crown', 'cosmetic', 10000, null, 'crown'),
  ('fee_ticket', 'fee_ticket', 10000, 1, null);

insert into public.daily_chest_pool_items (pool, cosmetic_id)
select v.pool, c.id
from (values
  ('frame_basic', 'vortex'), ('frame_basic', 'stone'), ('frame_basic', 'nature'),
  ('frame_rare', 'tidal'), ('frame_rare', 'glitch'), ('frame_rare', 'void'), ('frame_rare', 'nebula'),
  ('frame_legendary', 'dragonfire'), ('frame_legendary', 'orbit'), ('frame_legendary', 'angel'),
  ('crown', 'crown-steel'), ('crown', 'crown-frost'), ('crown', 'crown-inferno')
) as v(pool, asset_key)
join public.cosmetics c on c.asset_key = v.asset_key;

-- ---------- per-player cooldown + history ----------
create table public.daily_chest_state (
  user_id uuid primary key references public.profiles (id),
  last_opened_at timestamptz,
  next_at timestamptz,
  opens integer not null default 0 check (opens >= 0),
  constraint daily_chest_state_times check ((last_opened_at is null) = (next_at is null) and (next_at is null or next_at > last_opened_at))
);

create table public.fee_free_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  source text not null check (source in ('daily_chest')),
  source_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  used_at timestamptz,
  used_game text check (used_game in ('jackpot', 'coinflip', 'slott')),
  used_game_id bigint,
  waived_cents bigint check (waived_cents > 0),
  unique (source, source_id),
  unique (used_game, used_game_id),
  constraint fee_ticket_used_fields check (
    (used_at is null and used_game is null and used_game_id is null and waived_cents is null)
    or (used_at is not null and used_game is not null and used_game_id is not null and waived_cents is not null))
);
create index fee_free_tickets_unused on public.fee_free_tickets (user_id, created_at, id) where used_at is null;

create table public.daily_chest_opens (
  id uuid primary key,
  user_id uuid not null references public.profiles (id),
  opened_at timestamptz not null,
  next_at timestamptz not null,
  reward_key text not null references public.daily_chest_rewards (key),
  kind text not null check (kind in ('credits', 'xp', 'cosmetic', 'fee_ticket')),
  amount bigint,
  cosmetic_id uuid references public.cosmetics (id),
  fallback boolean not null default false,
  ledger_tx_id uuid unique references public.ledger_transactions (id),
  ticket_id uuid unique references public.fee_free_tickets (id),
  constraint daily_chest_open_shape check (
    (kind = 'credits' and amount > 0 and ledger_tx_id is not null and cosmetic_id is null and ticket_id is null)
    or (kind = 'xp' and amount > 0 and ledger_tx_id is null and cosmetic_id is null and ticket_id is null)
    or (kind = 'cosmetic' and amount is null and cosmetic_id is not null and ledger_tx_id is null and ticket_id is null)
    or (kind = 'fee_ticket' and amount = 1 and ticket_id is not null and ledger_tx_id is null and cosmetic_id is null))
);
create index daily_chest_opens_user on public.daily_chest_opens (user_id, opened_at desc);

create trigger no_mutation before update or delete on public.daily_chest_opens for each row execute function public._immutable();

create or replace function public._fee_ticket_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD fee_free_tickets'; end if;
  if old.used_at is not null then raise exception 'IMMUTABLE_RECORD used ticket %', old.id; end if;
  if new.user_id <> old.user_id or new.source <> old.source or new.source_id <> old.source_id or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  return new;
end $$;
revoke all on function public._fee_ticket_guard() from public, anon, authenticated;
create trigger fee_ticket_guard before update or delete on public.fee_free_tickets for each row execute function public._fee_ticket_guard();

alter table public.daily_chest_rewards enable row level security;
alter table public.daily_chest_pool_items enable row level security;
alter table public.daily_chest_state enable row level security;
alter table public.daily_chest_opens enable row level security;
alter table public.fee_free_tickets enable row level security;
revoke all on public.daily_chest_rewards, public.daily_chest_pool_items, public.daily_chest_state,
  public.daily_chest_opens, public.fee_free_tickets from public, anon, authenticated;
grant select on public.daily_chest_state, public.daily_chest_opens, public.fee_free_tickets to authenticated;
create policy daily_chest_state_own on public.daily_chest_state for select to authenticated using (user_id = auth.uid());
create policy daily_chest_opens_own on public.daily_chest_opens for select to authenticated using (user_id = auth.uid());
create policy fee_free_tickets_own on public.fee_free_tickets for select to authenticated using (user_id = auth.uid());
grant all on public.daily_chest_rewards, public.daily_chest_pool_items, public.daily_chest_state,
  public.daily_chest_opens, public.fee_free_tickets to service_role;

-- ---------- fee-free ticket ----------
-- Decides whether a ticket covers this game's fee, consuming the holder's
-- oldest unused ticket the first time. Idempotent per game: a game that already
-- used a ticket always answers true, and one game can never use two tickets.
create or replace function public._fee_ticket_take(p_user uuid, p_game text, p_game_id bigint, p_fee bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if exists (select 1 from public.fee_free_tickets where used_game = p_game and used_game_id = p_game_id) then return true; end if;
  if p_user is null or p_fee is null or p_fee <= 0 then return false; end if;
  select id into tid from public.fee_free_tickets
    where user_id = p_user and used_at is null
    order by created_at, id limit 1
    for update skip locked;
  if tid is null then return false; end if;
  update public.fee_free_tickets
    set used_at = clock_timestamp(), used_game = p_game, used_game_id = p_game_id, waived_cents = p_fee
    where id = tid and used_at is null;
  if not found then return false; end if;
  perform public._audit(p_user, 'fee_ticket_used', p_game_id, jsonb_build_object('ticket', tid, 'game', p_game, 'waived', p_fee));
  return true;
end $$;
revoke all on function public._fee_ticket_take(uuid, text, bigint, bigint) from public, anon, authenticated;

create or replace function public._fee_ticket_used(p_game text, p_game_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.fee_free_tickets where used_game = p_game and used_game_id = p_game_id)
$$;
revoke all on function public._fee_ticket_used(text, bigint) from public, anon, authenticated;

-- A ticket-covered win records fee_amount = 0; every other completed game keeps the exact fee.
alter table public.coinflip_games drop constraint completed_has_result;
alter table public.coinflip_games add constraint completed_has_result check (status <> 'COMPLETED' or (server_seed is not null and completed_at is not null
  and fee_amount in (0, (pot_amount * fee_bps) / 10000) and payout_amount + fee_amount = pot_amount));

alter table public.slot_games drop constraint completed_has_result;
alter table public.slot_games add constraint completed_has_result check (status <> 'COMPLETED' or (
  server_seed is not null and completed_at is not null and (
    (outcome = 'WIN' and winner_id is not null and fee_amount in (0, (p2p_pot * fee_bps) / 10000)
      and payout_amount + fee_amount = p2p_pot + bonus_total)
    or (outcome = 'DRAW' and winner_id is null and fee_amount = 0 and payout_amount = 0))));

create or replace function public.jackpot_settle(p_game_id bigint)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare g public.jackpot_games; seed bytea; d record; winner uuid; wtotal bigint; sum_amt bigint; n_entries int;
  rake bigint; payout bigint; tx uuid; escrow uuid; house uuid; p record; err text; waived boolean := false;
begin
  select * into g from jackpot_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED','CANCELLED','WAITING') then return 'noop'; end if;
  if g.status = 'ACTIVE' then
    if clock_timestamp() < g.scheduled_end_at then return 'not_due'; end if;
    update jackpot_games set status = 'DRAWING', drawn_at = clock_timestamp() where id = g.id;
    insert into jackpot_payouts (game_id) values (g.id) on conflict do nothing;
    perform _audit(null, 'game_locked', g.id, jsonb_build_object('pot', g.pot_amount, 'players', g.player_count));
    g.status := 'DRAWING';
  end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    select server_seed into seed from jackpot_game_secrets where game_id = g.id;
    if seed is null then raise exception 'SEED_MISSING'; end if;
    if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then
      raise exception 'INVARIANT_COMMITMENT';
    end if;
    select coalesce(sum(amount),0), count(*) into sum_amt, n_entries from jackpot_entries where game_id = g.id;
    if sum_amt <> g.pot_amount or n_entries <> g.entry_count then raise exception 'INVARIANT_POT_MISMATCH'; end if;
    if (select coalesce(sum(total_amount),0) from jackpot_players where game_id = g.id) <> g.pot_amount then raise exception 'INVARIANT_PLAYERS_MISMATCH'; end if;
    if exists (select 1 from (select ticket_start, lag(ticket_end, 1, 0::bigint) over (order by ticket_start) prev_end
               from jackpot_entries where game_id = g.id) t where t.ticket_start <> t.prev_end) then
      raise exception 'INVARIANT_TICKET_GAP';
    end if;

    select * into d from jackpot_draw_ticket(seed, g.id, g.draw_version, g.pot_amount);
    select user_id into winner from jackpot_entries where game_id = g.id and ticket_start <= d.ticket and ticket_end > d.ticket;
    if winner is null then raise exception 'INVARIANT_NO_WINNER'; end if;
    select total_amount into wtotal from jackpot_players where game_id = g.id and user_id = winner;
    rake := (g.pot_amount * g.rake_bps) / 10000;
    if _fee_ticket_take(winner, 'jackpot', g.id, rake) then rake := 0; waived := true; end if;
    payout := g.pot_amount - rake;

    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('jackpot_settlement', 'settle:' || g.id, g.account_type, winner, g.id, 'Jackpot settlement') returning id into tx;
    escrow := _system_account('game_escrow', g.asset, g.account_type);
    for p in select user_id, total_amount from jackpot_players where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(p.user_id, 'user_locked', g.asset, g.account_type), -p.total_amount);
    end loop;
    perform _post(tx, escrow, g.pot_amount);
    perform _post(tx, escrow, -g.pot_amount);
    perform _post(tx, _user_account(winner, 'user_available', g.asset, g.account_type), payout);
    if rake > 0 then
      house := _system_account('house_revenue', g.asset, g.account_type);
      perform _post(tx, house, rake);
    end if;

    update jackpot_payouts set status = 'SETTLED', attempts = attempts + 1, ledger_tx_id = tx, settled_at = clock_timestamp(), last_error = null
      where game_id = g.id;
    update jackpot_games set status = 'COMPLETED', completed_at = clock_timestamp(), winning_ticket = d.ticket, draw_counter = d.counter,
      winner_id = winner, winner_total = wtotal, payout_amount = payout, rake_amount = rake, server_seed = encode(seed, 'hex')
      where id = g.id;
    perform _audit(null, 'game_settled', g.id, jsonb_build_object('winner', winner, 'ticket', d.ticket, 'payout', payout, 'rake', rake, 'fee_waived', waived));
  exception when others then
    err := sqlerrm;
    update jackpot_payouts set status = 'FAILED', attempts = attempts + 1, last_error = err where game_id = g.id;
    perform _audit(null, 'settlement_failed', g.id, jsonb_build_object('error', err));
    return 'failed';
  end;
  return 'settled';
end;
$function$;
revoke all on function public.jackpot_settle(bigint) from public, anon, authenticated;
grant execute on function public.jackpot_settle(bigint) to service_role;

-- The winner's fee is decided once, when the payout row is created; settlement
-- re-derives it from the recorded ticket so a ticket granted later never changes it.
create or replace function public.coinflip_advance(p_game_id bigint)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare g public.coinflip_games; r public.coinflip_results; po public.coinflip_payouts; seed bytea; o record;
  n_entries int; sum_amt bigint; n_sides int; all_eq boolean; winner_side_ok boolean;
  tx uuid; escrow uuid; fee bigint; payout bigint; p record; err text; was_retry boolean;
begin
  select * into g from coinflip_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED','CANCELLED') then return 'noop'; end if;

  if g.status = 'WAITING' then
    if clock_timestamp() < g.expires_at then return 'not_due'; end if;
    perform _coinflip_refund(g.id, 'EXPIRED');
    return 'cancelled';
  end if;

  select * into r from coinflip_results where game_id = g.id;
  if not found then raise exception 'RESULT_MISSING'; end if;

  if g.status = 'READY' then
    if clock_timestamp() < g.animation_start_at then return 'not_due'; end if;
    update coinflip_games set status = 'FLIPPING', winner_id = r.winner_id, winning_side = r.winning_side where id = g.id;
    perform _audit_cf(null, 'FLIP_STARTED', g.id, jsonb_build_object('animation_start_at', g.animation_start_at));
    g.status := 'FLIPPING';
  end if;

  if g.status = 'FLIPPING' then
    if clock_timestamp() < g.animation_end_at then return 'flipping'; end if;
    fee := (g.pot_amount * g.fee_bps) / 10000;
    if _fee_ticket_take(r.winner_id, 'coinflip', g.id, fee) then fee := 0; end if;
    update coinflip_games set status = 'SETTLEMENT', settlement_started_at = clock_timestamp() where id = g.id;
    perform _audit_cf(null, 'FLIP_COMPLETED', g.id, jsonb_build_object('winning_side', r.winning_side));
    insert into coinflip_payouts (game_id, kind, idempotency_key, beneficiary_id, amount)
      values (g.id, 'WINNER', 'coinflip:' || g.id || ':winner', r.winner_id, g.pot_amount - fee)
      on conflict (game_id) do nothing;
    perform _audit_cf(null, 'PAYOUT_CREATED', g.id, jsonb_build_object('beneficiary', r.winner_id, 'amount', g.pot_amount - fee));
    g.status := 'SETTLEMENT';
  end if;

  -- SETTLEMENT
  select * into po from coinflip_payouts where game_id = g.id for update;
  if not found then
    fee := (g.pot_amount * g.fee_bps) / 10000;
    if _fee_ticket_take(r.winner_id, 'coinflip', g.id, fee) then fee := 0; end if;
    insert into coinflip_payouts (game_id, kind, idempotency_key, beneficiary_id, amount)
      values (g.id, 'WINNER', 'coinflip:' || g.id || ':winner', r.winner_id, g.pot_amount - fee) returning * into po;
  end if;
  was_retry := po.attempts > 0;
  if was_retry then perform _audit_cf(null, 'RECOVERY_ATTEMPTED', g.id, jsonb_build_object('attempt', po.attempts + 1)); end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    select count(*), coalesce(sum(amount),0), count(distinct side), coalesce(bool_and(amount = g.amount), false)
      into n_entries, sum_amt, n_sides, all_eq from coinflip_entries where game_id = g.id;
    if n_entries <> 2 or sum_amt <> g.pot_amount or n_sides <> 2 or not all_eq then raise exception 'INVARIANT_ENTRIES'; end if;
    select (side = r.winning_side) into winner_side_ok from coinflip_entries where game_id = g.id and user_id = r.winner_id;
    if not coalesce(winner_side_ok, false) then raise exception 'INVARIANT_WINNER_SIDE'; end if;
    select server_seed into seed from coinflip_game_secrets where game_id = g.id;
    if seed is null then raise exception 'SEED_MISSING'; end if;
    if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
    select * into o from coinflip_outcome(seed, g.id, g.draw_version);
    if o.side <> r.winning_side or o.hmac_hex <> r.hmac_hex then raise exception 'INVARIANT_RESULT'; end if;
    fee := case when _fee_ticket_used('coinflip', g.id) then 0 else (g.pot_amount * g.fee_bps) / 10000 end;
    payout := g.pot_amount - fee;
    if po.amount <> payout or po.beneficiary_id <> r.winner_id then raise exception 'INVARIANT_PAYOUT'; end if;

    if po.status <> 'SETTLED' then
      -- Same posting pattern as Jackpot settlement: players' locked -> escrow -> winner available (+ house fee).
      perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
      insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
        values ('coinflip_settlement', po.idempotency_key, g.account_type, r.winner_id, g.id, 'Coinflip settlement') returning id into tx;
      escrow := _system_account('game_escrow', g.asset, g.account_type);
      for p in select user_id, amount from coinflip_entries where game_id = g.id order by user_id loop
        perform _post(tx, _user_account(p.user_id, 'user_locked', g.asset, g.account_type), -p.amount);
      end loop;
      perform _post(tx, escrow, g.pot_amount);
      perform _post(tx, escrow, -g.pot_amount);
      perform _post(tx, _user_account(r.winner_id, 'user_available', g.asset, g.account_type), payout);
      if fee > 0 then perform _post(tx, _system_account('house_revenue', g.asset, g.account_type), fee); end if;
      if current_setting('pvp.fail_after_ledger', true) = 'on' then raise exception 'INJECTED_FAILURE_AFTER_LEDGER'; end if;
      update coinflip_payouts set status = 'SETTLED', attempts = attempts + 1, ledger_tx_id = tx, settled_at = clock_timestamp(), last_error = null
        where game_id = g.id;
      perform _audit_cf(null, 'PAYOUT_SETTLED', g.id, jsonb_build_object('beneficiary', r.winner_id, 'amount', payout, 'fee', fee, 'ledger_tx', tx));
    end if;

    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update coinflip_games set status = 'COMPLETED', completed_at = clock_timestamp(), payout_amount = payout, fee_amount = fee,
      server_seed = encode(seed, 'hex') where id = g.id;
    perform _audit_cf(null, 'GAME_COMPLETED', g.id, jsonb_build_object('winner', r.winner_id, 'winning_side', r.winning_side, 'payout', payout, 'fee', fee));
    if was_retry then perform _audit_cf(null, 'RECOVERY_COMPLETED', g.id, null); end if;
  exception when others then
    err := sqlerrm;
    update coinflip_payouts set status = 'FAILED', attempts = attempts + 1, last_error = left(err, 500) where game_id = g.id;
    perform _audit_cf(null, 'RECOVERY_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
    return 'failed';
  end;
  return 'settled';
end $function$;
revoke execute on function public.coinflip_advance(bigint) from public, anon, authenticated;
grant execute on function public.coinflip_advance(bigint) to service_role;

-- The ticket waives the fee on the P2P pot only; WILD bonuses were never fee'd.
create or replace function public._slot_settle(p_game_id bigint)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare g public.slot_games; seed bytea; n_entries int; sum_amt bigint; ev_total bigint; tx uuid; escrow uuid;
  fee bigint; payout bigint; winner uuid; e record; bank public.account_kind; waived boolean := false;
begin
  select * into g from slot_games where id = p_game_id for update;
  if g.status <> 'SETTLEMENT' then return 'noop'; end if;
  if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
  select count(*), coalesce(sum(amount), 0) into n_entries, sum_amt from slot_entries where game_id = g.id and amount = g.stake;
  if n_entries <> 2 or sum_amt <> g.p2p_pot then raise exception 'INVARIANT_ENTRIES'; end if;
  select coalesce(sum(awarded_cents), 0) into ev_total from slot_bonus_events where game_id = g.id and status = 'AWARDED';
  if ev_total <> g.bonus_total then raise exception 'INVARIANT_BONUS'; end if;
  select server_seed into seed from slot_game_secrets where game_id = g.id;
  if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  if exists (select 1 from slot_spins s where s.game_id = g.id
             and s.grid <> slot_spin_grid(seed, g.id, s.spin_no)) then
    raise exception 'INVARIANT_RESULT';
  end if;

  perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
  escrow := _system_account('game_escrow', g.asset, g.account_type);
  if g.score_a <> g.score_b then
    winner := case when g.score_a > g.score_b then g.creator_id else g.opponent_id end;
    fee := (g.p2p_pot * g.fee_bps) / 10000;
    if _fee_ticket_take(winner, 'slott', g.id, fee) then fee := 0; waived := true; end if;
    payout := g.p2p_pot - fee + g.bonus_total;
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_settlement', 'slot:' || g.id || ':settlement', g.account_type, winner, g.id, 'P2P Slott settlement')
      returning id into tx;
    for e in select user_id, amount from slot_entries where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
    end loop;
    perform _post(tx, escrow, g.p2p_pot);
    perform _post(tx, escrow, -(g.p2p_pot + g.bonus_total));
    perform _post(tx, _user_account(winner, 'user_available', g.asset, g.account_type), payout);
    if fee > 0 then perform _post(tx, _system_account('house_revenue', g.asset, g.account_type), fee); end if;
    update slot_bonus_events set status = 'PAID' where game_id = g.id and status = 'AWARDED';
    insert into slot_payouts (game_id, beneficiary_id, kind, amount, ledger_tx_id) values (g.id, winner, 'WINNER', payout, tx);
    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update slot_games set status = 'COMPLETED', completed_at = clock_timestamp(), outcome = 'WIN', winner_id = winner,
      fee_amount = fee, payout_amount = payout, server_seed = encode(seed, 'hex'), last_error = null where id = g.id;
    perform _audit_slot(null, 'GAME_COMPLETED', g.id, jsonb_build_object('outcome', 'WIN', 'winner', winner, 'score_a', g.score_a,
      'score_b', g.score_b, 'p2p_pot', g.p2p_pot, 'bonus', g.bonus_total, 'fee', fee, 'fee_waived', waived, 'payout', payout, 'ledger_tx', tx));
  else
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_refund', 'slot:' || g.id || ':draw', g.account_type, null, g.id, 'P2P Slott draw refund')
      returning id into tx;
    for e in select user_id, amount from slot_entries where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
      perform _post(tx, _user_account(e.user_id, 'user_available', g.asset, g.account_type), e.amount);
      insert into slot_payouts (game_id, beneficiary_id, kind, amount, ledger_tx_id) values (g.id, e.user_id, 'DRAW_REFUND', e.amount, tx);
    end loop;
    if g.bonus_total > 0 then
      bank := case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end;
      for e in select budget_day, sum(awarded_cents) amt from slot_bonus_events where game_id = g.id and status = 'AWARDED'
               group by budget_day order by budget_day loop
        update slot_bonus_budget set reserved_cents = reserved_cents - e.amt, updated_at = clock_timestamp() where day = e.budget_day;
      end loop;
      perform _post(tx, _system_account(bank, g.asset, g.account_type), g.bonus_total);
      perform _post(tx, escrow, -g.bonus_total);
      update slot_bonus_events set status = 'RETURNED', return_tx_id = tx where game_id = g.id and status = 'AWARDED';
    end if;
    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update slot_games set status = 'COMPLETED', completed_at = clock_timestamp(), outcome = 'DRAW', winner_id = null,
      fee_amount = 0, payout_amount = 0, server_seed = encode(seed, 'hex'), last_error = null where id = g.id;
    perform _audit_slot(null, 'GAME_COMPLETED', g.id, jsonb_build_object('outcome', 'DRAW', 'score', g.score_a,
      'bonus_returned', g.bonus_total, 'ledger_tx', tx));
  end if;
  return 'settled';
end $function$;
revoke execute on function public._slot_settle(bigint) from public, anon, authenticated;

-- ---------- chest draw ----------
-- Uniform pick over the active weights: rejection sampling on 32 CSPRNG bits keeps every weight exact.
create or replace function public._daily_chest_roll()
returns public.daily_chest_rewards language plpgsql volatile security definer set search_path = public as $$
declare total bigint; raw bigint; pick bigint; acc bigint := 0; o public.daily_chest_rewards;
begin
  select sum(weight) into total from public.daily_chest_rewards where active;
  if coalesce(total, 0) <= 0 then raise exception 'CHEST_UNAVAILABLE'; end if;
  loop
    raw := ('x' || lpad(encode(extensions.gen_random_bytes(4), 'hex'), 16, '0'))::bit(64)::bigint;
    exit when raw < (4294967296 / total) * total;
  end loop;
  pick := raw % total;
  for o in select * from public.daily_chest_rewards where active order by key loop
    acc := acc + o.weight;
    if pick < acc then return o; end if;
  end loop;
  raise exception 'CHEST_UNAVAILABLE';
end $$;
revoke all on function public._daily_chest_roll() from public, anon, authenticated;

-- Same XP path as wagers (xp_events + user_prestige + level unlocks), keyed by the open.
create or replace function public._daily_chest_award_xp(p_user uuid, p_open uuid, p_xp bigint)
returns void language plpgsql security definer set search_path = public as $$
declare cur public.user_prestige; nxt int;
begin
  insert into public.user_prestige (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into cur from public.user_prestige where user_id = p_user for update;
  insert into public.xp_events (user_id, source_game, source_transaction_id, event_type, xp_amount, metadata)
    values (p_user, 'daily_chest', p_open::text, 'daily_chest', p_xp, '{}'::jsonb);
  nxt := public.prestige_level_for(cur.total_xp + p_xp);
  update public.user_prestige set total_xp = total_xp + p_xp, current_level = nxt, updated_at = clock_timestamp()
    where user_id = p_user;
  perform public.prestige_sync_user(p_user);
  perform public._audit(p_user, 'prestige_xp_earned', null, jsonb_build_object('game', 'daily_chest', 'xp', p_xp, 'source', p_open));
  if nxt > cur.current_level then
    perform public._audit(p_user, 'prestige_level_up', null, jsonb_build_object('from', cur.current_level, 'to', nxt));
    perform public._audit(p_user, 'prestige_reward_unlocked', null, jsonb_build_object('level', nxt));
  end if;
end $$;
revoke all on function public._daily_chest_award_xp(uuid, uuid, bigint) from public, anon, authenticated;

create or replace function public._daily_chest_reward_json(o public.daily_chest_opens)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when o.id is null then null else jsonb_build_object(
    'kind', o.kind,
    'amount', o.amount,
    'opened_at', o.opened_at,
    'cosmetic', (select jsonb_build_object('id', c.id, 'type', c.type, 'name', c.name, 'description', c.description,
                   'rarity', c.rarity, 'asset_key', c.asset_key) from public.cosmetics c where c.id = o.cosmetic_id)
  ) end
$$;
revoke all on function public._daily_chest_reward_json(public.daily_chest_opens) from public, anon, authenticated;

create or replace function public.daily_chest_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); st public.daily_chest_state; last public.daily_chest_opens; now_ts timestamptz := clock_timestamp();
begin
  if uid is null then
    return jsonb_build_object('signed_in', false, 'available', false, 'next_at', null, 'server_time', now_ts, 'tickets', 0, 'last', null);
  end if;
  select * into st from public.daily_chest_state where user_id = uid;
  select * into last from public.daily_chest_opens where user_id = uid order by opened_at desc limit 1;
  return jsonb_build_object(
    'signed_in', true,
    'available', st.next_at is null or st.next_at <= now_ts,
    'next_at', case when st.next_at > now_ts then st.next_at end,
    'server_time', now_ts,
    'tickets', (select count(*) from public.fee_free_tickets where user_id = uid and used_at is null),
    'last', public._daily_chest_reward_json(last)
  );
end $$;
revoke all on function public.daily_chest_status() from public, anon, authenticated;
grant execute on function public.daily_chest_status() to anon, authenticated;

-- Takes no input: the caller cannot influence the reward. The player's chest
-- row is locked before anything else, so concurrent opens serialise and only
-- the first inside a 24-hour window succeeds. Every check that can fail runs
-- before the draw, so an error can never be used to re-roll.
create or replace function public.daily_chest_open()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prof public.profiles; st public.daily_chest_state; now_ts timestamptz := clock_timestamp();
  v_asset text; v_type text; v_bank public.account_kind; rw public.daily_chest_rewards;
  open_id uuid := gen_random_uuid(); v_kind text; v_amount bigint; v_cos uuid; v_fallback boolean := false;
  tx uuid; ticket uuid; rec public.daily_chest_opens;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into prof from public.profiles where id = uid;
  if prof.id is null then raise exception 'AUTH_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;

  insert into public.daily_chest_state (user_id) values (uid) on conflict (user_id) do nothing;
  select * into st from public.daily_chest_state where user_id = uid for update;
  if st.next_at is not null and st.next_at > now_ts then raise exception 'CHEST_COOLDOWN'; end if;

  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;

  rw := public._daily_chest_roll();
  v_kind := rw.kind;
  v_amount := rw.amount;
  if rw.kind = 'cosmetic' then
    select c.id into v_cos
      from public.daily_chest_pool_items p join public.cosmetics c on c.id = p.cosmetic_id
      where p.pool = rw.pool and c.active
        and not exists (select 1 from public.user_cosmetics uc where uc.user_id = uid and uc.cosmetic_id = c.id)
      order by gen_random_uuid()
      limit 1;
    if v_cos is null then
      -- Everything in this pool is already owned: pay XP instead of a duplicate.
      v_kind := 'xp'; v_amount := 100; v_fallback := true;
    end if;
  end if;

  if v_kind = 'credits' then
    insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
      values ('prestige_reward', 'daily_chest:' || open_id::text, v_type, uid, 'Daily chest')
      returning id into tx;
    perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -v_amount);
    perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), v_amount);
  elsif v_kind = 'xp' then
    perform public._daily_chest_award_xp(uid, open_id, v_amount);
  elsif v_kind = 'cosmetic' then
    insert into public.user_cosmetics (user_id, cosmetic_id) values (uid, v_cos);
  elsif v_kind = 'fee_ticket' then
    insert into public.fee_free_tickets (user_id, source, source_id) values (uid, 'daily_chest', open_id) returning id into ticket;
  end if;

  insert into public.daily_chest_opens (id, user_id, opened_at, next_at, reward_key, kind, amount, cosmetic_id, fallback, ledger_tx_id, ticket_id)
    values (open_id, uid, now_ts, now_ts + interval '24 hours', rw.key, v_kind, v_amount, v_cos, v_fallback, tx, ticket)
    returning * into rec;
  update public.daily_chest_state
    set last_opened_at = now_ts, next_at = now_ts + interval '24 hours', opens = opens + 1
    where user_id = uid;
  perform public._audit(uid, 'daily_chest_opened', null, jsonb_build_object('open', open_id, 'reward', rw.key, 'kind', v_kind,
    'amount', v_amount, 'cosmetic', v_cos, 'fallback', v_fallback, 'tx', tx, 'ticket', ticket));

  return jsonb_build_object(
    'signed_in', true,
    'available', false,
    'next_at', now_ts + interval '24 hours',
    'server_time', now_ts,
    'tickets', (select count(*) from public.fee_free_tickets where user_id = uid and used_at is null),
    'last', public._daily_chest_reward_json(rec)
  );
end $$;
revoke all on function public.daily_chest_open() from public, anon, authenticated;
grant execute on function public.daily_chest_open() to authenticated;

-- ---------- prestige_state: chest-won cosmetics ----------
create or replace function public.prestige_state()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare uid uuid := auth.uid(); up public.user_prestige; nxt record; cur_req bigint; next_req bigint;
begin
  if uid is not null then perform public.prestige_sync_user(uid); end if;
  select * into up from public.user_prestige where user_id = uid;
  if up.user_id is null then
    up.total_xp := 0; up.current_level := 1;
  end if;
  select xp_required into cur_req from public.prestige_levels where level = up.current_level;
  select level, xp_required into nxt from public.prestige_levels where level = up.current_level + 1;
  next_req := nxt.xp_required;
  return jsonb_build_object(
    'signed_in', uid is not null,
    'xp', coalesce(up.total_xp, 0),
    'level', coalesce(up.current_level, 1),
    'tier', (select tier from public.prestige_levels where level = coalesce(up.current_level, 1)),
    'xp_into', greatest(coalesce(up.total_xp, 0) - coalesce(cur_req, 0), 0),
    'xp_span', case when next_req is null then null else next_req - coalesce(cur_req, 0) end,
    'xp_remaining', case when next_req is null then 0 else greatest(next_req - coalesce(up.total_xp, 0), 0) end,
    'next_level', nxt.level,
    'equipped_frame', up.equipped_frame_id,
    'equipped_crown', up.equipped_crown_id,
    'loot_odds', coalesce((
      select jsonb_agg(jsonb_build_object('amount', o.amount, 'weight', o.weight) order by o.amount)
      from public.prestige_loot_odds o
    ), '[]'::jsonb),
    'levels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'level', l.level, 'xp_required', l.xp_required, 'tier', l.tier, 'title', l.title,
        'reward_id', r.id, 'reward_type', r.reward_type, 'amount', r.amount, 'currency', r.currency,
        'cosmetic_id', c.id,
        'name', coalesce(c.name, r.metadata->>'name', case when r.reward_type = 'usdc' then 'USDC reward' else l.title end),
        'description', coalesce(c.description, r.metadata->>'description'), 'rarity', c.rarity, 'asset_key', c.asset_key,
        'box', r.metadata->>'box',
        'unlocked', uid is not null and coalesce(up.current_level, 1) >= l.level,
        'claimed', cl.id is not null,
        'won', case when r.reward_type = 'lootbox' then cl.amount end
      ) order by l.level)
      from public.prestige_levels l
      left join public.prestige_rewards r on r.level = l.level
      left join public.cosmetics c on c.id = r.cosmetic_id
      left join public.user_reward_claims cl on cl.user_id = uid and cl.reward_id = r.id
    ), '[]'::jsonb),
    'extra_cosmetics', coalesce((
      select jsonb_agg(jsonb_build_object('cosmetic_id', c.id, 'type', c.type, 'name', c.name, 'description', c.description,
        'rarity', c.rarity, 'asset_key', c.asset_key) order by uc.unlocked_at, c.id)
      from public.user_cosmetics uc
      join public.cosmetics c on c.id = uc.cosmetic_id
      where uc.user_id = uid and c.active
        and not exists (select 1 from public.prestige_rewards r where r.cosmetic_id = c.id)
    ), '[]'::jsonb)
  );
end $function$;
revoke all on function public.prestige_state() from public, anon, authenticated;
grant execute on function public.prestige_state() to anon, authenticated;

