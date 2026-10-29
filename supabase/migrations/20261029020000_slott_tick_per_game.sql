-- Many Slott matches were advanced inside one slot_tick transaction. The first
-- due row stayed locked until the whole batch finished, so a busy second could
-- not start the next one. The one-second job now commits each match and leaves
-- pool and poker their own time. slot_tick remains the single-transaction
-- recovery path. Due rows are read through partial indexes, one predicate at
-- a time, so completed history is not scanned on every tick. The slot
-- broadcast carries the fields the lists need; a live spin does not ship the
-- whole game row.

create index if not exists slot_games_due_waiting
  on public.slot_games (expires_at, id)
  where status = 'WAITING';

create index if not exists slot_games_due_turn
  on public.slot_games (turn_deadline, id)
  where status = 'ACTIVE' and ends_at is null;

create index if not exists slot_games_due_end
  on public.slot_games (ends_at, id)
  where status = 'ACTIVE' and ends_at is not null;

create index if not exists slot_games_due_settlement
  on public.slot_games (settle_attempts, id)
  where status = 'SETTLEMENT' and settle_attempts < 8;

create index if not exists slot_games_settlement_exhausted
  on public.slot_games (id)
  where status = 'SETTLEMENT' and settle_attempts >= 8;

create or replace function public._slot_note_exhausted()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare r record;
begin
  for r in
    select g.id, g.settle_attempts, g.last_error
    from public.slot_games g
    where g.status = 'SETTLEMENT' and g.settle_attempts >= 8
    order by g.id
    limit 20
  loop
    perform public._note_settlement_exhausted(
      'slot_settlement_exhausted',
      'slsx:' || r.id,
      jsonb_build_object(
        'game_id', r.id,
        'status', 'SETTLEMENT',
        'attempts', r.settle_attempts,
        'last_error', r.last_error
      )
    );
  end loop;
end
$fn$;

revoke all on function public._slot_note_exhausted() from public, anon, authenticated;
grant execute on function public._slot_note_exhausted() to service_role;

