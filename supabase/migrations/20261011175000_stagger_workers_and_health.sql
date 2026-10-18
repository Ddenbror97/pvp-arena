-- The six background workers were filling up because five minute jobs, roulette,
-- and slots all launched at second 0. On 11 Oct 2026 that pile reached 9
-- overlapping runs while max_worker_processes is 6, and pg_cron reported
-- "job startup timeout". pg_cron 1.6 cannot place a job on a chosen second.
-- One minute dispatcher runs withdrawals, deposits, the leaderboard, coinflip,
-- and jackpot in that order, each in its own subtransaction, on a single
-- worker. A second start of the same tick takes the advisory lock and returns.
-- The health check reads clocks and stuck-round indexes. It does not settle
-- or post ledger rows.

create or replace function public._tick_gate(p_name text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean; r text; internal boolean;
begin
  r := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  internal := session_user <> 'authenticator' and r not in ('anon', 'authenticated');
  if not pg_try_advisory_xact_lock(hashtext('pvp_tick:' || p_name)) then
    return false;
  end if;
  if internal then
    insert into public.worker_tick_gate(name, last_run_at)
    values (p_name, clock_timestamp())
    on conflict (name) do update set last_run_at = clock_timestamp();
    return true;
  end if;
  update public.worker_tick_gate set last_run_at = clock_timestamp()
    where name = p_name and last_run_at <= clock_timestamp() - interval '250 milliseconds'
    returning true into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public._tick_gate(text) from public, anon, authenticated;

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
  allowed interval;
begin
  for r in
    select name, last_run_at from public.worker_tick_gate
    where name in ('roulette', 'slot', 'jackpot', 'coinflip')
  loop
    allowed := case when r.name in ('roulette', 'slot') then interval '15 seconds' else interval '150 seconds' end;
    if r.last_run_at < clock_timestamp() - allowed
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
            occurrences = public.integrity_incidents.occurrences + 1;
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
    for r in
      select j.jobname, count(*)::int n
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      where d.start_time > clock_timestamp() - interval '5 minutes'
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
            occurrences = public.integrity_incidents.occurrences + 1;
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
          occurrences = public.integrity_incidents.occurrences + 1;
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
          occurrences = public.integrity_incidents.occurrences + 1;
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
            occurrences = public.integrity_incidents.occurrences + 1;
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
  foreach step in array array[
    'crypto-withdrawals', 'crypto-deposits', 'leaderboard', 'coinflip', 'jackpot', 'health'
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
      elsif step = 'coinflip' then
        one := public.coinflip_tick();
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
    select jobid from cron.job
    where jobname in (
      'pvp-jackpot-worker', 'pvp-coinflip-worker', 'pvp-crypto-deposits',
      'pvp-crypto-withdrawals', 'pvp-leaderboard-worker',
      'pvp-minute-dispatch', 'pvp-settlement-health'
    )
  loop
    perform cron.unschedule(jid);
  end loop;
end
$unschedule$;

select cron.schedule('pvp-minute-dispatch', '* * * * *', 'select public.pvp_minute_dispatch()');
select cron.schedule('pvp-settlement-health', '8,23,38,53 * * * *', 'select public.settlement_worker_health()');
-- prod-only:end
