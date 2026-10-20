-- Remove promotional partner credits without touching deposited funds.
-- Already applied in production as schema_migrations version 20261017020000.
-- This file exists so a fresh database matches production. Do not apply it again there.
-- A retry with the same request id returns the first result. Real deposits are protected
-- by the withdraw-basis bucket: the removal cannot eat eligible deposited balance.

create table if not exists public.partner_credit_removals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.partners (user_id),
  amount_cents bigint not null check (amount_cents > 0),
  note text check (note is null or char_length(note) <= 200),
  admin_id uuid not null references public.profiles (id),
  request_id uuid not null unique,
  ledger_tx_id uuid not null unique references public.ledger_transactions (id),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists partner_credit_removals_user_idx
  on public.partner_credit_removals (user_id, created_at desc);
alter table public.partner_credit_removals enable row level security;
revoke all on public.partner_credit_removals from public, anon, authenticated;
grant all on public.partner_credit_removals to service_role;
drop trigger if exists no_mutation on public.partner_credit_removals;
create trigger no_mutation before update or delete on public.partner_credit_removals
  for each row execute function public._immutable();
drop trigger if exists no_truncate on public.partner_credit_removals;
create trigger no_truncate before truncate on public.partner_credit_removals
  for each statement execute function public._no_truncate();

create or replace function public.partner_admin_remove_credit(
  p_user uuid, p_amount_cents bigint, p_note text, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._assert_admin();
  prior public.partner_credit_removals;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  tx uuid;
  removal uuid := gen_random_uuid();
  v_asset text;
  v_type text;
  v_bank public.account_kind;
  bank uuid;
  v_avail bigint;
  v_eligible bigint := 0;
  v_left bigint;
begin
  if p_user is null or p_request_id is null then raise exception 'BAD_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtext('partner_clawback:' || p_request_id::text));
  select * into prior from public.partner_credit_removals where request_id = p_request_id;
  if prior.id is not null then
    if prior.user_id <> p_user or prior.amount_cents <> p_amount_cents then
      raise exception 'REQUEST_REUSED';
    end if;
    return jsonb_build_object('ok', true, 'id', prior.id, 'amount_cents', prior.amount_cents, 'duplicate', true);
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'AMOUNT_REQUIRED'; end if;
  if v_note is not null and char_length(v_note) > 200 then raise exception 'BAD_NOTE'; end if;
  perform 1 from public.partners where user_id = p_user for update;
  if not found then raise exception 'NOT_PARTNER'; end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (
       select 1 from public.wallet_accounts
       where owner_id = p_user and kind = 'user_available' and asset = 'USD' and account_type = 'real'
     ) then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (
    select 1 from public.wallet_accounts
    where owner_id = p_user and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit'
  ) then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  perform public._coinflip_lock_wallets(array[p_user], v_asset, v_type);
  bank := public._system_account(v_bank, v_asset, v_type);
  perform 1 from public.wallet_accounts where id = bank for update;
  select balance into v_avail from public.wallet_accounts
    where owner_id = p_user and kind = 'user_available' and asset = v_asset and account_type = v_type;
  select
    coalesce((select sum(amount_cents) from public.partner_topups where user_id = p_user), 0)
    - coalesce((select sum(amount_cents) from public.partner_credit_removals where user_id = p_user), 0)
    into v_left;
  if p_amount_cents > v_left then raise exception 'CREDITS_EXCEEDED'; end if;
  if p_amount_cents > coalesce(v_avail, 0) then raise exception 'INSUFFICIENT_AVAILABLE'; end if;
  if v_type = 'real' then
    select greatest(coalesce(eligible, 0), 0) into v_eligible
      from public.withdraw_basis_bucket where user_id = p_user;
    v_eligible := coalesce(v_eligible, 0);
  end if;
  if p_amount_cents > coalesce(v_avail, 0) - v_eligible then
    raise exception 'DEPOSITS_PROTECTED';
  end if;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('partner_credit', 'partner:clawback:' || p_request_id::text, v_type, p_user, 'Partner credit removed')
  returning id into tx;
  perform public._post(tx, bank, p_amount_cents);
  perform public._post(tx, public._user_account(p_user, 'user_available', v_asset, v_type), -p_amount_cents);
  insert into public.partner_credit_removals (id, user_id, amount_cents, note, admin_id, request_id, ledger_tx_id)
  values (removal, p_user, p_amount_cents, v_note, uid, p_request_id, tx);
  perform public._audit(uid, 'partner_credit_removed', null, jsonb_build_object(
    'user', p_user, 'cents', p_amount_cents, 'tx', tx, 'removal', removal
  ));
  return jsonb_build_object('ok', true, 'id', removal, 'amount_cents', p_amount_cents, 'duplicate', false);
end $$;

revoke all on function public.partner_admin_remove_credit(uuid, bigint, text, uuid) from public, anon;
grant execute on function public.partner_admin_remove_credit(uuid, bigint, text, uuid) to authenticated;
