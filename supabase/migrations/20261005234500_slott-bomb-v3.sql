-- P2P Slott v3. A bomb still ends the match and the house keeps both stakes.
-- The chance is about 6% for a full 1v1 match (6 spins each, 240 cells), not 6% per spin.
-- v1 and v2 draws are unchanged, so matches already in progress stay verifiable.

alter table public.slot_games drop constraint slot_games_protocol_version_check;
alter table public.slot_games add constraint slot_games_protocol_version_check
  check (protocol_version in ('v1', 'v2', 'v3'));

-- v1 weights, repeated 53 times, plus 14 bomb rolls out of 54286.
-- One cell is a bomb with probability 14/54286. Across 12 spins that is 6.00%.
create or replace function public.slot_spin_grid_v3(p_seed bytea, p_game_id bigint, p_spin_no integer)
returns smallint[] language plpgsql immutable set search_path = public, extensions as $$
declare
  w int[] := array[80,80,80,80,80,50,80,16,28,50,50,28,28,50,50,80,28,18,50,18];
  g smallint[] := '{}';
  h bytea; r bigint; rv int; acc int; s int;
begin
  if p_seed is null or length(p_seed) <> 32 then raise exception 'INVALID_SEED'; end if;
  if p_game_id is null or p_game_id < 1 or p_spin_no is null or p_spin_no < 1 then raise exception 'INVALID_SPIN'; end if;
  for c in 0..19 loop
    h := public._fair_hmac(p_seed, 'PVPCasino:slott:v3:' || p_game_id || ':' || p_spin_no || ':' || c);
    r := (get_byte(h, 0)::bigint * 16777216 + get_byte(h, 1)::bigint * 65536
          + get_byte(h, 2)::bigint * 256 + get_byte(h, 3)::bigint) % 54286;
    if r >= 54272 then
      g := g || 20::smallint;
    else
      rv := (r % 1024)::int;
      acc := 0; s := 0;
      loop
        acc := acc + w[s + 1];
        exit when rv < acc;
        s := s + 1;
      end loop;
      g := g || s::smallint;
    end if;
  end loop;
  return g;
end $$;

revoke execute on function public.slot_spin_grid_v3(bytea, bigint, integer) from public, anon, authenticated;
grant execute on function public.slot_spin_grid_v3(bytea, bigint, integer) to anon, authenticated;

