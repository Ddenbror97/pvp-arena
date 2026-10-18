-- Read-only books for the automatic Bitcoin float. Service role only.

create or replace function public.btc_float_books()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  owed bigint;
  pending_btc bigint;
  demand_btc bigint;
  other_cents bigint;
  recent jsonb;
begin
  perform public._require_server_caller();

  select coalesce(sum(w.balance) filter (
    where w.kind = 'game_escrow'
      or (w.kind in ('user_available', 'user_locked') and not coalesce(p.active, false))
  ), 0)
  into owed
  from public.wallet_accounts w
  left join public.partners p on p.user_id = w.owner_id
  where w.account_type = 'real'
    and w.asset = 'USD'
    and w.kind in ('user_available', 'user_locked', 'game_escrow');

  select coalesce(sum(usd_cents), 0)
  into pending_btc
  from public.btcpay_payouts
  where status in ('HOLD', 'AWAITING_APPROVAL', 'QUEUED');

  select coalesce(sum(usd_cents), 0)
  into demand_btc
  from public.btcpay_payouts
  where status = 'COMPLETED'
    and coalesce(closed_at, updated_at) > now() - interval '24 hours';

  select coalesce(sum(
    case
      when st.available_units is null or px.price is null then 0
      else floor(st.available_units * px.price / power(10::numeric, t.decimals) / 10000)::bigint
    end
  ), 0)
  into other_cents
  from public.treasury_assets t
  cross join lateral public._treasury_state(t.network, t.asset_key) st
  cross join lateral (select public._treasury_price(t.network, t.asset_key) as price) px
  where t.asset_key in ('ETH', 'USDC')
    and exists (
      select 1 from public.chain_networks n
      where 'eip155:' || n.chain_id = t.network and n.is_enabled
    );

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb)
  into recent
  from (
    select created_at,
      jsonb_build_object(
        'created_at', created_at,
        'usd_cents', usd_cents,
        'sats', sats::text,
        'status', status,
        'txid', txid
      ) as row_data
    from public.btc_wallet_transfers
    order by created_at desc
    limit 8
  ) listed;

  return jsonb_build_object(
    'owed_cents', owed,
    'pending_btc_cents', pending_btc,
    'demand_btc_cents', demand_btc,
    'other_cover_cents', other_cents,
    'transfers', recent
  );
end $$;

revoke all on function public.btc_float_books() from public, anon, authenticated;
grant execute on function public.btc_float_books() to service_role;
