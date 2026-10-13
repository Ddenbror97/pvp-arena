-- Abandoned jackpot and coinflip pots must settle without a browser open.
-- Roulette already has pvp-roulette-worker at 1 second; these minute jobs
-- recover overdue ACTIVE/DRAWING jackpots and expired coinflips.
-- prod-only:begin
select cron.unschedule(jobid)
from cron.job
where jobname in ('pvp-jackpot-worker', 'pvp-coinflip-worker');

select cron.schedule(
  'pvp-jackpot-worker',
  '* * * * *',
  'select public.jackpot_tick()'
);

select cron.schedule(
  'pvp-coinflip-worker',
  '* * * * *',
  'select public.coinflip_tick()'
);
-- prod-only:end
