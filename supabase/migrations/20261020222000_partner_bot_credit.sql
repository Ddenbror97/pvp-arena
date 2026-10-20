-- An active partner can call a bot with the house bot bankroll at zero. The stake is
-- drawn from house_bankroll, the same account as partner credit, which can go negative.
-- Those chips are swept back there, so they do not become treasury-backed bot funds.
-- A regular player still needs bot_bankroll to cover the stake.

create table if not exists public.bot_house_open (
  user_id uuid not null references public.profiles (id),
  asset text not null,
  account_type text not null,
  amount bigint not null check (amount > 0),
  primary key (user_id, asset, account_type)
);
alter table public.bot_house_open enable row level security;
revoke all on public.bot_house_open from public, anon, authenticated;
grant all on public.bot_house_open to service_role;

create or replace function public._bot_exposure(p_asset text, p_type text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(w.balance), 0)
  from public.wallet_accounts w
  join public.profiles p on p.id = w.owner_id and p.is_bot
  where w.kind in ('user_available', 'user_locked')
    and w.asset = p_asset and w.account_type = p_type
    and not exists (
      select 1 from public.bot_house_open o
      where o.user_id = w.owner_id and o.asset = w.asset and o.account_type = w.account_type
    )
$$;

create or replace function public._bot_fund(p_user uuid, p_amount bigint, p_asset text, p_type text, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare bank_bal bigint; exposure bigint; cap bigint; bank uuid; avail uuid; tx uuid; house boolean;
  src public.account_kind;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if not exists (select 1 from public.profiles where id = p_user and is_bot) then
    raise exception 'NOT_A_BOT';
  end if;
  perform pg_advisory_xact_lock(hashtext('bot-fund:' || p_user::text));
  perform public._bot_ensure_wallets(p_user, p_asset, p_type);
  perform public._coinflip_lock_wallets(array[p_user], p_asset, p_type);
  house := public._is_active_partner(auth.uid());
  if house then
    if exists (
      select 1 from public.bot_house_open o
      where o.user_id = p_user and o.asset = p_asset and o.account_type = p_type
    ) then
      raise exception 'BOTS_BUSY';
    end if;
    src := case when p_type = 'real' then 'house_bankroll' else 'test_faucet' end;
    perform public._lock_system_accounts(array[src], p_asset, p_type);
    bank := public._system_account(src, p_asset, p_type);
    avail := public._user_account(p_user, 'user_available', p_asset, p_type);
    insert into public.bot_house_open (user_id, asset, account_type, amount)
      values (p_user, p_asset, p_type, p_amount);
    insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
      values ('bot_fund', p_key, p_type, p_user, 'Partner bot stake')
      returning id into tx;
    perform public._post(tx, bank, -p_amount);
    perform public._post(tx, avail, p_amount);
    return;
  end if;
  perform public._lock_system_accounts(array['bot_bankroll']::public.account_kind[], p_asset, p_type);
  bank := public._system_account('bot_bankroll', p_asset, p_type);
  select balance into bank_bal from public.wallet_accounts where id = bank;
  if coalesce(bank_bal, 0) < p_amount then raise exception 'BOT_UNFUNDED'; end if;
  select max_exposure_cents into cap from public.bot_config;
  exposure := public._bot_exposure(p_asset, p_type);
  if exposure + p_amount > coalesce(cap, 0) then raise exception 'BOT_EXPOSURE_LIMIT'; end if;
  avail := public._user_account(p_user, 'user_available', p_asset, p_type);
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('bot_fund', p_key, p_type, p_user, 'House bot stake')
    returning id into tx;
  perform public._post(tx, bank, -p_amount);
  perform public._post(tx, avail, p_amount);
end $$;

create or replace function public._bot_sweep(p_user uuid, p_asset text, p_type text, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare bal bigint; avail uuid; bank uuid; tx uuid; house boolean; src public.account_kind;
begin
  if p_user is null or not exists (select 1 from public.profiles where id = p_user and is_bot) then
    return;
  end if;
  avail := public._user_account(p_user, 'user_available', p_asset, p_type);
  house := exists (
    select 1 from public.bot_house_open o
    where o.user_id = p_user and o.asset = p_asset and o.account_type = p_type
  );
  if avail is null then
    if house then
      delete from public.bot_house_open o
      where o.user_id = p_user and o.asset = p_asset and o.account_type = p_type;
    end if;
    return;
  end if;
  perform public._coinflip_lock_wallets(array[p_user], p_asset, p_type);
  src := case
    when house and p_type = 'real' then 'house_bankroll'
    when house then 'test_faucet'
    else 'bot_bankroll'
  end;
  perform public._lock_system_accounts(array[src], p_asset, p_type);
  select balance into bal from public.wallet_accounts where id = avail;
  if coalesce(bal, 0) > 0 then
    bank := public._system_account(src, p_asset, p_type);
    insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
      values ('bot_sweep', p_key, p_type, p_user,
        case when house then 'Return partner bot balance to partner credit'
             else 'Return bot balance to house bot bankroll' end)
      returning id into tx;
    perform public._post(tx, avail, -bal);
    perform public._post(tx, bank, bal);
  end if;
  if house then
    delete from public.bot_house_open o
    where o.user_id = p_user and o.asset = p_asset and o.account_type = p_type;
  end if;
end $$;

create or replace function public.coinflip_advance(p_game_id bigint)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare g public.coinflip_games; r public.coinflip_results; po public.coinflip_payouts; seed bytea; o record;
  n_entries int; sum_amt bigint; n_sides int; all_eq boolean; winner_side_ok boolean;
  tx uuid; escrow uuid; fee bigint; payout bigint; p record; err text; was_retry boolean;
  house_bot boolean;
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
      perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
      if exists (
        select 1 from coinflip_entries e
        join profiles pr on pr.id = e.user_id and pr.is_bot
        where e.game_id = g.id
      ) then
        select exists (
          select 1 from coinflip_entries e
          join bot_house_open opened on opened.user_id = e.user_id and opened.asset = g.asset and opened.account_type = g.account_type
          where e.game_id = g.id
        ) into house_bot;
        if house_bot and g.account_type = 'real' then
          perform _lock_system_accounts(array['game_escrow', 'house_bankroll', 'house_revenue']::account_kind[], g.asset, g.account_type);
        elsif house_bot then
          perform _lock_system_accounts(array['game_escrow', 'house_revenue', 'test_faucet']::account_kind[], g.asset, g.account_type);
        else
          perform _lock_system_accounts(array['bot_bankroll', 'game_escrow', 'house_revenue']::account_kind[], g.asset, g.account_type);
        end if;
      end if;
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
      for p in
        select e.user_id from coinflip_entries e
        join profiles pr on pr.id = e.user_id and pr.is_bot
        where e.game_id = g.id
        order by e.user_id
      loop
        perform public._bot_sweep(p.user_id, g.asset, g.account_type, 'bot:sweep:coinflip:' || g.id::text || ':' || p.user_id::text);
      end loop;
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

create or replace function public._poker_settle(p_hand bigint) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  h poker_hands; c poker_config; seed bytea; res jsonb; tx uuid; escrow uuid; house uuid; p record;
  total bigint; paid bigint; live int; s poker_seats;
begin
  select * into h from poker_hands where id = p_hand for update;
  if h.status <> 'SETTLEMENT' then return; end if;
  if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
  select * into c from poker_config;
  select server_seed into seed from poker_hand_secrets where hand_id = h.id;
  if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> h.server_seed_hash then
    raise exception 'INVARIANT_COMMITMENT';
  end if;
  if exists (select 1 from poker_hand_players where hand_id = h.id and stack + total_bet <> start_stack) then
    raise exception 'INVARIANT_CHIPS';
  end if;
  select count(*) into live from poker_hand_players where hand_id = h.id and not folded;
  if live > 1 then
    if coalesce(array_length(h.board, 1), 0) <> 5 then raise exception 'INVARIANT_BOARD'; end if;
    update poker_hand_players hp set
      hand_score = public._poker_eval(hc.cards || h.board),
      hand_name = public._poker_hand_name(public._poker_eval(hc.cards || h.board)),
      shown_cards = hc.cards
    from poker_hole_cards hc
    where hc.hand_id = hp.hand_id and hc.seat_no = hp.seat_no and hp.hand_id = h.id and not hp.folded;
  end if;
  res := public._poker_pots(h.id);
  select coalesce(sum(total_bet), 0) into total from poker_hand_players where hand_id = h.id;
  select coalesce(sum(value::bigint), 0) into paid from jsonb_each_text(res -> 'payouts');
  if total <= 0 or paid + (res ->> 'fee_total')::bigint <> total then raise exception 'INVARIANT_POT_MISMATCH'; end if;

  perform 1 from poker_seats where id in (select seat_id from poker_hand_players where hand_id = h.id)
    order by id for update;
  perform _coinflip_lock_wallets(
    array(select distinct user_id from poker_hand_players where hand_id = h.id order by user_id), h.asset, h.account_type);

  update poker_hand_players hp set
    refund = coalesce((res -> 'refunds' ->> hp.seat_no::text)::bigint, 0),
    won = coalesce((res -> 'payouts' ->> hp.seat_no::text)::bigint, 0)
          - coalesce((res -> 'refunds' ->> hp.seat_no::text)::bigint, 0),
    wagered = coalesce((res -> 'wagered' ->> hp.seat_no::text)::bigint, 0),
    end_stack = hp.stack + coalesce((res -> 'payouts' ->> hp.seat_no::text)::bigint, 0)
  where hp.hand_id = h.id;

  for p in select hp.* from poker_hand_players hp where hp.hand_id = h.id order by hp.seat_id loop
    select * into s from poker_seats where id = p.seat_id for update;
    if s.status <> 'SEATED' or s.stack <> p.start_stack then raise exception 'INVARIANT_SEAT_STACK'; end if;
    update poker_seats set stack = p.end_stack where id = s.id;
  end loop;

  if exists (
    select 1 from poker_hand_players hp
    join bot_house_open opened on opened.user_id = hp.user_id and opened.asset = h.asset and opened.account_type = h.account_type
    where hp.hand_id = h.id
  ) then
    perform public._lock_system_accounts(
      case when h.account_type = 'real'
        then array['game_escrow', 'house_bankroll', 'house_revenue']::public.account_kind[]
        else array['game_escrow', 'house_revenue', 'test_faucet']::public.account_kind[]
      end,
      h.asset, h.account_type);
  end if;

  escrow := _system_account('game_escrow', h.asset, h.account_type);
  house := _system_account('house_revenue', h.asset, h.account_type);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('poker_hand', 'poker:hand:' || h.id || ':settle', h.account_type, null, h.id, 'Poker hand settlement')
    returning id into tx;
  for p in select * from poker_hand_players where hand_id = h.id and total_bet > 0 order by user_id, seat_no loop
    perform _post(tx, _user_account(p.user_id, 'user_locked', h.asset, h.account_type), -p.total_bet);
  end loop;
  perform _post(tx, escrow, total);
  perform _post(tx, escrow, -total);
  for p in
    select hp.user_id, coalesce((res -> 'payouts' ->> hp.seat_no::text)::bigint, 0) as pay
    from poker_hand_players hp where hp.hand_id = h.id order by hp.user_id, hp.seat_no
  loop
    if p.pay > 0 then
      perform _post(tx, _user_account(p.user_id, 'user_locked', h.asset, h.account_type), p.pay);
    end if;
  end loop;
  if (res ->> 'fee_total')::bigint > 0 then
    perform _post(tx, house, (res ->> 'fee_total')::bigint);
  end if;
  if current_setting('pvp.fail_settlement', true) = 'late' then raise exception 'INJECTED_LATE_FAILURE'; end if;

  update poker_hands set
    status = 'COMPLETED', server_seed = encode(seed, 'hex'), pots = res -> 'pots', fee_total = (res ->> 'fee_total')::bigint,
    ledger_tx_id = tx, completed_at = clock_timestamp(), to_act = null, action_deadline = null,
    next_hand_at = clock_timestamp() + make_interval(secs =>
      case when live > 1 then c.showdown_seconds else c.between_hands_seconds end
      + h.runout_streets * c.runout_street_seconds),
    version = version + 1
  where id = h.id;
  update poker_tables set hand_id = null, button_seat = h.button_seat where id = h.table_id and hand_id = h.id;

  if (res ->> 'flop')::boolean then
    for p in select hp.user_id, hp.seat_no, hp.wagered from poker_hand_players hp
             where hp.hand_id = h.id and hp.wagered > 0 order by hp.user_id loop
      begin
        perform public.prestige_award_wager(p.user_id, 'poker', 'hand:' || h.id || ':' || p.seat_no, p.wagered,
          jsonb_build_object('hand_id', h.id));
      exception when others then
        perform _audit(p.user_id, 'prestige_hook_error', h.id, jsonb_build_object('game', 'poker', 'error', left(sqlerrm, 200)));
      end;
    end loop;
  end if;
  perform _audit(null, 'poker_hand_settled', h.id, jsonb_build_object(
    'table', h.table_id, 'fee_total', res -> 'fee_total', 'pot_total', total, 'ledger_tx', tx));
end $$;
