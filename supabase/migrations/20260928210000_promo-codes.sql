-- Promotional codes. A claim credits the existing ledger (kind promo_reward) and
-- locks that same amount until settled Jackpot, Coinflip, or Roulette stake covers it.
-- 1.0x: required wager equals the credited reward. Stake is read from the settled
-- game row (referral_settled_stake). One settled source is applied once, oldest
-- open claim first, so stacked promos do not multiply a single wager.
-- Withdrawable cents = available balance − referral playthrough still open − promo still open.
-- Deposited funds stay withdrawable. The promo amount does not, until its own claim completes.

alter type public.tx_kind add value if not exists 'promo_reward';

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,16}$'),
  reward_cents bigint not null check (reward_cents between 100 and 500),
  max_claims integer not null check (max_claims > 0),
  claim_count integer not null default 0 check (claim_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint promo_codes_claims_cap check (claim_count <= max_claims)
);
create index promo_codes_active_idx on public.promo_codes (active, expires_at);
alter table public.promo_codes enable row level security;
revoke all on public.promo_codes from public, anon, authenticated;
grant all on public.promo_codes to service_role;
create trigger no_truncate before truncate on public.promo_codes for each statement execute function public._no_truncate();

create table public.promo_claims (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id),
  user_id uuid not null references public.profiles (id),
  reward_cents bigint not null check (reward_cents between 100 and 500),
  required_wager_cents bigint not null check (required_wager_cents between 100 and 500),
  qualifying_wager_cents bigint not null default 0 check (qualifying_wager_cents >= 0),
  status text not null default 'CLAIMED' check (status in ('CLAIMED', 'WAGERING', 'COMPLETED')),
  ledger_tx_id uuid not null unique references public.ledger_transactions (id),
  claimed_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (promo_code_id, user_id),
  constraint promo_claims_wager_cap check (qualifying_wager_cents <= required_wager_cents),
  constraint promo_claims_reward_locked check (required_wager_cents = reward_cents),
  constraint promo_claims_completed check (
    (status = 'COMPLETED' and qualifying_wager_cents = required_wager_cents and completed_at is not null)
    or (status = 'WAGERING' and qualifying_wager_cents > 0 and qualifying_wager_cents < required_wager_cents and completed_at is null)
    or (status = 'CLAIMED' and qualifying_wager_cents = 0 and completed_at is null)
  )
);
create index promo_claims_open_idx on public.promo_claims (user_id, created_at)
  where status in ('CLAIMED', 'WAGERING');
alter table public.promo_claims enable row level security;
revoke all on public.promo_claims from public, anon, authenticated;
grant all on public.promo_claims to service_role;
create trigger no_truncate before truncate on public.promo_claims for each statement execute function public._no_truncate();

-- One settled source contributes once, then is split across open claims. It is not stored per claim.
create table public.promo_wagers (
  game text not null check (game in ('jackpot', 'coinflip', 'roulette')),
  source_id text not null check (char_length(source_id) between 1 and 80),
  user_id uuid not null references public.profiles (id),
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default clock_timestamp(),
  primary key (game, source_id)
);
alter table public.promo_wagers enable row level security;
revoke all on public.promo_wagers from public, anon, authenticated;
grant all on public.promo_wagers to service_role;
create trigger no_truncate before truncate on public.promo_wagers for each statement execute function public._no_truncate();

create table public.promo_claim_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default clock_timestamp()
);
create index promo_claim_attempts_user_idx on public.promo_claim_attempts (user_id, created_at desc);
alter table public.promo_claim_attempts enable row level security;
revoke all on public.promo_claim_attempts from public, anon, authenticated;
grant all on public.promo_claim_attempts to service_role;

create or replace function public._promo_code(p text)
returns text language plpgsql immutable set search_path = public as $$
declare c text;
begin
  c := upper(btrim(coalesce(p, '')));
  if c ~ '^[A-Z0-9]{4,16}$' then return c; end if;
  return null;
end $$;
revoke all on function public._promo_code(text) from public, anon, authenticated;

create or replace function public.promo_code_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.code is distinct from old.code or new.reward_cents is distinct from old.reward_cents
       or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
      raise exception 'IMMUTABLE';
    end if;
    if new.claim_count < old.claim_count or new.claim_count > new.max_claims then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end $$;
drop trigger if exists promo_code_guard on public.promo_codes;
create trigger promo_code_guard before update on public.promo_codes
  for each row execute function public.promo_code_guard();

