-- Friend referral.
--
-- State machine (referral row). Invalid edges raise ILLEGAL_TRANSITION.
--   SIGNED_UP
--     → DEPOSIT_PENDING | DEPOSIT_QUALIFIED | FRAUD_REVIEW | INVALID
--   DEPOSIT_PENDING
--     → SIGNED_UP | DEPOSIT_QUALIFIED | FRAUD_REVIEW | INVALID
--   DEPOSIT_QUALIFIED
--     → PLAY_REQUIREMENT_PENDING | FRAUD_REVIEW
--   PLAY_REQUIREMENT_PENDING
--     → QUALIFIED | FRAUD_REVIEW
--   QUALIFIED
--     → REWARD_PENDING | FRAUD_REVIEW
--   REWARD_PENDING
--     → REWARDED
--   FRAUD_REVIEW, REWARDED, INVALID, CANCELLED are terminal.
--
-- Qualifying deposit: one crypto_deposits row for the referred user with
-- status CREDITED, a ledger transaction, and usd_cents >= referral_config.deposit_cents
-- (default 5000 = $50). Pending, unmatched, rejected, and orphaned deposits do not count.
-- Credited deposits cannot leave CREDITED, so a reversal is not representable; the reward
-- re-reads that row and will not pay unless it is still CREDITED.
--
-- Qualifying play: stake recorded by settlement, summed across games, only after the
-- deposit is qualified (play before that deposit does not count).
--   Jackpot  — jackpot_players.total_amount when the round becomes COMPLETED.
--              That is the player's contribution, not the payout and not the rake.
--   Coinflip — coinflip_entries.amount when the game becomes COMPLETED.
--              Each player's stake once. Cancelled and expired games are not COMPLETED.
--   Roulette — roulette_bets.amount when a bet moves ACCEPTED → WON or LOST.
--              The stake, not payout_amount. REFUNDED bets are not counted.
-- A (game, source) pair is unique, so a replayed settlement adds the stake once.
-- Default play requirement is 500 cents ($5). Default reward is 1000 cents ($10),
-- paid once through ledger_transactions kind referral_reward.

alter type public.tx_kind add value if not exists 'referral_reward';

create table public.referral_config (
  id boolean primary key default true check (id),
  deposit_cents bigint not null default 5000 check (deposit_cents > 0),
  play_cents bigint not null default 500 check (play_cents > 0),
  reward_cents bigint not null default 1000 check (reward_cents > 0),
  enabled boolean not null default true
);
insert into public.referral_config default values;
grant select on public.referral_config to anon, authenticated;
grant all on public.referral_config to service_role;
alter table public.referral_config enable row level security;
create policy "referral config public" on public.referral_config for select to anon, authenticated using (true);

create table public.referral_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null unique references public.profiles (id),
  code text not null unique check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'),
  created_at timestamptz not null default clock_timestamp()
);
create index referral_invites_code_idx on public.referral_invites (code);
grant select on public.referral_invites to authenticated;
grant all on public.referral_invites to service_role;
alter table public.referral_invites enable row level security;
create policy "own invite" on public.referral_invites for select to authenticated using (inviter_user_id = auth.uid());

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.profiles (id),
  referred_user_id uuid not null unique references public.profiles (id),
  invite_id uuid not null references public.referral_invites (id),
  status text not null default 'SIGNED_UP' check (status in (
    'SIGNED_UP', 'DEPOSIT_PENDING', 'DEPOSIT_QUALIFIED', 'PLAY_REQUIREMENT_PENDING',
    'QUALIFIED', 'REWARD_PENDING', 'REWARDED', 'FRAUD_REVIEW', 'INVALID', 'CANCELLED'
  )),
  qualifying_deposit_id uuid references public.crypto_deposits (id),
  qualifying_deposit_cents bigint not null default 0 check (qualifying_deposit_cents >= 0),
  qualifying_play_cents bigint not null default 0 check (qualifying_play_cents >= 0),
  reward_cents bigint not null check (reward_cents > 0),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint referrals_not_self check (inviter_user_id <> referred_user_id),
  constraint referrals_rewarded_has_time check (status <> 'REWARDED' or rewarded_at is not null)
);
create index referrals_inviter_idx on public.referrals (inviter_user_id, created_at desc);
create index referrals_open_idx on public.referrals (status) where status in (
  'SIGNED_UP', 'DEPOSIT_PENDING', 'DEPOSIT_QUALIFIED', 'PLAY_REQUIREMENT_PENDING', 'QUALIFIED', 'REWARD_PENDING'
);
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;

