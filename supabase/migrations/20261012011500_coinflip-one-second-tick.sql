-- A coinflip flip lasts a few seconds. The minute dispatcher publishes the
-- winning side only on its next run, so the coin spun with no face to land on.
-- Coinflip gets its own one-second tick. Jackpot stays on the minute dispatcher.
-- The dispatcher must not call coinflip_tick: that call holds the coinflip
-- advisory lock until the whole minute job commits.

create or replace function public.pvp_minute_dispatch()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare results jsonb := '{}'::jsonb; step text; one jsonb;
begin
  foreach step in array array[
    'crypto-withdrawals', 'crypto-deposits', 'leaderboard', 'jackpot', 'health'
  ]
  loop
    begin
      if step = 'crypto-withdrawals' then
        perform public.crypto_invoke_cron('crypto-withdrawals');
        one := '{"ok":true}'::jsonb;
      elsif step = 'crypto-deposits' then
        perform public.crypto_invoke_cron('crypto-deposits');
        one := '{"ok":true}'::jsonb;
      elsif step = 'leaderboard' then
        one := public.leaderboard_tick();
      elsif step = 'jackpot' then
        one := public.jackpot_tick();
      else
        one := public.settlement_worker_health();
      end if;
      results := results || jsonb_build_object(step, coalesce(one, '{"ok":true}'::jsonb));
    exception when others then
      results := results || jsonb_build_object(step, jsonb_build_object('error', left(sqlerrm, 200)));
    end;
  end loop;
  return results;
end
$fn$;
revoke all on function public.pvp_minute_dispatch() from public, anon, authenticated;
grant execute on function public.pvp_minute_dispatch() to service_role;

-- prod-only:begin
do $unschedule$
declare jid bigint;
begin
  for jid in
    select jobid from cron.job where jobname = 'pvp-coinflip-worker'
  loop
    perform cron.unschedule(jid);
  end loop;
end
$unschedule$;

select cron.schedule('pvp-coinflip-worker', '1 second', 'select public.coinflip_tick()');
-- prod-only:end
