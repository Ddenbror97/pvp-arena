-- Admin deposit/withdraw lists and overview counts start at ops_stat_epoch (balances unchanged).

update public.ops_stat_epoch set started_at = clock_timestamp() where id = true;

create or replace function public.roulette_advance(p_game_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare g public.roulette_games; w public.roulette_wheels; seed bytea; d record; ts timestamptz; err text; rc public.roulette_color;
  settle_try int := 0;
begin
  select * into g from public.roulette_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED', 'CANCELLED') then return 'noop'; end if;
  if g.status = 'WAITING' then return 'not_due'; end if;
  ts := clock_timestamp();

  if g.status = 'BETTING' then
    if ts < g.betting_ends_at then return 'not_due'; end if;
    if ts >= g.betting_ends_at + make_interval(secs => g.stuck_cancel_seconds) then
      perform public._roulette_refund(g.id, 'STUCK');
      perform public._roulette_ensure_open();
      return 'cancelled';
    end if;
    select * into w from public.roulette_wheels where version = g.wheel_version;
    select server_seed into seed from public.roulette_game_secrets where game_id = g.id;
    if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
    select * into d from public.roulette_draw_slot(seed, g.id, g.draw_version, w.slot_count);
    rc := w.layout[d.slot + 1];
    insert into public.roulette_results (game_id, protocol_version, draw_version, wheel_version, server_seed_hash, message, hmac_hex, draw_counter, slot, color)
      values (g.id, g.protocol_version, g.draw_version, g.wheel_version, g.server_seed_hash,
              'PVPCasino:roulette:v1:' || g.id || ':' || g.draw_version || ':' || d.counter, d.hmac_hex, d.counter, d.slot, rc);
    update public.roulette_games set status = 'LOCKED', locked_at = ts,
        spin_start_at = ts + make_interval(secs => g.lock_ms / 1000.0),
        spin_end_at = ts + make_interval(secs => (g.lock_ms + g.spin_ms) / 1000.0)
      where id = g.id returning * into g;
    perform public._roulette_audit(null, 'ROUND_LOCKED', g.id, jsonb_build_object('bets', g.bet_count, 'pot', g.pot_amount));
  end if;

  if g.status = 'LOCKED' then
    if ts < g.spin_start_at - make_interval(secs => least(0.1, g.lock_ms / 10000.0)) then return 'locked'; end if;
    update public.roulette_games gg set status = 'SPINNING', winning_slot = r.slot, winning_color = r.color
      from public.roulette_results r where r.game_id = gg.id and gg.id = g.id returning gg.* into g;
    perform public._roulette_audit(null, 'SPIN_STARTED', g.id, jsonb_build_object('spin_end_at', g.spin_end_at));
  end if;

  if g.status = 'SPINNING' then
    if ts < g.spin_end_at then return 'spinning'; end if;
    update public.roulette_games set status = 'SETTLEMENT', settlement_started_at = ts where id = g.id returning * into g;
  end if;

  if g.status <> 'SETTLEMENT' then
    return 'not_due';
  end if;

  loop
    settle_try := settle_try + 1;
    begin
      if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
      perform public._roulette_settle(g.id);
      exit;
    exception
      when sqlstate '40P01' then
        if settle_try >= 4 then
          err := sqlerrm;
          update public.roulette_games set settle_attempts = settle_attempts + 1, last_error = left(err, 500) where id = g.id;
          perform public._roulette_audit(null, 'RECOVERY_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
          return 'failed';
        end if;
        perform pg_sleep(0.02 * settle_try);
        select * into g from public.roulette_games where id = p_game_id for update;
      when others then
        err := sqlerrm;
        update public.roulette_games set settle_attempts = settle_attempts + 1, last_error = left(err, 500) where id = g.id;
        perform public._roulette_audit(null, 'RECOVERY_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
        return 'failed';
    end;
  end loop;
  perform public._roulette_ensure_open();
  return 'settled';
end $$;
revoke execute on function public.roulette_advance(bigint) from public, anon, authenticated;
grant execute on function public.roulette_advance(bigint) to service_role;

CREATE OR REPLACE FUNCTION public.admin_ops_query(p_kind text, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_money_epoch timestamptz := coalesce((select started_at from public.ops_stat_epoch where id = true), '-infinity'::timestamptz);
  lim int := 25;
  v_cursor text;
  v_status text;
  v_q text;
  v_from timestamptz;
  v_to timestamptz;
  v_game text;
  v_sev text;
  v_asset text;
  v_chain text;
  v_rail text;
  rows jsonb;
  v_id bigint;
  v_uuid uuid;
  v_cursor_at timestamptz;
  v_cursor_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  if p_args is null then p_args := '{}'::jsonb; end if;
  if p_kind is null or p_kind !~ '^(overview|live|games|game|deposits|withdrawals|withdrawal|logs)$' then
    raise exception 'BAD_REQUEST';
  end if;

  begin
    if coalesce(p_args->>'limit', '') <> '' then
      if p_args->>'limit' !~ '^[0-9]{1,3}$' then raise exception 'BAD_REQUEST'; end if;
      lim := (p_args->>'limit')::int;
    end if;
    if lim < 1 or lim > 50 then lim := 25; end if;

    v_cursor := nullif(p_args->>'cursor', '');
    if v_cursor is not null and v_cursor !~ '^[0-9]+$' and p_kind not in ('deposits', 'withdrawals') then
      raise exception 'BAD_REQUEST';
    end if;
    v_status := nullif(upper(p_args->>'status'), '');
    if v_status is not null and v_status !~ '^[A-Z_]{3,32}$' then raise exception 'BAD_REQUEST'; end if;
    v_q := nullif(left(regexp_replace(coalesce(p_args->>'q', ''), '[%_\\]', '', 'g'), 80), '');
    v_game := nullif(lower(p_args->>'game'), '');
    if v_game is not null and v_game not in ('jackpot', 'coinflip', 'roulette') then raise exception 'BAD_REQUEST'; end if;
    v_sev := nullif(upper(p_args->>'severity'), '');
    if v_sev is not null and v_sev not in ('INFO', 'WARNING', 'ERROR', 'CRITICAL') then raise exception 'BAD_REQUEST'; end if;
    v_asset := nullif(upper(p_args->>'asset'), '');
    if v_asset is not null and v_asset !~ '^[A-Z0-9]{2,12}$' then raise exception 'BAD_REQUEST'; end if;
    v_chain := nullif(p_args->>'chain', '');
    if v_chain is not null and v_chain !~ '^[0-9]{1,12}$' then raise exception 'BAD_REQUEST'; end if;
    v_rail := nullif(lower(p_args->>'rail'), '');
    if v_rail is not null and v_rail not in ('evm', 'bitcoin', 'card') then raise exception 'BAD_REQUEST'; end if;
    if coalesce(p_args->>'from', '') <> '' then
      if p_args->>'from' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then raise exception 'BAD_REQUEST'; end if;
      v_from := (p_args->>'from')::timestamptz;
    end if;
    if coalesce(p_args->>'to', '') <> '' then
      if p_args->>'to' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then raise exception 'BAD_REQUEST'; end if;
      v_to := (p_args->>'to')::timestamptz;
    end if;
    if p_kind in ('deposits', 'withdrawals') and v_cursor is not null then
      if v_cursor !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'BAD_REQUEST'; end if;
      if coalesce(p_args->>'cursor_at', '') !~ '^[0-9]{4}-' then raise exception 'BAD_REQUEST'; end if;
      v_cursor_id := v_cursor::uuid;
      v_cursor_at := (p_args->>'cursor_at')::timestamptz;
    end if;
  exception
    when invalid_text_representation or datetime_field_overflow then
      raise exception 'BAD_REQUEST';
  end;

  if p_kind = 'live' then
    return jsonb_build_object(
      'server_time', clock_timestamp(),
      'workers', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', name,
          'last_run_at', last_run_at,
          'age_seconds', extract(epoch from (clock_timestamp() - last_run_at))
        ) order by name)
        from worker_tick_gate
      ), '[]'::jsonb),
      'jobs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', name,
          'last_run_at', last_run_at,
          'age_seconds', extract(epoch from (clock_timestamp() - last_run_at))
        ) order by name)
        from crypto_job_runs
      ), '[]'::jsonb),
      'integrity', (
        select jsonb_build_object('id', id, 'started_at', started_at, 'finished_at', finished_at, 'incidents_found', incidents_found)
        from integrity_runs order by id desc limit 1
      ),
      'crypto_cursor_at', (select max(updated_at) from crypto_chain_cursor),
      'roulette_error', (
        select public._admin_redact_text(last_error) from roulette_games
        where last_error is not null order by id desc limit 1
      ),
      'latest_failure', (
        select jsonb_build_object('id', id, 'action', action, 'game_type', game_type, 'game_id', game_id, 'created_at', created_at)
        from audit_logs where action ~* '(fail|error|critical)' order by id desc limit 1
      ),
      'roulette', (
        select jsonb_build_object(
          'id', id, 'status', status, 'pot_amount', pot_amount, 'bet_count', bet_count, 'player_count', player_count,
          'created_at', created_at, 'betting_ends_at', betting_ends_at, 'spin_end_at', spin_end_at,
          'locked_at', locked_at, 'completed_at', completed_at,
          'winning_color', case when status = 'COMPLETED' then winning_color::text else null end,
          'total_payout', case when status = 'COMPLETED' then total_payout else null end
        )
        from roulette_games
        where status not in ('COMPLETED', 'CANCELLED')
        order by id desc limit 1
      )
    );
  end if;

  if p_kind = 'overview' then
    return jsonb_build_object(
      'server_time', clock_timestamp(),
      'money_epoch', v_money_epoch,
      'jackpot', (
        select jsonb_build_object(
          'waiting', count(*) filter (where status = 'WAITING'),
          'active', count(*) filter (where status = 'ACTIVE'),
          'drawing', count(*) filter (where status = 'DRAWING')
        ) from jackpot_games where status in ('WAITING', 'ACTIVE', 'DRAWING')
      ) || jsonb_build_object(
        'completed_today', (select count(*) from jackpot_games where status = 'COMPLETED' and completed_at >= day_start),
        'cancelled_today', (select count(*) from jackpot_games where status = 'CANCELLED' and updated_at >= day_start),
        'rounds_today', (select count(*) from jackpot_games where created_at >= day_start)
      ),
      'coinflip', jsonb_build_object(
        'waiting', (select count(*) from coinflip_games where status = 'WAITING'),
        'active', (select count(*) from coinflip_games where status in ('READY', 'FLIPPING', 'SETTLEMENT')),
        'completed_today', (select count(*) from coinflip_games where status = 'COMPLETED' and completed_at >= day_start),
        'cancelled_today', (select count(*) from coinflip_games where status = 'CANCELLED' and cancelled_at >= day_start),
        'open_wager', (select coalesce(sum(case when status = 'WAITING' then amount else pot_amount end), 0) from coinflip_games where status in ('WAITING', 'READY', 'FLIPPING', 'SETTLEMENT'))
      ),
      'roulette', jsonb_build_object(
        'completed_today', (select count(*) from roulette_games where status = 'COMPLETED' and completed_at >= day_start),
        'cancelled_today', (select count(*) from roulette_games where status = 'CANCELLED' and cancelled_at >= day_start)
      ),
      'deposits', jsonb_build_object(
        'pending', (select count(*) from crypto_deposits where status = 'DETECTED' and created_at >= v_money_epoch),
        'confirming', (select count(*) from crypto_deposits where status = 'CONFIRMED' and created_at >= v_money_epoch),
        'unmatched', (select count(*) from crypto_deposits where status = 'UNMATCHED' and created_at >= v_money_epoch),
        'failed_today', (select count(*) from crypto_deposits where status in ('REJECTED', 'ORPHANED') and created_at >= day_start),
        'open_invoices', (
          select count(*) from btcpay_invoices where status in ('NEW', 'PROCESSING', 'SETTLED', 'REVIEW', 'INVALID')
        ),
        'today_count', (
          select count(*) from crypto_deposits where created_at >= greatest(day_start, v_money_epoch)
        ) + (
          select count(*) from btcpay_invoices where created_at >= greatest(day_start, v_money_epoch)
        ),
        'today_cents', (
          select coalesce(sum(usd_cents) filter (where credited_at >= greatest(day_start, v_money_epoch)), 0)
          from public._admin_credited_deposits()
        )
      ),
      'withdrawals', coalesce((
        select jsonb_build_object(
          'requested', coalesce(sum(c) filter (where status = 'PENDING' and not review_required), 0),
          'manual_review', coalesce(sum(c) filter (where review_required and status in ('PENDING', 'HELD')), 0),
          'funds_locked', coalesce(sum(c) filter (where status = 'HELD'), 0),
          'approved', coalesce(sum(c) filter (where status = 'APPROVED'), 0),
          'queued', coalesce(sum(c) filter (where status = 'LIQUIDITY_PENDING'), 0),
          'signing', coalesce(sum(c) filter (where status = 'SUBMITTING'), 0),
          'broadcast', coalesce(sum(c) filter (where status = 'SUBMITTED'), 0),
          'requested_cents', coalesce(sum(cents) filter (where status = 'PENDING'), 0),
          'open_cents', (select coalesce(sum(usd_cents), 0) from public._admin_open_withdrawals()),
          'bitcoin_open', (select count(*) from btcpay_payouts where status in ('HOLD', 'AWAITING_APPROVAL', 'QUEUED'))
        )
        from (
          select status, review_required, count(*)::int c, coalesce(sum(usd_cents), 0)::bigint cents
          from crypto_withdrawals
          where status in ('PENDING', 'HELD', 'APPROVED', 'LIQUIDITY_PENDING', 'SUBMITTING', 'SUBMITTED')
            and created_at >= v_money_epoch
          group by status, review_required
        ) s
      ), '{}'::jsonb) || jsonb_build_object(
        'completed_today', (select count(*) from public._admin_settled_withdrawals() where paid_at >= day_start),
        'completed_today_cents', (select coalesce(sum(usd_cents) filter (where paid_at >= day_start), 0) from public._admin_settled_withdrawals()),
        'failed_today', (
          select count(*) from crypto_withdrawals where status = 'FAILED' and created_at >= day_start
        ) + (
          select count(*) from btcpay_payouts where status = 'FAILED' and coalesce(closed_at, created_at) >= day_start
        ),
        'cancelled_today', (
          select count(*) from crypto_withdrawals where status in ('REJECTED', 'RELEASED') and coalesce(closed_at, created_at) >= day_start
        ) + (
          select count(*) from btcpay_payouts where status = 'CANCELLED' and coalesce(closed_at, created_at) >= day_start
        )
      )
    );
  end if;

  if p_kind = 'games' then
    if v_game is null then raise exception 'BAD_REQUEST'; end if;
    if v_game = 'jackpot' then
      select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into rows from (
        select g.id, g.status::text as status, g.player_count, g.entry_count, g.pot_amount,
          w.username as winner, g.rake_amount as fee, g.payout_amount, g.created_at, g.completed_at, g.updated_at, g.scheduled_end_at
        from jackpot_games g
        left join profiles w on w.id = g.winner_id
        where (v_cursor is null or g.id < v_cursor::bigint)
          and (v_status is null or g.status::text = v_status)
        order by g.id desc
        limit lim
      ) x;
    elsif v_game = 'coinflip' then
      select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into rows from (
        select g.id, g.status::text as status, c.username as creator, o.username as opponent, g.amount as wager,
          w.username as winner, g.fee_amount as fee, g.payout_amount, g.created_at, g.joined_at, g.completed_at
        from coinflip_games g
        left join profiles c on c.id = g.creator_id
        left join profiles o on o.id = g.opponent_id
        left join profiles w on w.id = g.winner_id
        where (v_cursor is null or g.id < v_cursor::bigint)
          and (v_status is null or g.status::text = v_status)
        order by g.id desc
        limit lim
      ) x;
    else
      select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into rows from (
        select g.id, g.status::text as status,
          case when g.status = 'COMPLETED' then g.winning_color::text else null end as result,
          g.pot_amount, case when g.status = 'COMPLETED' then g.total_payout else null end as total_payout,
          g.bet_count, g.player_count, g.created_at, g.completed_at
        from roulette_games g
        where (v_cursor is null or g.id < v_cursor::bigint)
          and (v_status is null or g.status::text = v_status)
        order by g.id desc
        limit lim
      ) x;
    end if;
    return jsonb_build_object('rows', rows, 'next', case when jsonb_array_length(rows) = lim then rows->(lim - 1)->>'id' else null end);
  end if;

  if p_kind = 'game' then
    if v_game is null or coalesce(p_args->>'id', '') !~ '^[0-9]+$' then raise exception 'BAD_REQUEST'; end if;
    v_id := (p_args->>'id')::bigint;
    if v_game = 'jackpot' then
      select to_jsonb(x) into rows from (
        select g.id, g.status::text as status, g.player_count, g.entry_count, g.pot_amount, w.username as winner,
          g.rake_amount as fee, g.payout_amount, g.created_at, g.countdown_started_at, g.scheduled_end_at,
          g.drawn_at, g.completed_at, g.updated_at, public._admin_redact_text(p.last_error) as last_error
        from jackpot_games g
        left join profiles w on w.id = g.winner_id
        left join jackpot_payouts p on p.game_id = g.id
        where g.id = v_id
      ) x;
    elsif v_game = 'coinflip' then
      select to_jsonb(x) into rows from (
        select g.id, g.status::text as status, c.username as creator, o.username as opponent, g.amount as wager,
          w.username as winner, g.fee_amount as fee, g.payout_amount, g.created_at, g.joined_at, g.completed_at,
          g.cancelled_at, g.cancel_reason, public._admin_redact_text(p.last_error) as last_error
        from coinflip_games g
        left join profiles c on c.id = g.creator_id
        left join profiles o on o.id = g.opponent_id
        left join profiles w on w.id = g.winner_id
        left join lateral (
          select last_error from coinflip_payouts where game_id = g.id and kind = 'WINNER' order by created_at desc limit 1
        ) p on true
        where g.id = v_id
      ) x;
    else
      select to_jsonb(x) into rows from (
        select g.id, g.status::text as status, g.pot_amount, g.bet_count, g.player_count,
          case when g.status = 'COMPLETED' then g.winning_color::text else null end as result,
          case when g.status = 'COMPLETED' then g.total_payout else null end as total_payout,
          g.created_at, g.betting_started_at, g.betting_ends_at, g.locked_at, g.spin_start_at, g.spin_end_at,
          g.completed_at, g.cancelled_at, g.cancel_reason, public._admin_redact_text(g.last_error) as last_error
        from roulette_games g where g.id = v_id
      ) x;
    end if;
    return jsonb_build_object('game', rows);
  end if;


  if p_kind = 'deposits' then
    select coalesce(jsonb_agg(x order by x.created_at desc, x.id desc), '[]'::jsonb) into rows from (
      select u.id, u.user_id, pr.username, u.rail, u.asset_key, u.chain_id, u.network,
        u.units, u.usd_cents, u.status, u.tx_hash, u.created_at, u.confirmed_at, u.credited_at, u.from_masked
      from (
        select d.id, d.user_id, 'evm'::text as rail, d.asset_key, d.chain_id, n.name as network,
          d.units::text as units, d.usd_cents, d.status, d.tx_hash, d.created_at, d.confirmed_at, d.credited_at,
          case when d.from_address is null then null else left(d.from_address, 6) || '…' || right(d.from_address, 4) end as from_masked
        from crypto_deposits d
        left join chain_networks n on n.chain_id = d.chain_id
        union all
        select b.id, b.user_id, 'bitcoin', 'BTC', null::bigint, 'Bitcoin',
          b.btc_due, case when b.status = 'CREDITED' and b.credited_cents > 0 then b.credited_cents else b.usd_cents end,
          b.status, null::text, b.created_at, b.credited_at, b.credited_at,
          case when b.address is null then null else left(b.address, 6) || '…' || right(b.address, 4) end
        from btcpay_invoices b
      ) u
      left join profiles pr on pr.id = u.user_id
      where (v_status is null or u.status = v_status)
        and (v_rail is null or u.rail = v_rail)
        and (v_asset is null or u.asset_key = v_asset)
        and (v_chain is null or u.chain_id = v_chain::bigint)
        and u.created_at >= v_money_epoch
        and (v_from is null or u.created_at >= v_from)
        and (v_to is null or u.created_at < v_to)
        and (v_cursor_id is null or u.created_at < v_cursor_at or (u.created_at = v_cursor_at and u.id < v_cursor_id))
        and (
          v_q is null
          or (v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (u.id = v_q::uuid or u.user_id = v_q::uuid))
          or (v_q ~* '^0x[0-9a-f]{64}$' and lower(u.tx_hash) = lower(v_q))
        )
      order by u.created_at desc, u.id desc
      limit lim
    ) x;
    return jsonb_build_object(
      'rows', rows,
      'next', case when jsonb_array_length(rows) = lim then rows->(lim - 1) else null end
    );
  end if;

  if p_kind = 'withdrawals' then
    select coalesce(jsonb_agg(x order by x.created_at desc, x.id desc), '[]'::jsonb) into rows from (
      select u.id, u.user_id, pr.username, u.rail, u.asset_key, u.chain_id, u.network,
        u.usd_cents, u.units, u.status, u.review_required, u.tx_hash, u.created_at, u.confirmed_at, u.closed_at, u.to_masked
      from (
        select w.id, w.user_id, 'evm'::text as rail, w.asset_key, w.chain_id, n.name as network,
          w.usd_cents, w.units::text as units, w.status, w.review_required, w.tx_hash,
          w.created_at, w.confirmed_at, w.closed_at,
          case when w.to_address is null then null else left(w.to_address, 6) || '…' || right(w.to_address, 4) end as to_masked
        from crypto_withdrawals w
        left join chain_networks n on n.chain_id = w.chain_id
        union all
        select b.id, b.user_id, 'bitcoin', 'BTC', null::bigint, 'Bitcoin',
          b.usd_cents, null::text, b.status, b.status = 'AWAITING_APPROVAL', null::text,
          b.created_at, case when b.status = 'COMPLETED' then b.closed_at else null end, b.closed_at,
          case when b.address is null then null else left(b.address, 6) || '…' || right(b.address, 4) end
        from btcpay_payouts b
      ) u
      left join profiles pr on pr.id = u.user_id
      where (v_status is null or u.status = v_status)
        and (v_rail is null or u.rail = v_rail)
        and (v_asset is null or u.asset_key = v_asset)
        and (v_chain is null or u.chain_id = v_chain::bigint)
        and u.created_at >= v_money_epoch
        and (v_from is null or u.created_at >= v_from)
        and (v_to is null or u.created_at < v_to)
        and (v_cursor_id is null or u.created_at < v_cursor_at or (u.created_at = v_cursor_at and u.id < v_cursor_id))
        and (
          v_q is null
          or (v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (u.id = v_q::uuid or u.user_id = v_q::uuid))
          or (v_q ~* '^0x[0-9a-f]{64}$' and lower(u.tx_hash) = lower(v_q))
        )
      order by u.created_at desc, u.id desc
      limit lim
    ) x;
    return jsonb_build_object(
      'rows', rows,
      'next', case when jsonb_array_length(rows) = lim then rows->(lim - 1) else null end
    );
  end if;

  if p_kind = 'withdrawal' then
    if coalesce(p_args->>'id', '') !~* '^[0-9a-f-]{36}$' then raise exception 'BAD_REQUEST'; end if;
    v_uuid := (p_args->>'id')::uuid;
    if v_rail is null or v_rail = 'evm' then
      select to_jsonb(x) into rows from (
        select w.id, w.user_id, p.username, 'evm'::text as rail, w.asset_key, w.chain_id, n.name as network,
          w.usd_cents, w.units::text as units, w.status, w.review_required, w.reviewed_at, w.tx_hash,
          w.created_at, w.submitted_at, w.confirmed_at, w.closed_at, w.attempts,
          public._admin_redact_text(w.last_error) as last_error,
          left(w.to_address, 6) || '…' || right(w.to_address, 4) as to_masked
        from crypto_withdrawals w
        left join profiles p on p.id = w.user_id
        left join chain_networks n on n.chain_id = w.chain_id
        where w.id = v_uuid
      ) x;
    end if;
    if rows is null and (v_rail is null or v_rail = 'bitcoin') then
      select to_jsonb(x) into rows from (
        select b.id, b.user_id, p.username, 'bitcoin'::text as rail, 'BTC'::text as asset_key, 'Bitcoin'::text as network,
          b.usd_cents, b.fee_usd_cents, b.status, b.created_at, b.closed_at,
          public._admin_redact_text(b.closed_reason) as closed_reason,
          left(b.address, 6) || '…' || right(b.address, 4) as to_masked
        from btcpay_payouts b
        left join profiles p on p.id = b.user_id
        where b.id = v_uuid
      ) x;
    end if;
    return jsonb_build_object('withdrawal', rows);
  end if;

  -- logs
  select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into rows from (
    select a.id, a.created_at, a.action, a.game_type, a.game_id, a.actor_id,
      case
        when a.action ~* 'critical' then 'CRITICAL'
        when a.action ~* '(fail|error)' then 'ERROR'
        when a.action ~* '(warn|reject|cancel|unmatched)' then 'WARNING'
        else 'INFO'
      end as severity,
      public._admin_redact(a.details) as details
    from audit_logs a
    where (v_cursor is null or a.id < v_cursor::bigint)
      and (v_game is null or a.game_type = v_game)
      and (v_from is null or a.created_at >= v_from)
      and (v_to is null or a.created_at < v_to)
      and (
        v_sev is null
        or (v_sev = 'CRITICAL' and a.action ~* 'critical')
        or (v_sev = 'ERROR' and a.action ~* '(fail|error)' and a.action !~* 'critical')
        or (v_sev = 'WARNING' and a.action ~* '(warn|reject|cancel|unmatched)' and a.action !~* '(fail|error|critical)')
        or (v_sev = 'INFO' and a.action !~* '(critical|fail|error|warn|reject|cancel|unmatched)')
      )
      and (
        v_q is null
        or a.action ilike '%' || v_q || '%'
        or (v_q ~ '^[0-9]+$' and a.game_id = v_q::bigint)
      )
    order by a.id desc
    limit lim
  ) x;
  return jsonb_build_object('rows', rows, 'next', case when jsonb_array_length(rows) = lim then rows->(lim - 1)->>'id' else null end);
exception
  when others then
    if sqlerrm in ('FORBIDDEN', 'BAD_REQUEST', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'ADMIN_STEP_UP') then
      raise;
    end if;
    raise warning 'admin_ops_query failed: %', left(sqlerrm, 200);
    raise exception 'ADMIN_UNAVAILABLE' using errcode = 'XX000';
end $function$;