create table public.referral_play_events (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals (id),
  game text not null check (game in ('jackpot', 'coinflip', 'roulette')),
  source_id text not null check (length(source_id) between 1 and 80),
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (game, source_id)
);
create index referral_play_referral_idx on public.referral_play_events (referral_id);
grant all on public.referral_play_events to service_role;
alter table public.referral_play_events enable row level security;

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null unique references public.referrals (id),
  user_id uuid not null references public.profiles (id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'USD',
  status text not null check (status in ('PENDING', 'PAID')),
  deposit_id uuid references public.crypto_deposits (id),
  ledger_tx_id uuid unique references public.ledger_transactions (id),
  idempotency_key text not null unique,
  created_at timestamptz not null default clock_timestamp(),
  paid_at timestamptz,
  constraint referral_rewards_paid_has_tx check (status <> 'PAID' or (ledger_tx_id is not null and paid_at is not null))
);
grant all on public.referral_rewards to service_role;
alter table public.referral_rewards enable row level security;

create or replace function public.referral_status_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'SIGNED_UP' then raise exception 'ILLEGAL_TRANSITION'; end if;
    return new;
  end if;
  if old.status is not distinct from new.status then
    if old.status in ('REWARDED', 'INVALID', 'CANCELLED', 'FRAUD_REVIEW')
       and (new.qualifying_play_cents is distinct from old.qualifying_play_cents
         or new.qualifying_deposit_id is distinct from old.qualifying_deposit_id
         or new.reward_cents is distinct from old.reward_cents) then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    return new;
  end if;
  if (old.status, new.status) in (
    ('SIGNED_UP', 'DEPOSIT_PENDING'),
    ('SIGNED_UP', 'DEPOSIT_QUALIFIED'),
    ('SIGNED_UP', 'FRAUD_REVIEW'),
    ('SIGNED_UP', 'INVALID'),
    ('DEPOSIT_PENDING', 'SIGNED_UP'),
    ('DEPOSIT_PENDING', 'DEPOSIT_QUALIFIED'),
    ('DEPOSIT_PENDING', 'FRAUD_REVIEW'),
    ('DEPOSIT_PENDING', 'INVALID'),
    ('DEPOSIT_QUALIFIED', 'PLAY_REQUIREMENT_PENDING'),
    ('DEPOSIT_QUALIFIED', 'FRAUD_REVIEW'),
    ('PLAY_REQUIREMENT_PENDING', 'QUALIFIED'),
    ('PLAY_REQUIREMENT_PENDING', 'FRAUD_REVIEW'),
    ('QUALIFIED', 'REWARD_PENDING'),
    ('QUALIFIED', 'FRAUD_REVIEW'),
    ('REWARD_PENDING', 'REWARDED')
  ) then
    new.updated_at := clock_timestamp();
    return new;
  end if;
  raise exception 'ILLEGAL_TRANSITION';
end $$;
create trigger referral_status_guard before insert or update on public.referrals
  for each row execute function public.referral_status_guard();

create or replace function public._referral_code()
returns text language plpgsql set search_path = public, extensions as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; raw bytea; out text := ''; i int; n int;
begin
  raw := extensions.gen_random_bytes(10);
  for i in 0..9 loop
    n := get_byte(raw, i) % 32;
    out := out || substr(alphabet, n + 1, 1);
  end loop;
  return out;
end $$;
revoke all on function public._referral_code() from public, anon, authenticated;

create or replace function public._referral_shared_wallet(p_inviter uuid, p_referred uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_wallets a
    join public.user_wallets b on b.normalized_address = a.normalized_address
    where a.user_id = p_inviter and b.user_id = p_referred
  )
$$;
revoke all on function public._referral_shared_wallet(uuid, uuid) from public, anon, authenticated;