create or replace function public.promo_claim_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'CLAIMED' or new.qualifying_wager_cents <> 0 or new.completed_at is not null then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    if new.required_wager_cents is distinct from new.reward_cents then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    return new;
  end if;
  if new.promo_code_id is distinct from old.promo_code_id
     or new.user_id is distinct from old.user_id
     or new.reward_cents is distinct from old.reward_cents
     or new.required_wager_cents is distinct from old.required_wager_cents
     or new.ledger_tx_id is distinct from old.ledger_tx_id
     or new.claimed_at is distinct from old.claimed_at
     or new.created_at is distinct from old.created_at then
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
create trigger promo_claim_guard before insert or update on public.promo_claims
  for each row execute function public.promo_claim_guard();

create or replace function public.promo_restricted_cents(p_user uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(required_wager_cents - qualifying_wager_cents), 0)
  from public.promo_claims
  where user_id = p_user and status in ('CLAIMED', 'WAGERING');
$$;
revoke all on function public.promo_restricted_cents(uuid) from public, anon, authenticated;

-- Referral hold and promo hold are separate. A withdrawal that only the referral blocks
-- still raises REFERRAL_PLAYTHROUGH. A withdrawal the promo blocks raises PROMO_PLAYTHROUGH.
create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  referral_hold bigint := public.referral_unplayed_reward_cents(p_user);
  promo_hold bigint := public.promo_restricted_cents(p_user);
begin
  if p_balance - referral_hold - promo_hold >= p_total then return; end if;
  if promo_hold > 0 and p_balance - referral_hold >= p_total then
    raise exception 'PROMO_PLAYTHROUGH';
  end if;
  if referral_hold > 0 and p_balance - promo_hold >= p_total then
    raise exception 'REFERRAL_PLAYTHROUGH';
  end if;
  if promo_hold > 0 then raise exception 'PROMO_PLAYTHROUGH'; end if;
  raise exception 'REFERRAL_PLAYTHROUGH';
end $$;
revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;

