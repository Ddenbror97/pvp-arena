-- Poker on leaderboards, under the same deposit-only rule as every other game.
--
-- A player's poker wager for a hand is their contested chips (poker_hand_players.wagered, the
-- same stake playthrough uses) in hands that reached the flop; uncalled chips never count. The deposit-funded
-- part is that wager times the eligible share of the chips they put into the pot, which
-- _withdraw_basis_apply_tx already works out per hand. It is now recorded in
-- withdraw_basis_poker_put (upserted, so a full basis rebuild rewrites the same rows).
-- Hands settled before this migration have no record and do not count.

create table public.withdraw_basis_poker_put (
  hand_id bigint not null,
  user_id uuid not null,
  put bigint not null check (put > 0),
  eligible bigint not null check (eligible >= 0 and eligible <= put),
  primary key (hand_id, user_id)
);
alter table public.withdraw_basis_poker_put enable row level security;
revoke all on public.withdraw_basis_poker_put from public, anon, authenticated;
grant all on public.withdraw_basis_poker_put to service_role;

create or replace function public._withdraw_basis_apply_tx(
  p_tx_id uuid,
  p_kind text,
  p_game_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  leg record;
  v_game text := substring(p_kind from '^(.+)_(?:entry|refund|settlement)$');
  v_pot_e bigint;
  v_pot_b bigint;
  v_pot bigint;
  v_payout bigint;
  v_gain_e bigint;
  v_part_e bigint;
  v_part_b bigint;
  v_hold bigint;
begin
  if p_kind = 'deposit' then
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where p.amount > 0), 0) as amt
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where p.amount > 0), 0) > 0
    loop
      insert into withdraw_basis_bucket (user_id, deposits, eligible, bonus)
      values (leg.owner_id, leg.amt, leg.amt, 0)
      on conflict (user_id) do update
        set deposits = withdraw_basis_bucket.deposits + excluded.deposits,
            eligible = withdraw_basis_bucket.eligible + excluded.eligible;
    end loop;

  elsif p_kind in (
    'promo_reward', 'referral_reward', 'leaderboard_prize',
    'prestige_reward', 'partner_credit', 'slot_bonus'
  ) then
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where p.amount > 0), 0) as amt
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where p.amount > 0), 0) > 0
    loop
      insert into withdraw_basis_bucket (user_id, deposits, eligible, bonus)
      values (leg.owner_id, 0, 0, leg.amt)
      on conflict (user_id) do update
        set bonus = withdraw_basis_bucket.bonus + excluded.bonus;
    end loop;

  elsif p_kind = 'withdrawal' or p_kind = 'refund' then
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount), 0) as net,
        coalesce(sum(p.amount) filter (where w.kind = 'user_locked'), 0) as locked_delta
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
    loop
      insert into withdraw_basis_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
      if p_kind = 'withdrawal' and leg.net = 0 and leg.locked_delta > 0 then
        select b.eligible, b.bonus into v_part_e, v_part_b
        from withdraw_basis_bucket b where b.user_id = leg.owner_id;
        v_part_e := least(greatest(v_part_e, 0), leg.locked_delta);
        v_part_b := leg.locked_delta - v_part_e;
        update withdraw_basis_bucket
          set eligible = greatest(eligible - v_part_e, 0),
              bonus = greatest(bonus - v_part_b, 0)
          where user_id = leg.owner_id;
        insert into withdraw_basis_hold (user_id, eligible_part, bonus_part)
        values (leg.owner_id, v_part_e, v_part_b);
      elsif p_kind = 'refund' and leg.net = 0 and leg.locked_delta < 0 then
        select h.eligible_part, h.bonus_part, h.id
          into v_part_e, v_part_b, v_hold
        from withdraw_basis_hold h
        where h.user_id = leg.owner_id
        order by h.id desc
        limit 1;
        if found then
          update withdraw_basis_bucket
            set eligible = eligible + v_part_e, bonus = bonus + v_part_b
            where user_id = leg.owner_id;
          delete from withdraw_basis_hold where id = v_hold;
        end if;
      end if;
    end loop;

  elsif p_kind = 'poker_hand' and p_game_id is not null then
    -- The pot: contributions leave each seat stake pro rata, payouts take the pot's mix.
    v_pot_e := 0;
    v_pot := 0;
    for leg in
      select w.owner_id, hp.seat_id,
        coalesce(-sum(p.amount) filter (where p.amount < 0), 0) as put
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      join poker_hand_players hp on hp.hand_id = p_game_id and hp.user_id = w.owner_id
      where p.tx_id = p_tx_id and w.kind = 'user_locked'
      group by w.owner_id, hp.seat_id
      having coalesce(-sum(p.amount) filter (where p.amount < 0), 0) > 0
      order by w.owner_id
    loop
      select greatest(s.eligible, 0), greatest(s.bonus, 0) into v_part_e, v_part_b
      from withdraw_basis_stake s
      where s.user_id = leg.owner_id and s.game = 'poker' and s.game_id = leg.seat_id;
      v_part_e := coalesce(v_part_e, 0);
      v_part_b := coalesce(v_part_b, 0);
      if v_part_e + v_part_b > 0 then
        v_gain_e := least(v_part_e, (leg.put * v_part_e) / (v_part_e + v_part_b));
      else
        v_gain_e := 0;
      end if;
      update withdraw_basis_stake
        set eligible = greatest(eligible - v_gain_e, 0),
            bonus = greatest(bonus - (leg.put - v_gain_e), 0)
        where user_id = leg.owner_id and game = 'poker' and game_id = leg.seat_id;
      insert into withdraw_basis_poker_put (hand_id, user_id, put, eligible)
      values (p_game_id, leg.owner_id, leg.put, v_gain_e)
      on conflict (hand_id, user_id) do update set put = excluded.put, eligible = excluded.eligible;
      v_pot_e := v_pot_e + v_gain_e;
      v_pot := v_pot + leg.put;
    end loop;
    for leg in
      select w.owner_id, hp.seat_id,
        coalesce(sum(p.amount) filter (where p.amount > 0), 0) as amt
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      join poker_hand_players hp on hp.hand_id = p_game_id and hp.user_id = w.owner_id
      where p.tx_id = p_tx_id and w.kind = 'user_locked'
      group by w.owner_id, hp.seat_id
      having coalesce(sum(p.amount) filter (where p.amount > 0), 0) > 0
      order by w.owner_id
    loop
      if v_pot > 0 then
        v_gain_e := (leg.amt * v_pot_e) / v_pot;
      else
        v_gain_e := 0;
      end if;
      insert into withdraw_basis_stake (user_id, game, game_id, eligible, bonus)
      values (leg.owner_id, 'poker', leg.seat_id, v_gain_e, leg.amt - v_gain_e)
      on conflict (user_id, game, game_id) do update
        set eligible = withdraw_basis_stake.eligible + excluded.eligible,
            bonus = withdraw_basis_stake.bonus + excluded.bonus;
    end loop;

  elsif p_kind like '%\_entry' escape '\' and p_game_id is not null then
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where w.kind = 'user_locked' and p.amount > 0), 0) as stake
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where w.kind = 'user_locked' and p.amount > 0), 0) > 0
    loop
      insert into withdraw_basis_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
      select b.eligible into v_part_e from withdraw_basis_bucket b where b.user_id = leg.owner_id;
      v_part_e := least(greatest(v_part_e, 0), leg.stake);
      v_part_b := leg.stake - v_part_e;
      update withdraw_basis_bucket
        set eligible = greatest(eligible - v_part_e, 0),
            bonus = greatest(bonus - v_part_b, 0)
        where user_id = leg.owner_id;
      insert into withdraw_basis_stake (user_id, game, game_id, eligible, bonus)
      values (leg.owner_id, v_game, p_game_id, v_part_e, v_part_b)
      on conflict (user_id, game, game_id) do update
        set eligible = withdraw_basis_stake.eligible + excluded.eligible,
            bonus = withdraw_basis_stake.bonus + excluded.bonus;
      insert into withdraw_basis_ledger_stake (ledger_tx_id, user_id, eligible, bonus, stake_total)
      values (p_tx_id, leg.owner_id, v_part_e, v_part_b, leg.stake)
      on conflict (ledger_tx_id) do update
        set eligible = excluded.eligible,
            bonus = excluded.bonus,
            stake_total = excluded.stake_total,
            user_id = excluded.user_id;
    end loop;

  elsif p_kind like '%\_refund' escape '\' and p_game_id is not null then
    delete from withdraw_basis_ledger_stake s
    using ledger_transactions t
    where t.game_id = p_game_id and s.ledger_tx_id = t.id
      and t.kind::text = v_game || '_entry';
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) as back
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) > 0
    loop
      select s.eligible, s.bonus into v_part_e, v_part_b
      from withdraw_basis_stake s
      where s.user_id = leg.owner_id and s.game = v_game and s.game_id = p_game_id;
      if found then
        update withdraw_basis_bucket
          set eligible = eligible + v_part_e, bonus = bonus + v_part_b
          where user_id = leg.owner_id;
        delete from withdraw_basis_stake
          where user_id = leg.owner_id and game = v_game and game_id = p_game_id;
      end if;
    end loop;

  elsif p_kind like '%\_settlement' escape '\' and p_game_id is not null then
    if not exists (select 1 from withdraw_basis_stake s where s.game = v_game and s.game_id = p_game_id) then
      for leg in
        select w.owner_id,
          coalesce(sum(-p.amount) filter (where w.kind = 'user_locked' and p.amount < 0), 0) as stake
        from ledger_postings p
        join wallet_accounts w on w.id = p.account_id
        where p.tx_id = p_tx_id and w.owner_id is not null
        group by w.owner_id
        having coalesce(sum(-p.amount) filter (where w.kind = 'user_locked' and p.amount < 0), 0) > 0
      loop
        insert into withdraw_basis_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
        select b.eligible into v_part_e from withdraw_basis_bucket b where b.user_id = leg.owner_id;
        v_part_e := least(greatest(v_part_e, 0), leg.stake);
        v_part_b := leg.stake - v_part_e;
        update withdraw_basis_bucket
          set eligible = greatest(eligible - v_part_e, 0), bonus = greatest(bonus - v_part_b, 0)
          where user_id = leg.owner_id;
        insert into withdraw_basis_stake (user_id, game, game_id, eligible, bonus)
        values (leg.owner_id, v_game, p_game_id, v_part_e, v_part_b)
        on conflict (user_id, game, game_id) do update
          set eligible = withdraw_basis_stake.eligible + excluded.eligible,
              bonus = withdraw_basis_stake.bonus + excluded.bonus;
      end loop;
    end if;
    select coalesce(sum(s.eligible), 0), coalesce(sum(s.bonus), 0)
      into v_pot_e, v_pot_b
    from withdraw_basis_stake s
    where s.game = v_game and s.game_id = p_game_id;
    v_pot := v_pot_e + v_pot_b;
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) as amt
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) > 0
    loop
      v_payout := leg.amt;
      insert into withdraw_basis_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
      if v_pot > 0 then
        v_gain_e := (v_payout * v_pot_e) / v_pot;
      else
        v_gain_e := 0;
      end if;
      update withdraw_basis_bucket
        set eligible = eligible + v_gain_e,
            bonus = bonus + (v_payout - v_gain_e)
        where user_id = leg.owner_id;
    end loop;
    delete from withdraw_basis_stake where game = v_game and game_id = p_game_id;
  end if;
