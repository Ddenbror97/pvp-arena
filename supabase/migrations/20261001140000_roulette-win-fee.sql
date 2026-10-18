-- 5% fee on roulette winnings. The multiplier (2x / 14x) is unchanged; settlement
-- keeps 5% of the gross payout and pays the rest. The rate is snapshotted onto
-- the round at creation, so a round already taking bets is not repriced.

alter table public.roulette_config
  add column win_fee_bps integer not null default 500 check (win_fee_bps between 0 and 1000);

alter table public.roulette_games
  add column win_fee_bps integer not null default 0 check (win_fee_bps between 0 and 1000);

update public.roulette_games g
set win_fee_bps = c.win_fee_bps
from public.roulette_config c
where g.status in ('WAITING', 'BETTING') and g.bet_count = 0;

create or replace function public._roulette_ensure_open()
 returns bigint language plpgsql security definer set search_path = ''
as $function$
declare gid bigint; c public.roulette_config; jc public.money_domain_config; seed bytea; ts timestamptz;
begin
  select id into gid from public.roulette_games
    where status in ('BETTING', 'LOCKED', 'SPINNING', 'SETTLEMENT') order by id desc limit 1;
  if gid is not null then return gid; end if;
  perform pg_advisory_xact_lock(hashtext('roulette:open'));
  select id into gid from public.roulette_games
    where status in ('BETTING', 'LOCKED', 'SPINNING', 'SETTLEMENT') order by id desc limit 1;
  if gid is not null then return gid; end if;
  select * into c from public.roulette_config;
  select * into jc from public.money_domain_config;
  if not public._roulette_domain_valid() then return null; end if;
  seed := extensions.gen_random_bytes(32);
  ts := clock_timestamp();
  insert into public.roulette_games (money_domain, status, wheel_version, asset, account_type, min_bet, max_bet, max_pot, max_bets_per_user, max_bets_per_round,
      betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, win_fee_bps, server_seed_hash, betting_started_at, betting_ends_at)
    values (jc.money_domain, 'BETTING', c.wheel_version, jc.asset, jc.account_type, c.min_bet, c.max_bet, c.max_pot, c.max_bets_per_user, c.max_bets_per_round,
      c.betting_seconds, c.lock_ms, c.spin_ms, c.stuck_cancel_seconds, c.win_fee_bps, encode(extensions.digest(seed, 'sha256'), 'hex'),
      ts + interval '3.5 seconds', ts + interval '3.5 seconds' + make_interval(secs => c.betting_seconds))
    returning id into gid;
  insert into public.roulette_game_secrets (game_id, server_seed) values (gid, seed);
  perform public._roulette_audit(null, 'ROUND_CREATED', gid, jsonb_build_object('wheel_version', c.wheel_version, 'win_fee_bps', c.win_fee_bps, 'continuous', true));
  return gid;
end $function$;
revoke execute on function public._roulette_ensure_open() from public, anon, authenticated;

