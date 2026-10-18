-- Prestige progression. XP is awarded only from settled wager rows, inside the
-- settlement transaction. Cosmetic and reward mutations are security-definer
-- functions. Browser roles cannot write these tables.

alter type public.tx_kind add value if not exists 'prestige_reward';

create table public.cosmetics (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('frame', 'crown')),
  name text not null,
  description text not null,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  asset_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.prestige_levels (
  id uuid primary key default gen_random_uuid(),
  level int not null unique check (level between 1 and 40),
  xp_required bigint not null check (xp_required >= 0),
  tier text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.prestige_rewards (
  id uuid primary key default gen_random_uuid(),
  level int not null references public.prestige_levels (level),
  reward_type text not null check (reward_type in ('frame', 'crown', 'usdc')),
  cosmetic_id uuid references public.cosmetics (id),
  currency text,
  amount bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (level)
);

create table public.user_prestige (
  user_id uuid primary key,
  total_xp bigint not null default 0 check (total_xp >= 0),
  current_level int not null default 1,
  equipped_frame_id uuid references public.cosmetics (id),
  equipped_crown_id uuid references public.cosmetics (id),
  updated_at timestamptz not null default now()
);

create table public.user_cosmetics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  cosmetic_id uuid not null references public.cosmetics (id),
  unlocked_at timestamptz not null default now(),
  unique (user_id, cosmetic_id)
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_game text not null check (source_game in ('jackpot', 'coinflip', 'roulette')),
  source_transaction_id text not null,
  event_type text not null,
  xp_amount bigint not null check (xp_amount > 0),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (source_game, source_transaction_id, event_type)
);

create table public.user_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reward_id uuid not null references public.prestige_rewards (id),
  amount bigint not null,
  currency text not null,
  claimed_at timestamptz not null default now(),
  transaction_id uuid,
  unique (user_id, reward_id)
);

create index xp_events_user_idx on public.xp_events (user_id, created_at desc);
create index user_cosmetics_user_idx on public.user_cosmetics (user_id);

alter table public.cosmetics enable row level security;
alter table public.prestige_levels enable row level security;
alter table public.prestige_rewards enable row level security;
alter table public.user_prestige enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.xp_events enable row level security;
alter table public.user_reward_claims enable row level security;

revoke all on public.cosmetics, public.prestige_levels, public.prestige_rewards,
  public.user_prestige, public.user_cosmetics, public.xp_events, public.user_reward_claims
  from public, anon, authenticated;

grant select on public.cosmetics, public.prestige_levels, public.prestige_rewards to anon, authenticated;
grant select on public.user_prestige, public.user_cosmetics, public.xp_events, public.user_reward_claims to authenticated;

create policy prestige_catalog_read on public.cosmetics for select to anon, authenticated using (active);
create policy prestige_levels_read on public.prestige_levels for select to anon, authenticated using (true);
create policy prestige_rewards_read on public.prestige_rewards for select to anon, authenticated using (true);
create policy prestige_own on public.user_prestige for select to authenticated using (user_id = auth.uid());
create policy cosmetics_own on public.user_cosmetics for select to authenticated using (user_id = auth.uid());
create policy xp_own on public.xp_events for select to authenticated using (user_id = auth.uid());
create policy claims_own on public.user_reward_claims for select to authenticated using (user_id = auth.uid());

