-- Player-facing Bitcoin transaction ids. The function stays STABLE and still
-- reads withdraw room through _withdraw_basis_peek, so wallet polls remain
-- read-only. Credit and payout settlement are unchanged.

create or replace function public.crypto_my_activity(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with basis as (select public._withdraw_basis_peek(p_user) as j)
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
    'bitcoin', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select b.id,
        case when b.status = 'CREDITED' and b.credited_cents > 0 then b.credited_cents else b.usd_cents end as usd_cents,
        b.status, b.created_at, b.btc_due, b.required_confirmations,
        (
          select o.txid
          from btcpay_deposit_outputs o
          where o.invoice_id = b.id
            and o.status in ('Settled', 'Processing')
          order by o.created_at desc
          limit 1
        ) as txid
      from btcpay_invoices b
      where b.user_id = p_user
      order by b.created_at desc limit 20
    ) x), '[]'),
    'bitcoin_payouts', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select p.id, p.usd_cents, p.status, p.created_at, p.address, p.payout_txid
      from btcpay_payouts p
      where p.user_id = p_user
      order by p.created_at desc limit 20
    ) x), '[]'),
    'card', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.usd_cents, c.status, c.created_at
      from nowpayments_invoices c
      where c.user_id = p_user
      order by c.created_at desc limit 20
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
              'payout_ready', public.treasury_can_fund_cents('eip155:' || n.chain_id, a.asset_key, n.min_withdrawal_cents)
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
    'deposit_addresses', coalesce((select jsonb_agg(jsonb_build_object('chain_id', da.chain_id, 'address', da.address, 'derivation_version', da.derivation_version) order by da.derivation_version desc, da.created_at) from crypto_deposit_addresses da where da.user_id = p_user), '[]'),
    'withdraw', (
      select jsonb_build_object(
        'room_cents', coalesce((basis.j->>'room')::bigint, 0),
        'bonus_cents', coalesce((basis.j->>'bonus')::bigint, 0),
        'deposit_cents', coalesce((basis.j->>'deposits')::bigint, 0),
        'deposit_floor_cents', (select min_withdrawal_cents from crypto_settings limit 1),
        'wagered_cents', coalesce((basis.j->>'wagered')::bigint, 0),
        'wager_required_cents', coalesce((basis.j->>'wager_required')::bigint, 0)
      )
      from basis
    ),
    'wallet', (select normalized_address from user_wallets where user_id = p_user and is_verified order by is_primary desc limit 1)
  )
  from basis
$$;
