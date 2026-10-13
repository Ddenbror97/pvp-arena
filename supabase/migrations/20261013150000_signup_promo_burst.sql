-- A new address was a new allowance: signup and promo limits were counted
-- per IP only. Farms that rotate addresses now also hit a site-wide signup
-- pace and a per-code claim pace. The one-address rules stay.

create index if not exists signup_verifications_created_idx
  on public.signup_verifications (created_at desc);

create or replace function public._signup_slot_reason(p_ip text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_ip is null or p_ip !~ '^[0-9a-f]{64}$' then
    return 'IP_REQUIRED';
  end if;
  if exists (
    select 1 from public.signup_verifications
    where ip_hash = p_ip and created_at > clock_timestamp() - interval '1 hour'
  ) then
    return 'IP_LIMIT';
  end if;
  if (
    select count(*) from public.signup_verifications
    where created_at > clock_timestamp() - interval '10 minutes'
  ) >= 4 then
    return 'BUSY';
  end if;
  return null;
end $$;

revoke all on function public._signup_slot_reason(text) from public, anon, authenticated;
grant execute on function public._signup_slot_reason(text) to service_role;

create or replace function public.signup_verified_preview(p_challenge uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ip text;
  v_purpose public.otp_purpose;
  v_reason text;
begin
  select ip_hash, purpose into v_ip, v_purpose
  from public.email_otp_challenges
  where id = p_challenge;
  if v_purpose is distinct from 'SIGNUP_EMAIL_VERIFICATION' then
    return jsonb_build_object('ok', false, 'reason', 'NOT_SIGNUP');
  end if;
  v_reason := public._signup_slot_reason(v_ip);
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.signup_verified_preview(uuid) from public, anon, authenticated;
grant execute on function public.signup_verified_preview(uuid) to service_role;

create or replace function public.signup_verified_claim(p_challenge uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text;
  v_purpose public.otp_purpose;
  v_reason text;
begin
  select ip_hash, purpose into v_ip, v_purpose
  from public.email_otp_challenges
  where id = p_challenge and status = 'CONSUMED';
  if v_purpose is distinct from 'SIGNUP_EMAIL_VERIFICATION' then
    return jsonb_build_object('ok', false, 'reason', 'NOT_SIGNUP');
  end if;
  perform pg_advisory_xact_lock(hashtext('signup-verified-global'));
  if v_ip is not null then
    perform pg_advisory_xact_lock(hashtext('signup-verified:' || v_ip));
  end if;
  v_reason := public._signup_slot_reason(v_ip);
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;
  insert into public.signup_verifications (ip_hash) values (v_ip);
  delete from public.signup_verifications
  where created_at < clock_timestamp() - interval '2 days';
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.signup_verified_claim(uuid) from public, anon, authenticated;
grant execute on function public.signup_verified_claim(uuid) to service_role;

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
  linked uuid;
  recent_claims int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if not exists (select 1 from public.profiles where id = uid) then raise exception 'AUTH_REQUIRED'; end if;
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
  if exists (select 1 from public.promo_claims c where c.user_id = uid)
     or exists (
       select 1 from public.ledger_transactions t
       where t.user_id = uid and t.kind = 'promo_reward'
     ) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'PROMO_ALREADY_REDEEMED'));
    return jsonb_build_object('ok', false, 'reason', 'PROMO_ALREADY_REDEEMED');
  end if;
  if exists (select 1 from public.promo_claims c where c.client_ip = v_ip) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'PROMO_IP_ALREADY_REDEEMED', 'ip', host(v_ip)));
    return jsonb_build_object('ok', false, 'reason', 'PROMO_IP_ALREADY_REDEEMED');
  end if;
  select count(*) into recent_claims from public.promo_claims c
  where c.promo_code_id = promo.id
    and c.claimed_at > clock_timestamp() - interval '10 minutes';
  if recent_claims >= 3 then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'PROMO_BURST'));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  select count(*) into recent_claims from public.promo_claims c
  where c.promo_code_id = promo.id
    and c.claimed_at > clock_timestamp() - interval '1 hour';
  if recent_claims >= 8 then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'PROMO_BURST'));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
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
  values ('promo_reward', key, v_type, uid, 'Promo ' || canonical)
  returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -promo.reward_cents);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), promo.reward_cents);
  insert into public.promo_claims (id, promo_code_id, user_id, reward_cents, required_wager_cents, ledger_tx_id, client_ip)
  values (claim_id, promo.id, uid, promo.reward_cents, promo.reward_cents, tx, v_ip);
  update public.promo_codes set claim_count = claim_count + 1 where id = promo.id and claim_count < max_claims;
  if not found then raise exception 'PROMO_EXHAUSTED'; end if;
  if promo.partner_user_id is not null and not public._is_active_partner(uid) then
    insert into public.partner_referrals (user_id, partner_user_id, source, promo_code_id, promo_claim_id)
    values (uid, promo.partner_user_id, 'promo', promo.id, claim_id)
    on conflict (user_id) do nothing
    returning user_id into linked;
    if linked is not null then
      perform public._audit(uid, 'partner_referral_attributed', null, jsonb_build_object(
        'partner', promo.partner_user_id, 'code', canonical, 'source', 'promo'
      ));
    end if;
  end if;
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
       or exists (select 1 from public.promo_claims c where c.user_id = uid)
       or exists (
         select 1 from public.ledger_transactions t
         where t.user_id = uid and t.kind = 'promo_reward'
       ) then
      return jsonb_build_object('ok', false, 'reason', 'PROMO_ALREADY_REDEEMED');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
end $$;

revoke all on function public.promo_claim(text) from public, anon;
grant execute on function public.promo_claim(text) to authenticated;