create or replace function public._slot_guard()
returns trigger language plpgsql set search_path = public as $$
declare n int; sa bigint; sb bigint; bt bigint;
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD slot_games'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'WAITING' or new.opponent_id is not null or new.winner_id is not null or new.server_seed is not null
       or new.next_spin <> 1 or new.score_a <> 0 or new.score_b <> 0 or new.bonus_total <> 0 or new.outcome is not null then
      raise exception 'ILLEGAL_INITIAL_STATE';
    end if;
    return new;
  end if;
  if old.status in ('COMPLETED', 'CANCELLED') then raise exception 'IMMUTABLE_RECORD slot game %', old.id; end if;
  if (old.status::text || '>' || new.status::text) not in
     ('WAITING>ACTIVE', 'WAITING>CANCELLED', 'ACTIVE>ACTIVE', 'ACTIVE>SETTLEMENT', 'SETTLEMENT>SETTLEMENT', 'SETTLEMENT>COMPLETED') then
    raise exception 'ILLEGAL_TRANSITION % -> %', old.status, new.status;
  end if;
  if (new.creator_id, new.stake, new.p2p_pot, new.bonus_cap, new.fee_bps, new.base_spins, new.max_spins, new.spin_ms,
      new.turn_seconds, new.protocol_version, new.server_seed_hash, new.created_at, new.expires_at, new.asset,
      new.account_type, new.money_domain)
     is distinct from
     (old.creator_id, old.stake, old.p2p_pot, old.bonus_cap, old.fee_bps, old.base_spins, old.max_spins, old.spin_ms,
      old.turn_seconds, old.protocol_version, old.server_seed_hash, old.created_at, old.expires_at, old.asset,
      old.account_type, old.money_domain) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if old.opponent_id is not null and (new.opponent_id, new.joined_at) is distinct from (old.opponent_id, old.joined_at) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if new.next_spin < old.next_spin or new.bonus_total < old.bonus_total
     or (old.ends_at is not null and new.ends_at is distinct from old.ends_at) then
    raise exception 'IMMUTABLE_FIELD progress';
  end if;
  if new.status not in ('WAITING', 'CANCELLED') then
    select count(*), coalesce(sum(score) filter (where seat = 'A'), 0), coalesce(sum(score) filter (where seat = 'B'), 0),
           coalesce(sum(bonus_cents), 0)
      into n, sa, sb, bt from slot_spins where game_id = new.id;
    if n <> new.next_spin - 1 or sa <> new.score_a or sb <> new.score_b then raise exception 'SCORE_MISMATCH'; end if;
    if bt <> new.bonus_total then raise exception 'BONUS_MISMATCH'; end if;
  end if;
  if old.status = 'ACTIVE' and new.status = 'SETTLEMENT' and (new.ends_at is null or clock_timestamp() < new.ends_at) then
    raise exception 'TOO_EARLY settlement';
  end if;
  if new.status = 'CANCELLED' and new.cancel_reason = 'EXPIRED' and clock_timestamp() < new.expires_at then
    raise exception 'TOO_EARLY expiry';
  end if;
  if new.status = 'COMPLETED' then
    if new.outcome = 'BOMB' and (
      new.winner_id is not null or new.protocol_version not in ('v2', 'v3')
      or not exists (select 1 from slot_spins s where s.game_id = new.id and 20 = any (s.grid))
    ) then
      raise exception 'RESULT_MISMATCH';
    end if;
    if new.protocol_version in ('v2', 'v3') and new.outcome is distinct from 'BOMB'
       and exists (select 1 from slot_spins s where s.game_id = new.id and 20 = any (s.grid)) then
      raise exception 'RESULT_MISMATCH';
    end if;
    if new.outcome = 'WIN' and (new.score_a = new.score_b
       or new.winner_id <> case when new.score_a > new.score_b then new.creator_id else new.opponent_id end) then
      raise exception 'RESULT_MISMATCH';
    end if;
    if new.outcome = 'DRAW' and new.score_a <> new.score_b then raise exception 'RESULT_MISMATCH'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

create or replace function public._slot_spin(p_game_id bigint, p_actor uuid, p_auto boolean, p_key text)
returns public.slot_spins language plpgsql security definer set search_path = public, extensions as $$
declare
  g public.slot_games; c public.slot_config; pc public.slot_promo_config; t public.slot_bonus_tiers;
  bud public.slot_bonus_budget; sp public.slot_spins;
  seed bytea; n int; v_seat text; pid uuid; grid smallint[]; sc record; ts timestamptz; reveal timestamptz;
  req bigint := 0; award bigint := 0; used bigint; u uuid; v_day date; tx uuid; bank public.account_kind;
  sa int; sb int; done boolean; skip text; points int;
