-- Withdrawals used to replay every real posting on each _withdraw_basis call.
-- Keep a durable simulation state and apply only new ledger transactions.

create table public.withdraw_basis_meta (
  id smallint primary key check (id = 1),
  posting_count bigint not null default 0,
  last_created_at timestamptz,
  last_tx_id uuid
);
insert into public.withdraw_basis_meta (id) values (1) on conflict do nothing;

create table public.withdraw_basis_bucket (
  user_id uuid primary key,
  deposits bigint not null default 0,
  eligible bigint not null default 0,
  bonus bigint not null default 0
);

create table public.withdraw_basis_stake (
  user_id uuid not null,
  game_id bigint not null,
  eligible bigint not null,
  bonus bigint not null,
  primary key (user_id, game_id)
);

create table public.withdraw_basis_hold (
  id bigserial primary key,
  user_id uuid not null,
  eligible_part bigint not null,
  bonus_part bigint not null
);
create index withdraw_basis_hold_user_id on public.withdraw_basis_hold (user_id, id desc);

alter table public.withdraw_basis_meta enable row level security;
alter table public.withdraw_basis_bucket enable row level security;
alter table public.withdraw_basis_stake enable row level security;
alter table public.withdraw_basis_hold enable row level security;
revoke all on public.withdraw_basis_meta, public.withdraw_basis_bucket,
  public.withdraw_basis_stake, public.withdraw_basis_hold from public, anon, authenticated;
grant all on public.withdraw_basis_meta, public.withdraw_basis_bucket,
  public.withdraw_basis_stake, public.withdraw_basis_hold to service_role;
grant usage, select on sequence public.withdraw_basis_hold_id_seq to service_role;

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
      insert into withdraw_basis_stake (user_id, game_id, eligible, bonus)
      values (leg.owner_id, p_game_id, v_part_e, v_part_b)
      on conflict (user_id, game_id) do update
        set eligible = withdraw_basis_stake.eligible + excluded.eligible,
            bonus = withdraw_basis_stake.bonus + excluded.bonus;
    end loop;

  elsif p_kind like '%\_refund' escape '\' and p_game_id is not null then
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
      where s.user_id = leg.owner_id and s.game_id = p_game_id;
      if found then
        update withdraw_basis_bucket
          set eligible = eligible + v_part_e, bonus = bonus + v_part_b
          where user_id = leg.owner_id;
        delete from withdraw_basis_stake where user_id = leg.owner_id and game_id = p_game_id;
      end if;
    end loop;

  elsif p_kind like '%\_settlement' escape '\' and p_game_id is not null then
    if not exists (select 1 from withdraw_basis_stake s where s.game_id = p_game_id) then
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
        insert into withdraw_basis_stake (user_id, game_id, eligible, bonus)
        values (leg.owner_id, p_game_id, v_part_e, v_part_b)
        on conflict (user_id, game_id) do update
          set eligible = withdraw_basis_stake.eligible + excluded.eligible,
              bonus = withdraw_basis_stake.bonus + excluded.bonus;
      end loop;
    end if;
    select coalesce(sum(s.eligible), 0), coalesce(sum(s.bonus), 0)
      into v_pot_e, v_pot_b
    from withdraw_basis_stake s
    where s.game_id = p_game_id;
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
    delete from withdraw_basis_stake where game_id = p_game_id;
  end if;
end $$;

revoke all on function public._withdraw_basis_apply_tx(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public._withdraw_basis_apply_tx(uuid, text, bigint) to service_role;

create or replace function public._withdraw_basis_rebuild_full()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tx record;
  v_n bigint;
  v_last_at timestamptz;
  v_last_id uuid;
begin
  perform set_config('client_min_messages', 'warning', true);
  truncate withdraw_basis_bucket, withdraw_basis_stake, withdraw_basis_hold restart identity;
  for tx in
    select t.id, t.kind::text as kind, t.game_id, t.created_at
    from ledger_transactions t
    where t.account_type = 'real'
    order by t.created_at, t.id
  loop
    perform public._withdraw_basis_apply_tx(tx.id, tx.kind, tx.game_id);
    v_last_at := tx.created_at;
    v_last_id := tx.id;
  end loop;
  select count(*) into v_n
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  where t.account_type = 'real';
  update withdraw_basis_meta
    set posting_count = v_n,
        last_created_at = v_last_at,
        last_tx_id = v_last_id
  where id = 1;
end $$;

revoke all on function public._withdraw_basis_rebuild_full() from public, anon, authenticated;
grant execute on function public._withdraw_basis_rebuild_full() to service_role;

create or replace function public._withdraw_basis_sync()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  tx record;
  v_n bigint;
  v_c bigint;
  v_last_at timestamptz;
  v_last_id uuid;
begin
  perform set_config('client_min_messages', 'warning', true);
  perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));
  select count(*) into v_n
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  where t.account_type = 'real';
  select posting_count, last_created_at, last_tx_id
    into v_c, v_last_at, v_last_id
  from withdraw_basis_meta
  where id = 1;
  if v_c is null or v_n < v_c or (v_n = v_c and v_last_id is null and v_n > 0) then
    perform public._withdraw_basis_rebuild_full();
    return;
  end if;
  if v_n = v_c then
    return;
  end if;
  for tx in
    select t.id, t.kind::text as kind, t.game_id, t.created_at
    from ledger_transactions t
    where t.account_type = 'real'
      and (
        v_last_at is null
        or (t.created_at, t.id) > (v_last_at, coalesce(v_last_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
    order by t.created_at, t.id
  loop
    perform public._withdraw_basis_apply_tx(tx.id, tx.kind, tx.game_id);
    v_last_at := tx.created_at;
    v_last_id := tx.id;
  end loop;
  update withdraw_basis_meta
    set posting_count = v_n,
        last_created_at = v_last_at,
        last_tx_id = v_last_id
  where id = 1;
end $$;

revoke all on function public._withdraw_basis_sync() from public, anon, authenticated;
grant execute on function public._withdraw_basis_sync() to service_role;

create or replace function public._withdraw_basis(p_user uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_deposits bigint := 0;
  v_eligible bigint := 0;
  v_bonus bigint := 0;
  v_room bigint := 0;
begin
  perform public._withdraw_basis_sync();
  select b.deposits, b.eligible, b.bonus
    into v_deposits, v_eligible, v_bonus
  from withdraw_basis_bucket b
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
grant execute on function public._withdraw_basis(uuid) to service_role;

select public._withdraw_basis_rebuild_full();