create or replace function public._roulette_settle(p_game_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.roulette_games; r public.roulette_results; w public.roulette_wheels; seed bytea; d record; b record;
  tx uuid; gross bigint; fee bigint; payout bigint; n integer; s bigint; house uuid; bank uuid; total bigint;
begin
  select * into g from public.roulette_games where id = p_game_id for update;
  if g.status <> 'SETTLEMENT' then raise exception 'NOT_IN_SETTLEMENT'; end if;
  select * into r from public.roulette_results where game_id = g.id;
  if not found then raise exception 'RESULT_MISSING'; end if;
  select * into w from public.roulette_wheels where version = g.wheel_version;
  select server_seed into seed from public.roulette_game_secrets where game_id = g.id;
  if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  select * into d from public.roulette_draw_slot(seed, g.id, g.draw_version, w.slot_count);
  if d.slot <> r.slot or d.hmac_hex <> r.hmac_hex or w.layout[r.slot + 1] <> r.color
     or g.winning_slot is distinct from r.slot or g.winning_color is distinct from r.color then
    raise exception 'INVARIANT_RESULT';
  end if;
  select count(*), coalesce(sum(amount), 0) into n, s from public.roulette_bets where game_id = g.id;
  if n <> g.bet_count or s <> g.pot_amount then raise exception 'INVARIANT_BETS'; end if;
  if exists (select 1 from public.roulette_bets where game_id = g.id and multiplier_bps <> (w.multipliers_bps ->> color::text)::integer) then
    raise exception 'INVARIANT_MULTIPLIER';
  end if;

  perform public._coinflip_lock_wallets(array(select distinct user_id from public.roulette_bets where game_id = g.id order by 1), g.asset, g.account_type);
  house := public._system_account('house_revenue', g.asset, g.account_type);
  bank := public._system_account(case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end, g.asset, g.account_type);
  for b in select * from public.roulette_bets where game_id = g.id and status = 'ACCEPTED' order by created_at, id loop
    insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('roulette_settlement', 'roulette:bet:' || b.id || ':settle', g.account_type, b.user_id, g.id, 'Roulette settlement') returning id into tx;
    perform public._post(tx, public._user_account(b.user_id, 'user_locked', g.asset, g.account_type), -b.amount);
    if b.color = r.color then
      gross := (b.amount * b.multiplier_bps) / 10000;
      fee := (gross * g.win_fee_bps) / 10000;
      payout := gross - fee;
      perform public._post(tx, public._user_account(b.user_id, 'user_available', g.asset, g.account_type), payout);
      perform public._post(tx, bank, -(gross - b.amount));
      if fee > 0 then perform public._post(tx, house, fee); end if;
      insert into public.roulette_payouts (bet_id, game_id, kind, beneficiary_id, amount, idempotency_key, ledger_tx_id)
        values (b.id, g.id, 'WINNER', b.user_id, payout, 'roulette:bet:' || b.id || ':win', tx);
      update public.roulette_bets set status = 'WON', payout_amount = payout, settled_at = clock_timestamp() where id = b.id;
    else
      perform public._post(tx, house, b.amount);
      update public.roulette_bets set status = 'LOST', payout_amount = 0, settled_at = clock_timestamp() where id = b.id;
    end if;
  end loop;
  if current_setting('pvp.fail_after_ledger', true) = 'on' then raise exception 'INJECTED_FAILURE_AFTER_LEDGER'; end if;
  select coalesce(sum(amount), 0) into total from public.roulette_payouts where game_id = g.id and kind = 'WINNER';
  update public.roulette_games set status = 'COMPLETED', completed_at = clock_timestamp(), total_payout = total,
    house_result = g.pot_amount - total, server_seed = encode(seed, 'hex'), draw_counter = r.draw_counter where id = g.id;
  perform public._roulette_audit(null, 'ROUND_COMPLETED', g.id, jsonb_build_object('winning_color', r.color, 'slot', r.slot,
    'pot', g.pot_amount, 'payout', total, 'win_fee_bps', g.win_fee_bps, 'bets', n));
end $$;
revoke execute on function public._roulette_settle(bigint) from public, anon, authenticated;

create or replace function public.roulette_integrity_check()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r record; n integer := 0;
begin
  for r in
    select 'roulette_pot_mismatch' chk, 'rlp:' || g.id fp, jsonb_build_object('game_id', g.id, 'pot', g.pot_amount, 'bets', g.bet_count) d
      from public.roulette_games g
      where g.pot_amount <> (select coalesce(sum(b.amount), 0) from public.roulette_bets b where b.game_id = g.id)
         or g.bet_count <> (select count(*) from public.roulette_bets b where b.game_id = g.id)
    union all
    select 'roulette_entry_debit_mismatch', 'rle:' || g.id, jsonb_build_object('game_id', g.id)
      from public.roulette_games g
      where (select count(*) from public.roulette_bets b where b.game_id = g.id)
         <> (select count(*) from public.ledger_transactions t where t.game_id = g.id and t.kind = 'roulette_entry')
    union all
    select 'roulette_outcome_mismatch', 'rlo:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status)
      from public.roulette_games g
      where (select count(*) from public.ledger_transactions t where t.game_id = g.id and t.kind = 'roulette_settlement')
              <> case when g.status = 'COMPLETED' then g.bet_count else 0 end
         or (select count(*) from public.ledger_transactions t where t.game_id = g.id and t.kind = 'roulette_refund')
              <> case when g.status = 'CANCELLED' then g.bet_count else 0 end
         or (select count(*) from public.roulette_payouts p where p.game_id = g.id and p.kind = 'WINNER')
              <> case when g.status = 'COMPLETED' then (select count(*) from public.roulette_bets b where b.game_id = g.id and b.color = g.winning_color) else 0 end
         or exists (select 1 from public.roulette_payouts p join public.roulette_bets b on b.id = p.bet_id
                    where p.game_id = g.id and p.kind = 'WINNER' and (b.color is distinct from g.winning_color
                      or p.amount <> (b.amount * b.multiplier_bps) / 10000
                        - (((b.amount * b.multiplier_bps) / 10000) * g.win_fee_bps) / 10000))
         or (g.status = 'COMPLETED' and g.total_payout <> (select coalesce(sum(p.amount), 0) from public.roulette_payouts p where p.game_id = g.id and p.kind = 'WINNER'))
    union all
    select 'roulette_settlement_stuck', 'rls:' || g.id,
           jsonb_build_object('game_id', g.id, 'status', g.status, 'attempts', g.settle_attempts, 'last_error', g.last_error,
                              'since', coalesce(g.settlement_started_at, g.spin_end_at, g.betting_ends_at))
      from public.roulette_games g
      where (g.status = 'SETTLEMENT' and (g.settle_attempts >= 3 or g.settlement_started_at < clock_timestamp() - interval '2 minutes'))
         or (g.status in ('LOCKED', 'SPINNING') and g.spin_end_at < clock_timestamp() - interval '2 minutes')
  loop
    n := n + 1;
    insert into public.integrity_incidents (check_name, fingerprint, details) values (r.chk, r.fp, r.d)
      on conflict (fingerprint) do update set details = excluded.details, last_seen_at = now(), occurrences = public.integrity_incidents.occurrences + 1;
    raise warning 'INTEGRITY_INCIDENT % %', r.chk, r.d::text;
  end loop;
  return jsonb_build_object('incidents', n);
end $function$;
revoke execute on function public.roulette_integrity_check() from public, anon, authenticated;
