create or replace function public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; d crypto_deposits; a chain_assets; ps crypto_price_snapshots; cents bigint; tx uuid; key text; psid uuid; admin_ok boolean;
begin
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
end $$;
revoke execute on function public.crypto_credit_deposit(uuid, uuid) from public, anon, authenticated;

DO $$ DECLARE r jsonb; s crypto_settings; before_bal bigint; after_bal bigint;
BEGIN
  select * into s from crypto_settings for update;
  select coalesce(sum(balance),0) into before_bal from wallet_accounts where owner_id = '0c9efda3-4bbe-40cf-beaf-d05edddadcd0' and kind = 'user_available' and account_type = 'real';
  update crypto_settings set watch_only = false;
  perform set_config('crypto.admin_credit_deposit', '1690a12b-c7ce-49ce-851f-c402fc0a2c7f', true);
  r := public.crypto_credit_deposit('1690a12b-c7ce-49ce-851f-c402fc0a2c7f', null);
  perform set_config('crypto.admin_credit_deposit', '', true);
  select coalesce(sum(balance),0) into after_bal from wallet_accounts where owner_id = '0c9efda3-4bbe-40cf-beaf-d05edddadcd0' and kind = 'user_available' and account_type = 'real';
  if r->>'status' <> 'CREDITED' or (r->>'cents')::bigint <> 200 or after_bal - before_bal <> 200 then
    raise exception 'ADMIN_CREDIT_CHECK_FAILED %', r;
  end if;
  perform _audit(null, 'crypto_watch_only_disabled', null, jsonb_build_object('reason','owner approved automatic deposit crediting'));
END $$;