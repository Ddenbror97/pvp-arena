-- Promo, referral, prize, and other bonus credits are not cash. Wagering them
-- against another bonus account must not make them withdrawable. A cashout can
-- take deposits and game results. With no deposit, the only cash is profit won
-- from an opponent who has actually deposited.

create table public.promo_ip_redemptions (
  ip inet primary key,
  created_at timestamptz not null default now()
);
alter table public.promo_ip_redemptions enable row level security;
revoke all on public.promo_ip_redemptions from public, anon, authenticated;
grant all on public.promo_ip_redemptions to service_role;

insert into public.promo_ip_redemptions (ip)
select distinct client_ip from public.promo_claims where client_ip is not null
on conflict do nothing;

do $$
declare r record;
begin
  for r in
    select distinct details->>'ip' as ip
    from public.audit_logs
    where action = 'promo_claimed' and coalesce(details->>'ip', '') <> ''
  loop
    begin
      insert into public.promo_ip_redemptions (ip) values (r.ip::inet) on conflict do nothing;
    exception when others then
      null;
    end;
  end loop;
end $$;

create or replace function public._cash_room(p_user uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  deposits bigint;
  game_net bigint;
  sent bigint;
  locked bigint;
  pvp bigint;
begin
  select coalesce(sum(p.amount), 0) into deposits
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  join wallet_accounts w on w.id = p.account_id
  where w.owner_id = p_user and w.account_type = 'real' and t.kind = 'deposit' and p.amount > 0;

  select coalesce(sum(p.amount), 0) into game_net
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  join wallet_accounts w on w.id = p.account_id
  where w.owner_id = p_user and w.account_type = 'real'
    and t.kind not in (
      'deposit', 'withdrawal', 'refund',
      'promo_reward', 'referral_reward', 'leaderboard_prize', 'prestige_reward',
      'partner_credit', 'slot_bonus', 'test_credit_grant', 'test_credit_reset'
    );

  select coalesce(-sum(p.amount), 0) into sent
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  join wallet_accounts w on w.id = p.account_id
  where w.owner_id = p_user and w.account_type = 'real' and t.kind = 'withdrawal';

  select coalesce(sum(balance), 0) into locked
  from wallet_accounts
  where owner_id = p_user and account_type = 'real' and kind = 'user_locked';

  if deposits > 0 then
    return deposits + game_net - sent - locked;
  end if;

  select coalesce(sum(least(greatest(mine.net, 0), opp.lost)), 0) into pvp
  from (
    select t.game_id, sum(p.amount) as net
    from ledger_transactions t
    join ledger_postings p on p.tx_id = t.id
    join wallet_accounts w on w.id = p.account_id
    where w.owner_id = p_user and w.account_type = 'real'
      and t.game_id is not null
      and t.kind::text ~ '^(coinflip|jackpot|slot)_'
    group by t.game_id
  ) mine
  join lateral (
    select coalesce(sum(greatest(-n.net, 0)), 0) as lost
    from (
      select w.owner_id, sum(p.amount) as net
      from ledger_transactions t
      join ledger_postings p on p.tx_id = t.id
      join wallet_accounts w on w.id = p.account_id
      where t.game_id = mine.game_id
        and w.owner_id is not null
        and w.owner_id <> p_user
        and w.account_type = 'real'
      group by w.owner_id
    ) n
    where exists (
      select 1 from ledger_transactions d
      where d.user_id = n.owner_id and d.kind = 'deposit'
    )
  ) opp on true;

  return pvp - sent - locked;
end $$;

revoke all on function public._cash_room(uuid) from public, anon, authenticated;

create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql stable security definer set search_path = public as $$
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
  if exists (
    select 1 from ledger_transactions t
    where t.user_id = p_user and t.account_type = 'real'
      and t.kind in (
        'promo_reward', 'referral_reward', 'leaderboard_prize', 'prestige_reward',
        'partner_credit', 'slot_bonus'
      )
  ) and p_total > public._cash_room(p_user) then
    raise exception 'BONUS_NOT_WITHDRAWABLE';
  end if;
end $$;

revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;

-- A redeemed network stays redeemed after the account is removed.
create or replace function public._promo_ip_stick()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.client_ip is null then
    raise exception 'PROMO_IP_REQUIRED' using errcode = '23514';
  end if;
  if exists (select 1 from public.promo_ip_redemptions where ip = new.client_ip) then
    raise exception 'PROMO_IP_ALREADY_REDEEMED' using errcode = '23505';
  end if;
  insert into public.promo_ip_redemptions (ip) values (new.client_ip);
  return new;
end $$;

revoke all on function public._promo_ip_stick() from public, anon, authenticated;

drop trigger if exists promo_ip_stick on public.promo_claims;
create trigger promo_ip_stick before insert on public.promo_claims
for each row execute function public._promo_ip_stick();
