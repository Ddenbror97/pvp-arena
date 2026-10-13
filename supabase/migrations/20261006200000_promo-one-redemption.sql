-- One successful promo redemption per account, and one per client IP, for the
-- life of that account and address. Failed attempts stay in promo_claim_attempts
-- and do not take a slot. Claim rows are the redemption record; deleting one is
-- blocked so a balance reversal does not reopen eligibility.
--
-- The IP is Cloudflare's CF-Connecting-IP as PostgREST exposes it on
-- request.headers. That header is set by the edge in front of the Supabase API.
-- X-Forwarded-For and X-Real-IP are ignored. A missing or malformed address
-- rejects the claim and does not consume eligibility.
--
-- Shared NAT, carrier-grade NAT, VPNs, and household networks share one public
-- address, so the IP rule will reject a later account from that network.
-- client_ip is stored in the clear on the claim row because the unique index
-- needs the address itself. Audit rows for a rejected address also store it.
-- Those tables are not granted to the browser roles.

do $$
begin
  if exists (
    select 1 from public.promo_claims
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'PROMO_DUPLICATE_ACCOUNTS'
      using hint = 'More than one successful promo claim exists for an account. Keep the ledger history and resolve the rows before adding the unique account index.';
  end if;
end $$;

alter table public.promo_claims add column if not exists client_ip inet;

create unique index if not exists promo_claims_one_account
  on public.promo_claims (user_id);

create unique index if not exists promo_claims_one_ip
  on public.promo_claims (client_ip)
  where client_ip is not null;

create or replace function public._normalize_inet(p text)
returns inet
language plpgsql
immutable
set search_path = public
as $$
declare
  t text := btrim(p);
  v inet;
  delta bigint;
begin
  if t is null or t = ''
     or position(',' in t) > 0
     or position('/' in t) > 0
     or position('%' in t) > 0
     or position('[' in t) > 0
     or position(']' in t) > 0
     or t ~ '[[:space:]]' then
    return null;
  end if;
  begin
    v := t::inet;
  exception
    when invalid_text_representation then
      return null;
  end;
  if family(v) = 4 and masklen(v) <> 32 then
    return null;
  end if;
  if family(v) = 6 and masklen(v) <> 128 then
    return null;
  end if;
  -- One identity for an IPv4 address and its IPv4-mapped IPv6 form.
  if family(v) = 6
     and v >= inet '::ffff:0.0.0.0'
     and v <= inet '::ffff:255.255.255.255' then
    delta := v - inet '::ffff:0.0.0.0';
    return (
      ((delta >> 24) & 255)::int::text || '.' ||
      ((delta >> 16) & 255)::int::text || '.' ||
      ((delta >> 8) & 255)::int::text || '.' ||
      (delta & 255)::int::text
    )::inet;
  end if;
  return v;
end $$;
revoke all on function public._normalize_inet(text) from public, anon, authenticated;

-- Trusted address for this request. Test sessions may set test.client_ip.
-- PostgREST does not set test.uid, so that fallback is not available to the API.
create or replace function public._promo_client_ip()
returns inet
language plpgsql
stable
set search_path = public
as $$
declare
  raw text;
  headers jsonb := '{}'::jsonb;
begin
  begin
    raw := nullif(btrim(current_setting('request.headers', true)), '');
    if raw is not null then
      headers := raw::jsonb;
    end if;
  exception
    when others then
      headers := '{}'::jsonb;
  end;
  if headers ? 'cf-connecting-ip' then
    return public._normalize_inet(headers->>'cf-connecting-ip');
  end if;
  if headers ? 'CF-Connecting-IP' then
    return public._normalize_inet(headers->>'CF-Connecting-IP');
  end if;
  if nullif(btrim(current_setting('test.uid', true)), '') is not null then
    return public._normalize_inet(current_setting('test.client_ip', true));
  end if;
  return null;
end $$;
revoke all on function public._promo_client_ip() from public, anon, authenticated;

create or replace function public.promo_claim_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.client_ip is not null then
      new.client_ip := public._normalize_inet(host(new.client_ip));
    end if;
    if new.client_ip is null then
      raise exception 'IP_REQUIRED';
    end if;
    if new.status <> 'CLAIMED' or new.qualifying_wager_cents <> 0 or new.completed_at is not null then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    if new.required_wager_cents is distinct from new.reward_cents then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'IMMUTABLE';
  end if;
  if new.promo_code_id is distinct from old.promo_code_id
     or new.user_id is distinct from old.user_id
     or new.reward_cents is distinct from old.reward_cents
     or new.required_wager_cents is distinct from old.required_wager_cents
     or new.ledger_tx_id is distinct from old.ledger_tx_id
     or new.claimed_at is distinct from old.claimed_at
     or new.created_at is distinct from old.created_at
     or new.client_ip is distinct from old.client_ip then
    raise exception 'IMMUTABLE';
  end if;
  if new.qualifying_wager_cents < old.qualifying_wager_cents then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if old.status = 'COMPLETED' and (new.status is distinct from 'COMPLETED' or new.qualifying_wager_cents is distinct from old.qualifying_wager_cents) then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if (old.status, new.status) not in (
    ('CLAIMED', 'CLAIMED'),
    ('CLAIMED', 'WAGERING'),
    ('CLAIMED', 'COMPLETED'),
    ('WAGERING', 'WAGERING'),
    ('WAGERING', 'COMPLETED'),
    ('COMPLETED', 'COMPLETED')
  ) then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if new.status = 'CLAIMED' and new.qualifying_wager_cents <> 0 then raise exception 'ILLEGAL_TRANSITION'; end if;
  if new.status = 'WAGERING' and (new.qualifying_wager_cents <= 0 or new.qualifying_wager_cents >= new.required_wager_cents or new.completed_at is not null) then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if new.status = 'COMPLETED' and new.qualifying_wager_cents <> new.required_wager_cents then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if new.status = 'COMPLETED' and new.completed_at is null then
    new.completed_at := clock_timestamp();
  end if;
  if new.status <> 'COMPLETED' and new.completed_at is not null then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists promo_claim_guard on public.promo_claims;
create trigger promo_claim_guard
  before insert or update or delete on public.promo_claims
  for each row execute function public.promo_claim_guard();

create or replace function public.promo_claim(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  canonical text;
  promo public.promo_codes;
  claim_id uuid := gen_random_uuid();
  tx uuid;
  key text;
  v_asset text;
  v_type text;
  v_bank public.account_kind;
  bank uuid;
  attempts int;
  v_ip inet;
  cname text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if not exists (select 1 from public.profiles where id = uid) then raise exception 'AUTH_REQUIRED'; end if;
  -- Account first, then IP, so two claims never deadlock on the opposite order.
  perform pg_advisory_xact_lock(hashtext('promo_claim:' || uid::text));
  insert into public.promo_claim_attempts (user_id) values (uid);
  select count(*) into attempts from public.promo_claim_attempts
  where user_id = uid and created_at > clock_timestamp() - interval '10 minutes';
  if attempts > 5 then
    perform public._audit(uid, 'promo_claim_rate_limited', null, '{}'::jsonb);
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  v_ip := public._promo_client_ip();
  if v_ip is null then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('reason', 'ip_unavailable'));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  perform pg_advisory_xact_lock(hashtext('promo_ip:' || host(v_ip)));
  canonical := public._promo_code(p_code);
  if canonical is null then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  select * into promo from public.promo_codes where promo_codes.code = canonical for update;
  if promo.id is null then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if promo.partner_user_id is not null
     and (promo.partner_user_id = uid or not public._is_active_partner(promo.partner_user_id)) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'partner_code'));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if not promo.active
     or (promo.expires_at is not null and promo.expires_at <= clock_timestamp())
     or promo.claim_count >= promo.max_claims then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if exists (select 1 from public.promo_claims c where c.user_id = uid) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'PROMO_ALREADY_REDEEMED'));
    return jsonb_build_object('ok', false, 'reason', 'PROMO_ALREADY_REDEEMED');
  end if;
  if exists (select 1 from public.promo_claims c where c.client_ip = v_ip) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'PROMO_IP_ALREADY_REDEEMED', 'ip', host(v_ip)));
    return jsonb_build_object('ok', false, 'reason', 'PROMO_IP_ALREADY_REDEEMED');
  end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  if v_bank = 'house_bankroll' then
    bank := public._system_account(v_bank, v_asset, v_type);
    perform 1 from public.wallet_accounts where id = bank for update;
  end if;
  key := 'promo:claim:' || claim_id::text;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('promo_reward', key, v_type, uid, 'Promo reward')
  returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -promo.reward_cents);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), promo.reward_cents);
  insert into public.promo_claims (id, promo_code_id, user_id, reward_cents, required_wager_cents, ledger_tx_id, client_ip)
  values (claim_id, promo.id, uid, promo.reward_cents, promo.reward_cents, tx, v_ip);
  update public.promo_codes set claim_count = claim_count + 1 where id = promo.id and claim_count < max_claims;
  if not found then raise exception 'PROMO_EXHAUSTED'; end if;
  perform public._audit(uid, 'promo_claimed', null, jsonb_build_object(
    'code', canonical, 'cents', promo.reward_cents, 'tx', tx, 'claim', claim_id, 'ip', host(v_ip)
  ));
  return jsonb_build_object('ok', true, 'reward_cents', promo.reward_cents, 'required_wager_cents', promo.reward_cents);
exception
  when unique_violation then
    get stacked diagnostics cname = CONSTRAINT_NAME;
    if cname = 'promo_claims_one_ip'
       or exists (select 1 from public.promo_claims c where c.client_ip = v_ip and c.user_id is distinct from uid) then
      return jsonb_build_object('ok', false, 'reason', 'PROMO_IP_ALREADY_REDEEMED');
    end if;
    if cname in ('promo_claims_one_account', 'promo_claims_promo_code_id_user_id_key')
       or exists (select 1 from public.promo_claims c where c.user_id = uid) then
      return jsonb_build_object('ok', false, 'reason', 'PROMO_ALREADY_REDEEMED');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
end $$;
revoke all on function public.promo_claim(text) from public, anon;
grant execute on function public.promo_claim(text) to authenticated;
