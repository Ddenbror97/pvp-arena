CREATE OR REPLACE FUNCTION public.roulette_integrity_check()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
                    where p.game_id = g.id and p.kind = 'WINNER' and (b.color is distinct from g.winning_color or p.amount <> (b.amount * b.multiplier_bps) / 10000))
         or (g.status = 'COMPLETED' and g.total_payout <> (select coalesce(sum(p.amount), 0) from public.roulette_payouts p where p.game_id = g.id and p.kind = 'WINNER'))
    union all
    -- Stuck-round monitor: a round that keeps failing settlement or sits past its deadlines is never silent.
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

-- Every failed settlement attempt is also written to the database log for monitoring.
CREATE OR REPLACE FUNCTION public._roulette_audit(p_actor uuid, p_action text, p_game bigint, p_details jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.audit_logs (actor_id, action, game_id, details, game_type) values (p_actor, p_action, p_game, coalesce(p_details, '{}'::jsonb), 'roulette');
  if p_action = 'RECOVERY_FAILED' then
    raise warning 'ROULETTE_RECOVERY_FAILED game=% %', p_game, coalesce(p_details, '{}'::jsonb)::text;
  end if;
end $function$;

REVOKE EXECUTE ON FUNCTION public.roulette_integrity_check() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._roulette_audit(uuid, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;