end $$;
revoke all on function public._withdraw_basis_apply_tx(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public._withdraw_basis_apply_tx(uuid, text, bigint) to service_role;


create or replace function public._lb_poker_deposit_cents(p_hand bigint, p_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select least(hp.wagered, (hp.wagered * x.eligible) / x.put)
    from public.poker_hand_players hp
    join public.poker_hands h on h.id = hp.hand_id
    join public.withdraw_basis_poker_put x on x.hand_id = hp.hand_id and x.user_id = hp.user_id
    where hp.hand_id = p_hand and hp.user_id = p_user and hp.wagered > 0
      and coalesce(array_length(h.board, 1), 0) >= 3
  ), 0);
$$;
revoke all on function public._lb_poker_deposit_cents(bigint, uuid) from public, anon, authenticated;

create or replace function public._lb_poker_event_id(p_hand bigint, p_user uuid)
returns uuid
language sql
immutable
set search_path = public
as $$ select md5('poker:' || p_hand::text || ':' || p_user::text)::uuid $$;
revoke all on function public._lb_poker_event_id(bigint, uuid) from public, anon, authenticated;

create index if not exists poker_hands_completed_created_idx
  on public.poker_hands (created_at) where status = 'COMPLETED';

alter table public.leaderboard_templates drop constraint leaderboard_templates_games;
alter table public.leaderboard_templates add constraint leaderboard_templates_games
  check (cardinality(allowed_games) > 0 and allowed_games <@ array['jackpot', 'coinflip', 'roulette', 'slott', 'poker']);
