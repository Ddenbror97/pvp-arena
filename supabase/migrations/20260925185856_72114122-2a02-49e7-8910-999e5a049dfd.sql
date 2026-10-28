-- lovable-cron-fallback-reviewed: Roulette is a timed live game that must advance without visitors; one-second checks preserve its existing one-second lock phase.
-- Keep Roulette lifecycle progress independent of browser sessions.
-- pg_cron 1.6 supports interval schedules from 1 to 59 seconds.
-- prod-only:begin
-- A new project does not install pg_cron until asked. Production already
-- recorded this version with the extension present, so this statement does
-- not run again there.
create extension if not exists pg_cron;
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