-- Player activity lists enabled funding assets and omits the deposit treasury.
-- A disabled asset is absent here. Quote creation also rejects a disabled ETH row.

create or replace function public.crypto_my_activity(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deposits', coalesce((select jsonb_agg(x order by x.detected_at desc) from (
      select d.id, d.chain_id, d.asset_key, d.tx_hash, d.units::text as units, d.usd_cents, d.status, d.detected_at, d.credited_at, a.decimals
      from crypto_deposits d
      left join chain_assets a on a.chain_id = d.chain_id and a.asset_key = d.asset_key
      where d.user_id = p_user
      order by d.detected_at desc limit 20
    ) x), '[]'),
    'withdrawals', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select w.id, w.chain_id, w.asset_key, w.tx_hash, w.units::text as units, w.usd_cents, w.fee_usd_cents, w.status, w.review_required, w.created_at, w.confirmed_at, w.last_error, a.decimals
      from crypto_withdrawals w
      left join chain_assets a on a.chain_id = w.chain_id and a.asset_key = w.asset_key
      where w.user_id = p_user
      order by w.created_at desc limit 20
    ) x), '[]'),
    'settings', (select jsonb_build_object('deposits_enabled', crypto_system_enabled and deposits_enabled, 'withdrawals_enabled', crypto_system_enabled and withdrawals_enabled, 'min_deposit_cents', min_deposit_cents, 'min_withdrawal_cents', min_withdrawal_cents, 'daily_limit_cents', daily_limit_cents, 'fee_cents', withdrawal_fee_cents, 'auto_approve_cents', auto_approve_cents) from crypto_settings),
    'chains', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'chain_id', n.chain_id,
          'name', n.name,
          'network_mode', n.network_mode,
          'min_deposit_cents', n.min_deposit_cents,
          'min_withdrawal_cents', n.min_withdrawal_cents,
          'credit_confirmations', n.credit_confirmations,
          'assets', coalesce((
            select jsonb_agg(jsonb_build_object(
              'asset_key', a.asset_key,
              'display_name', a.display_name,
              'decimals', a.decimals,
              'settlement_kind', a.settlement_kind,
              'payout_ready', case
                when a.settlement_kind = 'native' and n.chain_id = 8453 then exists (
                  select 1 from crypto_chain_inventory i
                  where i.chain_id = n.chain_id
                    and i.observed_at > now() - interval '10 minutes'
                    and i.payout_wei >= coalesce((
                      select sum(w.units) from crypto_withdrawals w
                      where w.chain_id = n.chain_id
                        and w.asset_key = a.asset_key
                        and w.status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED')
                    ), 0) + 50000000000000
                )
                else true
              end
            ) order by a.asset_key)
            from chain_assets a
            where a.chain_id = n.chain_id and a.is_enabled
          ), '[]'::jsonb)
        )
        order by n.chain_id
      )
      from chain_networks n
      where n.is_enabled
    ), '[]'::jsonb),
    'deposit_addresses', coalesce((select jsonb_agg(jsonb_build_object('chain_id', da.chain_id, 'address', da.address)) from crypto_deposit_addresses da where da.user_id = p_user), '[]'),
    'wallet', (select normalized_address from user_wallets where user_id = p_user and is_verified order by is_primary desc limit 1)
  ) $$;

create or replace function public.crypto_quote_withdrawal(p_user uuid, p_chain bigint, p_usd_cents bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; ps crypto_price_snapshots; wei numeric; q crypto_withdrawal_quotes;
begin
  perform public._require_server_caller();
  select * into s from crypto_settings;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  if not exists (
    select 1 from chain_assets where chain_id = p_chain and asset_key = 'ETH' and is_enabled and settlement_kind = 'native'
  ) then
    raise exception 'ASSET_NOT_ALLOWLISTED';
  end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  select * into ps from crypto_price_snapshots
    where chain_id = p_chain and asset_key = 'ETH'
    order by observed_at desc limit 1;
  if ps is null or ps.price_micro_usd <= 0
     or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds)
     or ps.oracle_updated_at < now() - interval '1320 seconds' then
    raise exception 'PRICE_STALE';
  end if;
  wei := floor(p_usd_cents::numeric * 10000 * power(10::numeric, 18) / ps.price_micro_usd);
  insert into crypto_withdrawal_quotes (user_id, chain_id, asset_key, usd_cents, units, price_snapshot_id, price_micro_usd, expires_at)
    values (p_user, p_chain, 'ETH', p_usd_cents, wei, ps.id, ps.price_micro_usd, now() + make_interval(secs => s.quote_ttl_seconds))
    returning * into q;
  return jsonb_build_object('quote_id', q.id, 'usd_cents', q.usd_cents, 'wei', q.units::text,
    'price_micro_usd', q.price_micro_usd, 'expires_at', q.expires_at, 'snapshot', ps.id);
end $$;
