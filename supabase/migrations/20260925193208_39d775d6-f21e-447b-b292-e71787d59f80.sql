-- Backend audit 2026-09-25: two reversible hardening changes. No game, wallet or ledger data is touched.

-- 1) Retire the legacy chain-less money overloads. The site and workers only call the
--    chain-explicit versions; these older ones pick a chain implicitly from settings,
--    which contradicts the "missing chain fails closed" rule. Revoke only (reversible):
--    rollback = GRANT EXECUTE ON FUNCTION <sig> TO service_role;
revoke execute on function public.crypto_observe_deposit(text, text, integer, bigint, text, text, numeric) from public, anon, authenticated, service_role;
revoke execute on function public.crypto_record_price(text, text, numeric, bigint, timestamptz) from public, anon, authenticated, service_role;
revoke execute on function public.crypto_quote_withdrawal(uuid, bigint) from public, anon, authenticated, service_role;
revoke execute on function public.crypto_request_withdrawal(uuid, text, bigint, uuid, boolean) from public, anon, authenticated, service_role;
revoke execute on function public.crypto_next_withdrawals() from public, anon, authenticated, service_role;

-- 2) Scheduler history retention. The 1-second Roulette worker writes ~86,400 run rows/day
--    (~29 MB/day measured). Keep 3 days of history; purge once a day.
--    rollback = select cron.unschedule('pvp-cron-history-retention');
-- prod-only:begin
select cron.schedule(
  'pvp-cron-history-retention',
  '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '3 days'$$
);
-- prod-only:end