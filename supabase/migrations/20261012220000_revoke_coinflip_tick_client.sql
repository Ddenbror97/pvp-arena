-- coinflip_tick is the one-second worker. The browser no longer calls it.
-- pg_cron runs as the function owner, so this revoke does not stop that job.
-- service_role keeps execute. Do not replace the function body.

revoke all on function public.coinflip_tick() from public, anon, authenticated;
grant execute on function public.coinflip_tick() to service_role;
