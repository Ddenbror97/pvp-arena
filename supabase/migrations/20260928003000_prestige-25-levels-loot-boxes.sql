-- Prestige grows to 25 levels. Existing reward rows move to their new level in
-- place (ids unchanged, so claims and unlocked cosmetics carry over). Cash
-- milestones rise with level; loot boxes at 5 / 10 / 15 pay a server-drawn
-- USD amount from one public odds table.

insert into public.prestige_levels (level, xp_required, tier, title) values
  (21, 125000, 'Mythic', 'Mythic'),
  (22, 150000, 'Mythic', 'Mythic'),
  (23, 200000, 'Mythic', 'Mythic'),
  (24, 250000, 'Mythic', 'Mythic'),
  (25, 300000, 'Mythic', 'Mythic')
on conflict (level) do nothing;

alter table public.prestige_rewards drop constraint prestige_rewards_reward_type_check;
alter table public.prestige_rewards add constraint prestige_rewards_reward_type_check
  check (reward_type in ('frame', 'crown', 'usdc', 'lootbox'));

alter table public.prestige_rewards drop constraint prestige_rewards_level_key;
update public.prestige_rewards r set level = m.to_level
from (values
  (5, 6), (6, 7), (7, 9), (9, 11), (10, 13), (11, 14), (13, 17), (14, 18),
  (15, 16), (16, 19), (17, 21), (18, 22), (19, 24), (20, 25)
) as m(from_level, to_level)
where r.level = m.from_level;

insert into public.prestige_rewards (level, reward_type, currency, amount, metadata) values
  (5, 'lootbox', 'USD', null, '{"box": "silver", "name": "Silver Loot Box", "description": "Open it for a random USD reward between $0.50 and $100."}'),
  (10, 'lootbox', 'USD', null, '{"box": "purple", "name": "Purple Loot Box", "description": "Open it for a random USD reward between $0.50 and $100."}'),
  (15, 'lootbox', 'USD', null, '{"box": "green", "name": "Green Loot Box", "description": "Open it for a random USD reward between $0.50 and $100."}'),
  (20, 'usdc', 'USD', 500, '{}'),
  (23, 'usdc', 'USD', 1000, '{}');
alter table public.prestige_rewards add constraint prestige_rewards_level_key unique (level);

-- Weights are out of 10,000. Average payout is $2.97.
create table public.prestige_loot_odds (
  amount bigint primary key check (amount > 0),
  weight int not null check (weight > 0)
);
insert into public.prestige_loot_odds (amount, weight) values
  (50, 3400), (100, 3000), (200, 1500), (500, 1150), (1000, 650), (2500, 270), (10000, 30);

alter table public.prestige_loot_odds enable row level security;
revoke all on public.prestige_loot_odds from public, anon, authenticated;
grant select on public.prestige_loot_odds to anon, authenticated;
grant all on public.prestige_loot_odds to service_role;
create policy prestige_loot_odds_read on public.prestige_loot_odds for select to anon, authenticated using (true);

-- Uniform draw over the total weight: rejection sampling on 32 CSPRNG bits keeps every weight exact.
create or replace function public._prestige_loot_roll()
returns bigint language plpgsql volatile set search_path = public as $$
declare total bigint; raw bigint; pick bigint; acc bigint := 0; o record;
begin
  select sum(weight) into total from public.prestige_loot_odds;
  if coalesce(total, 0) <= 0 then raise exception 'NO_ODDS'; end if;
  loop
    raw := ('x' || lpad(encode(extensions.gen_random_bytes(4), 'hex'), 16, '0'))::bit(64)::bigint;
    exit when raw < (4294967296 / total) * total;
  end loop;
  pick := raw % total;
  for o in select amount, weight from public.prestige_loot_odds order by amount loop
    acc := acc + o.weight;
    if pick < acc then return o.amount; end if;
  end loop;
  raise exception 'NO_ODDS';
end $$;
revoke all on function public._prestige_loot_roll() from public, anon, authenticated;

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
    'loot_odds', coalesce((
      select jsonb_agg(jsonb_build_object('amount', o.amount, 'weight', o.weight) order by o.amount)
      from public.prestige_loot_odds o
    ), '[]'::jsonb),
    'levels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'level', l.level, 'xp_required', l.xp_required, 'tier', l.tier, 'title', l.title,
        'reward_id', r.id, 'reward_type', r.reward_type, 'amount', r.amount, 'currency', r.currency,
        'cosmetic_id', c.id,
        'name', coalesce(c.name, r.metadata->>'name', case when r.reward_type = 'usdc' then 'USDC reward' else l.title end),
        'description', coalesce(c.description, r.metadata->>'description'), 'rarity', c.rarity, 'asset_key', c.asset_key,
        'box', r.metadata->>'box',
        'unlocked', uid is not null and coalesce(up.current_level, 1) >= l.level,
        'claimed', cl.id is not null,
        'won', case when r.reward_type = 'lootbox' then cl.amount end
      ) order by l.level)
      from public.prestige_levels l
      left join public.prestige_rewards r on r.level = l.level
      left join public.cosmetics c on c.id = r.cosmetic_id
      left join public.user_reward_claims cl on cl.user_id = uid and cl.reward_id = r.id
    ), '[]'::jsonb)
  );
end $$;
revoke all on function public.prestige_state() from public, anon, authenticated;
grant execute on function public.prestige_state() to anon, authenticated;

create or replace function public.prestige_claim(p_reward uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.prestige_rewards; up public.user_prestige;
  v_asset text; v_type text; v_bank public.account_kind; tx uuid; inserted int; v_amount bigint;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  select * into r from public.prestige_rewards where id = p_reward;
  if not found or r.reward_type not in ('usdc', 'lootbox')
     or (r.reward_type = 'usdc' and (r.amount is null or r.amount <= 0)) then
    raise exception 'NOT_A_REWARD';
  end if;
  select * into up from public.user_prestige where user_id = uid for update;
  if up.user_id is null or up.current_level < r.level then raise exception 'LOCKED'; end if;
  v_amount := case when r.reward_type = 'lootbox' then public._prestige_loot_roll() else r.amount end;
  insert into public.user_reward_claims (user_id, reward_id, amount, currency)
  values (uid, r.id, v_amount, coalesce(r.currency, 'USD'))
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
    values ('prestige_reward', 'prestige:reward:' || uid::text || ':' || r.id::text, v_type, uid,
            case when r.reward_type = 'lootbox' then 'Prestige loot box' else 'Prestige milestone' end)
    returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -v_amount);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), v_amount);
  update public.user_reward_claims set transaction_id = tx where user_id = uid and reward_id = r.id;
  perform public._audit(uid, 'prestige_reward_claimed', null,
    jsonb_build_object('reward', r.id, 'type', r.reward_type, 'cents', v_amount, 'tx', tx));
  return public.prestige_state();
end $$;
revoke all on function public.prestige_claim(uuid) from public, anon, authenticated;
grant execute on function public.prestige_claim(uuid) to authenticated;