insert into public.cosmetics (type, name, description, rarity, asset_key) values
  ('frame', 'Starter Ring', 'A thin ring for the first step on the road.', 'common', 'starter'),
  ('frame', 'Bronze Frame', 'A warm bronze band with a brushed edge.', 'common', 'bronze'),
  ('frame', 'Steel Frame', 'A faceted steel border.', 'common', 'steel'),
  ('frame', 'Silver Frame', 'A cool silver rim with a bright inner line.', 'uncommon', 'silver'),
  ('frame', 'Neon Frame', 'A violet neon circuit.', 'uncommon', 'neon'),
  ('frame', 'Gold Frame', 'A heavy gold border with corner marks.', 'rare', 'gold'),
  ('frame', 'Emerald Frame', 'A cut emerald hexagon.', 'uncommon', 'emerald'),
  ('frame', 'Diamond Frame', 'A crystalline frame reserved for advanced players.', 'epic', 'diamond'),
  ('frame', 'Cosmic Frame', 'An orbit of faint stars.', 'epic', 'cosmic'),
  ('frame', 'Elite Frame', 'A sharp chevron frame.', 'epic', 'elite'),
  ('frame', 'Royal Frame', 'Layered royal ornament.', 'epic', 'royal'),
  ('frame', 'Celestial Frame', 'A star-point frame.', 'legendary', 'celestial'),
  ('frame', 'Legend Frame', 'The final frame on the road.', 'legendary', 'legend'),
  ('crown', 'Gold Crown', 'A small gold crown.', 'rare', 'crown-gold'),
  ('crown', 'Diamond Crown', 'A crown set with a clear stone.', 'epic', 'crown-diamond'),
  ('crown', 'Royal Crown', 'A taller crown with side points.', 'epic', 'crown-royal'),
  ('crown', 'Legend Crown', 'The crown at the end of the road.', 'legendary', 'crown-legend');

insert into public.prestige_levels (level, xp_required, tier, title) values
  (1, 0, 'Rookie', 'Rookie'),
  (2, 50, 'Rookie', 'Rookie'),
  (3, 100, 'Rookie', 'Rookie'),
  (4, 250, 'Rookie', 'Rookie'),
  (5, 500, 'Challenger', 'Challenger'),
  (6, 750, 'Challenger', 'Challenger'),
  (7, 1000, 'Challenger', 'Challenger'),
  (8, 1500, 'Challenger', 'Challenger'),
  (9, 2000, 'Challenger', 'Challenger'),
  (10, 3000, 'Elite', 'Elite'),
  (11, 4000, 'Elite', 'Elite'),
  (12, 5000, 'Elite', 'Elite'),
  (13, 7500, 'Elite', 'Elite'),
  (14, 10000, 'Elite', 'Elite'),
  (15, 15000, 'Master', 'Master'),
  (16, 20000, 'Master', 'Master'),
  (17, 30000, 'Master', 'Master'),
  (18, 50000, 'Legend', 'Legend'),
  (19, 75000, 'Legend', 'Legend'),
  (20, 100000, 'Legend', 'Legend');

insert into public.prestige_rewards (level, reward_type, cosmetic_id, currency, amount)
select v.level, v.reward_type, c.id, v.currency, v.amount
from (values
  (1, 'frame', 'starter', null::text, null::bigint),
  (2, 'frame', 'bronze', null, null),
  (3, 'frame', 'steel', null, null),
  (4, 'frame', 'silver', null, null),
  (5, 'crown', 'crown-gold', null, null),
  (6, 'frame', 'neon', null, null),
  (7, 'frame', 'gold', null, null),
  (8, 'usdc', null, 'USD', 100),
  (9, 'crown', 'crown-diamond', null, null),
  (10, 'frame', 'diamond', null, null),
  (11, 'frame', 'emerald', null, null),
  (12, 'usdc', null, 'USD', 300),
  (13, 'crown', 'crown-royal', null, null),
  (14, 'frame', 'cosmic', null, null),
  (15, 'usdc', null, 'USD', 500),
  (16, 'frame', 'elite', null, null),
  (17, 'crown', 'crown-legend', null, null),
  (18, 'frame', 'royal', null, null),
  (19, 'frame', 'celestial', null, null),
  (20, 'frame', 'legend', null, null)
) as v(level, reward_type, asset_key, currency, amount)
left join public.cosmetics c on c.asset_key = v.asset_key;

create or replace function public.prestige_level_for(p_xp bigint)
returns int
language sql stable set search_path = public as $$
  select coalesce(max(level), 1) from public.prestige_levels where xp_required <= p_xp
$$;
revoke all on function public.prestige_level_for(bigint) from public, anon, authenticated;

