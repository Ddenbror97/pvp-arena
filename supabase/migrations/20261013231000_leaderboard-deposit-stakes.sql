-- Leaderboards rank only the deposit-funded portion of each stake (same FIFO as withdrawals).
-- Promo, referral, partner credits, and leaderboard prizes count as bonus until recycled.

create table public.withdraw_basis_ledger_stake (
  ledger_tx_id uuid primary key references public.ledger_transactions (id) on delete cascade,
  user_id uuid not null,
  eligible bigint not null check (eligible >= 0),
  bonus bigint not null check (bonus >= 0),
  stake_total bigint not null check (stake_total > 0)
);
create index withdraw_basis_ledger_stake_user_idx on public.withdraw_basis_ledger_stake (user_id);

alter table public.withdraw_basis_ledger_stake enable row level security;
revoke all on public.withdraw_basis_ledger_stake from public, anon, authenticated;
grant all on public.withdraw_basis_ledger_stake to service_role;

create or replace function public._lb_wager_deposit_cents(p_ledger_tx uuid, p_amount bigint)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select least(greatest(s.eligible, 0), greatest(p_amount, 0))
      from public.withdraw_basis_ledger_stake s
      where s.ledger_tx_id = p_ledger_tx
    ),
    0
  );
$$;
revoke all on function public._lb_wager_deposit_cents(uuid, bigint) from public, anon, authenticated;

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
      and t.kind::text like '%\_entry' escape '\';
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
  v_tx bigint;
  v_last_at timestamptz;
  v_last_id uuid;
begin
  perform set_config('client_min_messages', 'warning', true);
  perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));
  truncate withdraw_basis_bucket, withdraw_basis_stake, withdraw_basis_hold, withdraw_basis_ledger_stake restart identity;
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
  select ledger_real_tx_count into v_tx from withdraw_basis_meta where id = 1;
  update withdraw_basis_meta
    set posting_count = v_n,
        last_created_at = v_last_at,
        last_tx_id = v_last_id,
        applied_tx_count = v_tx
  where id = 1;
end $$;