begin
  select * into g from slot_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'ACTIVE' or g.ends_at is not null then raise exception 'MATCH_NOT_ACTIVE'; end if;
  n := g.next_spin;
  v_seat := case when n % 2 = 1 then 'A' else 'B' end;
  pid := case when v_seat = 'A' then g.creator_id else g.opponent_id end;
  ts := clock_timestamp();
  if p_auto then
    if ts < g.turn_deadline then raise exception 'TURN_NOT_EXPIRED'; end if;
  else
    if p_actor is distinct from pid then raise exception 'NOT_YOUR_TURN'; end if;
    if ts < g.turn_opens_at then raise exception 'TURN_NOT_OPEN'; end if;
  end if;

  select server_seed into seed from slot_game_secrets where game_id = g.id;
  if seed is null then raise exception 'SEED_MISSING'; end if;
  if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  if g.protocol_version = 'v1' then
    grid := public.slot_spin_grid(seed, g.id, n);
  elsif g.protocol_version = 'v2' then
    grid := public.slot_spin_grid_v2(seed, g.id, n);
  elsif g.protocol_version = 'v3' then
    grid := public.slot_spin_grid_v3(seed, g.id, n);
  else
    raise exception 'INVARIANT_PROTOCOL';
  end if;
  reveal := ts + g.spin_ms * interval '1 millisecond';

  -- Either seat landing a bomb ends the match. That spin scores nothing and awards no bonus.
  if g.protocol_version in ('v2', 'v3') and 20 = any (grid) then
    insert into slot_spins (game_id, spin_no, seat, player_id, auto, idempotency_key, grid, wild_count, base_score, line_score,
                            score, lines, bonus_cents, created_at, reveal_at)
      values (g.id, n, v_seat, pid, p_auto, case when p_auto then null else p_key end, grid, 0, 0, 0,
              0, '[]'::jsonb, 0, ts, reveal)
      returning * into sp;
    update slot_games set next_spin = n + 1,
      turn_opens_at = null, turn_deadline = null, ends_at = reveal
      where id = g.id;
    perform _audit_slot(pid, case when p_auto then 'SPIN_AUTO' else 'SPIN' end, g.id, jsonb_build_object(
      'spin', n, 'seat', v_seat, 'score', 0, 'wilds', 0, 'bonus', 0, 'final', true, 'bomb', true));
    return sp;
  end if;

  select * into sc from slot_score_v1(grid);

  select * into t from slot_bonus_tiers where min_wilds <= sc.wilds order by min_wilds desc limit 1;
  if found then
    req := (g.stake * t.stake_bps) / 10000;
    select * into c from slot_config;
    select * into pc from slot_promo_config;
    v_day := (clock_timestamp() at time zone 'utc')::date;
    if req <= 0 then skip := 'ZERO_REQUEST';
    elsif not coalesce(pc.enabled, false) then skip := 'PROMO_DISABLED';
    else
      award := least(req, c.max_event_bonus_cents, g.bonus_cap - g.bonus_total);
      insert into slot_bonus_budget (day, budget_cents) values (v_day, pc.daily_budget_cents) on conflict (day) do nothing;
      select * into bud from slot_bonus_budget where day = v_day for update;
      award := least(award, bud.budget_cents - bud.reserved_cents);
      foreach u in array array[g.creator_id, g.opponent_id] loop
        select coalesce(sum(e.awarded_cents), 0) into used
          from slot_bonus_events e join slot_games x on x.id = e.game_id
          where e.budget_day = v_day and e.status <> 'RETURNED' and (x.creator_id = u or x.opponent_id = u);
        award := least(award, pc.user_daily_cap_cents - used);
      end loop;
      if award <= 0 then award := 0; skip := 'CAP_OR_BUDGET_EXHAUSTED'; end if;
    end if;
  end if;

  points := sc.base + sc.line_score;
  insert into slot_spins (game_id, spin_no, seat, player_id, auto, idempotency_key, grid, wild_count, base_score, line_score,
                          score, lines, bonus_cents, created_at, reveal_at)
    values (g.id, n, v_seat, pid, p_auto, case when p_auto then null else p_key end, grid, sc.wilds, sc.base, sc.line_score,
            points, sc.lines, award, ts, reveal)
    returning * into sp;

  if award > 0 then
    update slot_bonus_budget set reserved_cents = reserved_cents + award, updated_at = clock_timestamp() where day = v_day;
    bank := case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end;
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_bonus', 'slot:' || g.id || ':bonus:' || n, g.account_type, pid, g.id, 'P2P Slott promotional bonus to match pool')
      returning id into tx;
    perform _post(tx, _system_account(bank, g.asset, g.account_type), -award);
    perform _post(tx, _system_account('game_escrow', g.asset, g.account_type), award);
    insert into slot_bonus_events (game_id, spin_no, triggered_by, wild_count, tier, tier_bps, requested_cents, awarded_cents,
                                   pool_before, pool_after, budget_day, ledger_tx_id)
      values (g.id, n, pid, sc.wilds, t.tier, t.stake_bps, req, award,
              g.p2p_pot + g.bonus_total, g.p2p_pot + g.bonus_total + award, v_day, tx);
    perform _audit_slot(pid, 'BONUS_AWARDED', g.id, jsonb_build_object('spin', n, 'tier', t.tier, 'wilds', sc.wilds,
      'requested', req, 'awarded', award, 'pool_before', g.p2p_pot + g.bonus_total, 'pool_after', g.p2p_pot + g.bonus_total + award,
      'budget_day', v_day, 'ledger_tx', tx));
  elsif skip is not null then
    perform _audit_slot(pid, 'BONUS_SKIPPED', g.id, jsonb_build_object('spin', n, 'tier', t.tier, 'wilds', sc.wilds,
      'requested', req, 'reason', skip));
  end if;

  sa := g.score_a + case when v_seat = 'A' then points else 0 end;
  sb := g.score_b + case when v_seat = 'B' then points else 0 end;
  done := n >= g.base_spins and n % 2 = 0 and (sa <> sb or n >= g.max_spins);
  update slot_games set next_spin = n + 1, score_a = sa, score_b = sb, bonus_total = bonus_total + award,
    turn_opens_at = case when done then null else reveal end,
    turn_deadline = case when done then null else reveal + g.turn_seconds * interval '1 second' end,
    ends_at = case when done then reveal else null end
    where id = g.id;
  perform _audit_slot(pid, case when p_auto then 'SPIN_AUTO' else 'SPIN' end, g.id, jsonb_build_object('spin', n, 'seat', v_seat,
    'score', points, 'wilds', sc.wilds, 'bonus', award, 'final', done));
  return sp;
