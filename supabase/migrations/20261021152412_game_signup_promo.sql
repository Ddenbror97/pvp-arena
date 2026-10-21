-- One automatic game-page signup invite per IP hash per campaign.
-- The hash is an HMAC from the worker. This table never stores a raw IP.
-- Claim limits stay on promo_claim. An impression does not create an account
-- or post a ledger credit.
--
-- Measurement (service role only):
--   impressions:  event = promo_modal_impression
--   dismissals:   event = promo_modal_dismiss
--   signup rate:  promo_signup_completed / promo_modal_impression, grouped by game
--   claim rate:   promo_claim_success / promo_signup_completed
--   exhaustion:   promo_codes.claim_count >= max_claims for code PVP1

create table public.game_signup_impressions (
  campaign text not null,
  ip_hash text not null,
  game text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (campaign, ip_hash),
  constraint game_signup_impressions_game_check
    check (game in ('jackpot', 'roulette', 'coinflip', 'poker', 'slott')),
  constraint game_signup_impressions_hash_check
    check (ip_hash ~ '^[0-9a-f]{64}$')
);

create table public.game_signup_events (
  id bigint generated always as identity primary key,
  campaign text not null,
  ip_hash text not null,
  game text not null,
  event text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint game_signup_events_game_check
    check (game in ('jackpot', 'roulette', 'coinflip', 'poker', 'slott')),
  constraint game_signup_events_hash_check
    check (ip_hash ~ '^[0-9a-f]{64}$'),
  constraint game_signup_events_event_check
    check (event in (
      'promo_modal_eligible',
      'promo_modal_impression',
      'promo_modal_cta_click',
      'promo_modal_dismiss',
      'promo_signup_completed',
      'promo_claim_success',
      'promo_claim_failure'
    ))
);

create unique index game_signup_events_once
  on public.game_signup_events (campaign, ip_hash, event);
create index game_signup_events_campaign_idx
  on public.game_signup_events (campaign, event, game);
create index game_signup_impressions_created_idx
  on public.game_signup_impressions (created_at);
create index game_signup_events_created_idx
  on public.game_signup_events (created_at);

create table public.game_signup_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint game_signup_attempts_hash_check
    check (ip_hash ~ '^[0-9a-f]{64}$')
);
create index game_signup_attempts_ip_idx
  on public.game_signup_attempts (ip_hash, created_at);

alter table public.game_signup_impressions enable row level security;
alter table public.game_signup_events enable row level security;
alter table public.game_signup_attempts enable row level security;

revoke all on table public.game_signup_impressions from public, anon, authenticated;
revoke all on table public.game_signup_events from public, anon, authenticated;
revoke all on table public.game_signup_attempts from public, anon, authenticated;
grant all on table public.game_signup_impressions to service_role;
grant all on table public.game_signup_events to service_role;
grant all on table public.game_signup_attempts to service_role;

revoke all on sequence public.game_signup_events_id_seq from public, anon, authenticated;
revoke all on sequence public.game_signup_attempts_id_seq from public, anon, authenticated;
grant all on sequence public.game_signup_events_id_seq to service_role;
grant all on sequence public.game_signup_attempts_id_seq to service_role;

create or replace function public._game_signup_allow(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ts timestamptz := clock_timestamp();
  n integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext('game_signup:' || p_ip_hash));
  select count(*)::integer into n
  from public.game_signup_attempts
  where ip_hash = p_ip_hash and created_at > ts - interval '1 minute';
  if n >= 20 then
    return false;
  end if;
  insert into public.game_signup_attempts (ip_hash) values (p_ip_hash);
  delete from public.game_signup_attempts
  where id in (
    select id from public.game_signup_attempts
    where created_at < ts - interval '1 day'
    limit 50
  );
  delete from public.game_signup_impressions
  where (campaign, ip_hash) in (
    select campaign, ip_hash from public.game_signup_impressions
    where created_at < ts - interval '180 days'
    limit 50
  );
  delete from public.game_signup_events
  where id in (
    select id from public.game_signup_events
    where created_at < ts - interval '180 days'
    limit 50
  );
  return true;
end $$;

revoke all on function public._game_signup_allow(text) from public, anon, authenticated;

create or replace function public.reserve_game_signup_impression(p_ip_hash text, p_game text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign text := 'game_signup_pvp1_v1';
  promo public.promo_codes;
  inserted integer := 0;
begin
  if p_game not in ('jackpot', 'roulette', 'coinflip', 'poker', 'slott') then
    return jsonb_build_object('show', false);
  end if;
  if not public._game_signup_allow(p_ip_hash) then
    return jsonb_build_object('show', false);
  end if;

  delete from public.game_signup_impressions
  where campaign = v_campaign
    and ip_hash = p_ip_hash
    and created_at < clock_timestamp() - interval '180 days';

  select * into promo from public.promo_codes where code = public._promo_code('PVP1');
  if promo.id is null
     or promo.reward_cents is distinct from 100
     or not promo.active
     or (promo.expires_at is not null and promo.expires_at <= clock_timestamp())
     or promo.claim_count >= promo.max_claims
     or (promo.partner_user_id is not null and not public._is_active_partner(promo.partner_user_id))
  then
    return jsonb_build_object('show', false);
  end if;

  insert into public.game_signup_impressions (campaign, ip_hash, game)
  values (v_campaign, p_ip_hash, p_game)
  on conflict (campaign, ip_hash) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return jsonb_build_object('show', false);
  end if;

  insert into public.game_signup_events (campaign, ip_hash, game, event)
  values (v_campaign, p_ip_hash, p_game, 'promo_modal_eligible')
  on conflict (campaign, ip_hash, event) do nothing;
  return jsonb_build_object('show', true);
end $$;

revoke all on function public.reserve_game_signup_impression(text, text) from public, anon, authenticated;
grant execute on function public.reserve_game_signup_impression(text, text) to service_role;

create or replace function public.record_game_signup_event(p_ip_hash text, p_event text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign text := 'game_signup_pvp1_v1';
  v_game text;
  inserted integer := 0;
begin
  if p_event not in (
    'promo_modal_impression',
    'promo_modal_cta_click',
    'promo_modal_dismiss',
    'promo_signup_completed',
    'promo_claim_success',
    'promo_claim_failure'
  ) then
    return jsonb_build_object('ok', false);
  end if;
  if not public._game_signup_allow(p_ip_hash) then
    return jsonb_build_object('ok', false);
  end if;
  select game into v_game
  from public.game_signup_impressions
  where campaign = v_campaign and ip_hash = p_ip_hash;
  if v_game is null then
    return jsonb_build_object('ok', false);
  end if;
  insert into public.game_signup_events (campaign, ip_hash, game, event)
  values (v_campaign, p_ip_hash, v_game, p_event)
  on conflict (campaign, ip_hash, event) do nothing;
  get diagnostics inserted = row_count;
  return jsonb_build_object('ok', true, 'recorded', inserted = 1);
end $$;

revoke all on function public.record_game_signup_event(text, text) from public, anon, authenticated;
grant execute on function public.record_game_signup_event(text, text) to service_role;