create or replace function public._lb_rules(c public.leaderboard_campaigns) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_array(
    'Runs ' || to_char(c.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC to '
      || to_char(c.ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC.',
    'Games: ' || array_to_string(c.games, ', ') || '.',
    case when c.audience = 'attributed'
      then 'Players who joined through this host''s partner link or promo code are on this board.'
      else 'Any player who stakes in this window can place, except the host.'
    end,
    'Your rank is the total deposit-funded stake on finished games in that window.',
    'Only the portion of each stake paid from deposited balance counts. Promo, referral, partner, and prize credits do not count until you deposit and wager from that balance.',
    'Cancelled games, refunds, test-credit games, and the host''s own stakes do not count. Only the match stake counts.',
    case when c.min_wager_cents > 0
      then 'Each counted stake must include at least ' || trim(to_char(c.min_wager_cents / 100.0, 'FM999999990.00')) || ' USD from deposited balance.'
      else 'Any deposit-funded stake the game accepts counts.' end,
    'Stakes are in USD.',
    'A higher total ranks higher. If the totals match, the earlier last stake ranks higher.',
    'Prizes are fixed USD amounts for a place or a range of places.',
    'A prize is added to your balance and stays locked until you wager that same amount on Jackpot, Coinflip, Roulette, or Slott.',
    'Rankings and prizes are final when the race closes.'
  )
$$;

create or replace function public._lb_sync(p_campaign uuid) returns boolean
language plpgsql security definer set search_path = public as $$
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
    and dep.cents >= c.min_wager_cents and e.user_id <> c.partner_user_id
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
    and dep.cents >= c.min_wager_cents and e.user_id <> c.partner_user_id
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
    and dep.cents >= c.min_wager_cents and b.user_id <> c.partner_user_id
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
    and dep.cents >= c.min_wager_cents and e.user_id <> c.partner_user_id
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
      end
    ) < c.min_wager_cents;

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

create or replace function public._lb_event_guard() returns trigger
language plpgsql set search_path = public as $$
declare st text;
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD leaderboard_wager_events'; end if;
  if new.campaign_id is distinct from old.campaign_id
     or new.player_id is distinct from old.player_id
     or new.source_game_type is distinct from old.source_game_type
     or new.source_event_id is distinct from old.source_event_id
     or new.source_game_id is distinct from old.source_game_id
     or new.event_at is distinct from old.event_at
  then raise exception 'IMMUTABLE_FIELD'; end if;
  if new.qualifying_cents is distinct from old.qualifying_cents then
    select status into st from leaderboard_campaigns where id = new.campaign_id;
    if st not in ('active', 'closing') then raise exception 'IMMUTABLE_FIELD'; end if;
    if new.qualifying_cents <= 0 then raise exception 'IMMUTABLE_FIELD'; end if;
  end if;
  if new.voided and not old.voided then
    select status into st from leaderboard_campaigns where id = new.campaign_id;
    if st not in ('active', 'closing') then raise exception 'RANKINGS_FROZEN'; end if;
  elsif new.voided is distinct from old.voided then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  return new;
end $$;

create or replace function public.leaderboard_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c public.leaderboard_campaigns;
  ok boolean;
  caught boolean;
  pending integer;
  failed integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('leaderboard_tick')) then
    return jsonb_build_object('ok', true, 'skipped', 'busy');
  end if;
  update worker_tick_gate set last_run_at = clock_timestamp()
    where name = 'leaderboards' and last_run_at <= clock_timestamp() - interval '15 seconds'
    returning true into ok;
  if not coalesce(ok, false) then
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  perform public._withdraw_basis_sync();

  update leaderboard_campaigns
    set status = 'active', started_at = clock_timestamp(), updated_at = clock_timestamp()
    where status = 'scheduled' and funding_status = 'checked' and rules_frozen_at is not null
      and starts_at <= clock_timestamp();

  update leaderboard_campaigns
    set status = 'closing', closed_at = coalesce(closed_at, clock_timestamp()), updated_at = clock_timestamp()
    where status = 'active' and ends_at <= clock_timestamp();

  for c in
    select * from leaderboard_campaigns
    where status in ('active', 'closing')
    order by case when status = 'closing' then 0 else 1 end, ends_at
    limit 10
  loop
    caught := public._lb_sync(c.id);
    if c.status = 'closing' and caught and (
      not public._lb_inflight(c.id) or clock_timestamp() > c.ends_at + interval '2 hours'
    ) then
      insert into leaderboard_prize_awards (campaign_id, player_id, final_rank, reward_cents)
      select e.campaign_id, e.player_id, e.rank, t.reward_cents
      from leaderboard_entries e
      join leaderboard_prize_tiers t
        on t.campaign_id = e.campaign_id and e.rank between t.rank_start and t.rank_end
      where e.campaign_id = c.id and e.qualifying_cents > 0 and e.rank is not null
      on conflict (campaign_id, player_id) do nothing;
      update leaderboard_campaigns
        set status = 'settling', awards_created = true, updated_at = clock_timestamp()
        where id = c.id and status = 'closing';
      perform public._audit(null, 'leaderboard_rankings_frozen', null, jsonb_build_object('campaign_id', c.id));
    end if;
  end loop;

  for c in select * from leaderboard_campaigns where status = 'settling' order by closed_at limit 10 loop
    perform public._lb_pay_campaign(c.id);
    select count(*) filter (where payout_status = 'pending'), count(*) filter (where payout_status = 'failed')
      into pending, failed
    from leaderboard_prize_awards where campaign_id = c.id;
    if coalesce(pending, 0) = 0 and coalesce(failed, 0) = 0 then
      update leaderboard_campaigns
        set status = 'completed', finalized_at = clock_timestamp(), updated_at = clock_timestamp()
        where id = c.id and status = 'settling';
      perform public._audit(null, 'leaderboard_completed', null, jsonb_build_object('campaign_id', c.id));
    elsif coalesce(pending, 0) = 0 and failed > 0 then
      update leaderboard_campaigns
        set status = 'under_review', updated_at = clock_timestamp()
        where id = c.id and status = 'settling';
      perform public._audit(null, 'leaderboard_under_review', null,
        jsonb_build_object('campaign_id', c.id, 'failed', failed));
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'skipped', false);
end $$;

-- Backfill deposit splits and refresh open races (void/update in place; rows are immutable to DELETE).
select public._withdraw_basis_rebuild_full();

do $$
declare r record;
begin
  for r in select id from public.leaderboard_campaigns where status in ('active', 'closing')
  loop
    perform public._lb_sync(r.id);
  end loop;
end $$;