create or replace function public.promo_apply_wager(p_user uuid, p_game text, p_source text)
returns void language plpgsql security definer set search_path = public as $$
declare
  stake bigint;
  inserted int;
  remaining bigint;
  claim public.promo_claims;
  room bigint;
  take bigint;
  next_status text;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  if public.promo_restricted_cents(p_user) = 0 then return; end if;
  stake := public.referral_settled_stake(p_user, p_game, p_source);
  if stake is null or stake <= 0 then return; end if;
  remaining := stake;
  insert into public.promo_wagers (game, source_id, user_id, amount_cents)
  values (p_game, p_source, p_user, stake)
  on conflict (game, source_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  for claim in
    select * from public.promo_claims
    where user_id = p_user and status in ('CLAIMED', 'WAGERING')
    order by created_at, id
    for update
  loop
    exit when remaining <= 0;
    room := claim.required_wager_cents - claim.qualifying_wager_cents;
    take := least(room, remaining);
    if claim.qualifying_wager_cents + take >= claim.required_wager_cents then
      next_status := 'COMPLETED';
    else
      next_status := 'WAGERING';
    end if;
    update public.promo_claims
    set qualifying_wager_cents = qualifying_wager_cents + take,
        status = next_status,
        completed_at = case when next_status = 'COMPLETED' then clock_timestamp() else null end
    where id = claim.id;
    if next_status = 'COMPLETED' then
      perform public._audit(p_user, 'promo_wager_completed', null, jsonb_build_object('claim', claim.id, 'cents', claim.reward_cents));
    end if;
    remaining := remaining - take;
  end loop;
end $$;
revoke all on function public.promo_apply_wager(uuid, text, text) from public, anon, authenticated;
grant execute on function public.promo_apply_wager(uuid, text, text) to service_role;

create or replace function public.referral_note_play(p_user uuid, p_game text, p_source text, p_cents bigint)
returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; inserted int; stake bigint;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  stake := public.referral_settled_stake(p_user, p_game, p_source);
  if stake is not null and stake > 0 then
    begin
      perform public.promo_apply_wager(p_user, p_game, p_source);
    exception when others then
      perform public._audit(p_user, 'promo_hook_error', null, jsonb_build_object('game', p_game, 'source', p_source));
    end;
    perform public.referral_apply_reward_wager(p_user, p_game, p_source, stake);
    select * into r from public.referrals where referred_user_id = p_user for update;
    if r.id is not null and r.status = 'PLAY_REQUIREMENT_PENDING' then
      insert into public.referral_play_events (referral_id, game, source_id, amount_cents)
      values (r.id, p_game, p_source, stake)
      on conflict (game, source_id) do nothing;
      get diagnostics inserted = row_count;
      if inserted = 1 then
        update public.referrals set qualifying_play_cents = qualifying_play_cents + stake where id = r.id;
        perform public._audit(r.inviter_user_id, 'referral_gameplay_progress', null, jsonb_build_object('referral', r.id, 'game', p_game, 'source', p_source, 'cents', stake));
      end if;
    end if;
  end if;
  perform public.referral_progress(p_user);
end $$;
revoke all on function public.referral_note_play(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_note_play(uuid, text, text, bigint) to service_role;

create or replace function public.promo_claim(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
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
  bank_bal bigint;
  attempts int;
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
  canonical := public._promo_code(p_code);
  if canonical is null then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  select * into promo from public.promo_codes where promo_codes.code = canonical for update;
  if promo.id is null
     or not promo.active
     or (promo.expires_at is not null and promo.expires_at <= clock_timestamp())
     or promo.claim_count >= promo.max_claims
     or exists (select 1 from public.promo_claims c where c.promo_code_id = promo.id and c.user_id = uid) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
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
    select balance into bank_bal from public.wallet_accounts where id = bank for update;
    if bank_bal is null or bank_bal < promo.reward_cents then
      perform public._audit(uid, 'promo_claim_deferred', null, jsonb_build_object('code', canonical, 'reason', 'insufficient_bankroll'));
      return jsonb_build_object('ok', false, 'reason', 'unavailable');
    end if;
  end if;
  key := 'promo:claim:' || claim_id::text;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('promo_reward', key, v_type, uid, 'Promo reward')
  returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -promo.reward_cents);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), promo.reward_cents);
  insert into public.promo_claims (id, promo_code_id, user_id, reward_cents, required_wager_cents, ledger_tx_id)
  values (claim_id, promo.id, uid, promo.reward_cents, promo.reward_cents, tx);
  update public.promo_codes set claim_count = claim_count + 1 where id = promo.id and claim_count < max_claims;
  if not found then raise exception 'PROMO_EXHAUSTED'; end if;
  perform public._audit(uid, 'promo_claimed', null, jsonb_build_object('code', canonical, 'cents', promo.reward_cents, 'tx', tx, 'claim', claim_id));
  return jsonb_build_object('ok', true, 'reward_cents', promo.reward_cents, 'required_wager_cents', promo.reward_cents);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
end $$;
revoke all on function public.promo_claim(text) from public, anon;
grant execute on function public.promo_claim(text) to authenticated;

