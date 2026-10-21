-- Creator of a waiting P2P Slott match can call an automated opponent.
-- The seed committed at create is reused. The bot's spins go through the
-- existing turn worker. Stake comes from the same bot bankroll path as
-- coinflip and poker, and any bot balance is swept back at settlement.
-- slott_enabled stays off unless coinflip bots are already on.

alter table public.bot_config
  add column if not exists slott_enabled boolean not null default false;

update public.bot_config
set slott_enabled = coinflip_enabled
where id;

do $$
declare cname text;
begin
  select c.conname into cname
  from pg_constraint c
  where c.conrelid = 'public.bot_calls'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%coinflip%';
  if cname is not null then
    execute format('alter table public.bot_calls drop constraint %I', cname);
  end if;
end $$;

alter table public.bot_calls
  add constraint bot_calls_game_check check (game in ('coinflip', 'poker', 'slott'));

create or replace function public.bot_public_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'coinflip', enabled and coinflip_enabled,
    'poker', enabled and poker_enabled,
    'slott', enabled and slott_enabled
  )
  from public.bot_config
$$;

revoke all on function public.bot_public_config() from public;
grant execute on function public.bot_public_config() to anon, authenticated, service_role;

create or replace function public.slot_call_bot(p_game_id bigint, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  cfg public.bot_config;
  c public.slot_config;
  g public.slot_games;
  bot uuid;
  tx uuid;
  avail uuid;
  locked uuid;
  ts timestamptz;
  opens timestamptz;
  result jsonb;
  n int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  perform pg_advisory_xact_lock(hashtext('bot-call:' || uid::text));
  select bc.result into result from public.bot_calls bc
    where bc.user_id = uid and bc.idempotency_key = p_idempotency_key;
  if found then
    if result ->> 'game_id' is distinct from p_game_id::text then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return result || jsonb_build_object('duplicate', true);
  end if;
  select * into cfg from public.bot_config;
  if (select count(*) from public.bot_calls
      where user_id = uid and game = 'slott'
        and created_at > clock_timestamp() - make_interval(secs => cfg.call_rate_window_seconds))
     >= cfg.call_rate_limit then
    raise exception 'RATE_LIMITED';
  end if;
  select * into g from public.slot_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.creator_id <> uid then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from public.profiles where id = uid and self_excluded_until > now()) then
    raise exception 'SELF_EXCLUDED';
  end if;
  if g.status <> 'WAITING' then
    result := jsonb_build_object('ok', true, 'joined', false, 'duplicate', false,
      'reason', 'GAME_NOT_JOINABLE', 'status', g.status, 'opponent_id', g.opponent_id, 'game_id', g.id);
    insert into public.bot_calls (user_id, idempotency_key, game, result)
      values (uid, p_idempotency_key, 'slott', result);
    return result;
  end if;
  if clock_timestamp() >= g.expires_at then
    result := jsonb_build_object('ok', true, 'joined', false, 'duplicate', false,
      'reason', 'GAME_EXPIRED', 'status', g.status, 'game_id', g.id);
    insert into public.bot_calls (user_id, idempotency_key, game, result)
      values (uid, p_idempotency_key, 'slott', result);
    return result;
  end if;
  if g.account_type <> (select account_type from public.money_domain_config) or not public._play_domain_open() then
    raise exception 'REAL_MONEY_DISABLED';
  end if;
  if not cfg.enabled or not cfg.slott_enabled then raise exception 'BOTS_DISABLED'; end if;
  select count(*) into n from public.profiles where is_bot;
  if n < 1 then raise exception 'BOTS_DISABLED'; end if;
  select id into bot from public.profiles
    where is_bot
    order by username
    offset (abs(hashtext(p_game_id::text)) % n) limit 1;
  perform public._bot_fund(bot, g.stake, g.asset, g.account_type, 'bot:fund:slott:' || g.id::text);
  select * into c from public.slot_config;
  avail := public._user_account(bot, 'user_available', g.asset, g.account_type);
  locked := public._user_account(bot, 'user_locked', g.asset, g.account_type);
  perform public._coinflip_lock_wallets(array[bot], g.asset, g.account_type);
  ts := clock_timestamp();
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('slot_entry', 'slot:' || g.id || ':entry:B', g.account_type, bot, g.id, 'P2P Slott bot stake')
    returning id into tx;
  perform public._post(tx, avail, -g.stake);
  perform public._post(tx, locked, g.stake);
  insert into public.slot_entries (game_id, user_id, seat, amount, ledger_tx_id, idempotency_key, created_at)
    values (g.id, bot, 'B', g.stake, tx, 'bot-join-' || g.id::text, ts);
  opens := ts + c.pre_delay_ms * interval '1 millisecond';
  update public.slot_games set status = 'ACTIVE', opponent_id = bot, joined_at = ts, turn_opens_at = opens,
    turn_deadline = opens + interval '60 seconds' where id = g.id;
  perform public._audit_slot(uid, 'PLAYER_JOINED', g.id, jsonb_build_object(
    'stake', g.stake, 'ledger_tx', tx, 'turn_opens_at', opens, 'bot', true, 'opponent', bot));
  result := jsonb_build_object('ok', true, 'joined', true, 'duplicate', false, 'game_id', g.id,
    'opponent_id', bot, 'status', 'ACTIVE');
  insert into public.bot_calls (user_id, idempotency_key, game, result)
    values (uid, p_idempotency_key, 'slott', result);
  return result;
