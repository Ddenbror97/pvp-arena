-- Logged-out visitors can read visible chat. Sending stays authenticated-only.
grant select on public.game_chat_messages to anon;

drop policy if exists "chat read visible anon" on public.game_chat_messages;
create policy "chat read visible anon" on public.game_chat_messages
  for select to anon
  using (status = 'visible');

-- realtime-auth:begin
drop policy if exists "chat rooms receive anon" on realtime.messages;
create policy "chat rooms receive anon" on realtime.messages
  for select to anon
  using (
    realtime.topic() in ('chat:jackpot', 'chat:coinflip', 'chat:roulette')
    and realtime.messages.extension = 'broadcast'
  );
-- realtime-auth:end

-- A waiting coinflip refunds itself after 24 hours if nobody joins.
-- expires_at is immutable after insert, so games already open keep the
-- deadline they were created with. New games read this config value.
update public.coinflip_config set waiting_timeout_seconds = 86400;
alter table public.coinflip_config alter column waiting_timeout_seconds set default 86400;

-- A payout parked for liquidity must be signable again once the hot wallet is funded.
-- The previous liquidity function only rewrote last_error on APPROVED rows, so a
-- LIQUIDITY_PENDING retry died in crypto_withdrawal_signed with NOT_APPROVED.
create or replace function public.crypto_withdrawal_signed(p_id uuid, p_hash text, p_nonce bigint, p_raw text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  update crypto_withdrawals
    set status = 'SUBMITTING', tx_hash = lower(p_hash), nonce = p_nonce, signed_raw_tx = p_raw, attempts = attempts + 1
    where id = p_id and status in ('APPROVED', 'LIQUIDITY_PENDING');
  if not found then raise exception 'NOT_APPROVED'; end if;
end $$;

create or replace function public.crypto_withdrawal_liquidity_pending(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  update crypto_withdrawals
    set status = 'LIQUIDITY_PENDING', last_error = left(p_reason, 500)
    where id = p_id and status in ('APPROVED', 'LIQUIDITY_PENDING');
  if found then
    perform _crypto_incident('crypto_liquidity', 'crypto_liquidity:' || p_id, jsonb_build_object('withdrawal', p_id, 'reason', left(p_reason, 300)));
  end if;
end $$;

create or replace function public.crypto_withdrawal_failed(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare w crypto_withdrawals;
begin
  perform public._require_server_caller();
  select * into w from crypto_withdrawals where id = p_id for update;
  if w.status not in ('APPROVED', 'LIQUIDITY_PENDING', 'SUBMITTING', 'SUBMITTED') then return; end if;
  perform _crypto_release(w.id, 'RELEASED', left(p_reason, 500));
end $$;
