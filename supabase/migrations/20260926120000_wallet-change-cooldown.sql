-- After a verified wallet becomes primary, withdrawals to it wait 24 hours
-- whenever the account already has another verified wallet. The first wallet
-- on an account is not delayed. Switching back to an older wallet restarts
-- the same wait, because primary-ness is what the withdrawal uses.

alter table public.user_wallets
  add column if not exists became_primary_at timestamptz;

update public.user_wallets
  set became_primary_at = coalesce(verified_at, created_at)
  where became_primary_at is null;

alter table public.user_wallets
  alter column became_primary_at set default now();

CREATE OR REPLACE FUNCTION public.wallet_consume_and_verify(p_id uuid, p_user uuid, p_normalized text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.wallet_verification_challenges; ts timestamptz;
begin
  perform public._require_server_caller();
  select * into c from public.wallet_verification_challenges where id = p_id for update;
  ts := clock_timestamp();
  if not found or c.user_id is distinct from p_user then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if c.consumed_at is not null then return jsonb_build_object('ok', false, 'code', 'CONSUMED'); end if;
  if c.expires_at <= ts then return jsonb_build_object('ok', false, 'code', 'EXPIRED'); end if;
  if c.normalized_address <> p_normalized then return jsonb_build_object('ok', false, 'code', 'ADDRESS_MISMATCH'); end if;
  begin
    update public.wallet_verification_challenges set consumed_at = ts where id = c.id;
    update public.user_wallets set is_primary = false, updated_at = ts where user_id = p_user and is_primary and normalized_address <> c.normalized_address;
    insert into public.user_wallets (user_id, address, normalized_address, is_verified, is_primary, verified_at, last_seen_at, became_primary_at)
      values (p_user, c.wallet_address, c.normalized_address, true, true, ts, ts, ts)
    on conflict (user_id, normalized_address) do update set address = excluded.address, is_verified = true, is_primary = true,
      verified_at = coalesce(public.user_wallets.verified_at, excluded.verified_at), last_seen_at = excluded.last_seen_at, updated_at = ts,
      became_primary_at = case when public.user_wallets.is_primary then public.user_wallets.became_primary_at else ts end;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_LINKED');
  end;
  return jsonb_build_object('ok', true, 'address', c.wallet_address, 'verified_at', ts);
end $function$;

CREATE OR REPLACE FUNCTION public.crypto_request_withdrawal(p_user uuid, p_chain bigint, p_asset text, p_usd_cents bigint, p_quote uuid, p_env_ok boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s crypto_settings; net chain_networks; a chain_assets; w user_wallets; q crypto_withdrawal_quotes; units numeric; total bigint; avail uuid; locked uuid; bal bigint; tx uuid; wid uuid := gen_random_uuid(); review boolean; used bigint; used_global bigint;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  select * into a from chain_assets where chain_id = p_chain and asset_key = p_asset and is_enabled;
  if a is null then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  select * into w from user_wallets where user_id = p_user and is_verified order by is_primary desc, verified_at desc limit 1;
  if w is null then raise exception 'NO_VERIFIED_WALLET'; end if;
  -- A stolen session can prove a new address. Do not pay that address until
  -- it has been primary for 24 hours, and only when another verified wallet
  -- already existed (the first wallet on an account can withdraw immediately).
  if exists (
    select 1 from user_wallets o
    where o.user_id = p_user and o.is_verified and o.normalized_address <> w.normalized_address
  ) and w.became_primary_at > clock_timestamp() - interval '24 hours' then
    raise exception 'WALLET_CHANGE_COOLDOWN';
  end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (select 1 from crypto_withdrawals where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')) then raise exception 'WITHDRAWAL_PENDING'; end if;
  select coalesce(sum(usd_cents),0) into used from crypto_withdrawals where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from crypto_withdrawals where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
  if used_global + p_usd_cents > s.daily_global_limit_cents then raise exception 'GLOBAL_DAILY_LIMIT'; end if;
  if a.settlement_kind = 'native' then
    select * into q from crypto_withdrawal_quotes where id = p_quote for update;
    if q is null or q.user_id <> p_user or q.asset_key <> p_asset or q.chain_id <> p_chain then raise exception 'QUOTE_INVALID'; end if;
    if q.used_at is not null then raise exception 'QUOTE_USED'; end if;
    if q.expires_at < now() then raise exception 'QUOTE_EXPIRED'; end if;
    if q.usd_cents <> p_usd_cents then raise exception 'QUOTE_MISMATCH'; end if;
    update crypto_withdrawal_quotes set used_at = now() where id = q.id;
    units := q.units;
  else
    units := p_usd_cents::numeric * power(10::numeric, a.decimals) / 100;
  end if;
  total := p_usd_cents + s.withdrawal_fee_cents;
  avail := _user_account(p_user, 'user_available', a.ledger_asset, a.ledger_account_type);
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < total then raise exception 'INSUFFICIENT_BALANCE'; end if;
  locked := _user_account(p_user, 'user_locked', a.ledger_asset, a.ledger_account_type);
  if locked is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type) values (p_user, 'user_locked', a.ledger_asset, a.ledger_account_type) returning id into locked;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'withdrawal:' || wid || ':hold', a.ledger_account_type, p_user, 'Withdrawal hold') returning id into tx;
  perform _post(tx, avail, -total);
  perform _post(tx, locked, total);
  review := not coalesce(p_env_ok, false) or p_usd_cents > s.auto_approve_cents;
  insert into crypto_withdrawals (id, user_id, chain_id, asset_key, to_address, units, usd_cents, fee_usd_cents, status, review_required, hold_ledger_tx_id, quote_id)
    values (wid, p_user, p_chain, p_asset, w.normalized_address, units, p_usd_cents, s.withdrawal_fee_cents, case when review then 'PENDING' else 'APPROVED' end, review, tx, q.id);
  perform _audit(p_user, 'crypto_withdrawal_requested', null, jsonb_build_object('withdrawal', wid, 'cents', p_usd_cents, 'asset', p_asset, 'chain', p_chain, 'review', review));
  return jsonb_build_object('id', wid, 'status', case when review then 'PENDING' else 'APPROVED' end);
end $function$;

revoke execute on function public.wallet_consume_and_verify(uuid, uuid, text),
  public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean)
  from public, anon, authenticated;