create or replace function public.prestige_sync_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare lvl int;
begin
  insert into public.user_prestige (user_id) values (p_user) on conflict (user_id) do nothing;
  select current_level into lvl from public.user_prestige where user_id = p_user;
  insert into public.user_cosmetics (user_id, cosmetic_id)
  select p_user, r.cosmetic_id from public.prestige_rewards r
  where r.cosmetic_id is not null and r.level <= lvl
  on conflict (user_id, cosmetic_id) do nothing;
end $$;
revoke all on function public.prestige_sync_user(uuid) from public, anon, authenticated;

create or replace function public.prestige_award_wager(
  p_user uuid, p_game text, p_source text, p_cents bigint, p_meta jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare xp bigint; inserted int; cur public.user_prestige; nxt int; before_level int;
begin
  if p_user is null or p_cents is null or p_cents <= 0 then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then raise exception 'BAD_GAME'; end if;
  if p_source is null or length(p_source) > 80 then raise exception 'BAD_SOURCE'; end if;
  xp := p_cents / 10;
  if xp <= 0 then return; end if;
  insert into public.user_prestige (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into cur from public.user_prestige where user_id = p_user for update;
  insert into public.xp_events (user_id, source_game, source_transaction_id, event_type, xp_amount, metadata)
  values (p_user, p_game, p_source, 'wager_settled', xp, coalesce(p_meta, '{}'::jsonb) - 'seed' - 'secret' - 'token')
  on conflict (source_game, source_transaction_id, event_type) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    perform public._audit(p_user, 'prestige_replay', null, jsonb_build_object('game', p_game, 'source', p_source));
    return;
  end if;
  before_level := cur.current_level;
  nxt := public.prestige_level_for(cur.total_xp + xp);
  update public.user_prestige
    set total_xp = total_xp + xp, current_level = nxt, updated_at = clock_timestamp()
    where user_id = p_user;
  perform public.prestige_sync_user(p_user);
  perform public._audit(p_user, 'prestige_xp_earned', null, jsonb_build_object('game', p_game, 'xp', xp, 'source', p_source));
  if nxt > before_level then
    perform public._audit(p_user, 'prestige_level_up', null, jsonb_build_object('from', before_level, 'to', nxt));
    perform public._audit(p_user, 'prestige_reward_unlocked', null, jsonb_build_object('level', nxt));
  end if;
end $$;
revoke all on function public.prestige_award_wager(uuid, text, text, bigint, jsonb) from public, anon, authenticated;

create or replace function public.prestige_on_jackpot()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    for p in select user_id, total_amount from public.jackpot_players where game_id = new.id and total_amount > 0 order by user_id loop
      perform public.prestige_award_wager(p.user_id, 'jackpot', new.id::text || ':' || p.user_id::text, p.total_amount, jsonb_build_object('game_id', new.id));
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.prestige_on_jackpot() from public, anon, authenticated;
drop trigger if exists prestige_jackpot_xp on public.jackpot_games;
create trigger prestige_jackpot_xp after update of status on public.jackpot_games
  for each row execute function public.prestige_on_jackpot();

create or replace function public.prestige_on_coinflip()
returns trigger language plpgsql security definer set search_path = public as $$
declare e record;
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    for e in select user_id, amount from public.coinflip_entries where game_id = new.id and amount > 0 order by user_id loop
      perform public.prestige_award_wager(e.user_id, 'coinflip', new.id::text || ':' || e.user_id::text, e.amount, jsonb_build_object('game_id', new.id));
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.prestige_on_coinflip() from public, anon, authenticated;
drop trigger if exists prestige_coinflip_xp on public.coinflip_games;
create trigger prestige_coinflip_xp after update of status on public.coinflip_games
  for each row execute function public.prestige_on_coinflip();

create or replace function public.prestige_on_roulette_bet()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('WON', 'LOST') and old.status = 'ACCEPTED' and new.amount > 0 then
    perform public.prestige_award_wager(new.user_id, 'roulette', new.id::text, new.amount, jsonb_build_object('game_id', new.game_id));
  end if;
  return new;
end $$;
revoke all on function public.prestige_on_roulette_bet() from public, anon, authenticated;
drop trigger if exists prestige_roulette_xp on public.roulette_bets;
create trigger prestige_roulette_xp after update of status on public.roulette_bets
  for each row execute function public.prestige_on_roulette_bet();

create or replace function public.prestige_state()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); up public.user_prestige; nxt record; cur_req bigint; next_req bigint;
begin
  if uid is not null then perform public.prestige_sync_user(uid); end if;
  select * into up from public.user_prestige where user_id = uid;
  if up.user_id is null then
    up.total_xp := 0; up.current_level := 1;
  end if;
  select xp_required into cur_req from public.prestige_levels where level = up.current_level;
  select level, xp_required into nxt from public.prestige_levels where level = up.current_level + 1;
  next_req := nxt.xp_required;
  return jsonb_build_object(
    'signed_in', uid is not null,
    'xp', coalesce(up.total_xp, 0),
    'level', coalesce(up.current_level, 1),
    'tier', (select tier from public.prestige_levels where level = coalesce(up.current_level, 1)),
    'xp_into', greatest(coalesce(up.total_xp, 0) - coalesce(cur_req, 0), 0),
    'xp_span', case when next_req is null then null else next_req - coalesce(cur_req, 0) end,
    'xp_remaining', case when next_req is null then 0 else greatest(next_req - coalesce(up.total_xp, 0), 0) end,
    'next_level', nxt.level,
    'equipped_frame', up.equipped_frame_id,
    'equipped_crown', up.equipped_crown_id,
    'levels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'level', l.level, 'xp_required', l.xp_required, 'tier', l.tier, 'title', l.title,
        'reward_id', r.id, 'reward_type', r.reward_type, 'amount', r.amount, 'currency', r.currency,
        'cosmetic_id', c.id, 'name', coalesce(c.name, case when r.reward_type = 'usdc' then 'USDC reward' else l.title end),
        'description', c.description, 'rarity', c.rarity, 'asset_key', c.asset_key,
        'unlocked', uid is not null and coalesce(up.current_level, 1) >= l.level,
        'claimed', exists (select 1 from public.user_reward_claims cl where cl.user_id = uid and cl.reward_id = r.id)
      ) order by l.level)
      from public.prestige_levels l
      left join public.prestige_rewards r on r.level = l.level
      left join public.cosmetics c on c.id = r.cosmetic_id
    ), '[]'::jsonb)
  );
