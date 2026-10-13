-- New boards run for 30 days and the prize cap is $1,500.
-- Finished campaigns keep the schedule and prizes they already stored.
update public.leaderboard_templates
set min_duration_seconds = 2592000,
    max_duration_seconds = 2592000,
    max_prize_pool_cents = 150000,
    version = version + 1,
    updated_at = clock_timestamp()
where status = 'active'
  and max_prize_pool_cents = 100000
  and max_duration_seconds = 2592000
  and min_duration_seconds = 3600;
