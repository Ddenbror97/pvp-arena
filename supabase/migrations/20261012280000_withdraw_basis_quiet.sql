-- A second call in the same transaction, with no new real postings, reads the
-- buckets the first call already built. One statement that asks for many
-- users therefore replays the ledger once.

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
  v_n bigint;
begin
  perform set_config('client_min_messages', 'warning', true);
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
  create temp table if not exists _pvp_by_owner (
    tx_id uuid not null,
    owner_id uuid not null,
    pos bigint not null,
    net bigint not null,
    locked_delta bigint not null,
    locked_stake bigint not null,
    avail_back bigint not null,
    locked_take bigint not null
  ) on commit drop;
  create index if not exists _pvp_leg_tx on _pvp_leg (tx_id);
  create index if not exists _pvp_by_owner_tx on _pvp_by_owner (tx_id);
  create temp table if not exists _pvp_basis_ready (
    xact text primary key,
    n bigint not null
  ) on commit drop;
  select count(*) into v_n
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  where t.account_type = 'real';
  if not exists (
    select 1 from _pvp_basis_ready r
    where r.xact = pg_current_xact_id()::text and r.n = v_n
  ) then
  truncate _pvp_bucket, _pvp_stake, _pvp_hold, _pvp_leg, _pvp_by_owner;
  insert into _pvp_leg (tx_id, kind, game_id, created_at, owner_id, acct, amount)
  select t.id, t.kind::text, t.game_id, t.created_at, w.owner_id, w.kind::text, p.amount
  from ledger_transactions t
  join ledger_postings p on p.tx_id = t.id
  join wallet_accounts w on w.id = p.account_id
  where t.account_type = 'real';
  insert into _pvp_by_owner (
    tx_id, owner_id, pos, net, locked_delta, locked_stake, avail_back, locked_take
  )
  select l.tx_id, l.owner_id,
    coalesce(sum(l.amount) filter (where l.amount > 0), 0),
    coalesce(sum(l.amount), 0),
    coalesce(sum(l.amount) filter (where l.acct = 'user_locked'), 0),
    coalesce(sum(l.amount) filter (where l.acct = 'user_locked' and l.amount > 0), 0),
    coalesce(sum(l.amount) filter (where l.acct = 'user_available' and l.amount > 0), 0),
    coalesce(sum(-l.amount) filter (where l.acct = 'user_locked' and l.amount < 0), 0)
  from _pvp_leg l
  where l.owner_id is not null
  group by l.tx_id, l.owner_id;

  for tx in
    select l.tx_id as id, min(l.kind) as kind, min(l.game_id) as game_id
    from _pvp_leg l
    group by l.tx_id
    order by min(l.created_at), l.tx_id
  loop
    if tx.kind = 'deposit' then
      for leg in
        select o.owner_id, o.pos as amt
        from _pvp_by_owner o
        where o.tx_id = tx.id and o.pos > 0
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
        select o.owner_id, o.pos as amt
        from _pvp_by_owner o
        where o.tx_id = tx.id and o.pos > 0
      loop
        insert into _pvp_bucket (user_id, deposits, eligible, bonus)
        values (leg.owner_id, 0, 0, leg.amt)
        on conflict (user_id) do update
          set bonus = _pvp_bucket.bonus + excluded.bonus;
      end loop;

    elsif tx.kind = 'withdrawal' or tx.kind = 'refund' then
      for leg in
        select o.owner_id, o.net, o.locked_delta
        from _pvp_by_owner o
        where o.tx_id = tx.id
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
        select o.owner_id, o.locked_stake as stake
        from _pvp_by_owner o
        where o.tx_id = tx.id and o.locked_stake > 0
      loop
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
        select o.owner_id, o.avail_back as back
        from _pvp_by_owner o
        where o.tx_id = tx.id and o.avail_back > 0
      loop
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
          select o.owner_id, o.locked_take as stake
          from _pvp_by_owner o
          where o.tx_id = tx.id and o.locked_take > 0
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
        select o.owner_id, o.avail_back as amt
        from _pvp_by_owner o
        where o.tx_id = tx.id and o.avail_back > 0
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
  delete from _pvp_basis_ready;
  insert into _pvp_basis_ready values (pg_current_xact_id()::text, v_n);
  end if;

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
