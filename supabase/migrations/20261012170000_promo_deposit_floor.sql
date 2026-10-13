-- Bonus stays bonus until the player has deposited $20, and a win paid by
-- another player's bonus stays bonus. Cashout minimum is $20 on every rail.

alter table public.chain_networks disable trigger user;
update public.crypto_settings set min_withdrawal_cents = 2000 where min_withdrawal_cents <= 1000;
update public.chain_networks set min_withdrawal_cents = 2000 where min_withdrawal_cents <= 1000;
alter table public.chain_networks enable trigger user;

-- Replay the real ledger in posting order. eligible is deposited money and
-- the share of a payout that came from deposited stakes. bonus is promo,
-- referral, prize, partner, and prestige credit, plus the share of a payout
-- that came from those stakes.
create or replace function public._withdraw_basis(p_user uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  tx record;
  leg record;
  v_pot_e bigint;
  v_pot_b bigint;
  v_pot bigint;
  v_payout bigint;
  v_gain_e bigint;
  v_part_e bigint;
  v_part_b bigint;
  v_hold bigint;
  v_deposits bigint := 0;
  v_eligible bigint := 0;
  v_bonus bigint := 0;
  v_room bigint := 0;
begin
  create temp table if not exists _pvp_bucket (
    user_id uuid primary key,
    deposits bigint not null default 0,
    eligible bigint not null default 0,
    bonus bigint not null default 0
  ) on commit drop;
  create temp table if not exists _pvp_stake (
    user_id uuid not null,
    game_id bigint not null,
    eligible bigint not null,
    bonus bigint not null,
    primary key (user_id, game_id)
  ) on commit drop;
  create temp table if not exists _pvp_hold (
    id bigserial primary key,
    user_id uuid not null,
    eligible_part bigint not null,
    bonus_part bigint not null
  ) on commit drop;
  create temp table if not exists _pvp_leg (
    tx_id uuid not null,
    kind text not null,
    game_id bigint,
    created_at timestamptz not null,
    owner_id uuid,
    acct text not null,
    amount bigint not null
  ) on commit drop;
  create index if not exists _pvp_leg_tx on _pvp_leg (tx_id);
  truncate _pvp_bucket, _pvp_stake, _pvp_hold, _pvp_leg;
  insert into _pvp_leg (tx_id, kind, game_id, created_at, owner_id, acct, amount)
  select t.id, t.kind::text, t.game_id, t.created_at, w.owner_id, w.kind::text, p.amount
  from ledger_transactions t
  join ledger_postings p on p.tx_id = t.id
  join wallet_accounts w on w.id = p.account_id
  where t.account_type = 'real';

  for tx in
    select l.tx_id as id, min(l.kind) as kind, min(l.game_id) as game_id
    from _pvp_leg l
    group by l.tx_id
    order by min(l.created_at), l.tx_id
  loop
    if tx.kind = 'deposit' then
      for leg in
        select l.owner_id, sum(l.amount)::bigint as amt
        from _pvp_leg l
        where l.tx_id = tx.id and l.owner_id is not null and l.amount > 0
        group by l.owner_id
      loop
        insert into _pvp_bucket (user_id, deposits, eligible, bonus)
        values (leg.owner_id, leg.amt, leg.amt, 0)
        on conflict (user_id) do update
          set deposits = _pvp_bucket.deposits + excluded.deposits,
              eligible = _pvp_bucket.eligible + excluded.eligible;
      end loop;

    elsif tx.kind in (
      'promo_reward', 'referral_reward', 'leaderboard_prize',
      'prestige_reward', 'partner_credit', 'slot_bonus'
    ) then
      for leg in
        select l.owner_id, sum(l.amount)::bigint as amt
        from _pvp_leg l
        where l.tx_id = tx.id and l.owner_id is not null and l.amount > 0
        group by l.owner_id
      loop
        insert into _pvp_bucket (user_id, deposits, eligible, bonus)
        values (leg.owner_id, 0, 0, leg.amt)
        on conflict (user_id) do update
          set bonus = _pvp_bucket.bonus + excluded.bonus;
      end loop;

    elsif tx.kind = 'withdrawal' or tx.kind = 'refund' then
      for leg in
        select l.owner_id,
          sum(l.amount)::bigint as net,
          coalesce(sum(l.amount) filter (where l.acct = 'user_locked'), 0)::bigint as locked_delta
        from _pvp_leg l
        where l.tx_id = tx.id and l.owner_id is not null
        group by l.owner_id
      loop
        insert into _pvp_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
        if tx.kind = 'withdrawal' and leg.net = 0 and leg.locked_delta > 0 then
          select b.eligible, b.bonus into v_part_e, v_part_b from _pvp_bucket b where b.user_id = leg.owner_id;
          v_part_e := least(greatest(v_part_e, 0), leg.locked_delta);
          v_part_b := leg.locked_delta - v_part_e;
          update _pvp_bucket
            set eligible = greatest(eligible - v_part_e, 0),
                bonus = greatest(bonus - v_part_b, 0)
            where user_id = leg.owner_id;
          insert into _pvp_hold (user_id, eligible_part, bonus_part)
          values (leg.owner_id, v_part_e, v_part_b);
        elsif tx.kind = 'refund' and leg.net = 0 and leg.locked_delta < 0 then
          select h.eligible_part, h.bonus_part, h.id
            into v_part_e, v_part_b, v_hold
          from _pvp_hold h
          where h.user_id = leg.owner_id
          order by h.id desc
          limit 1;
          if found then
            update _pvp_bucket
              set eligible = eligible + v_part_e, bonus = bonus + v_part_b
              where user_id = leg.owner_id;
            delete from _pvp_hold where id = v_hold;
          end if;
        end if;
      end loop;

    elsif tx.kind like '%\_entry' escape '\' and tx.game_id is not null then
      for leg in
        select l.owner_id,
          coalesce(sum(l.amount) filter (where l.acct = 'user_locked' and l.amount > 0), 0)::bigint as stake
        from _pvp_leg l
        where l.tx_id = tx.id and l.owner_id is not null
        group by l.owner_id
      loop
        if leg.stake <= 0 then continue; end if;
        insert into _pvp_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
        select b.eligible into v_part_e from _pvp_bucket b where b.user_id = leg.owner_id;
        v_part_e := least(greatest(v_part_e, 0), leg.stake);
        v_part_b := leg.stake - v_part_e;
        update _pvp_bucket
          set eligible = greatest(eligible - v_part_e, 0),
              bonus = greatest(bonus - v_part_b, 0)
          where user_id = leg.owner_id;
        insert into _pvp_stake (user_id, game_id, eligible, bonus)
        values (leg.owner_id, tx.game_id, v_part_e, v_part_b)
        on conflict (user_id, game_id) do update
          set eligible = _pvp_stake.eligible + excluded.eligible,
              bonus = _pvp_stake.bonus + excluded.bonus;
      end loop;

    elsif tx.kind like '%\_refund' escape '\' and tx.game_id is not null then
      for leg in
        select l.owner_id,
          coalesce(sum(l.amount) filter (where l.acct = 'user_available' and l.amount > 0), 0)::bigint as back
        from _pvp_leg l
        where l.tx_id = tx.id and l.owner_id is not null
        group by l.owner_id
      loop
        if leg.back <= 0 then continue; end if;
        select s.eligible, s.bonus into v_part_e, v_part_b
        from _pvp_stake s
        where s.user_id = leg.owner_id and s.game_id = tx.game_id;
        if found then
          update _pvp_bucket
            set eligible = eligible + v_part_e, bonus = bonus + v_part_b
            where user_id = leg.owner_id;
          delete from _pvp_stake where user_id = leg.owner_id and game_id = tx.game_id;
        end if;
      end loop;

    elsif tx.kind like '%\_settlement' escape '\' and tx.game_id is not null then
      if not exists (select 1 from _pvp_stake s where s.game_id = tx.game_id) then
        for leg in
          select l.owner_id, sum(-l.amount)::bigint as stake
          from _pvp_leg l
          where l.tx_id = tx.id and l.owner_id is not null
            and l.acct = 'user_locked' and l.amount < 0
          group by l.owner_id
        loop
          insert into _pvp_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
          select b.eligible into v_part_e from _pvp_bucket b where b.user_id = leg.owner_id;
          v_part_e := least(greatest(v_part_e, 0), leg.stake);
          v_part_b := leg.stake - v_part_e;
          update _pvp_bucket
            set eligible = greatest(eligible - v_part_e, 0), bonus = greatest(bonus - v_part_b, 0)
            where user_id = leg.owner_id;
          insert into _pvp_stake (user_id, game_id, eligible, bonus)
          values (leg.owner_id, tx.game_id, v_part_e, v_part_b)
          on conflict (user_id, game_id) do update
            set eligible = _pvp_stake.eligible + excluded.eligible,
                bonus = _pvp_stake.bonus + excluded.bonus;
        end loop;
      end if;
      select coalesce(sum(s.eligible), 0), coalesce(sum(s.bonus), 0)
        into v_pot_e, v_pot_b
      from _pvp_stake s
      where s.game_id = tx.game_id;
      v_pot := v_pot_e + v_pot_b;
      for leg in
        select l.owner_id, sum(l.amount)::bigint as amt
        from _pvp_leg l
        where l.tx_id = tx.id and l.owner_id is not null
          and l.acct = 'user_available' and l.amount > 0
        group by l.owner_id
      loop
        v_payout := leg.amt;
        insert into _pvp_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
        if v_pot > 0 then
          v_gain_e := (v_payout * v_pot_e) / v_pot;
        else
          v_gain_e := 0;
        end if;
        update _pvp_bucket
          set eligible = eligible + v_gain_e,
              bonus = bonus + (v_payout - v_gain_e)
          where user_id = leg.owner_id;
      end loop;
      delete from _pvp_stake where game_id = tx.game_id;
    end if;
  end loop;

  select b.deposits, b.eligible, b.bonus
    into v_deposits, v_eligible, v_bonus
  from _pvp_bucket b
  where b.user_id = p_user;
  v_deposits := coalesce(v_deposits, 0);
  v_eligible := greatest(coalesce(v_eligible, 0), 0);
  v_bonus := greatest(coalesce(v_bonus, 0), 0);
  v_room := v_eligible + case when v_deposits >= 2000 then v_bonus else 0 end;
  return jsonb_build_object(
    'deposits', v_deposits,
    'eligible', v_eligible,
    'bonus', v_bonus,
    'room', v_room
  );
end $$;

revoke all on function public._withdraw_basis(uuid) from public, anon, authenticated;

create or replace function public._cash_room(p_user uuid)
returns bigint
language sql
volatile
security definer
set search_path = public
as $$
  select (public._withdraw_basis(p_user)->>'room')::bigint
$$;

revoke all on function public._cash_room(uuid) from public, anon, authenticated;

create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  referral_hold bigint;
  promo_hold bigint;
  prize_hold bigint;
  partner_hold bigint;
  profit_hold bigint;
  b0 bigint;
  bal bigint;
begin
  if public._is_active_partner(p_user) then raise exception 'PARTNER_WITHDRAWAL_BLOCKED'; end if;
  referral_hold := public.referral_unplayed_reward_cents(p_user);
  promo_hold := public.promo_restricted_cents(p_user);
  prize_hold := public.leaderboard_prize_restricted_cents(p_user);
  partner_hold := public._partner_release_block(p_user, p_balance);
  profit_hold := public._partner_profit_hold(p_user);
  if p_balance - referral_hold - promo_hold - prize_hold - partner_hold - profit_hold >= p_total then
    null;
  elsif profit_hold > 0 and p_balance - referral_hold - promo_hold - prize_hold - partner_hold >= p_total then
    raise exception 'PARTNER_PROFIT_REVIEW';
  else
    b0 := p_balance - profit_hold;
    if partner_hold > 0 and b0 - referral_hold - promo_hold - prize_hold >= p_total then
      raise exception 'PARTNER_FUNDS_HELD';
    end if;
    bal := b0 - partner_hold;
    if promo_hold > 0 and bal - referral_hold - prize_hold >= p_total then
      raise exception 'PROMO_PLAYTHROUGH';
    end if;
    if prize_hold > 0 and bal - referral_hold - promo_hold >= p_total then
      raise exception 'LEADERBOARD_PLAYTHROUGH';
    end if;
    if referral_hold > 0 and bal - promo_hold - prize_hold >= p_total then
      raise exception 'REFERRAL_PLAYTHROUGH';
    end if;
    if promo_hold > 0 then raise exception 'PROMO_PLAYTHROUGH'; end if;
    if prize_hold > 0 then raise exception 'LEADERBOARD_PLAYTHROUGH'; end if;
    if referral_hold > 0 then raise exception 'REFERRAL_PLAYTHROUGH'; end if;
    if partner_hold > 0 then raise exception 'PARTNER_FUNDS_HELD'; end if;
    raise exception 'PARTNER_PROFIT_REVIEW';
  end if;
  if p_total > public._cash_room(p_user) then
    raise exception 'BONUS_NOT_WITHDRAWABLE';
  end if;
end $$;

revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;