end $$;

revoke all on function public.slot_call_bot(bigint, text) from public, anon;
grant execute on function public.slot_call_bot(bigint, text) to authenticated;

-- The worker spins a bot as soon as its turn opens. A missed tick still
-- auto-spins that seat when the turn deadline passes.
create or replace function public.slot_advance(p_game_id bigint)
returns text language plpgsql security definer set search_path = public as $$
declare g public.slot_games; err text; res text; pid uuid;
begin
  select * into g from slot_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED', 'CANCELLED') then return 'noop'; end if;
  if g.status = 'WAITING' then
    if clock_timestamp() < g.expires_at then return 'not_due'; end if;
    perform _slot_refund_waiting(g.id, 'EXPIRED');
    return 'cancelled';
  end if;
  if g.status = 'ACTIVE' then
    if g.ends_at is null then
      pid := case when g.next_spin % 2 = 1 then g.creator_id else g.opponent_id end;
      if g.turn_opens_at is not null
         and clock_timestamp() >= g.turn_opens_at
         and exists (select 1 from profiles pr where pr.id = pid and pr.is_bot) then
        perform _slot_spin(g.id, pid, false, 'bot-spin-' || g.id::text || '-' || g.next_spin::text);
        return 'bot_spun';
      end if;
      if clock_timestamp() < g.turn_deadline then return 'not_due'; end if;
      perform _slot_spin(g.id, null, true, null);
      return 'auto_spun';
    end if;
    if clock_timestamp() < g.ends_at then return 'not_due'; end if;
    update slot_games set status = 'SETTLEMENT', settlement_started_at = clock_timestamp() where id = g.id;
  end if;
  begin
    res := _slot_settle(g.id);
  exception when others then
    err := sqlerrm;
    update slot_games set settle_attempts = settle_attempts + 1, last_error = left(err, 500) where id = g.id;
    perform _audit_slot(null, 'SETTLEMENT_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
    raise log 'SLOT_SETTLEMENT_FAILED game=% error=%', g.id, left(err, 200);
    return 'failed';
  end;
  return res;
end $$;

-- Latest settlement, plus a sweep of any bot available balance.
create or replace function public._slot_settle(p_game_id bigint) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare g public.slot_games; seed bytea; n_entries int; sum_amt bigint; ev_total bigint; tx uuid; escrow uuid;
  fee bigint; payout bigint; winner uuid; e record; bank public.account_kind; waived boolean := false; bombed boolean;
  has_bot boolean := false; house_bot boolean := false;
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
  has_bot := exists (
    select 1 from profiles pr
    where pr.is_bot and pr.id in (g.creator_id, g.opponent_id)
  );
  house_bot := has_bot and exists (
    select 1 from bot_house_open o
    where o.user_id in (g.creator_id, g.opponent_id)
      and o.asset = g.asset and o.account_type = g.account_type
  );

  perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
  perform _lock_system_accounts(array['game_escrow', 'house_revenue']::account_kind[]
    || case when g.bonus_total > 0 or house_bot then array[case when g.account_type = 'real' then 'house_bankroll'
                                                                else 'test_faucet' end]::account_kind[]
            else array[]::account_kind[] end
    || case when has_bot and not house_bot then array['bot_bankroll']::account_kind[] else array[]::account_kind[] end,
    g.asset, g.account_type);
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
  if has_bot then
    for e in
      select pr.id as user_id from profiles pr
      where pr.is_bot and pr.id in (g.creator_id, g.opponent_id)
      order by pr.id
    loop
      perform public._bot_sweep(e.user_id, g.asset, g.account_type,
        'bot:sweep:slott:' || g.id::text || ':' || e.user_id::text);
    end loop;
  end if;
  return 'settled';
end $$;

revoke all on function public._slot_settle(bigint) from public, anon, authenticated;