end $$;
revoke all on function public.prestige_state() from public, anon, authenticated;
grant execute on function public.prestige_state() to anon, authenticated;

create or replace function public.prestige_identities(p_ids uuid[])
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', u.id,
    'level', coalesce(p.current_level, 1),
    'tier', coalesce(l.tier, 'Rookie'),
    'frame', f.asset_key,
    'crown', c.asset_key
  )), '[]'::jsonb)
  from (select distinct id from unnest(coalesce(p_ids, '{}'::uuid[])) as id limit 40) u
  left join public.user_prestige p on p.user_id = u.id
  left join public.prestige_levels l on l.level = coalesce(p.current_level, 1)
  left join public.cosmetics f on f.id = p.equipped_frame_id
  left join public.cosmetics c on c.id = p.equipped_crown_id
$$;
revoke all on function public.prestige_identities(uuid[]) from public, anon, authenticated;
grant execute on function public.prestige_identities(uuid[]) to anon, authenticated;

create or replace function public.prestige_equip(p_cosmetic uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.cosmetics;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  if p_cosmetic is null then raise exception 'BAD_REQUEST'; end if;
  perform public.prestige_sync_user(uid);
  select * into c from public.cosmetics where id = p_cosmetic and active;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not exists (select 1 from public.user_cosmetics where user_id = uid and cosmetic_id = c.id) then
    raise exception 'LOCKED';
  end if;
  if c.type = 'frame' then
    update public.user_prestige set equipped_frame_id = c.id, updated_at = clock_timestamp() where user_id = uid;
  elsif c.type = 'crown' then
    update public.user_prestige set equipped_crown_id = c.id, updated_at = clock_timestamp() where user_id = uid;
  else
    raise exception 'BAD_REQUEST';
  end if;
  perform public._audit(uid, 'prestige_cosmetic_equipped', null, jsonb_build_object('cosmetic', c.id, 'type', c.type));
  return public.prestige_state();
end $$;
revoke all on function public.prestige_equip(uuid) from public, anon, authenticated;
grant execute on function public.prestige_equip(uuid) to authenticated;

create or replace function public.prestige_claim(p_reward uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.prestige_rewards; up public.user_prestige;
  v_asset text; v_type text; v_bank public.account_kind; tx uuid; inserted int;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  select * into r from public.prestige_rewards where id = p_reward;
  if not found or r.reward_type <> 'usdc' or r.amount is null or r.amount <= 0 then raise exception 'NOT_A_REWARD'; end if;
  select * into up from public.user_prestige where user_id = uid for update;
  if up.user_id is null or up.current_level < r.level then raise exception 'LOCKED'; end if;
  insert into public.user_reward_claims (user_id, reward_id, amount, currency)
  values (uid, r.id, r.amount, coalesce(r.currency, 'USD'))
  on conflict (user_id, reward_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then raise exception 'ALREADY_CLAIMED'; end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('prestige_reward', 'prestige:reward:' || uid::text || ':' || r.id::text, v_type, uid, 'Prestige milestone')
    returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -r.amount);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), r.amount);
  update public.user_reward_claims set transaction_id = tx where user_id = uid and reward_id = r.id;
  perform public._audit(uid, 'prestige_reward_claimed', null, jsonb_build_object('reward', r.id, 'cents', r.amount, 'tx', tx));
  return public.prestige_state();