end $$;

create or replace function public._slot_settle(p_game_id bigint)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare g public.slot_games; seed bytea; n_entries int; sum_amt bigint; ev_total bigint; tx uuid; escrow uuid;
  fee bigint; payout bigint; winner uuid; e record; bank public.account_kind; waived boolean := false; bombed boolean;
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
  if g.protocol_version = 'v1' then
    if exists (select 1 from slot_spins s where s.game_id = g.id
               and s.grid <> slot_spin_grid(seed, g.id, s.spin_no)) then
      raise exception 'INVARIANT_RESULT';
    end if;
  elsif g.protocol_version = 'v2' then
    if exists (select 1 from slot_spins s where s.game_id = g.id
               and s.grid <> slot_spin_grid_v2(seed, g.id, s.spin_no)) then
      raise exception 'INVARIANT_RESULT';
    end if;
  elsif g.protocol_version = 'v3' then
    if exists (select 1 from slot_spins s where s.game_id = g.id
               and s.grid <> slot_spin_grid_v3(seed, g.id, s.spin_no)) then
      raise exception 'INVARIANT_RESULT';
    end if;
  else
    raise exception 'INVARIANT_PROTOCOL';
  end if;

  bombed := g.protocol_version in ('v2', 'v3') and exists (
    select 1 from slot_spins s where s.game_id = g.id and 20 = any (s.grid));

  perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
  escrow := _system_account('game_escrow', g.asset, g.account_type);
  if bombed then
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_settlement', 'slot:' || g.id || ':bomb', g.account_type, null, g.id, 'P2P Slott bomb')
      returning id into tx;
    for e in select user_id, amount from slot_entries where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
    end loop;
    perform _post(tx, escrow, g.p2p_pot);
    perform _post(tx, escrow, -g.p2p_pot);
    perform _post(tx, _system_account('house_revenue', g.asset, g.account_type), g.p2p_pot);
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
    update slot_games set status = 'COMPLETED', completed_at = clock_timestamp(), outcome = 'BOMB', winner_id = null,
      fee_amount = g.p2p_pot, payout_amount = 0, server_seed = encode(seed, 'hex'), last_error = null where id = g.id;
    perform _audit_slot(null, 'GAME_COMPLETED', g.id, jsonb_build_object('outcome', 'BOMB', 'score_a', g.score_a,
      'score_b', g.score_b, 'p2p_pot', g.p2p_pot, 'bonus_returned', g.bonus_total, 'ledger_tx', tx));
  elsif g.score_a <> g.score_b then
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

