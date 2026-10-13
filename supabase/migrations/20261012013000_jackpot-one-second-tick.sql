-- The jackpot countdown is 45 seconds and the wheel is anchored to settlement.
-- A once-a-minute tick, and one that waits behind deposits, leaves the clock at
-- 0 with betting locked and the wheel idle. Jackpot gets its own one-second
-- tick. The dispatcher must not call jackpot_tick: that holds the advisory
-- lock until the whole minute job commits.

create or replace function public.pvp_minute_dispatch()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare results jsonb := '{}'::jsonb; step text; one jsonb;
begin
  foreach step in array array[
    'crypto-withdrawals', 'crypto-deposits', 'leaderboard', 'health'
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
    select jobid from cron.job where jobname = 'pvp-jackpot-worker'
  loop
    perform cron.unschedule(jid);
  end loop;
end
$unschedule$;

select cron.schedule('pvp-jackpot-worker', '1 second', 'select public.jackpot_tick()');
-- prod-only:end
