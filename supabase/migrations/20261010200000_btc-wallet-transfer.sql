-- Admin top-ups from the Bitcoin deposit wallet to the payout wallet.
-- One in-flight row blocks a second broadcast. A stuck row expires after 15 minutes.

create table if not exists public.btc_wallet_transfers (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  usd_cents bigint not null check (usd_cents >= 1000 and usd_cents <= 100000),
  sats bigint not null check (sats > 0),
  destination text not null,
  txid text,
  status text not null check (status in ('SENDING', 'SENT', 'FAILED')),
  created_at timestamptz not null default now()
);

alter table public.btc_wallet_transfers enable row level security;
revoke all on public.btc_wallet_transfers from public, anon, authenticated;

create unique index if not exists btc_wallet_transfers_one_sending
  on public.btc_wallet_transfers ((true))
  where status = 'SENDING';

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
  if not public.has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
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
    'id', transfer_id, 'cents', p_usd_cents, 'sats', p_sats
  ));
  return transfer_id;
end $$;

create or replace function public.btc_wallet_transfer_finish(
  p_id uuid,
  p_txid text,
  p_ok boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_server_caller();
  if p_ok then
    if p_txid is null or p_txid !~ '^[0-9a-f]{64}$' then raise exception 'TXID'; end if;
    update public.btc_wallet_transfers
      set status = 'SENT', txid = lower(p_txid)
      where id = p_id and status = 'SENDING';
  else
    update public.btc_wallet_transfers
      set status = 'FAILED'
      where id = p_id and status = 'SENDING';
  end if;
end $$;

revoke all on function public.btc_wallet_transfer_begin(uuid, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.btc_wallet_transfer_finish(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.btc_wallet_transfer_begin(uuid, bigint, bigint, text) to service_role;
grant execute on function public.btc_wallet_transfer_finish(uuid, text, boolean) to service_role;
