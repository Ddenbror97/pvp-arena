-- Public leaderboard rules stay short. They describe the race, not the ledger.

create or replace function public._lb_rules(c public.leaderboard_campaigns) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_array(
    'Runs ' || to_char(c.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC to '
      || to_char(c.ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC.',
    'Games: ' || array_to_string(c.games, ', ') || '.',
    'Your rank is the total you staked on finished games in that window.',
    'Cancelled games, refunds, test-credit games, and the host''s own stakes do not count. Only the match stake counts.',
    'Promo, referral, and partner credits are not extra wagers. A real stake still counts.',
    case when c.min_wager_cents > 0
      then 'Each stake must be at least ' || trim(to_char(c.min_wager_cents / 100.0, 'FM999999990.00')) || ' USD.'
      else 'Any stake the game accepts counts.' end,
    'Stakes are in USD.',
    'A higher total ranks higher. If the totals match, the earlier last stake ranks higher.',
    'Prizes are fixed USD amounts for a place or a range of places.',
    'A prize is added to your balance and stays locked until you wager that same amount on Jackpot, Coinflip, Roulette, or Slott.',
    'Rankings and prizes are final when the race closes.'
  )
$$;