end $$;
revoke all on function public.prestige_claim(uuid) from public, anon, authenticated;
grant execute on function public.prestige_claim(uuid) to authenticated;

create or replace function public.prestige_track(p_event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if p_event is distinct from 'prestige_page_viewed' then raise exception 'BAD_REQUEST'; end if;
  perform public._audit(auth.uid(), 'prestige_page_viewed', null, '{}'::jsonb);
end $$;
revoke all on function public.prestige_track(text) from public, anon, authenticated;
grant execute on function public.prestige_track(text) to authenticated;

create or replace function public.admin_prestige_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'xp_total', coalesce((select sum(xp_amount) from public.xp_events), 0),
    'by_game', coalesce((select jsonb_object_agg(source_game, xp) from (
      select source_game, sum(xp_amount) xp from public.xp_events group by source_game
    ) g), '{}'::jsonb),
    'users_by_level', coalesce((select jsonb_object_agg(current_level, n) from (
      select current_level, count(*) n from public.user_prestige group by current_level
    ) l), '{}'::jsonb),
    'cosmetics_unlocked', (select count(*) from public.user_cosmetics),
    'rewards_claimed', (select count(*) from public.user_reward_claims),
    'usdc_cents', coalesce((select sum(amount) from public.user_reward_claims), 0),
    'replays', (select count(*) from public.audit_logs where action = 'prestige_replay'),
    'recent', coalesce((select jsonb_agg(x) from (
      select id, user_id, source_game, event_type, xp_amount, created_at
      from public.xp_events order by created_at desc limit 12
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.admin_prestige_summary() from public, anon, authenticated;
grant execute on function public.admin_prestige_summary() to authenticated;

grant all on public.cosmetics, public.prestige_levels, public.prestige_rewards,
  public.user_prestige, public.user_cosmetics, public.xp_events, public.user_reward_claims
  to service_role;
grant execute on function public.prestige_award_wager(uuid, text, text, bigint, jsonb) to service_role;
grant execute on function public.prestige_sync_user(uuid) to service_role;
grant execute on function public.prestige_level_for(bigint) to service_role;