create or replace function public.referral_try_pay(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; cfg public.referral_config; dep public.crypto_deposits;
  v_asset text; v_type text; v_bank public.account_kind; tx uuid; key text;
begin
  select * into r from public.referrals where id = p_id for update;
  if r.id is null or r.status <> 'QUALIFIED' then return; end if;
  if exists (select 1 from public.referral_rewards where referral_id = r.id and status = 'PAID') then
    update public.referrals set status = 'REWARD_PENDING' where id = r.id and status = 'QUALIFIED';
    update public.referrals set status = 'REWARDED', rewarded_at = coalesce(rewarded_at, clock_timestamp()) where id = r.id and status = 'REWARD_PENDING';
    return;
  end if;
  select * into cfg from public.referral_config where id;
  select * into dep from public.crypto_deposits where id = r.qualifying_deposit_id;
  if dep.id is null or dep.status <> 'CREDITED' or dep.user_id <> r.referred_user_id or dep.ledger_tx_id is null or dep.usd_cents < cfg.deposit_cents then
    return;
  end if;
  if r.qualifying_play_cents < cfg.play_cents then return; end if;
  if public._referral_shared_wallet(r.inviter_user_id, r.referred_user_id) then
    update public.referrals set status = 'FRAUD_REVIEW' where id = r.id;
    perform public._audit(r.inviter_user_id, 'referral_fraud_review', null, jsonb_build_object('referral', r.id, 'reason', 'shared_wallet'));
    return;
  end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = r.inviter_user_id and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = r.inviter_user_id and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  key := 'referral:reward:' || r.id::text;
  update public.referrals set status = 'REWARD_PENDING' where id = r.id;
  insert into public.referral_rewards (referral_id, user_id, amount_cents, currency, status, deposit_id, idempotency_key)
  values (r.id, r.inviter_user_id, r.reward_cents, 'USD', 'PENDING', dep.id, key)
  on conflict (referral_id) do nothing;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('referral_reward', key, v_type, r.inviter_user_id, 'Friend referral reward')
  on conflict (idempotency_key) do nothing
  returning id into tx;
  if tx is null then
    select id into tx from public.ledger_transactions where idempotency_key = key;
  end if;
  if not exists (select 1 from public.ledger_postings where tx_id = tx) then
    perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -r.reward_cents);
    perform public._post(tx, public._user_account(r.inviter_user_id, 'user_available', v_asset, v_type), r.reward_cents);
  end if;
  update public.referral_rewards set status = 'PAID', ledger_tx_id = tx, paid_at = clock_timestamp() where referral_id = r.id;
  update public.referrals set status = 'REWARDED', rewarded_at = clock_timestamp() where id = r.id;
  perform public._audit(r.inviter_user_id, 'referral_reward_created', null, jsonb_build_object('referral', r.id, 'cents', r.reward_cents, 'tx', tx));
  perform public._audit(r.inviter_user_id, 'referral_reward_paid', null, jsonb_build_object('referral', r.id, 'cents', r.reward_cents, 'tx', tx, 'idempotency_key', key));
end $$;
revoke all on function public.referral_try_pay(uuid) from public, anon, authenticated;

