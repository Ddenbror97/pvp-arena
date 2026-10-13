-- Automatic payout-wallet refills are server-only. An admin click still requires an admin.

alter table public.btc_wallet_transfers alter column admin_id drop not null;

create or replace function public.btc_wallet_transfer_begin(
  p_admin uuid,
  p_usd_cents bigint,
  p_sats bigint,
  p_destination text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  transfer_id uuid;
  used bigint;
begin
  perform public._require_server_caller();
  if p_admin is not null and not public.has_role(p_admin, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_usd_cents < 1000 or p_usd_cents > 100000 then raise exception 'BAD_AMOUNT'; end if;
  if p_sats <= 0 then raise exception 'BAD_AMOUNT'; end if;
  if p_destination !~* '^bc1' then raise exception 'ADDRESS'; end if;

  update public.btc_wallet_transfers
    set status = 'FAILED'
    where status = 'SENDING' and created_at < now() - interval '15 minutes';

  select coalesce(sum(usd_cents), 0) into used
    from public.btc_wallet_transfers
    where created_at > now() - interval '24 hours'
      and status in ('SENDING', 'SENT');
  if used + p_usd_cents > 200000 then raise exception 'DAILY_SWEEP_LIMIT'; end if;

  begin
    insert into public.btc_wallet_transfers (admin_id, usd_cents, sats, destination, status)
      values (p_admin, p_usd_cents, p_sats, p_destination, 'SENDING')
      returning btc_wallet_transfers.id into transfer_id;
  exception when unique_violation then
    raise exception 'TRANSFER_IN_PROGRESS';
  end;
  perform public._audit(p_admin, 'btc_wallet_transfer_begin', null, jsonb_build_object(
    'id', transfer_id, 'cents', p_usd_cents, 'sats', p_sats, 'auto', p_admin is null
  ));
  return transfer_id;
end $$;

create or replace function public.btc_wallet_transfer_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  swept bigint;
  cooling boolean;
begin
  perform public._require_server_caller();
  select coalesce(sum(sats), 0) into swept
    from public.btc_wallet_transfers
    where status = 'SENT';
  cooling := exists (
    select 1 from public.btc_wallet_transfers
    where status in ('SENDING', 'SENT')
      and created_at > now() - interval '20 minutes'
  );
  return jsonb_build_object('swept_sats', swept, 'cooling_down', cooling);
end $$;

revoke all on function public.btc_wallet_transfer_begin(uuid, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.btc_wallet_transfer_state() from public, anon, authenticated;
grant execute on function public.btc_wallet_transfer_begin(uuid, bigint, bigint, text) to service_role;
grant execute on function public.btc_wallet_transfer_state() to service_role;
