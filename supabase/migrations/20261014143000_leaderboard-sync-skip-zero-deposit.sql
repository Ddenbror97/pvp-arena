-- Bonus-only stakes have zero deposit-funded qualifying cents; do not insert wager events (qualifying_cents > 0 check).
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