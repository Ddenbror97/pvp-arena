-- Scheduler history retention, revised (backend audit 2026-10-15).
--
-- 20260925193208 sized retention for one 1-second worker. Four now run every second
-- (roulette, jackpot, coinflip, slot), about 340,000 run rows a day. With 3 days kept,
-- cron.job_run_details reached 1.18M rows / 180 MB, more than half of the 336 MB
-- database, and the nightly purge deleted ~340k rows in one statement.
--
-- New policy, purged hourly so each pass is small (~14k rows):
--   * 1-second workers: 12 hours of successful runs (enough to investigate a stall).
--   * every other job, and failed runs of any job: 7 days.
-- The first hourly pass removes the existing backlog (~1M rows, a few seconds; it only
-- touches finished rows, which the scheduler never updates again).
--
-- Rollback: re-run the cron.schedule block from 20260925193208.

-- prod-only:begin
select cron.schedule(
  'pvp-cron-history-retention',
  '17 * * * *',
  $$delete from cron.job_run_details d
    where d.end_time < now() - interval '7 days'
       or (d.end_time < now() - interval '12 hours'
           and d.status <> 'failed'
           and d.jobid in (select j.jobid from cron.job j where j.schedule ~ '^[0-9]+ seconds?$'))$$
);
-- prod-only:end
