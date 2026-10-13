-- Caps the house's worst-case net loss on one Roulette round. For every wheel colour the
-- exposure is what the house would pay if that colour landed minus everything staked in the
-- round; a bet that would push the largest of those past max_round_exposure is rejected.
-- The check runs while the round row is locked, so concurrent bets cannot race past it.

alter table public.roulette_config
  add column if not exists max_round_exposure bigint not null default 500000
  check (max_round_exposure > 0);

create or replace function public.roulette_bet(p_color public.roulette_color, p_amount bigint, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare uid uuid := auth.uid(); prof public.profiles; b public.roulette_bets; g public.roulette_games; w public.roulette_wheels;
  gid bigint; mult integer; bid uuid; tx uuid; avail uuid; lck uuid; bal bigint; ts timestamptz; n_user integer;
  cap bigint; worst numeric;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  if p_color is null then raise exception 'INVALID_COLOR'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'BELOW_MIN_WAGER'; end if;
  perform pg_advisory_xact_lock(hashtext('rl:' || uid::text || ':' || p_idempotency_key));
  select * into b from public.roulette_bets where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if b.color <> p_color or b.amount <> p_amount then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return jsonb_build_object('duplicate', true, 'bet_id', b.id, 'game_id', b.game_id);
  end if;
  select * into prof from public.profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;

  gid := public._roulette_ensure_open();
  if gid is null then raise exception 'REAL_MONEY_DISABLED'; end if;
  select * into g from public.roulette_games where id = gid for update;
  ts := clock_timestamp();
  if g.status not in ('WAITING', 'BETTING') or (g.status = 'BETTING' and ts >= g.betting_ends_at) then raise exception 'BETTING_CLOSED'; end if;
  if g.account_type <> (select account_type from public.money_domain_config) or not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  if p_amount < g.min_bet then raise exception 'BELOW_MIN_WAGER'; end if;
  if p_amount > g.max_bet then raise exception 'ABOVE_MAX_WAGER'; end if;
  if g.pot_amount + p_amount > g.max_pot then raise exception 'POT_LIMIT_REACHED'; end if;
  if g.bet_count >= g.max_bets_per_round then raise exception 'ROUND_FULL'; end if;
  select count(*) into n_user from public.roulette_bets where game_id = g.id and user_id = uid;
  if n_user >= g.max_bets_per_user then raise exception 'TOO_MANY_BETS'; end if;
  select * into w from public.roulette_wheels where version = g.wheel_version;
  mult := (w.multipliers_bps ->> p_color::text)::integer;
  if mult is null then raise exception 'INVALID_COLOR'; end if;

  select max_round_exposure into cap from public.roulette_config;
  select max(
      coalesce((select sum(rb.amount::numeric * rb.multiplier_bps / 10000)
                from public.roulette_bets rb where rb.game_id = g.id and rb.color::text = k), 0)
      + case when k = p_color::text then p_amount::numeric * mult / 10000 else 0 end)
    into worst
    from jsonb_object_keys(w.multipliers_bps) k;
  if cap is not null and worst - (g.pot_amount + p_amount) > cap then raise exception 'EXPOSURE_LIMIT_REACHED'; end if;

  avail := public._user_account(uid, 'user_available', g.asset, g.account_type);
  lck := public._user_account(uid, 'user_locked', g.asset, g.account_type);
  perform public._coinflip_lock_wallets(array[uid], g.asset, g.account_type);
  select balance into bal from public.wallet_accounts where id = avail;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  bid := gen_random_uuid();
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('roulette_entry', 'roulette:bet:' || bid || ':entry', g.account_type, uid, g.id, 'Roulette wager') returning id into tx;
  perform public._post(tx, avail, -p_amount);
  perform public._post(tx, lck, p_amount);
  insert into public.roulette_bets (id, game_id, user_id, color, amount, multiplier_bps, ledger_tx_id, idempotency_key, created_at)
    values (bid, g.id, uid, p_color, p_amount, mult, tx, p_idempotency_key, ts);
  update public.roulette_games set pot_amount = pot_amount + p_amount, bet_count = bet_count + 1,
      player_count = player_count + case when n_user = 0 then 1 else 0 end,
      status = 'BETTING', betting_started_at = coalesce(betting_started_at, ts),
      betting_ends_at = coalesce(betting_ends_at, ts + make_interval(secs => betting_seconds))
    where id = g.id returning * into g;
  perform public._roulette_audit(uid, 'BET_ACCEPTED', g.id, jsonb_build_object('bet_id', bid, 'color', p_color, 'amount', p_amount, 'multiplier_bps', mult));
  return jsonb_build_object('duplicate', false, 'bet_id', bid, 'game_id', g.id, 'betting_ends_at', g.betting_ends_at);
end $$;
revoke all on function public.roulette_bet(public.roulette_color, bigint, text) from public, anon;
grant execute on function public.roulette_bet(public.roulette_color, bigint, text) to authenticated, service_role;
