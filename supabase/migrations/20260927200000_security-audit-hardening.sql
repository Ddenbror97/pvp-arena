-- Security audit hardening.
-- 1. Every server-only money entry point asserts a server caller in its own body, so a
--    future grant mistake cannot expose it to browser roles.
-- 2. Chat readers get only the columns the client renders; moderation metadata stays private.

create or replace function public.crypto_credit_deposit(p_id uuid, p_price_snapshot uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  return public.crypto_credit_deposit(p_id, p_price_snapshot, null::text);
end $$;

create or replace function public.crypto_cancel_withdrawal(p_user uuid, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w crypto_withdrawals;
begin
  perform public._require_server_caller();
  select * into w from crypto_withdrawals where id = p_id and user_id = p_user for update;
  if w is null then raise exception 'NOT_FOUND'; end if;
  if w.status not in ('PENDING', 'APPROVED', 'LIQUIDITY_PENDING') then raise exception 'CANNOT_CANCEL'; end if;
  perform _crypto_release(w.id, 'RELEASED', 'cancelled by user');
  return jsonb_build_object('status', 'RELEASED');
end;
$$;

create or replace function public.crypto_withdrawal_broadcast(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  update crypto_withdrawals set status = 'SUBMITTED', submitted_at = coalesce(submitted_at, now()) where id = p_id and status = 'SUBMITTING';
end $$;

create or replace function public.crypto_withdrawal_confirmed(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare w crypto_withdrawals; a chain_assets; tx uuid;
begin
  perform public._require_server_caller();
  select * into w from crypto_withdrawals where id = p_id for update;
  if not found or w.status not in ('SUBMITTING','SUBMITTED') then return; end if;
  select * into a from chain_assets where chain_id = w.chain_id and asset_key = w.asset_key;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'withdrawal:' || w.id || ':settle', a.ledger_account_type, w.user_id, 'Withdrawal sent ' || w.tx_hash) returning id into tx;
  perform _post(tx, _user_account(w.user_id, 'user_locked', a.ledger_asset, a.ledger_account_type), -(w.usd_cents + w.fee_usd_cents));
  perform _post(tx, _system_account('external_custody', a.ledger_asset, a.ledger_account_type), w.usd_cents);
  if w.fee_usd_cents > 0 then perform _post(tx, _system_account('house_revenue', a.ledger_asset, a.ledger_account_type), w.fee_usd_cents); end if;
  update crypto_withdrawals set status = 'CONFIRMED', settle_ledger_tx_id = tx, confirmed_at = now(), closed_at = now() where id = w.id;
  perform _audit(w.user_id, 'crypto_withdrawal_confirmed', null, jsonb_build_object('withdrawal', w.id, 'tx', w.tx_hash));
end $$;

create or replace function public.crypto_withdrawal_error(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  update crypto_withdrawals set last_error = left(p_reason, 500) where id = p_id;
end $$;

create or replace function public.crypto_admin_set_switches(p_admin uuid, p_system boolean, p_deposits boolean, p_withdrawals boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  if not has_role(p_admin, 'admin') then raise exception 'FORBIDDEN'; end if;
  update crypto_settings set crypto_system_enabled = p_system, deposits_enabled = p_deposits, withdrawals_enabled = p_withdrawals, updated_at = now();
  perform _audit(p_admin, 'crypto_switches', null, jsonb_build_object('system', p_system, 'deposits', p_deposits, 'withdrawals', p_withdrawals));
  return jsonb_build_object('ok', true);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.crypto_credit_deposit(uuid, uuid)', 'public.crypto_cancel_withdrawal(uuid, uuid)',
    'public.crypto_withdrawal_broadcast(uuid)', 'public.crypto_withdrawal_confirmed(uuid)',
    'public.crypto_withdrawal_error(uuid, text)', 'public.crypto_admin_set_switches(uuid, boolean, boolean, boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

revoke select on public.game_chat_messages from anon, authenticated;
grant select (id, game_type, user_id, message, status, created_at) on public.game_chat_messages to anon, authenticated;
