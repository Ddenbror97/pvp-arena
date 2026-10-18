-- The first turn used the same 3.5s idle timer as every later turn. A creator who
-- waited for an opponent lost the match to auto-spin before they could press SPIN.
-- Later turns stay on slot_games.turn_seconds. Only the opening deadline is longer.
create or replace function public.slot_join(p_game_id bigint, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prof public.profiles; c public.slot_config; g public.slot_games; e public.slot_entries;
  tx uuid; avail uuid; locked uuid; bal bigint; ts timestamptz; opens timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtext('slot:' || uid::text || ':' || p_idempotency_key));
  select * into e from slot_entries where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if e.seat = 'B' and e.game_id = p_game_id then return jsonb_build_object('duplicate', true, 'game_id', e.game_id); end if;
    raise exception 'IDEMPOTENCY_KEY_REUSED';
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from slot_config;

  select * into g from slot_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_JOINABLE'; end if;
  if g.account_type <> (select account_type from money_domain_config) or not public._play_domain_open() then
    raise exception 'REAL_MONEY_DISABLED';
  end if;
  ts := clock_timestamp();
  if ts >= g.expires_at then raise exception 'GAME_EXPIRED'; end if;
  if g.creator_id = uid then raise exception 'CANNOT_JOIN_OWN_GAME'; end if;

  avail := _user_account(uid, 'user_available', g.asset, g.account_type);
  locked := _user_account(uid, 'user_locked', g.asset, g.account_type);
  perform _coinflip_lock_wallets(array[uid], g.asset, g.account_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or locked is null or bal < g.stake then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('slot_entry', 'slot:' || g.id || ':entry:B', g.account_type, uid, g.id, 'P2P Slott stake') returning id into tx;
  perform _post(tx, avail, -g.stake);
  perform _post(tx, locked, g.stake);
  insert into slot_entries (game_id, user_id, seat, amount, ledger_tx_id, idempotency_key, created_at)
    values (g.id, uid, 'B', g.stake, tx, p_idempotency_key, ts);
  opens := ts + c.pre_delay_ms * interval '1 millisecond';
  update slot_games set status = 'ACTIVE', opponent_id = uid, joined_at = ts, turn_opens_at = opens,
    turn_deadline = opens + interval '60 seconds' where id = g.id;
  perform _audit_slot(uid, 'PLAYER_JOINED', g.id, jsonb_build_object('stake', g.stake, 'ledger_tx', tx, 'turn_opens_at', opens));
  return jsonb_build_object('duplicate', false, 'game_id', g.id, 'turn_opens_at', opens);
end $$;