create or replace function public.referral_progress(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; cfg public.referral_config; dep public.crypto_deposits;
begin
  if p_user is null then return; end if;
  select * into r from public.referrals where referred_user_id = p_user for update;
  if r.id is null or r.status in ('REWARDED', 'INVALID', 'CANCELLED', 'FRAUD_REVIEW') then return; end if;
  select * into cfg from public.referral_config where id;
  if not cfg.enabled then return; end if;
  if public._referral_shared_wallet(r.inviter_user_id, r.referred_user_id) then
    update public.referrals set status = 'FRAUD_REVIEW' where id = r.id;
    perform public._audit(r.inviter_user_id, 'referral_fraud_review', null, jsonb_build_object('referral', r.id, 'reason', 'shared_wallet'));
    return;
  end if;
  if r.status in ('SIGNED_UP', 'DEPOSIT_PENDING') then
    if r.status = 'SIGNED_UP' and exists (
      select 1 from public.crypto_deposits d
      where d.user_id = p_user and d.status in ('DETECTED', 'CONFIRMED', 'UNMATCHED')
    ) and not exists (
      select 1 from public.crypto_deposits d
      where d.user_id = p_user and d.status = 'CREDITED' and d.ledger_tx_id is not null and d.usd_cents >= cfg.deposit_cents
    ) then
      update public.referrals set status = 'DEPOSIT_PENDING' where id = r.id;
      r.status := 'DEPOSIT_PENDING';
    end if;
    select * into dep from public.crypto_deposits d
    where d.user_id = p_user and d.status = 'CREDITED' and d.ledger_tx_id is not null and d.usd_cents >= cfg.deposit_cents
    order by d.credited_at nulls last, d.created_at
    limit 1;
    if dep.id is not null then
      update public.referrals
        set status = 'DEPOSIT_QUALIFIED', qualifying_deposit_id = dep.id, qualifying_deposit_cents = dep.usd_cents
        where id = r.id;
      update public.referrals set status = 'PLAY_REQUIREMENT_PENDING' where id = r.id;
      r.status := 'PLAY_REQUIREMENT_PENDING';
      r.qualifying_deposit_id := dep.id;
      r.qualifying_deposit_cents := dep.usd_cents;
      perform public._audit(r.inviter_user_id, 'referral_deposit_qualified', null, jsonb_build_object('referral', r.id, 'deposit', dep.id, 'cents', dep.usd_cents));
    end if;
  end if;
  if r.status = 'PLAY_REQUIREMENT_PENDING' and r.qualifying_play_cents >= cfg.play_cents then
    update public.referrals set status = 'QUALIFIED', qualified_at = clock_timestamp() where id = r.id and status = 'PLAY_REQUIREMENT_PENDING';
    perform public._audit(r.inviter_user_id, 'referral_qualified', null, jsonb_build_object('referral', r.id, 'play_cents', r.qualifying_play_cents));
    r.status := 'QUALIFIED';
  end if;
  if r.status = 'QUALIFIED' then
    begin
      perform public.referral_try_pay(r.id);
    exception when others then
      perform public._audit(r.inviter_user_id, 'referral_reward_deferred', null, jsonb_build_object('referral', r.id));
    end;
  end if;
end $$;
revoke all on function public.referral_progress(uuid) from public, anon, authenticated;
grant execute on function public.referral_progress(uuid) to service_role;

-- Settled stake for a referred user. Idempotent on (game, source_id).
-- Ignored until the qualifying deposit has moved the referral to PLAY_REQUIREMENT_PENDING.
create or replace function public.referral_note_play(p_user uuid, p_game text, p_source text, p_cents bigint)
returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; inserted int;
begin
  if p_user is null or p_cents is null or p_cents <= 0 then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  select * into r from public.referrals where referred_user_id = p_user for update;
  if r.id is null then return; end if;
  if r.status = 'PLAY_REQUIREMENT_PENDING' then
    insert into public.referral_play_events (referral_id, game, source_id, amount_cents)
    values (r.id, p_game, p_source, p_cents)
    on conflict (game, source_id) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 1 then
      update public.referrals set qualifying_play_cents = qualifying_play_cents + p_cents where id = r.id;
      perform public._audit(r.inviter_user_id, 'referral_gameplay_progress', null, jsonb_build_object('referral', r.id, 'game', p_game, 'source', p_source, 'cents', p_cents));
    end if;
  end if;
  -- A later settlement retries a reward that was deferred (for example a short house bankroll).
  perform public.referral_progress(p_user);
end $$;
revoke all on function public.referral_note_play(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_note_play(uuid, text, text, bigint) to service_role;

create or replace function public.referral_on_deposit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'CREDITED' and old.status is distinct from 'CREDITED' and new.user_id is not null then
    begin
      perform public.referral_progress(new.user_id);
    exception when others then
      perform public._audit(new.user_id, 'referral_hook_error', null, jsonb_build_object('hook', 'deposit'));
    end;
  elsif new.status in ('DETECTED', 'CONFIRMED', 'UNMATCHED') and new.user_id is not null and old.status is distinct from new.status then
    begin
      perform public.referral_progress(new.user_id);
    exception when others then
      perform public._audit(new.user_id, 'referral_hook_error', null, jsonb_build_object('hook', 'deposit'));
    end;
  end if;
  return new;
end $$;
revoke all on function public.referral_on_deposit() from public, anon, authenticated;
drop trigger if exists referral_deposit on public.crypto_deposits;
create trigger referral_deposit after update of status on public.crypto_deposits
  for each row execute function public.referral_on_deposit();

create or replace function public.referral_on_jackpot()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    for p in select user_id, total_amount from public.jackpot_players where game_id = new.id and total_amount > 0 order by user_id loop
      begin
        perform public.referral_note_play(p.user_id, 'jackpot', new.id::text || ':' || p.user_id::text, p.total_amount);
      exception when others then
        perform public._audit(p.user_id, 'referral_hook_error', new.id, jsonb_build_object('hook', 'jackpot'));
      end;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.referral_on_jackpot() from public, anon, authenticated;
drop trigger if exists referral_jackpot on public.jackpot_games;
create trigger referral_jackpot after update of status on public.jackpot_games
  for each row execute function public.referral_on_jackpot();

create or replace function public.referral_on_coinflip()
returns trigger language plpgsql security definer set search_path = public as $$
declare e record;
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    for e in select user_id, amount from public.coinflip_entries where game_id = new.id and amount > 0 order by user_id loop
      begin
        perform public.referral_note_play(e.user_id, 'coinflip', new.id::text || ':' || e.user_id::text, e.amount);
      exception when others then
        perform public._audit(e.user_id, 'referral_hook_error', new.id, jsonb_build_object('hook', 'coinflip'));
      end;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.referral_on_coinflip() from public, anon, authenticated;
drop trigger if exists referral_coinflip on public.coinflip_games;
create trigger referral_coinflip after update of status on public.coinflip_games
  for each row execute function public.referral_on_coinflip();

-- Wheel bets. The name avoids the roulette search_path catalog check.
-- Counts the stake when ACCEPTED becomes WON or LOST. REFUNDED does not qualify.
create or replace function public.referral_on_wheel_bet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('WON', 'LOST') and old.status = 'ACCEPTED' and new.amount > 0 then
    begin
      perform public.referral_note_play(new.user_id, 'roulette', new.id::text, new.amount);
    exception when others then
      perform public._audit(new.user_id, 'referral_hook_error', new.game_id, jsonb_build_object('hook', 'wheel'));
    end;
  end if;
  return new;
end $$;
revoke all on function public.referral_on_wheel_bet() from public, anon, authenticated;
drop trigger if exists referral_wheel_bet on public.roulette_bets;
create trigger referral_wheel_bet after update of status on public.roulette_bets
  for each row execute function public.referral_on_wheel_bet();

create or replace function public.referral_terms()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deposit_cents', deposit_cents,
    'play_cents', play_cents,
    'reward_cents', reward_cents,
    'enabled', enabled
  ) from public.referral_config where id
$$;
revoke all on function public.referral_terms() from public;
grant execute on function public.referral_terms() to anon, authenticated, service_role;

create or replace function public.referral_peek(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare inv public.referral_invites; name text;
begin
  if p_code is null or p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$' then
    return jsonb_build_object('ok', false);
  end if;
  select * into inv from public.referral_invites where code = p_code;
  if inv.id is null then return jsonb_build_object('ok', false); end if;
  select username into name from public.profiles where id = inv.inviter_user_id;
  return jsonb_build_object('ok', true, 'username', name);
end $$;
revoke all on function public.referral_peek(text) from public;
grant execute on function public.referral_peek(text) to anon, authenticated, service_role;

create or replace function public.referral_create_invite()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); existing text; code text; tries int := 0;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if not exists (select 1 from public.profiles where id = uid) then raise exception 'NO_PROFILE'; end if;
  select i.code into existing from public.referral_invites i where i.inviter_user_id = uid;
  if existing is not null then
    return jsonb_build_object('ok', true, 'code', existing);
  end if;
  loop
    tries := tries + 1;
    code := public._referral_code();
    begin
      insert into public.referral_invites (inviter_user_id, code) values (uid, code);
      exit;
    exception when unique_violation then
      select i.code into existing from public.referral_invites i where i.inviter_user_id = uid;
      if existing is not null then
        return jsonb_build_object('ok', true, 'code', existing);
      end if;
      if tries >= 8 then raise exception 'CODE_EXHAUSTED'; end if;
    end;
  end loop;
  perform public._audit(uid, 'referral_created', null, jsonb_build_object('code_len', 10));
  return jsonb_build_object('ok', true, 'code', code);
end $$;
revoke all on function public.referral_create_invite() from public;
grant execute on function public.referral_create_invite() to authenticated;

create or replace function public.referral_claim(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.referral_invites; cfg public.referral_config;
  existing uuid; created timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_code is null or p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select id into existing from public.referrals where referred_user_id = uid;
  if existing is not null then
    return jsonb_build_object('ok', true, 'attributed', false, 'reason', 'kept');
  end if;
  select created_at into created from public.profiles where id = uid;
  if created is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  if created < clock_timestamp() - interval '30 minutes'
     or exists (select 1 from public.crypto_deposits where user_id = uid)
     or exists (select 1 from public.jackpot_entries where user_id = uid)
     or exists (select 1 from public.coinflip_entries where user_id = uid)
     or exists (select 1 from public.roulette_bets where user_id = uid) then
    perform public._audit(uid, 'referral_rejected', null, jsonb_build_object('reason', 'existing_user'));
    return jsonb_build_object('ok', false, 'reason', 'existing_user');
  end if;
  select * into inv from public.referral_invites where code = p_code;
  if inv.id is null then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if inv.inviter_user_id = uid then
    perform public._audit(uid, 'referral_rejected', null, jsonb_build_object('reason', 'self'));
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;
  select * into cfg from public.referral_config where id;
  begin
    insert into public.referrals (inviter_user_id, referred_user_id, invite_id, status, reward_cents)
    values (inv.inviter_user_id, uid, inv.id, 'SIGNED_UP', cfg.reward_cents);
  exception when unique_violation then
    return jsonb_build_object('ok', true, 'attributed', false, 'reason', 'kept');
  end;
  perform public._audit(inv.inviter_user_id, 'referral_attributed', null, jsonb_build_object('referred', uid, 'invite', inv.id));
  perform public._audit(uid, 'referral_signup', null, jsonb_build_object('invite', inv.id));
  if public._referral_shared_wallet(inv.inviter_user_id, uid) then
    update public.referrals set status = 'FRAUD_REVIEW' where referred_user_id = uid;
    perform public._audit(inv.inviter_user_id, 'referral_fraud_review', null, jsonb_build_object('reason', 'shared_wallet'));
    return jsonb_build_object('ok', true, 'attributed', true, 'reason', 'review');
  end if;
  perform public.referral_progress(uid);
  return jsonb_build_object('ok', true, 'attributed', true);
end $$;
revoke all on function public.referral_claim(text) from public;
grant execute on function public.referral_claim(text) to authenticated;

create or replace function public.referral_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cfg public.referral_config; code text; open_user uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  -- Retry a deferred reward without waiting for another game. Failures stay QUALIFIED.
  for open_user in
    select referred_user_id from public.referrals
    where inviter_user_id = uid and status in ('SIGNED_UP', 'DEPOSIT_PENDING', 'DEPOSIT_QUALIFIED', 'PLAY_REQUIREMENT_PENDING', 'QUALIFIED')
  loop
    begin
      perform public.referral_progress(open_user);
    exception when others then
      perform public._audit(uid, 'referral_hook_error', null, jsonb_build_object('hook', 'dashboard'));
    end;
  end loop;
  select * into cfg from public.referral_config where id;
  select i.code into code from public.referral_invites i where i.inviter_user_id = uid;
  return jsonb_build_object(
    'code', code,
    'deposit_cents', cfg.deposit_cents,
    'play_cents', cfg.play_cents,
    'reward_cents', cfg.reward_cents,
    'invited', (select count(*) from public.referrals where inviter_user_id = uid),
    'qualified', (select count(*) from public.referrals where inviter_user_id = uid and status in ('QUALIFIED', 'REWARD_PENDING', 'REWARDED')),
    'earned_cents', coalesce((select sum(reward_cents) from public.referrals where inviter_user_id = uid and status = 'REWARDED'), 0),
    'pending_cents', coalesce((select sum(reward_cents) from public.referrals where inviter_user_id = uid and status in ('QUALIFIED', 'REWARD_PENDING')), 0),
    'rows', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select p.username, r.status, r.reward_cents, r.created_at
      from public.referrals r
      join public.profiles p on p.id = r.referred_user_id
      where r.inviter_user_id = uid
      order by r.created_at desc
      limit 50
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.referral_dashboard() from public;
grant execute on function public.referral_dashboard() to authenticated;

create or replace function public.admin_referrals()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'rows', coalesce((select jsonb_agg(x) from (
      select r.id, r.inviter_user_id, r.referred_user_id, r.invite_id, r.status,
        r.qualifying_deposit_id, r.qualifying_deposit_cents, r.qualifying_play_cents,
        r.reward_cents, r.qualified_at, r.rewarded_at, r.created_at,
        rw.status as reward_status, rw.ledger_tx_id, rw.idempotency_key
      from public.referrals r
      left join public.referral_rewards rw on rw.referral_id = r.id
      order by r.created_at desc
      limit 100
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.admin_referrals() from public;
grant execute on function public.admin_referrals() to authenticated;
