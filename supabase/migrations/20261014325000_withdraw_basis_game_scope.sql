-- Each game numbers its rounds with its own sequence, so jackpot 52, coinflip 52 and
-- roulette 52 all exist. withdraw_basis_stake was keyed by game_id alone: a roulette
-- settlement for round N pooled and deleted the open coinflip stake for game N too,
-- paying the roulette winner out of the coinflip pot's eligible/bonus mix, and the
-- coinflip settlement then re-derived its stake from whatever eligible balance the
-- player had at that moment (bonus could come back as withdrawable cash). Refunds had
-- the same reach into other games' entry rows.
--
-- Stakes are now keyed by (user, game, game_id), where game is the tx kind prefix
-- (jackpot, coinflip, roulette, slot, poker). The basis is replayed from the ledger.

alter table public.withdraw_basis_stake add column game text not null default '';
alter table public.withdraw_basis_stake drop constraint withdraw_basis_stake_pkey;
alter table public.withdraw_basis_stake add primary key (user_id, game, game_id);
alter table public.withdraw_basis_stake alter column game drop default;
create index withdraw_basis_stake_game on public.withdraw_basis_stake (game, game_id);

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

-- Replay the whole real ledger under the corrected keys, then refresh open races,
-- whose deposit-funded splits come from the replayed entry rows.
select public._withdraw_basis_rebuild_full();

do $$
declare r record;
begin
  for r in select id from public.leaderboard_campaigns where status in ('active', 'closing')
  loop
    perform public._lb_sync(r.id);
  end loop;
end $$;
