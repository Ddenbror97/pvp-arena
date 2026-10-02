-- Any whole-cent stake between the smallest and largest configured chip.
-- The chips stay shortcuts; the range is still the admin stake list.

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
                          max_spins, spin_ms, turn_seconds, server_seed_hash, created_at, expires_at)
  values (jc.money_domain, jc.asset, jc.account_type, uid, p_stake, p_stake * 2,
          least((p_stake * c.match_cap_bps) / 10000, c.max_match_bonus_cents), c.fee_bps, c.base_spins, c.max_spins,
          c.spin_ms, c.turn_seconds, encode(extensions.digest(seed, 'sha256'), 'hex'), ts,
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
    'fee_bps', g.fee_bps, 'bonus_cap', g.bonus_cap, 'expires_at', g.expires_at, 'ledger_tx', tx));
  return jsonb_build_object('duplicate', false, 'game_id', g.id);
end $$;
