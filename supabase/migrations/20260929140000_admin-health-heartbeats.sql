-- The admin health panel reads worker_tick_gate.last_run_at. pg_cron calls
-- the tick functions as an internal role, and _tick_gate returned before
-- writing that timestamp, so the panel showed the last browser visit.
-- external_custody and house_bankroll are allowed to be negative by
-- wallet_accounts_balance_nonneg; integrity_check was still reporting them.

create or replace function public._tick_gate(p_name text) returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean; r text;
begin
  r := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  -- Scheduler / internal callers are never throttled, but they do stamp the heartbeat.
  if session_user <> 'authenticator' and r not in ('anon', 'authenticated') then
    insert into public.worker_tick_gate(name, last_run_at)
    values (p_name, clock_timestamp())
    on conflict (name) do update set last_run_at = clock_timestamp();
    return true;
  end if;
  if not pg_try_advisory_xact_lock(hashtext('pvp_tick:' || p_name)) then return false; end if;
  update public.worker_tick_gate set last_run_at = clock_timestamp()
    where name = p_name and last_run_at <= clock_timestamp() - interval '250 milliseconds'
    returning true into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public._tick_gate(text) from public, anon, authenticated;

create or replace function public.integrity_check() returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; run bigint;
begin
  insert into integrity_runs default values returning id into run;
  for r in
    select 'account_balance_mismatch' chk, 'acct:' || a.id fp,
           jsonb_build_object('account_id', a.id, 'owner_id', a.owner_id, 'kind', a.kind, 'balance', a.balance, 'ledger_sum', coalesce(s.total, 0)) d
      from wallet_accounts a left join (select account_id, sum(amount) total from ledger_postings group by 1) s on s.account_id = a.id
      where a.balance <> coalesce(s.total, 0)
    union all
    select 'account_last_posting_mismatch', 'acctlast:' || a.id, jsonb_build_object('account_id', a.id, 'owner_id', a.owner_id, 'balance', a.balance, 'last_balance_after', l.balance_after)
      from wallet_accounts a join lateral (select p.balance_after from ledger_postings p where p.account_id = a.id order by p.id desc limit 1) l on true
      where l.balance_after <> a.balance
    union all
    select 'negative_balance', 'neg:' || a.id, jsonb_build_object('account_id', a.id, 'owner_id', a.owner_id, 'kind', a.kind, 'balance', a.balance)
      from wallet_accounts a
      where a.kind not in ('test_faucet', 'external_custody', 'house_bankroll') and a.balance < 0
    union all
    select 'unbalanced_transaction', 'tx:' || p.tx_id, jsonb_build_object('tx_id', p.tx_id, 'sum', sum(p.amount))
      from ledger_postings p group by p.tx_id having sum(p.amount) <> 0
    union all
    select 'transaction_without_postings', 'txempty:' || t.id, jsonb_build_object('tx_id', t.id, 'kind', t.kind, 'game_id', t.game_id)
      from ledger_transactions t where not exists (select 1 from ledger_postings p where p.tx_id = t.id)
    union all
    select 'asset_sum_nonzero', 'global:' || a.asset || ':' || a.account_type, jsonb_build_object('asset', a.asset, 'account_type', a.account_type, 'sum', sum(a.balance))
      from wallet_accounts a group by a.asset, a.account_type having sum(a.balance) <> 0
    union all
    select 'jackpot_pot_mismatch', 'jp:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status, 'pot', g.pot_amount, 'payout', g.payout_amount, 'rake', g.rake_amount,
             'entries_sum', (select coalesce(sum(e.amount), 0) from jackpot_entries e where e.game_id = g.id))
      from jackpot_games g
      where g.pot_amount <> (select coalesce(sum(e.amount), 0) from jackpot_entries e where e.game_id = g.id)
         or (g.status = 'COMPLETED' and g.payout_amount + g.rake_amount <> g.pot_amount)
    union all
    select 'jackpot_ticket_ranges', 'jpt:' || g.id, jsonb_build_object('game_id', g.id)
      from jackpot_games g
      where exists (select 1 from (select e.ticket_start, lag(e.ticket_end, 1, 0::bigint) over (order by e.ticket_start) prev
                                   from jackpot_entries e where e.game_id = g.id) x where x.ticket_start <> x.prev)
    union all
    select 'jackpot_entry_debit_mismatch', 'jpe:' || g.id, jsonb_build_object('game_id', g.id,
             'entries', (select count(*) from jackpot_entries e where e.game_id = g.id),
             'debits', (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'jackpot_entry'))
      from jackpot_games g
      where (select count(*) from jackpot_entries e where e.game_id = g.id)
         <> (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'jackpot_entry')
    union all
    select 'jackpot_settlement_count', 'jps:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status,
             'settlements', (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'jackpot_settlement'))
      from jackpot_games g
      where (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'jackpot_settlement')
         <> case when g.status = 'COMPLETED' then 1 else 0 end
    union all
    select 'coinflip_entry_debit_mismatch', 'cfe:' || g.id, jsonb_build_object('game_id', g.id)
      from coinflip_games g
      where (select count(*) from coinflip_entries e where e.game_id = g.id)
         <> (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_entry')
    union all
    select 'coinflip_outcome_mismatch', 'cfo:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status,
             'winner_payouts', (select count(*) from coinflip_payouts p where p.game_id = g.id and p.kind = 'WINNER' and p.status = 'SETTLED'),
             'refund_payouts', (select count(*) from coinflip_payouts p where p.game_id = g.id and p.kind = 'REFUND' and p.status = 'SETTLED'),
             'settlements', (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_settlement'),
             'refunds', (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_refund'))
      from coinflip_games g
      where (select count(*) from coinflip_payouts p where p.game_id = g.id and p.kind = 'WINNER' and p.status = 'SETTLED') <> case when g.status = 'COMPLETED' then 1 else 0 end
         or (select count(*) from coinflip_payouts p where p.game_id = g.id and p.kind = 'REFUND' and p.status = 'SETTLED') <> case when g.status = 'CANCELLED' then 1 else 0 end
         or (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_settlement') <> case when g.status = 'COMPLETED' then 1 else 0 end
         or (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_refund') <> case when g.status = 'CANCELLED' then 1 else 0 end
         or (g.status = 'COMPLETED' and (g.payout_amount + g.fee_amount <> g.pot_amount or not exists (
               select 1 from coinflip_payouts p where p.game_id = g.id and p.kind = 'WINNER' and p.beneficiary_id = g.winner_id and p.amount = g.payout_amount)))
  loop
    n := n + 1;
    insert into integrity_incidents(check_name, fingerprint, details, last_run_id) values (r.chk, r.fp, r.d, run)
      on conflict (fingerprint) do update set details = excluded.details, last_seen_at = now(),
        occurrences = integrity_incidents.occurrences + 1, last_run_id = run;
    raise warning 'INTEGRITY_INCIDENT % %', r.chk, r.d::text;
  end loop;
  update integrity_runs set finished_at = clock_timestamp(), incidents_found = n where id = run;
  return jsonb_build_object('run_id', run, 'incidents', n);
end $$;
revoke execute on function public.integrity_check() from public, anon, authenticated;
grant execute on function public.integrity_check() to service_role;
