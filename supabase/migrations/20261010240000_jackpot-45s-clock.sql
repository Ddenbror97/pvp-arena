-- The jackpot clock starts at 45 seconds. A new player adds 10 seconds only
-- once 35 seconds or less remain, so the opening 10 seconds do not stretch it.

alter table public.jackpot_config alter column countdown_seconds set default 45;

update public.jackpot_config
set countdown_seconds = 45,
    updated_at = clock_timestamp()
where countdown_seconds = 60;

update public.jackpot_games
set countdown_seconds = 45
where status = 'WAITING'
  and countdown_started_at is null
  and countdown_seconds = 60;

create or replace function public.jackpot_join(p_amount bigint, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid(); g public.jackpot_games; c public.jackpot_config; prof public.profiles;
  e public.jackpot_entries; ts timestamptz; avail uuid; locked uuid; bal bigint; tx uuid;
  is_new boolean; extended boolean := false; started boolean := false; gid bigint;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  select * into e from jackpot_entries where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('duplicate', true, 'entry_id', e.id, 'game_id', e.game_id, 'amount', e.amount);
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from jackpot_config;
  if (select count(*) from jackpot_entries where user_id = uid and created_at > clock_timestamp() - make_interval(secs => c.entry_rate_window_seconds)) >= c.entry_rate_limit then
    raise exception 'RATE_LIMITED';
  end if;

  gid := _ensure_open_game();
  if gid is null then
    if not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
    raise exception 'GAME_CLOSED';
  end if;
  select * into g from jackpot_games where id = gid for update;
  if g.status not in ('WAITING','ACTIVE') then raise exception 'GAME_CLOSED'; end if;
  if g.account_type <> (select account_type from money_domain_config) or not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  ts := clock_timestamp();
  if g.status = 'ACTIVE' and ts >= g.scheduled_end_at then raise exception 'GAME_CLOSED'; end if;
  if p_amount is null or p_amount < g.min_entry then raise exception 'BELOW_MIN_ENTRY'; end if;
  if p_amount > g.max_entry then raise exception 'ABOVE_MAX_ENTRY'; end if;

  avail := _user_account(uid, 'user_available', g.asset, g.account_type);
  locked := _user_account(uid, 'user_locked', g.asset, g.account_type);
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('jackpot_entry', 'entry:' || uid || ':' || p_idempotency_key, g.account_type, uid, g.id, 'Jackpot entry') returning id into tx;
  perform _post(tx, avail, -p_amount);
  perform _post(tx, locked, p_amount);

  insert into jackpot_entries (game_id, user_id, amount, ticket_start, ticket_end, ledger_tx_id, idempotency_key, created_at)
    values (g.id, uid, p_amount, g.pot_amount, g.pot_amount + p_amount, tx, p_idempotency_key, ts) returning * into e;

  is_new := not exists (select 1 from jackpot_players where game_id = g.id and user_id = uid);
  insert into jackpot_players (game_id, user_id, total_amount, entry_count, first_entry_at, last_entry_at)
    values (g.id, uid, p_amount, 1, ts, ts)
    on conflict (game_id, user_id) do update set total_amount = jackpot_players.total_amount + excluded.total_amount,
      entry_count = jackpot_players.entry_count + 1, last_entry_at = excluded.last_entry_at;

  if is_new then
    g.player_count := g.player_count + 1;
    if g.player_count = 2 then
      g.status := 'ACTIVE';
      g.countdown_started_at := ts;
      g.scheduled_end_at := ts + make_interval(secs => g.countdown_seconds);
      g.max_end_at := ts + make_interval(secs => g.max_duration_seconds);
      started := true;
    elsif g.player_count > 2 and g.scheduled_end_at - ts <= interval '35 seconds' then
      g.scheduled_end_at := least(g.scheduled_end_at + make_interval(secs => g.extension_seconds), g.max_end_at);
      extended := true;
    end if;
  end if;

  update jackpot_games set status = g.status, pot_amount = g.pot_amount + p_amount, entry_count = entry_count + 1,
    player_count = g.player_count, countdown_started_at = g.countdown_started_at,
    scheduled_end_at = g.scheduled_end_at, max_end_at = g.max_end_at
  where id = g.id;

  perform _audit(uid, 'entry', g.id, jsonb_build_object('amount', p_amount, 'ticket_start', e.ticket_start, 'new_player', is_new, 'timer_started', started, 'timer_extended', extended));
  return jsonb_build_object('duplicate', false, 'entry_id', e.id, 'game_id', g.id, 'amount', p_amount,
    'ticket_start', e.ticket_start, 'ticket_end', e.ticket_end, 'new_player', is_new, 'timer_started', started, 'timer_extended', extended);
end $$;