create or replace function public.promo_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  return jsonb_build_object(
    'restricted_cents', public.promo_restricted_cents(uid),
    'claims', coalesce((select jsonb_agg(x order by x.claimed_at desc) from (
      select c.code, pc.reward_cents, pc.required_wager_cents, pc.qualifying_wager_cents, pc.status, pc.claimed_at
      from public.promo_claims pc
      join public.promo_codes c on c.id = pc.promo_code_id
      where pc.user_id = uid
      order by pc.claimed_at desc
      limit 20
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.promo_status() from public, anon;
grant execute on function public.promo_status() to authenticated;

create or replace function public.promo_admin_create(p_code text, p_reward_cents bigint, p_max_claims integer, p_expires timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); canonical text; new_id uuid;
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  canonical := public._promo_code(p_code);
  if canonical is null then raise exception 'BAD_CODE'; end if;
  if p_reward_cents is null or p_reward_cents < 100 or p_reward_cents > 500 then raise exception 'BAD_REWARD'; end if;
  if p_max_claims is null or p_max_claims < 1 or p_max_claims > 100000 then raise exception 'BAD_CLAIMS'; end if;
  if p_expires is not null and p_expires <= clock_timestamp() then raise exception 'BAD_EXPIRY'; end if;
  insert into public.promo_codes (code, reward_cents, max_claims, expires_at, active, created_by)
  values (canonical, p_reward_cents, p_max_claims, p_expires, true, uid)
  returning promo_codes.id into new_id;
  perform public._audit(uid, 'promo_created', null, jsonb_build_object('code', canonical, 'cents', p_reward_cents, 'max', p_max_claims));
  return jsonb_build_object('ok', true, 'id', new_id, 'code', canonical);
exception
  when unique_violation then
    raise exception 'CODE_TAKEN';
end $$;
revoke all on function public.promo_admin_create(text, bigint, integer, timestamptz) from public, anon;
grant execute on function public.promo_admin_create(text, bigint, integer, timestamptz) to authenticated;

create or replace function public.promo_admin_update(p_id uuid, p_active boolean, p_max_claims integer, p_expires timestamptz, p_touch_expiry boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  if p_active is null then raise exception 'BAD_REQUEST'; end if;
  if p_max_claims is null or p_max_claims < 1 or p_max_claims > 100000 then raise exception 'BAD_CLAIMS'; end if;
  if coalesce(p_touch_expiry, false) and p_expires is not null and p_expires <= clock_timestamp() then
    raise exception 'BAD_EXPIRY';
  end if;
  update public.promo_codes
  set active = p_active,
      max_claims = p_max_claims,
      expires_at = case when coalesce(p_touch_expiry, false) then p_expires else expires_at end
  where id = p_id and p_max_claims >= claim_count;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'BAD_REQUEST'; end if;
  perform public._audit(uid, 'promo_updated', null, jsonb_build_object('id', p_id, 'active', p_active, 'max', p_max_claims));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.promo_admin_update(uuid, boolean, integer, timestamptz, boolean) from public, anon;
grant execute on function public.promo_admin_update(uuid, boolean, integer, timestamptz, boolean) to authenticated;

create or replace function public.promo_admin_list()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  return jsonb_build_object(
    'rows', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select id, code, reward_cents, max_claims, claim_count, (max_claims - claim_count) as remaining,
        expires_at, active, created_at
      from public.promo_codes
      order by created_at desc
      limit 100
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.promo_admin_list() from public, anon;
grant execute on function public.promo_admin_list() to authenticated;

-- Hold check added. The rest of the withdrawal function is unchanged from 20260928110000.
create or replace function public.crypto_request_withdrawal(p_user uuid, p_chain bigint, p_asset text, p_usd_cents bigint, p_quote uuid, p_env_ok boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; a chain_assets; w user_wallets; q crypto_withdrawal_quotes;
  units numeric; total bigint; avail uuid; locked uuid; bal bigint; tx uuid; wid uuid := gen_random_uuid();
  review boolean; used bigint; used_global bigint; payout_wei numeric; locked_wei numeric; wd_status text;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  select * into a from chain_assets where chain_id = p_chain and asset_key = p_asset and is_enabled;
  if a is null then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  select * into w from user_wallets where user_id = p_user and is_verified order by is_primary desc, verified_at desc limit 1;
  if w is null then raise exception 'NO_VERIFIED_WALLET'; end if;
  if exists (
    select 1 from user_wallets o
    where o.user_id = p_user and o.is_verified and o.normalized_address <> w.normalized_address
  ) and w.became_primary_at > clock_timestamp() - interval '24 hours' then
    raise exception 'WALLET_CHANGE_COOLDOWN';
  end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (select 1 from crypto_withdrawals where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')) then raise exception 'WITHDRAWAL_PENDING'; end if;
  select coalesce(sum(usd_cents),0) into used from crypto_withdrawals where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from crypto_withdrawals where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
  if used_global + p_usd_cents > s.daily_global_limit_cents then raise exception 'GLOBAL_DAILY_LIMIT'; end if;
  if a.settlement_kind = 'native' then
    select * into q from crypto_withdrawal_quotes where id = p_quote for update;
    if q is null or q.user_id <> p_user or q.asset_key <> p_asset or q.chain_id <> p_chain then raise exception 'QUOTE_INVALID'; end if;
    if q.used_at is not null then raise exception 'QUOTE_USED'; end if;
    if q.expires_at < now() then raise exception 'QUOTE_EXPIRED'; end if;
    if q.usd_cents <> p_usd_cents then raise exception 'QUOTE_MISMATCH'; end if;
    update crypto_withdrawal_quotes set used_at = now() where id = q.id;
    units := q.units;
  else
    units := p_usd_cents::numeric * power(10::numeric, a.decimals) / 100;
  end if;
  total := p_usd_cents + s.withdrawal_fee_cents;
  avail := _user_account(p_user, 'user_available', a.ledger_asset, a.ledger_account_type);
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < total then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public._assert_reward_holds(p_user, bal, total);
  locked := _user_account(p_user, 'user_locked', a.ledger_asset, a.ledger_account_type);
  if locked is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type) values (p_user, 'user_locked', a.ledger_asset, a.ledger_account_type) returning id into locked;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'withdrawal:' || wid || ':hold', a.ledger_account_type, p_user, 'Withdrawal hold') returning id into tx;
  perform _post(tx, avail, -total);
  perform _post(tx, locked, total);
  review := not coalesce(p_env_ok, false) or p_usd_cents > s.auto_approve_cents;
  wd_status := case when review then 'PENDING' else 'APPROVED' end;
  if wd_status = 'APPROVED' and a.settlement_kind = 'native' and p_chain = 8453 then
    select i.payout_wei into payout_wei
      from crypto_chain_inventory i
      where i.chain_id = p_chain and i.observed_at > now() - interval '10 minutes';
    select coalesce(sum(w2.units), 0) into locked_wei
      from crypto_withdrawals w2
      where w2.chain_id = p_chain and w2.asset_key = 'ETH'
        and w2.status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED');
    if payout_wei is null or payout_wei < locked_wei + units + 50000000000000 then
      wd_status := 'LIQUIDITY_PENDING';
    end if;
  end if;
  insert into crypto_withdrawals (id, user_id, chain_id, asset_key, to_address, units, usd_cents, fee_usd_cents, status, review_required, hold_ledger_tx_id, quote_id)
    values (wid, p_user, p_chain, p_asset, w.normalized_address, units, p_usd_cents, s.withdrawal_fee_cents, wd_status, review, tx, q.id);
  perform _audit(p_user, 'crypto_withdrawal_requested', null, jsonb_build_object('withdrawal', wid, 'cents', p_usd_cents, 'asset', p_asset, 'chain', p_chain, 'review', review, 'status', wd_status));
  return jsonb_build_object('id', wid, 'status', wd_status);
end $$;
revoke execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean) from public, anon, authenticated;
grant execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean) to service_role;

create or replace function public.btcpay_request_payout(p_user uuid, p_usd_cents bigint, p_address text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings;
  avail uuid; locked uuid; bal bigint; tx uuid; pid uuid := gen_random_uuid();
  total bigint; used bigint; used_global bigint;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  if p_usd_cents <= 0 then raise exception 'BELOW_MINIMUM'; end if;
  if p_address !~* '^bc1' then raise exception 'ADDRESS'; end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (
    select 1 from crypto_withdrawals
    where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')
  ) then raise exception 'WITHDRAWAL_PENDING'; end if;
  if exists (
    select 1 from btcpay_payouts
    where user_id = p_user and status in ('HOLD','AWAITING_APPROVAL','QUEUED')
  ) then raise exception 'WITHDRAWAL_PENDING'; end if;
  select coalesce(sum(usd_cents),0) into used from (
    select usd_cents from crypto_withdrawals
      where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('CANCELLED','FAILED')
  ) x;
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from (
    select usd_cents from crypto_withdrawals
      where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where created_at > now() - interval '24 hours' and status not in ('CANCELLED','FAILED')
  ) y;
  if used_global + p_usd_cents > s.daily_global_limit_cents then raise exception 'GLOBAL_DAILY_LIMIT'; end if;
  total := p_usd_cents + s.withdrawal_fee_cents;
  avail := _user_account(p_user, 'user_available', 'USD', 'real');
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < total then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public._assert_reward_holds(p_user, bal, total);
  locked := _user_account(p_user, 'user_locked', 'USD', 'real');
  if locked is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type)
      values (p_user, 'user_locked', 'USD', 'real') returning id into locked;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'btcpay-payout:' || pid || ':hold', 'real', p_user, 'Bitcoin cashout hold')
    returning id into tx;
  perform _post(tx, avail, -total);
  perform _post(tx, locked, total);
  insert into btcpay_payouts (id, user_id, usd_cents, fee_usd_cents, address, status, hold_ledger_tx_id)
    values (pid, p_user, p_usd_cents, s.withdrawal_fee_cents, p_address, 'HOLD', tx);
  perform _audit(p_user, 'btcpay_payout_requested', null, jsonb_build_object('payout', pid, 'cents', p_usd_cents));
  return jsonb_build_object('id', pid, 'status', 'HOLD');
end $$;
revoke all on function public.btcpay_request_payout(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.btcpay_request_payout(uuid, bigint, text) to service_role;
