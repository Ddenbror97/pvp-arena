-- The hourly roulette integrity check was reading every historical round and,
-- for each round, running its own bet, ledger, and payout subqueries.
-- On 11 Oct 2026 that pass took 30–50 seconds and occupied one of the six
-- background workers. The checks below are the same comparisons. The bet,
-- ledger, and payout totals are computed once, then joined.

create index if not exists ledger_tx_game_kind_idx
  on public.ledger_transactions (game_id, kind)
  where game_id is not null;

create or replace function public.roulette_integrity_check()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare r record; n integer := 0;
begin
  for r in
    with bets as (
      select game_id, count(*)::int n, coalesce(sum(amount), 0)::bigint s
      from public.roulette_bets
      group by game_id
    ),
    entries as (
      select game_id, count(*)::int n
      from public.ledger_transactions
      where kind = 'roulette_entry' and game_id is not null
      group by game_id
    ),
    settlements as (
      select game_id, count(*)::int n
      from public.ledger_transactions
      where kind = 'roulette_settlement' and game_id is not null
      group by game_id
    ),
    refunds as (
      select game_id, count(*)::int n
      from public.ledger_transactions
      where kind = 'roulette_refund' and game_id is not null
      group by game_id
    ),
    pays as (
      select game_id, count(*)::int n, coalesce(sum(amount), 0)::bigint s
      from public.roulette_payouts
      where kind = 'WINNER'
      group by game_id
    ),
    color_hits as (
      select b.game_id, count(*)::int n
      from public.roulette_bets b
      join public.roulette_games g on g.id = b.game_id
      where b.color = g.winning_color
      group by b.game_id
    ),
    bad_pay as (
      select distinct p.game_id
      from public.roulette_payouts p
      join public.roulette_bets b on b.id = p.bet_id
      join public.roulette_games g on g.id = p.game_id
      where p.kind = 'WINNER'
        and (b.color is distinct from g.winning_color
          or p.amount <> (b.amount * b.multiplier_bps) / 10000
            - (((b.amount * b.multiplier_bps) / 10000) * g.win_fee_bps) / 10000)
    )
    select 'roulette_pot_mismatch' chk, 'rlp:' || g.id fp,
           jsonb_build_object('game_id', g.id, 'pot', g.pot_amount, 'bets', g.bet_count) d
      from public.roulette_games g
      left join bets b on b.game_id = g.id
      where g.pot_amount <> coalesce(b.s, 0) or g.bet_count <> coalesce(b.n, 0)
    union all
    select 'roulette_entry_debit_mismatch', 'rle:' || g.id, jsonb_build_object('game_id', g.id)
      from public.roulette_games g
      left join bets b on b.game_id = g.id
      left join entries e on e.game_id = g.id
      where coalesce(b.n, 0) <> coalesce(e.n, 0)
    union all
    select 'roulette_outcome_mismatch', 'rlo:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status)
      from public.roulette_games g
      left join bets b on b.game_id = g.id
      left join settlements s on s.game_id = g.id
      left join refunds rf on rf.game_id = g.id
      left join pays p on p.game_id = g.id
      left join color_hits c on c.game_id = g.id
      where coalesce(s.n, 0) <> case when g.status = 'COMPLETED' then g.bet_count else 0 end
         or coalesce(rf.n, 0) <> case when g.status = 'CANCELLED' then g.bet_count else 0 end
         or coalesce(p.n, 0) <> case when g.status = 'COMPLETED' then coalesce(c.n, 0) else 0 end
         or g.id in (select game_id from bad_pay)
         or (g.status = 'COMPLETED' and g.total_payout <> coalesce(p.s, 0))
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
end
$fn$;

revoke execute on function public.roulette_integrity_check() from public, anon, authenticated;
