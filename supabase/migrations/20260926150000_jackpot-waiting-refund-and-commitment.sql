-- Solo WAITING jackpot pots refund after the game's own max_duration.
-- Settlement re-checks seed ↔ commitment before the draw (same as coinflip/roulette).
-- Repair corrupted pvp-crypto-* cron commands that started with a stray ')'.

create or replace function public._jackpot_refund_waiting(p_game_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.jackpot_games;
  p record;
  tx uuid;
  key text;
  users uuid[];
begin
  select * into g from public.jackpot_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status <> 'WAITING' then return 'noop'; end if;
  if g.player_count < 1 or g.pot_amount <= 0 then
    -- Empty lobby stays open; nothing to refund.
    return 'noop';
  end if;

  select array_agg(user_id order by user_id) into users
  from public.jackpot_players where game_id = g.id;
  if users is null or array_length(users, 1) is null then
    raise exception 'INVARIANT_PLAYERS_MISSING';
  end if;

  perform public._coinflip_lock_wallets(users, g.asset, g.account_type);
  key := 'jackpot:refund:' || g.id;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('refund', key, g.account_type, users[1], g.id, 'Jackpot refund (no opponent)')
    returning id into tx;
  for p in
    select user_id, total_amount from public.jackpot_players where game_id = g.id order by user_id
  loop
    perform public._post(tx, public._user_account(p.user_id, 'user_locked', g.asset, g.account_type), -p.total_amount);
    perform public._post(tx, public._user_account(p.user_id, 'user_available', g.asset, g.account_type), p.total_amount);
  end loop;

  -- pot_amount stays (POT_DECREASE guard); CANCELLED frees the open-game slot.
  update public.jackpot_games set status = 'CANCELLED' where id = g.id;
  perform public._audit(null, 'game_cancelled', g.id, jsonb_build_object(
    'reason', 'WAITING_EXPIRED',
    'pot', g.pot_amount,
    'players', g.player_count,
    'ledger_tx', tx
  ));
  return 'cancelled';
end;
$$;

revoke all on function public._jackpot_refund_waiting(bigint) from public, anon, authenticated;
grant execute on function public._jackpot_refund_waiting(bigint) to service_role;

create or replace function public.jackpot_settle(p_game_id bigint)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare g public.jackpot_games; seed bytea; d record; winner uuid; wtotal bigint; sum_amt bigint; n_entries int;
  rake bigint; payout bigint; tx uuid; escrow uuid; house uuid; p record; err text;
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
    perform _audit(null, 'game_settled', g.id, jsonb_build_object('winner', winner, 'ticket', d.ticket, 'payout', payout, 'rake', rake));
  exception when others then
    err := sqlerrm;
    update jackpot_payouts set status = 'FAILED', attempts = attempts + 1, last_error = err where game_id = g.id;
    perform _audit(null, 'settlement_failed', g.id, jsonb_build_object('error', err));
    return 'failed';
  end;
  return 'settled';
end;
$$;

create or replace function public.jackpot_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare r record; n int := 0; n_cancelled int := 0; res text;
begin
  if not public._tick_gate('jackpot') then
    return jsonb_build_object('settled', 0, 'cancelled', 0, 'throttled', true, 'server_time', clock_timestamp());
  end if;

  -- Solo WAITING pots older than this game's max_duration: refund locked stakes.
  for r in
    select id from public.jackpot_games
    where status = 'WAITING'
      and player_count >= 1
      and pot_amount > 0
      and created_at <= clock_timestamp() - make_interval(secs => max_duration_seconds)
    order by id
    limit 10
    for update skip locked
  loop
    res := public._jackpot_refund_waiting(r.id);
    if res = 'cancelled' then n_cancelled := n_cancelled + 1; end if;
  end loop;

  for r in select id from jackpot_games
           where (status = 'ACTIVE' and scheduled_end_at <= clock_timestamp()) or status = 'DRAWING'
           order by id limit 10 loop
    res := jackpot_settle(r.id);
    if res = 'settled' then n := n + 1; end if;
  end loop;
  perform _ensure_open_game();
  return jsonb_build_object('settled', n, 'cancelled', n_cancelled, 'server_time', clock_timestamp());
end;
$$;

revoke all on function public.jackpot_settle(bigint) from public, anon, authenticated;
revoke all on function public.jackpot_tick() from public;
grant execute on function public.jackpot_tick() to anon, authenticated, service_role;
grant execute on function public.jackpot_settle(bigint) to service_role;

-- prod-only:begin
select cron.unschedule(jobid)
from cron.job
where jobname in ('pvp-crypto-deposits', 'pvp-crypto-withdrawals', 'pvp-crypto-reconcile');

select cron.schedule(
  'pvp-crypto-deposits',
  '* * * * *',
  $cmd$select public.crypto_invoke_cron('crypto-deposits')$cmd$
);
select cron.schedule(
  'pvp-crypto-withdrawals',
  '* * * * *',
  $cmd$select public.crypto_invoke_cron('crypto-withdrawals')$cmd$
);
select cron.schedule(
  'pvp-crypto-reconcile',
  '*/15 * * * *',
  $cmd$select public.crypto_invoke_cron('crypto-reconcile')$cmd$
);
-- prod-only:end
