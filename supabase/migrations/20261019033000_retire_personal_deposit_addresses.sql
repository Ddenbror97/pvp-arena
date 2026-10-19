-- Personal deposit addresses are retired. The site does not have the key for
-- them, and a Base deposit is paid to the treasury wallet instead.
-- A $2 send can arrive a few cents short after the sender's network fee.
-- $1.95 still credits. The balance increase is the amount that arrived.

create or replace function public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid, p_block_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; d crypto_deposits; a chain_assets; ps crypto_price_snapshots;
  cents bigint; tx uuid; key text; psid uuid; admin_ok boolean; bhash text;
begin
  perform public._require_server_caller();
  if p_block_hash is not null and p_block_hash !~* '^0x[0-9a-f]{64}$' then raise exception 'BAD_BLOCK_HASH'; end if;
  bhash := case when p_block_hash is null then null else lower(p_block_hash) end;
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
    if ps is null or ps.price_micro_usd <= 0
       or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds)
       or ps.oracle_updated_at < now() - interval '1320 seconds' then
      return jsonb_build_object('status','AWAITING_VALUATION');
    end if;
    psid := ps.id;
    cents := floor(d.units * ps.price_micro_usd / power(10::numeric, a.decimals) / 10000);
  end if;
  if d.user_id is null then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = now(), closed_reason = 'sender is not exactly one verified wallet' where id = d.id;
    return jsonb_build_object('status','UNMATCHED');
  end if;
  admin_ok := coalesce(current_setting('crypto.admin_credit_deposit', true), '') = d.id::text;
  if public._is_house_address(d.from_address) and not admin_ok then
    update crypto_deposits set status = 'UNMATCHED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = coalesce(confirmed_at, now()), closed_reason = 'sender is a house wallet' where id = d.id;
    perform _audit(d.user_id, 'crypto_deposit_house_sender', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'from', d.from_address));
    return jsonb_build_object('status','UNMATCHED');
  end if;
  -- Five cents covers a network fee or a price tick on a $2 send. $1.94 still rejects.
  if cents + 5 < net.min_deposit_cents then
    update crypto_deposits set status = 'REJECTED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = now(), closed_reason = 'below minimum deposit' where id = d.id;
    return jsonb_build_object('status','REJECTED');
  end if;
  if s.watch_only then
    update crypto_deposits set status = 'CONFIRMED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = coalesce(confirmed_at, now()) where id = d.id;
    perform _audit(d.user_id, 'crypto_deposit_watch_only', null, jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id));
    return jsonb_build_object('status','WATCH_ONLY','cents',cents);
  end if;
  if public._money_state() <> 'FINALIZED' then
    update crypto_deposits set status = 'CONFIRMED', usd_cents = cents, price_snapshot_id = psid, block_hash = coalesce(bhash, block_hash),
      confirmed_at = coalesce(confirmed_at, now()) where id = d.id;
    return jsonb_build_object('status','LEDGER_NOT_READY','cents',cents);
  end if;
  key := 'deposit:' || d.chain_id || ':' || d.tx_hash || ':' || d.log_index;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, a.ledger_account_type, d.user_id, net.name || ' ' || a.asset_key || ' deposit ' || d.tx_hash) returning id into tx;
  perform _post(tx, _system_account('external_custody', a.ledger_asset, a.ledger_account_type), -cents);
  perform _post(tx, _user_account(d.user_id, 'user_available', a.ledger_asset, a.ledger_account_type), cents);
  update crypto_deposits set status = 'CREDITED', usd_cents = cents, price_snapshot_id = psid, ledger_tx_id = tx,
    block_hash = coalesce(bhash, block_hash), confirmed_at = coalesce(confirmed_at, now()), credited_at = now() where id = d.id;
  perform _audit(d.user_id, case when admin_ok then 'crypto_deposit_admin_credited' else 'crypto_deposit_credited' end, null,
    jsonb_build_object('deposit', d.id, 'cents', cents, 'asset', d.asset_key, 'chain', d.chain_id,
      'snapshot', psid, 'price_micro', ps.price_micro_usd, 'oracle_updated_at', ps.oracle_updated_at,
      'round', ps.feed_round_id, 'block_hash', bhash));
  return jsonb_build_object('status','CREDITED','cents',cents,'snapshot',psid);
end $$;

-- The USDC scan floor is a dust filter. $1.95 must reach the cent check above.
drop trigger if exists chain_assets_readonly on public.chain_assets;
update public.chain_assets
set min_deposit_units = 1950000
where chain_id = 8453 and asset_key = 'USDC' and min_deposit_units = 2000000;
create trigger chain_assets_readonly
  before update or delete on public.chain_assets
  for each row execute function public.crypto_allowlist_guard();

delete from public.crypto_deposit_addresses;
