-- settlement_worker_health was parallel-scanning all of cron.job_run_details
-- (about 112 MB) on every call. The minute dispatcher called it every minute,
-- and so did the health schedule and the Cloudflare cron. That scan held a
-- connection for 7–17s and took one of the parallel worker slots.
-- The timeout check only cares about the last five minutes, so it reads a
-- bounded run-id range on the primary key. Health stays on its own schedule.
-- The dispatcher only queues withdrawals, deposits, and the leaderboard.

create or replace function public.settlement_worker_health()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  r record;
  n_stale int := 0;
  n_timeout int := 0;
  n_stuck int := 0;
  n_withdrawals int := 0;
  floor_id bigint := 0;
begin
  for r in
    select name, last_run_at from public.worker_tick_gate
    where name in ('roulette', 'slot', 'jackpot', 'coinflip')
  loop
    -- All four clocks are one-second jobs. Fifteen seconds is a missed window, not a late minute.
    if r.last_run_at < clock_timestamp() - interval '15 seconds'
       and not exists (
         select 1 from pg_stat_activity a
         where a.pid <> pg_backend_pid()
           and a.state = 'active'
           and a.query ilike '%' || r.name || '_tick%'
       ) then
      insert into public.integrity_incidents (check_name, fingerprint, details)
      values (
        'settlement_worker_stale',
        'swh:' || r.name,
        jsonb_build_object('worker', r.name, 'last_run_at', r.last_run_at)
      )
      on conflict (fingerprint) do update
        set details = excluded.details, last_seen_at = now(),
            occurrences = public.integrity_incidents.occurrences + 1
        where public.integrity_incidents.last_seen_at < now() - interval '1 hour';
      n_stale := n_stale + 1;
    else
      update public.integrity_incidents
        set details = details || jsonb_build_object('recovered_at', clock_timestamp())
        where fingerprint = 'swh:' || r.name
          and check_name = 'settlement_worker_stale'
          and not (details ? 'recovered_at');
    end if;
  end loop;

  if to_regclass('cron.job_run_details') is not null then
    select coalesce(max(runid), 0) - 20000 into floor_id from cron.job_run_details;
    for r in
      select j.jobname, count(*)::int n
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      where d.runid > floor_id
        and d.start_time > clock_timestamp() - interval '5 minutes'
        and d.status = 'failed'
        and d.return_message = 'job startup timeout'
        and j.jobname in (
          'pvp-roulette-worker', 'pvp-slot-worker', 'pvp-minute-dispatch', 'pvp-settlement-health',
          'pvp-jackpot-worker', 'pvp-coinflip-worker',
          'pvp-crypto-deposits', 'pvp-crypto-withdrawals', 'pvp-leaderboard-worker'
        )
      group by j.jobname
    loop
      insert into public.integrity_incidents (check_name, fingerprint, details)
      values (
        'worker_startup_timeout',
        'swh:timeout:' || r.jobname,
        jsonb_build_object('job', r.jobname, 'timeouts_5m', r.n)
      )
      on conflict (fingerprint) do update
        set details = excluded.details, last_seen_at = now(),
            occurrences = public.integrity_incidents.occurrences + 1
        where public.integrity_incidents.last_seen_at < now() - interval '1 hour';
      n_timeout := n_timeout + r.n;
    end loop;
  end if;

  for r in
    select 'roulette' game, id from public.roulette_games
    where (status = 'SETTLEMENT' and settlement_started_at < clock_timestamp() - interval '2 minutes')
       or (status in ('LOCKED', 'SPINNING') and spin_end_at < clock_timestamp() - interval '2 minutes')
    limit 20
  loop
    insert into public.integrity_incidents (check_name, fingerprint, details)
    values ('stuck_round', 'swh:stuck:roulette:' || r.id, jsonb_build_object('game', 'roulette', 'game_id', r.id))
    on conflict (fingerprint) do update
      set details = excluded.details, last_seen_at = now(),
          occurrences = public.integrity_incidents.occurrences + 1
      where public.integrity_incidents.last_seen_at < now() - interval '1 hour';
    n_stuck := n_stuck + 1;
  end loop;

  for r in
    select id from public.slot_games
    where status = 'SETTLEMENT' and settlement_started_at < clock_timestamp() - interval '2 minutes'
    limit 20
  loop
    insert into public.integrity_incidents (check_name, fingerprint, details)
    values ('stuck_round', 'swh:stuck:slot:' || r.id, jsonb_build_object('game', 'slot', 'game_id', r.id))
    on conflict (fingerprint) do update
      set details = excluded.details, last_seen_at = now(),
          occurrences = public.integrity_incidents.occurrences + 1
      where public.integrity_incidents.last_seen_at < now() - interval '1 hour';
    n_stuck := n_stuck + 1;
  end loop;

  if to_regclass('public.crypto_withdrawals') is not null then
    select count(*)::int into n_withdrawals from (
      select 1 from public.crypto_withdrawals
      where status in ('PENDING', 'HELD', 'APPROVED', 'SUBMITTING', 'SUBMITTED', 'LIQUIDITY_PENDING')
        and created_at < clock_timestamp() - interval '30 minutes'
      limit 50
    ) s;
    if n_withdrawals > 0 then
      insert into public.integrity_incidents (check_name, fingerprint, details)
      values (
        'withdrawals_aging',
        'swh:withdrawals-old',
        jsonb_build_object('older_than', '30 minutes', 'count', n_withdrawals)
      )
      on conflict (fingerprint) do update
        set details = excluded.details, last_seen_at = now(),
            occurrences = public.integrity_incidents.occurrences + 1
        where public.integrity_incidents.last_seen_at < now() - interval '1 hour';
    end if;
  end if;

  return jsonb_build_object(
    'stale', n_stale, 'startup_timeouts', n_timeout, 'stuck', n_stuck,
    'old_withdrawals', n_withdrawals, 'server_time', clock_timestamp());
end
$fn$;
revoke all on function public.settlement_worker_health() from public, anon, authenticated;
grant execute on function public.settlement_worker_health() to service_role;

create or replace function public.pvp_minute_dispatch()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare results jsonb := '{}'::jsonb; step text; one jsonb;
begin
  foreach step in array array['crypto-withdrawals', 'crypto-deposits', 'leaderboard']
  loop
    begin
      if step = 'crypto-withdrawals' then
        perform public.crypto_invoke_cron('crypto-withdrawals');
        one := '{"ok":true}'::jsonb;
      elsif step = 'crypto-deposits' then
        perform public.crypto_invoke_cron('crypto-deposits');
        one := '{"ok":true}'::jsonb;
      else
        one := public.leaderboard_tick();
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