create or replace function public.slot_create(p_stake bigint, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); prof public.profiles; c public.slot_config; jc public.money_domain_config;
  e public.slot_entries; g public.slot_games; seed bytea; tx uuid; avail uuid; locked uuid; bal bigint; ts timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtext('slot:' || uid::text || ':' || p_idempotency_key));
  select * into e from slot_entries where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if e.seat <> 'A' or e.amount <> p_stake then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return jsonb_build_object('duplicate', true, 'game_id', e.game_id);
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from slot_config;
  select * into jc from money_domain_config;
  if not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  if p_stake is null or p_stake < (select min(s) from unnest(c.stakes) s) or p_stake > (select max(s) from unnest(c.stakes) s) then
    raise exception 'INVALID_STAKE';
  end if;
  if (select count(*) from slot_games where creator_id = uid
      and created_at > clock_timestamp() - make_interval(secs => c.create_rate_window_seconds)) >= c.create_rate_limit then
    raise exception 'RATE_LIMITED';
  end if;
  if (select count(*) from slot_games where creator_id = uid and status = 'WAITING') >= c.max_open_per_user then
    raise exception 'TOO_MANY_OPEN_GAMES';
  end if;

  avail := _user_account(uid, 'user_available', jc.asset, jc.account_type);
  locked := _user_account(uid, 'user_locked', jc.asset, jc.account_type);
  perform _coinflip_lock_wallets(array[uid], jc.asset, jc.account_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or locked is null or bal < p_stake then raise exception 'INSUFFICIENT_BALANCE'; end if;

  ts := clock_timestamp();
  seed := extensions.gen_random_bytes(32);
  insert into slot_games (money_domain, asset, account_type, creator_id, stake, p2p_pot, bonus_cap, fee_bps, base_spins,
                          max_spins, spin_ms, turn_seconds, protocol_version, server_seed_hash, created_at, expires_at)
  values (jc.money_domain, jc.asset, jc.account_type, uid, p_stake, p_stake * 2,
          least((p_stake * c.match_cap_bps) / 10000, c.max_match_bonus_cents), c.fee_bps, c.base_spins, c.max_spins,
          c.spin_ms, c.turn_seconds, 'v3', encode(extensions.digest(seed, 'sha256'), 'hex'), ts,
          ts + make_interval(secs => c.waiting_timeout_seconds))
  returning * into g;
  insert into slot_game_secrets (game_id, server_seed) values (g.id, seed);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('slot_entry', 'slot:' || g.id || ':entry:A', jc.account_type, uid, g.id, 'P2P Slott stake') returning id into tx;
  perform _post(tx, avail, -p_stake);
  perform _post(tx, locked, p_stake);
  insert into slot_entries (game_id, user_id, seat, amount, ledger_tx_id, idempotency_key, created_at)
    values (g.id, uid, 'A', p_stake, tx, p_idempotency_key, ts);
  perform _audit_slot(uid, 'GAME_CREATED', g.id, jsonb_build_object('stake', p_stake, 'server_seed_hash', g.server_seed_hash,
    'fee_bps', g.fee_bps, 'bonus_cap', g.bonus_cap, 'protocol', 'v3', 'expires_at', g.expires_at, 'ledger_tx', tx));
  return jsonb_build_object('duplicate', false, 'game_id', g.id);
end $$;
