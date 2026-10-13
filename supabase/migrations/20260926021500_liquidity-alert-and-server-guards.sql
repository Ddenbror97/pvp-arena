-- Security audit 2026-09-26.
-- L-1: crypto_withdrawal_liquidity_pending set a status the crypto_withdrawals_status_check constraint
--      rejects, so every hot-wallet shortfall aborted (worker ignores the error) and its incident rolled
--      back: operators were never alerted. The withdrawal now stays APPROVED (retried each run, still
--      cancellable) and the shortfall is recorded and raised as an incident.
-- C-1 defense in depth: money-moving functions refuse Data API callers carrying an anon/authenticated JWT
--      even if a platform bulk grant re-exposes them. Server code (service_role), pg_cron and migrations
--      carry no such claim and are unaffected.

create or replace function public._require_server_caller()
 returns void
 language plpgsql
 stable
 set search_path to 'public'
as $function$
declare r text;
begin
  r := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', nullif(current_setting('request.jwt.claim.role', true), ''), '');
  if r in ('anon', 'authenticated') then
    raise exception 'SERVER_ONLY' using errcode = '42501';
  end if;
end $function$;
revoke execute on function public._require_server_caller() from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._crypto_release(p_id uuid, p_status text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w crypto_withdrawals; a chain_assets; tx uuid; total bigint;
begin
  perform public._require_server_caller();
  select * into w from crypto_withdrawals where id = p_id for update;
  select * into a from chain_assets where chain_id = w.chain_id and asset_key = w.asset_key;
  total := w.usd_cents + w.fee_usd_cents;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('refund', 'withdrawal:' || w.id || ':release', a.ledger_account_type, w.user_id, 'Withdrawal hold released') returning id into tx;
  perform _post(tx, _user_account(w.user_id, 'user_locked', a.ledger_asset, a.ledger_account_type), -total);
  perform _post(tx, _user_account(w.user_id, 'user_available', a.ledger_asset, a.ledger_account_type), total);
  update crypto_withdrawals set status = p_status, release_ledger_tx_id = tx, last_error = p_reason, closed_at = now() where id = w.id;
  perform _audit(w.user_id, 'crypto_withdrawal_released', null, jsonb_build_object('withdrawal', w.id, 'status', p_status, 'reason', p_reason));
end $function$;

CREATE OR REPLACE FUNCTION public.crypto_withdrawal_signed(p_id uuid, p_hash text, p_nonce bigint, p_raw text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public._require_server_caller();
  update crypto_withdrawals set status = 'SUBMITTING', tx_hash = lower(p_hash), nonce = p_nonce, signed_raw_tx = p_raw, attempts = attempts + 1
    where id = p_id and status = 'APPROVED';
  if not found then raise exception 'NOT_APPROVED'; end if;
end $function$;

CREATE OR REPLACE FUNCTION public.crypto_withdrawal_liquidity_pending(p_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public._require_server_caller();
  update crypto_withdrawals set last_error = left(p_reason, 500) where id = p_id and status = 'APPROVED';
  if found then
    perform _crypto_incident('crypto_liquidity', 'crypto_liquidity:' || p_id, jsonb_build_object('withdrawal', p_id, 'reason', left(p_reason, 300)));
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.crypto_withdrawal_failed(p_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w crypto_withdrawals;
begin
  perform public._require_server_caller();
  select * into w from crypto_withdrawals where id = p_id for update;
  if w.status not in ('APPROVED','SUBMITTING','SUBMITTED') then return; end if;
  perform _crypto_release(w.id, 'RELEASED', left(p_reason, 500));
end $function$;

CREATE OR REPLACE FUNCTION public.crypto_cancel_withdrawal(p_user uuid, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w crypto_withdrawals;
begin
  perform public._require_server_caller();
  select * into w from crypto_withdrawals where id = p_id and user_id = p_user for update;
  if w is null then raise exception 'NOT_FOUND'; end if;
  if w.status not in ('PENDING','APPROVED') then raise exception 'CANNOT_CANCEL'; end if;
  perform _crypto_release(w.id, 'RELEASED', 'cancelled by user');
  return jsonb_build_object('status','RELEASED');
end $function$;

CREATE OR REPLACE FUNCTION public.crypto_admin_review(p_admin uuid, p_id uuid, p_approve boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w crypto_withdrawals;
begin
  perform public._require_server_caller();
  if not has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  select * into w from crypto_withdrawals where id = p_id for update;
  if w is null or w.status <> 'PENDING' then raise exception 'NOT_PENDING'; end if;
  if p_approve then
    update crypto_withdrawals set status = 'APPROVED', reviewed_by = p_admin, reviewed_at = now() where id = w.id;
  else
    update crypto_withdrawals set reviewed_by = p_admin, reviewed_at = now() where id = w.id;
    perform _crypto_release(w.id, 'REJECTED', 'rejected by admin');
  end if;
  perform _audit(p_admin, 'crypto_withdrawal_reviewed', null, jsonb_build_object('withdrawal', w.id, 'approve', p_approve));
  return jsonb_build_object('ok', true);
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

CREATE OR REPLACE FUNCTION public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s crypto_settings; net chain_networks; d crypto_deposits; a chain_assets; ps crypto_price_snapshots; cents bigint; tx uuid; key text; psid uuid; admin_ok boolean;
begin
  perform public._require_server_caller();
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.deposits_enabled then return jsonb_build_object('status','PAUSED'); end if;
  select * into d from crypto_deposits where id = p_id for update;
  if d is null then raise exception 'DEPOSIT_NOT_FOUND'; end if;
  if d.status not in ('DETECTED','CONFIRMED') then return jsonb_build_object('status', d.status); end if;
  select * into net from chain_networks where chain_id = d.chain_id;
  if net is null or not net.is_enabled then return jsonb_build_object('status','CHAIN_DISABLED'); end if;
  select * into a from chain_assets where chain_id = d.chain_id and asset_key = d.asset_key;
  psid := null;
  if a.settlement_kind = 'erc20' then
    cents := floor(d.units * 100 / power(10::numeric, a.decimals));
  else
    select * into ps from crypto_price_snapshots where id = p_price_snapshot and asset_key = d.asset_key and chain_id = d.chain_id;
    if ps is null or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds) then
      return jsonb_build_object('status','AWAITING_VALUATION');
    end if;
    psid := ps.id;
    cents := floor(d.units * ps.price_micro_usd / power(10::numeric, a.decimals) / 10000);
  end if;
  if d.user_id is null then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = psid, confirmed_at = now(), closed_reason = 'sender is not exactly one verified wallet' where id = d.id;
    return jsonb_build_object('status','UNMATCHED');
  end if;
  -- Money sent from a house wallet (treasury/payout) is never credited automatically.
  -- Only an explicit, per-deposit admin decision inside a migration may override it.
  admin_ok := coalesce(current_setting('crypto.admin_credit_deposit', true), '') = d.id::text;
  if public._is_house_address(d.from_address) and not admin_ok then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = psid, confirmed_at = coalesce(confirmed_at, now()), closed_reason = 'sender is a house wallet' where id = d.id;
    perform _audit(d.user_id, 'crypto_deposit_house_sender', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'from', d.from_address));
    return jsonb_build_object('status','UNMATCHED');
  end if;
  if cents < net.min_deposit_cents then
    update crypto_deposits set status = 'REJECTED', usd_cents = cents, price_snapshot_id = psid, confirmed_at = now(), closed_reason = 'below minimum deposit' where id = d.id;
    return jsonb_build_object('status','REJECTED');
  end if;
  if s.watch_only then
    update crypto_deposits set status = 'CONFIRMED', usd_cents = cents, price_snapshot_id = psid, confirmed_at = coalesce(confirmed_at, now()) where id = d.id;
    perform _audit(d.user_id, 'crypto_deposit_watch_only', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id));
    return jsonb_build_object('status','WATCH_ONLY','cents',cents);
  end if;
  if public._money_state() <> 'FINALIZED' then
    update crypto_deposits set status = 'CONFIRMED', usd_cents = cents, price_snapshot_id = psid, confirmed_at = coalesce(confirmed_at, now()) where id = d.id;
    return jsonb_build_object('status','LEDGER_NOT_READY','cents',cents);
  end if;
  key := 'deposit:' || d.chain_id || ':' || d.tx_hash || ':' || d.log_index;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, a.ledger_account_type, d.user_id, net.name || ' ' || a.asset_key || ' deposit ' || d.tx_hash) returning id into tx;
  perform _post(tx, _system_account('external_custody', a.ledger_asset, a.ledger_account_type), -cents);
  perform _post(tx, _user_account(d.user_id, 'user_available', a.ledger_asset, a.ledger_account_type), cents);
  update crypto_deposits set status = 'CREDITED', usd_cents = cents, price_snapshot_id = psid, ledger_tx_id = tx,
    confirmed_at = coalesce(confirmed_at, now()), credited_at = now() where id = d.id;
  perform _audit(d.user_id, case when admin_ok then 'crypto_deposit_admin_credited' else 'crypto_deposit_credited' end, null,
    jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id));
  return jsonb_build_object('status','CREDITED','cents',cents);
end $function$;

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
    insert into public.user_wallets (user_id, address, normalized_address, is_verified, is_primary, verified_at, last_seen_at)
      values (p_user, c.wallet_address, c.normalized_address, true, true, ts, ts)
    on conflict (user_id, normalized_address) do update set address = excluded.address, is_verified = true, is_primary = true,
      verified_at = coalesce(public.user_wallets.verified_at, excluded.verified_at), last_seen_at = excluded.last_seen_at, updated_at = ts;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_LINKED');
  end;
  return jsonb_build_object('ok', true, 'address', c.wallet_address, 'verified_at', ts);
end $function$;

revoke execute on function public._crypto_release(uuid,text,text), public.crypto_withdrawal_signed(uuid,text,bigint,text),
  public.crypto_withdrawal_liquidity_pending(uuid,text),
  public.crypto_withdrawal_failed(uuid,text), public.crypto_cancel_withdrawal(uuid,uuid), public.crypto_admin_review(uuid,uuid,boolean),
  public.crypto_request_withdrawal(uuid,bigint,text,bigint,uuid,boolean), public.crypto_credit_deposit(uuid,uuid),
  public.wallet_consume_and_verify(uuid,uuid,text) from public, anon, authenticated;

-- Retired chain-less overloads stay unreachable for every API role, including service_role (the
-- deny-by-default restore re-granted all functions to service_role). The request overload skips the
-- global daily limit.
revoke execute on function public.crypto_observe_deposit(text,text,integer,bigint,text,text,numeric),
  public.crypto_record_price(text,text,numeric,bigint,timestamp with time zone), public.crypto_quote_withdrawal(uuid,bigint),
  public.crypto_request_withdrawal(uuid,text,bigint,uuid,boolean), public.crypto_next_withdrawals()
  from public, anon, authenticated, service_role;
