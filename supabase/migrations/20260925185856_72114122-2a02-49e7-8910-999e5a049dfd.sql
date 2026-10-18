-- lovable-cron-fallback-reviewed: Roulette is a timed live game that must advance without visitors; one-second checks preserve its existing one-second lock phase.
-- Keep Roulette lifecycle progress independent of browser sessions.
-- pg_cron 1.6 supports interval schedules from 1 to 59 seconds.
-- prod-only:begin
select cron.unschedule('pvp-roulette-worker')
where exists (
  select 1 from cron.job where jobname = 'pvp-roulette-worker'
);

select cron.schedule(
  'pvp-roulette-worker',
  '1 second',
  'select public.roulette_tick()'
);
-- prod-only:end