alter table public.leaderboard_campaigns drop constraint leaderboard_campaigns_games;
alter table public.leaderboard_campaigns add constraint leaderboard_campaigns_games
  check (cardinality(games) > 0 and games <@ array['jackpot', 'coinflip', 'roulette', 'slott', 'poker']);
alter table public.leaderboard_wager_events drop constraint leaderboard_wager_events_source_game_type_check;
alter table public.leaderboard_wager_events add constraint leaderboard_wager_events_source_game_type_check
  check (source_game_type in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker'));

create or replace function public.leaderboard_admin_save_template(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._lb_require_admin();
  t public.leaderboard_templates;
  g text[];
  min_s integer; max_s integer; cap bigint; tiers integer;
  saved uuid;
begin
  if jsonb_typeof(p) <> 'object' or jsonb_typeof(p -> 'allowed_games') <> 'array' then raise exception 'BAD_INPUT'; end if;
  if p ->> 'name' is null or char_length(btrim(p ->> 'name')) not between 3 and 60 then raise exception 'BAD_NAME'; end if;
  if coalesce(char_length(p ->> 'description'), 0) > 500 then raise exception 'BAD_DESCRIPTION'; end if;
  if coalesce(p ->> 'status', 'active') not in ('active', 'archived') then raise exception 'BAD_STATUS'; end if;
  min_s := (p ->> 'min_duration_seconds')::integer;
  max_s := (p ->> 'max_duration_seconds')::integer;
  cap := (p ->> 'max_prize_pool_cents')::bigint;
  tiers := coalesce((p ->> 'max_tiers')::integer, 10);
  if min_s is null or max_s is null or min_s < 3600 or max_s < min_s or max_s > 7776000 then raise exception 'BAD_DURATION'; end if;
  if cap is null or cap < 100 or cap > 10000000000 then raise exception 'BAD_CAP'; end if;
  if tiers < 1 or tiers > 20 then raise exception 'TOO_MANY_TIERS'; end if;
  select coalesce(array_agg(distinct x order by x), '{}') into g from jsonb_array_elements_text(p -> 'allowed_games') x;
  if g is null or cardinality(g) = 0 or exists (select 1 from unnest(g) game where game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker')) then
    raise exception 'BAD_GAMES';
  end if;
  if nullif(p ->> 'id', '') is null then
    insert into leaderboard_templates (name, description, status, min_duration_seconds, max_duration_seconds, max_prize_pool_cents, allowed_games, max_tiers, created_by)
    values (btrim(p ->> 'name'), coalesce(p ->> 'description', ''), p ->> 'status', min_s, max_s, cap, g, tiers, uid)
    returning id into saved;
  else
    select * into t from leaderboard_templates where id = (p ->> 'id')::uuid for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    update leaderboard_templates set
      name = btrim(p ->> 'name'), description = coalesce(p ->> 'description', ''), status = p ->> 'status',
      min_duration_seconds = min_s, max_duration_seconds = max_s, max_prize_pool_cents = cap,
      allowed_games = g, max_tiers = tiers, version = version + 1, updated_at = clock_timestamp()
    where id = t.id;
    saved := t.id;
  end if;
  perform public._audit(uid, 'leaderboard_template_saved', null, jsonb_build_object('template_id', saved, 'version_bump', t.id is not null));
  return public.leaderboard_admin_templates();
exception when invalid_text_representation then
  raise exception 'BAD_INPUT';
end $$;

create or replace function public._lb_inflight(p_campaign uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare c public.leaderboard_campaigns;
begin
  select * into c from leaderboard_campaigns where id = p_campaign;
  if not found then return false; end if;
  if 'jackpot' = any (c.games) and exists (
    select 1 from jackpot_entries e join jackpot_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  if 'coinflip' = any (c.games) and exists (
    select 1 from coinflip_entries e join coinflip_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  if 'roulette' = any (c.games) and exists (
    select 1 from roulette_bets b join roulette_games g on g.id = b.game_id
    where g.account_type = 'real' and b.status = 'ACCEPTED' and g.status not in ('COMPLETED', 'CANCELLED')
      and b.created_at >= c.starts_at and b.created_at < c.ends_at
      and b.amount >= c.min_wager_cents and b.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = b.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  if 'slott' = any (c.games) and exists (
    select 1 from slot_entries e join slot_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  if 'poker' = any (c.games) and exists (
    select 1 from poker_hand_players hp
    join poker_hands h on h.id = hp.hand_id
    join poker_tables t on t.id = h.table_id
    where t.account_type = 'real' and h.status in ('COMMIT', 'BETTING', 'SETTLEMENT')
      and h.created_at >= c.starts_at and h.created_at < c.ends_at
      and hp.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = hp.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  return false;
end $$;
revoke all on function public._lb_inflight(uuid) from public, anon, authenticated;

create or replace function public._lb_sync(p_campaign uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.leaderboard_campaigns;
  n integer;
  caught boolean := true;
begin
  select * into c from leaderboard_campaigns where id = p_campaign for update;
  if not found or c.status not in ('active', 'closing') then return true; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'jackpot', e.id, e.game_id, dep.cents, e.created_at
  from jackpot_entries e
  join jackpot_games g on g.id = e.game_id
  cross join lateral (select public._lb_wager_deposit_cents(e.ledger_tx_id, e.amount) as cents) dep
  where 'jackpot' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and dep.cents >= greatest(c.min_wager_cents, 1) and e.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'jackpot' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'coinflip', e.id, e.game_id, dep.cents, e.created_at
  from coinflip_entries e
  join coinflip_games g on g.id = e.game_id
  cross join lateral (select public._lb_wager_deposit_cents(e.ledger_tx_id, e.amount) as cents) dep
  where 'coinflip' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and dep.cents >= greatest(c.min_wager_cents, 1) and e.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'coinflip' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, b.user_id, 'roulette', b.id, b.game_id, dep.cents, b.created_at
  from roulette_bets b
  join roulette_games g on g.id = b.game_id
  cross join lateral (select public._lb_wager_deposit_cents(b.ledger_tx_id, b.amount) as cents) dep
  where 'roulette' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and b.status in ('WON', 'LOST')
    and b.created_at >= c.starts_at and b.created_at < c.ends_at
    and dep.cents >= greatest(c.min_wager_cents, 1) and b.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = b.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'roulette' and w.source_event_id = b.id
    )
  order by b.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'slott', e.id, e.game_id, dep.cents, e.created_at
  from slot_entries e
  join slot_games g on g.id = e.game_id
  cross join lateral (select public._lb_wager_deposit_cents(e.ledger_tx_id, e.amount) as cents) dep
  where 'slott' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and dep.cents >= greatest(c.min_wager_cents, 1) and e.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'slott' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, hp.user_id, 'poker', public._lb_poker_event_id(h.id, hp.user_id), h.id, dep.cents, h.created_at
  from poker_hands h
  join poker_tables t on t.id = h.table_id
  join poker_hand_players hp on hp.hand_id = h.id
  cross join lateral (select public._lb_poker_deposit_cents(h.id, hp.user_id) as cents) dep
  where 'poker' = any (c.games)
    and h.status = 'COMPLETED' and t.account_type = 'real'
    and h.created_at >= c.starts_at and h.created_at < c.ends_at
    and dep.cents >= greatest(c.min_wager_cents, 1) and hp.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = hp.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'poker'
        and w.source_event_id = public._lb_poker_event_id(h.id, hp.user_id)
    )
  order by h.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  update leaderboard_wager_events w set voided = true
  where w.campaign_id = c.id and not w.voided and c.audience = 'attributed'
    and not exists (
      select 1 from partner_referrals r
      where r.user_id = w.player_id and r.partner_user_id = c.partner_user_id
    );

  update leaderboard_wager_events w set voided = true
  where w.campaign_id = c.id and not w.voided and (
    (w.source_game_type = 'jackpot' and not exists (
      select 1 from jackpot_entries e join jackpot_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
    or (w.source_game_type = 'coinflip' and not exists (
      select 1 from coinflip_entries e join coinflip_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
    or (w.source_game_type = 'roulette' and not exists (
      select 1 from roulette_bets b join roulette_games g on g.id = b.game_id
      where b.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real' and b.status in ('WON', 'LOST')))
    or (w.source_game_type = 'slott' and not exists (
      select 1 from slot_entries e join slot_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
    or (w.source_game_type = 'poker' and not exists (
      select 1 from poker_hands h join poker_tables t on t.id = h.table_id
      where h.id = w.source_game_id and h.status = 'COMPLETED' and t.account_type = 'real'))
  );

  update leaderboard_wager_events w
    set qualifying_cents = sub.cents
  from (
    select w2.id,
      case w2.source_game_type
        when 'jackpot' then public._lb_wager_deposit_cents(
          (select je.ledger_tx_id from jackpot_entries je where je.id = w2.source_event_id),
          (select je.amount from jackpot_entries je where je.id = w2.source_event_id))
        when 'coinflip' then public._lb_wager_deposit_cents(
          (select ce.ledger_tx_id from coinflip_entries ce where ce.id = w2.source_event_id),
          (select ce.amount from coinflip_entries ce where ce.id = w2.source_event_id))
        when 'roulette' then public._lb_wager_deposit_cents(
          (select rb.ledger_tx_id from roulette_bets rb where rb.id = w2.source_event_id),
          (select rb.amount from roulette_bets rb where rb.id = w2.source_event_id))
        when 'slott' then public._lb_wager_deposit_cents(
          (select se.ledger_tx_id from slot_entries se where se.id = w2.source_event_id),
          (select se.amount from slot_entries se where se.id = w2.source_event_id))
        when 'poker' then public._lb_poker_deposit_cents(w2.source_game_id, w2.player_id)
      end as cents
    from leaderboard_wager_events w2
    where w2.campaign_id = c.id and not w2.voided
  ) sub
  where w.id = sub.id and sub.cents > 0 and sub.cents >= c.min_wager_cents
    and w.qualifying_cents is distinct from sub.cents;

  update leaderboard_wager_events w set voided = true
  where w.campaign_id = c.id and not w.voided
    and (
      case w.source_game_type
        when 'jackpot' then public._lb_wager_deposit_cents(
          (select je.ledger_tx_id from jackpot_entries je where je.id = w.source_event_id),
          (select je.amount from jackpot_entries je where je.id = w.source_event_id))
        when 'coinflip' then public._lb_wager_deposit_cents(
          (select ce.ledger_tx_id from coinflip_entries ce where ce.id = w.source_event_id),
          (select ce.amount from coinflip_entries ce where ce.id = w.source_event_id))
        when 'roulette' then public._lb_wager_deposit_cents(
          (select rb.ledger_tx_id from roulette_bets rb where rb.id = w.source_event_id),
          (select rb.amount from roulette_bets rb where rb.id = w.source_event_id))
        when 'slott' then public._lb_wager_deposit_cents(
          (select se.ledger_tx_id from slot_entries se where se.id = w.source_event_id),
          (select se.amount from slot_entries se where se.id = w.source_event_id))
        when 'poker' then public._lb_poker_deposit_cents(w.source_game_id, w.player_id)
      end
     ) < greatest(c.min_wager_cents, 1);

  insert into leaderboard_entries (campaign_id, player_id, qualifying_cents, last_event_at)
  select w.campaign_id, w.player_id, sum(w.qualifying_cents), max(w.event_at)
  from leaderboard_wager_events w
  where w.campaign_id = c.id and not w.voided
  group by w.campaign_id, w.player_id
  on conflict (campaign_id, player_id) do update
    set qualifying_cents = excluded.qualifying_cents,
        last_event_at = excluded.last_event_at,
        updated_at = clock_timestamp();

  update leaderboard_entries e set qualifying_cents = 0, rank = null, updated_at = clock_timestamp()
  where e.campaign_id = c.id and not exists (
    select 1 from leaderboard_wager_events w
    where w.campaign_id = e.campaign_id and w.player_id = e.player_id and not w.voided and w.qualifying_cents >= c.min_wager_cents
  );

  with ranked as (
    select player_id, row_number() over (
      order by qualifying_cents desc, last_event_at asc, player_id asc
    ) as n
    from leaderboard_entries
    where campaign_id = c.id and qualifying_cents > 0
  )
  update leaderboard_entries e
    set rank = ranked.n, updated_at = clock_timestamp()
  from ranked
  where e.campaign_id = c.id and e.player_id = ranked.player_id and e.rank is distinct from ranked.n;

  update leaderboard_campaigns set ranked_at = clock_timestamp(), updated_at = clock_timestamp() where id = c.id;
  return caught;
end $$;
revoke all on function public._lb_sync(uuid) from public, anon, authenticated;

create or replace function public._lb_rules(c public.leaderboard_campaigns)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_path_query_array(jsonb_build_array(
    'Runs ' || to_char(c.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC to '
      || to_char(c.ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC.',
    'Games: ' || array_to_string(c.games, ', ') || '.',
    case when c.audience = 'attributed'
      then 'Players who joined through this host''s partner link or promo code are on this board.'
      else 'Any player who stakes in this window can place, except the host.'
    end,
    'Your rank is the total you wager from deposited money on finished games in that window.',
    'Only stakes paid from money you deposited, and winnings made with it, count. Promo codes, referral, partner, and prize credits never count, and neither do winnings from them.',
    'Cancelled games, refunds, test-credit games, and the host''s own stakes do not count. Only the match stake counts.',
    case when 'poker' = any (c.games)
      then 'Poker counts the chips you put into contested pots in hands that reach the flop, from deposited money. Uncalled bets returned to you do not count.'
    end,
    case when c.min_wager_cents > 0
      then 'Each counted stake must include at least ' || trim(to_char(c.min_wager_cents / 100.0, 'FM999999990.00')) || ' USD from deposited money.'
      else 'Any deposit-funded stake the game accepts counts.' end,
    'Stakes are in USD.',
    'A higher total ranks higher. If the totals match, the earlier last stake ranks higher.',
    'Prizes are fixed USD amounts for a place or a range of places.',
    'A prize is added to your balance and stays locked until you wager that same amount on Jackpot, Coinflip, Roulette, Slott, or Poker.',
    'Rankings and prizes are final when the race closes.'
  ), '$[*] ? (@ != null)')
$$;
revoke all on function public._lb_rules(public.leaderboard_campaigns) from public, anon, authenticated;
grant execute on function public._lb_rules(public.leaderboard_campaigns) to service_role;

update public.leaderboard_templates
  set allowed_games = array_append(allowed_games, 'poker'), version = version + 1, updated_at = clock_timestamp()
  where status = 'active' and not ('poker' = any (allowed_games));

-- Open campaigns add poker to their frozen game list (audited). Wagers already counted are unchanged.
alter table public.leaderboard_campaigns disable trigger leaderboard_campaign_guard;
with added as (
  update public.leaderboard_campaigns
    set games = array_append(games, 'poker'),
        config_snapshot = case when config_snapshot is null then null
          else config_snapshot || jsonb_build_object('games', to_jsonb(array_append(games, 'poker'))) end,
        updated_at = clock_timestamp()
  where status in ('scheduled', 'active', 'suspended') and not ('poker' = any (games))
  returning id
)
select public._audit(null, 'leaderboard_games_added', null,
  jsonb_build_object('campaign_id', id, 'added', 'poker', 'note', 'Deposit-funded poker wagers count from this release.'))
from added;
alter table public.leaderboard_campaigns enable trigger leaderboard_campaign_guard;