-- One due match. Settlement first, then a match whose clock has finished,
-- then an expired turn, then an expired open table. Skip a row another
-- worker already holds, and skip ids this pass already tried, so one failure
-- does not burn the rest of the attempt budget in the same second.
create or replace function public._slot_tick_one(p_skip bigint[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare gid bigint; res text; bumped int;
begin
  select g.id into gid
  from public.slot_games g
  where g.status = 'SETTLEMENT' and g.settle_attempts < 8
    and not (g.id = any (p_skip))
  order by g.id
  limit 1
  for update skip locked;
  if gid is null then
    select g.id into gid
    from public.slot_games g
    where g.status = 'ACTIVE' and g.ends_at <= clock_timestamp()
      and not (g.id = any (p_skip))
    order by g.id
    limit 1
    for update skip locked;
  end if;
  if gid is null then
    select g.id into gid
    from public.slot_games g
    where g.status = 'ACTIVE' and g.ends_at is null and g.turn_deadline <= clock_timestamp()
      and not (g.id = any (p_skip))
    order by g.id
    limit 1
    for update skip locked;
  end if;
  if gid is null then
    select g.id into gid
    from public.slot_games g
    where g.status = 'WAITING' and g.expires_at <= clock_timestamp()
      and not (g.id = any (p_skip))
    order by g.id
    limit 1
    for update skip locked;
  end if;
  if gid is null then
    return jsonb_build_object('result', 'idle');
  end if;
  begin
    res := public.slot_advance(gid);
  exception when others then
    update public.slot_games
      set settle_attempts = settle_attempts + 1, last_error = left(sqlerrm, 500)
      where id = gid and status = 'SETTLEMENT'
      returning settle_attempts into bumped;
    if coalesce(bumped, 0) >= 8 then
      perform public._note_settlement_exhausted(
        'slot_settlement_exhausted',
        'slsx:' || gid,
        jsonb_build_object(
          'game_id', gid,
          'status', 'SETTLEMENT',
          'attempts', bumped,
          'last_error', left(sqlerrm, 500)
        )
      );
    end if;
    perform public._audit_slot(null, 'ADVANCE_FAILED', gid, jsonb_build_object('error', left(sqlerrm, 500)));
    res := 'error';
  end;
  return jsonb_build_object('result', res, 'id', gid);
end
$fn$;

revoke all on function public._slot_tick_one(bigint[]) from public, anon, authenticated;
grant execute on function public._slot_tick_one(bigint[]) to service_role;

create or replace function public.slot_tick()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  res text;
  n_settled int := 0;
  n_cancelled int := 0;
  n_auto int := 0;
  n_failed int := 0;
  n int := 0;
  tried bigint[] := '{}';
  payload jsonb;
begin
  if not public._tick_gate('slot') then
    return jsonb_build_object('throttled', true, 'server_time', clock_timestamp());
  end if;
  perform public._slot_note_exhausted();
  loop
    exit when n >= 50;
    payload := public._slot_tick_one(tried);
    res := payload->>'result';
    exit when res = 'idle';
    if payload ? 'id' then
      tried := tried || (payload->>'id')::bigint;
    end if;
    n := n + 1;
    if res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    elsif res = 'auto_spun' then n_auto := n_auto + 1;
    elsif res in ('failed', 'error') then n_failed := n_failed + 1;
    end if;
  end loop;
  update public.worker_tick_gate set last_run_at = clock_timestamp() where name = 'slot';
  return jsonb_build_object(
    'settled', n_settled,
    'cancelled', n_cancelled,
    'auto_spun', n_auto,
    'failed', n_failed,
    'server_time', clock_timestamp()
  );
end
$fn$;

revoke all on function public.slot_tick() from public, anon, authenticated;
grant execute on function public.slot_tick() to service_role;

-- Not SECURITY DEFINER and no SET search_path: a procedure needs both absent
-- to COMMIT. Runs as the job owner. Every step is a schema-qualified definer
-- function. The name keeps "slot_tick" in the job text for the health check.
create or replace procedure public.slot_tick_worker()
language plpgsql
as $proc$
declare
  tid bigint;
  ids bigint[];
  n int := 0;
  failed int := 0;
  skipped int := 0;
  started timestamptz;
  slot_started timestamptz;
  res text;
  cap int;
  exhausted boolean := false;
  slot_n int := 0;
  payload jsonb;
  skip_ids bigint[] := '{}';
begin
  perform public._tick_gate('slot');
  commit;
  perform public._slot_note_exhausted();
  commit;
  slot_started := clock_timestamp();
  loop
    if clock_timestamp() - slot_started > interval '500 milliseconds' then
      exit;
    end if;
    exit when slot_n >= 50;
    begin
      payload := public._slot_tick_one(skip_ids);
      res := payload->>'result';
      if payload ? 'id' then
        skip_ids := skip_ids || (payload->>'id')::bigint;
      end if;
    exception when others then
      res := 'error';
    end;
    commit;
    exit when res = 'idle';
    slot_n := slot_n + 1;
  end loop;
  begin
    perform public.pool_tick();
  exception when others then
    null;
  end;
  commit;
  started := clock_timestamp();
  select tick_tables into cap from public.poker_config;
  ids := public._poker_due_tables(cap);
  foreach tid in array ids loop
    if clock_timestamp() - started > interval '400 milliseconds' then exhausted := true; exit; end if;
    res := public._poker_tick_one(tid);
    if res = 'failed' then failed := failed + 1;
    elsif res = 'skipped' then skipped := skipped + 1;
    else n := n + 1; end if;
    commit;
  end loop;
  perform public._poker_close_idle();
  perform public._poker_record_tick(started, n, failed, skipped, exhausted);
  commit;
end
$proc$;

revoke all on procedure public.slot_tick_worker() from public, anon, authenticated;
grant execute on procedure public.slot_tick_worker() to service_role;

create or replace function public._feed_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare v_topic text; v_payload jsonb;
begin
  begin
    case tg_argv[0]
      when 'wallet' then
        if new.owner_id is null
           or (tg_op = 'UPDATE' and new.balance is not distinct from old.balance) then
          return null;
        end if;
        v_topic := 'wallet:' || new.owner_id::text;
        v_payload := jsonb_build_object('kind', new.kind, 'account_type', new.account_type);
      when 'poker' then
        v_topic := 'poker:table:' || new.id::text;
        v_payload := jsonb_build_object('id', new.id, 'version', new.version);
      when 'jackpot_players' then
        v_topic := 'game:jackpot';
        v_payload := jsonb_build_object('game_id', new.game_id);
      when 'slot' then
        v_topic := 'game:slot';
        v_payload := jsonb_build_object(
          'id', new.id,
          'status', new.status,
          'next_spin', new.next_spin,
          'ends_at', new.ends_at
        );
      else
        v_topic := 'game:' || tg_argv[0];
        v_payload := to_jsonb(new);
    end case;
    perform realtime.send(v_payload, tg_argv[1], v_topic, true);
  exception when others then
    raise warning 'feed broadcast failed: %', sqlstate;
  end;
  return null;
end
$fn$;

revoke all on function public._feed_broadcast() from public, anon, authenticated;
