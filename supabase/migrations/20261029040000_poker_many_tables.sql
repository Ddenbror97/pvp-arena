-- Many poker tables at once.
--
-- The one-second worker already commits each table inside a 400ms budget.
-- tick_tables was 20, so the loop stopped after 20 tables even when the
-- budget had time left. The row (not only the column default) is raised to
-- 100. The budget is still the stop.
--
-- A tick that only moves next_due_at no longer bumps poker_tables.version.
-- The table feed broadcasts on a version change, and every viewer refetches
-- poker_table_state when that happens. Blinds, pots, and bot choices are
-- unchanged. A real change still bumps the version.
--
-- poker_table_state keeps hole cards and legal actions per viewer. The shared
-- hand, last hand, and recent list are stored once per table version.
-- poker_lobby keeps "mine" per viewer. The public table list is reused until
-- the open tables change, and for at most two seconds after that so a renamed
-- player shows up.

create table public.poker_state_cache (
  table_id bigint primary key references public.poker_tables (id) on delete cascade,
  version bigint not null,
  body jsonb not null
);
alter table public.poker_state_cache enable row level security;
revoke all on public.poker_state_cache from public, anon, authenticated;

create table public.poker_lobby_cache (
  id boolean primary key default true check (id),
  open_count int not null,
  version_sum numeric not null,
  seated_sum bigint not null,
  cfg text not null,
  types jsonb not null,
  tables jsonb not null,
  built_at timestamptz not null
);
alter table public.poker_lobby_cache enable row level security;
revoke all on public.poker_lobby_cache from public, anon, authenticated;

-- Count and sums of open tables, without reading closed history.
create index poker_tables_open_fp on public.poker_tables (version, seated) where status = 'OPEN';

alter table public.poker_config alter column tick_tables set default 100;
update public.poker_config set tick_tables = greatest(tick_tables, 100);

-- Same schedule as 20261020210200. p_notify false leaves version alone so a
-- reschedule does not wake spectators. Player actions keep the default.
drop function public._poker_touch(bigint);
create function public._poker_touch(p_table bigint, p_notify boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare t poker_tables; h poker_hands; c poker_config; due timestamptz; ready int; last_next timestamptz; kick timestamptz;
  humans int; bots int; v_seated int;
begin
  select * into t from poker_tables where id = p_table;
  select * into c from poker_config;
  if t.hand_id is not null then
    select * into h from poker_hands where id = t.hand_id;
    due := case h.status
      when 'COMMIT' then h.reveal_deadline
      when 'BETTING' then least(h.action_deadline, coalesce(h.bot_act_at, h.action_deadline))
      when 'SETTLEMENT' then case when h.settle_attempts < 8 then clock_timestamp() + interval '2 seconds' end end;
  else
    select count(*) into ready from poker_seats
      where table_id = p_table and status = 'SEATED' and state = 'ACTIVE' and not leaving
        and stack + pending > 0 and chain_link is not null;
    select next_hand_at into last_next from poker_hands where table_id = p_table order by id desc limit 1;
    select min(sat_out_at) + make_interval(secs => c.sit_out_kick_seconds) into kick from poker_seats
      where table_id = p_table and status = 'SEATED' and state = 'SITTING_OUT';
    due := least(case when ready >= 2 then greatest(coalesce(last_next, clock_timestamp()), clock_timestamp()) end, kick);
    select count(*) filter (where not pr.is_bot), count(*) filter (where pr.is_bot)
      into humans, bots
    from poker_seats ps join profiles pr on pr.id = ps.user_id
    where ps.table_id = p_table and ps.status = 'SEATED';
    if humans = 0 and bots > 0 then
      due := clock_timestamp();
    end if;
  end if;
  select count(*) into v_seated from poker_seats where table_id = p_table and status = 'SEATED';
  if p_notify then
    update poker_tables set
      next_due_at = due,
      version = version + 1,
      updated_at = clock_timestamp(),
      seated = v_seated
    where id = p_table;
  else
    update poker_tables set next_due_at = due, seated = v_seated
    where id = p_table
      and (next_due_at is distinct from due or seated is distinct from v_seated);
  end if;
end $$;
revoke all on function public._poker_touch(bigint, boolean) from public, anon, authenticated;

-- What a spectator can see. Compared around a worker step so an idle
-- reschedule does not bump the table version. chain_link is only a change
-- detector here; it is not returned to clients.
create function public._poker_visible_fp(p_table bigint) returns text
language sql stable security definer set search_path = public as $$
  select md5(concat_ws('|',
    t.hand_id::text,
    h.version::text,
    h.status::text,
    h.street::text,
    h.to_act::text,
    h.board::text,
    (select string_agg(concat_ws(',',
        s.id::text, s.state::text, s.stack::text, s.pending::text, s.leaving::text,
        s.status::text, coalesce(s.chain_link, ''), s.owes_bb::text, s.timeouts::text,
        s.missed_reveals::text), ';' order by s.id)
      from poker_seats s where s.table_id = t.id and s.status = 'SEATED'),
    (select string_agg((hp.reveal is not null)::text, ',' order by hp.seat_no)
      from poker_hand_players hp where hp.hand_id = t.hand_id)
  ))
  from poker_tables t
  left join poker_hands h on h.id = t.hand_id
  where t.id = p_table
$$;
revoke all on function public._poker_visible_fp(bigint) from public, anon, authenticated;

create or replace function public._poker_tick_table(p_table bigint) returns text
language plpgsql security definer set search_path = public as $$
declare t poker_tables; h poker_hands; c poker_config; la jsonb; seat_row record; res text := 'idle'; hid bigint;
  v_leaving boolean; v_bot boolean; before_fp text; notify boolean;
begin
  before_fp := public._poker_visible_fp(p_table);
  select * into t from poker_tables where id = p_table;
  select * into c from poker_config;
  if t.hand_id is not null then
    select * into h from poker_hands where id = t.hand_id;
    if h.status = 'COMMIT' then
      perform public._poker_bot_reveal(h.id);
      select * into h from poker_hands where id = t.hand_id;
    end if;
    if h.status = 'COMMIT' and clock_timestamp() >= h.reveal_deadline then
      update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp(),
          missed_reveals = missed_reveals + 1,
          leaving = leaving or missed_reveals + 1 >= c.max_missed_reveals
        where id in (
          select hp.seat_id from poker_hand_players hp
          join profiles pr on pr.id = hp.user_id and not pr.is_bot
          where hp.hand_id = h.id and hp.reveal is null
        );
      perform public._poker_void(h.id, 'missing_reveal', array(
        select user_id from poker_hand_players where hand_id = h.id and reveal is null order by seat_no));
      perform public._poker_post_hand(t.id);
      res := 'voided';
    elsif h.status = 'BETTING' and h.bot_act_at is not null and clock_timestamp() >= h.bot_act_at
          and exists (
            select 1 from poker_hand_players hp
            join profiles pr on pr.id = hp.user_id and pr.is_bot
            where hp.hand_id = h.id and hp.seat_no = h.to_act
          ) then
      begin
        perform public._poker_apply(h.id, h.to_act, h.bot_action, coalesce(h.bot_amount, 0), 'bot',
          'bot:' || h.id::text || ':' || h.version::text || ':' || h.to_act::text);
      exception when others then
        if sqlerrm ilike '%NOT_YOUR_TURN%' then
          null;
        else
          begin
            la := public._poker_legal(h.id, h.to_act);
            perform public._poker_apply(h.id, h.to_act,
              case when coalesce((la ->> 'can_check')::boolean, false) then 'CHECK' else 'FOLD' end,
              0, 'bot',
              'bot:' || h.id::text || ':' || h.version::text || ':' || h.to_act::text || ':fb');
          exception when others then
            if sqlerrm ilike '%NOT_YOUR_TURN%' then null; else raise; end if;
          end;
        end if;
      end;
      res := 'bot';
    elsif h.status = 'BETTING' and clock_timestamp() >= h.action_deadline then
      la := public._poker_legal(h.id, h.to_act);
      select ps.leaving, coalesce(pr.is_bot, false) into v_leaving, v_bot
        from poker_seats ps
        join poker_hand_players hp on hp.seat_id = ps.id
        join profiles pr on pr.id = hp.user_id
        where hp.hand_id = h.id and hp.seat_no = h.to_act;
      if not v_leaving and not coalesce(v_bot, false) then
        update poker_seats set timeouts = timeouts + 1
          where id = (select seat_id from poker_hand_players where hand_id = h.id and seat_no = h.to_act);
      end if;
      perform public._poker_apply(h.id, h.to_act,
        case when not v_leaving and (la ->> 'can_check')::boolean then 'CHECK' else 'FOLD' end, 0,
        case when v_leaving then 'leave' else 'timeout' end, null);
      res := 'timeout';
    elsif h.status = 'SETTLEMENT' and h.settle_attempts < 8 then
      res := public._poker_finish(h.id);
    end if;
  elsif not exists (
    select 1 from poker_seats ps
    join profiles pr on pr.id = ps.user_id and not pr.is_bot
    where ps.table_id = t.id and ps.status = 'SEATED'
  ) then
    for seat_row in select id from poker_seats where table_id = t.id and status = 'SEATED' order by id loop
      perform public._poker_cashout(seat_row.id);
      res := 'cashed_out';
    end loop;
  else
    for seat_row in select id from poker_seats where table_id = t.id and status = 'SEATED'
               and (leaving or (state = 'SITTING_OUT'
                    and sat_out_at <= clock_timestamp() - make_interval(secs => c.sit_out_kick_seconds)))
             order by id loop
      perform public._poker_cashout(seat_row.id);
      res := 'cashed_out';
    end loop;
    if coalesce((select next_hand_at from poker_hands where table_id = t.id order by id desc limit 1), '-infinity')
       <= clock_timestamp() then
      hid := public._poker_open_hand(t.id);
      if hid is not null then res := 'opened'; end if;
    end if;
  end if;
  -- 'idle' is not "nothing changed": a bot can reveal, or a seat can sit out,
  -- and the result text stays idle. Compare the visible snapshot.
  notify := res is distinct from 'idle' or before_fp is distinct from public._poker_visible_fp(t.id);
  perform public._poker_touch(t.id, notify);
  return res;
end $$;

-- Same payload as 20261021195500. The presence write stays on every read.
-- hand, last_hand, and recent are shared across viewers of this table version.
create or replace function public.poker_table_state(p_table bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t poker_tables; cur bigint; last_done bigint; me jsonb := null; ms poker_seats;
  hp poker_hand_players; h poker_hands; cards smallint[]; cached jsonb;
begin
  if uid is not null then
    update poker_seats set last_seen_at = clock_timestamp()
    where table_id = p_table and user_id = uid and status = 'SEATED'
      and last_seen_at < clock_timestamp() - interval '3 seconds';
  end if;
  select * into t from poker_tables where id = p_table;
  if not found then return null; end if;
  select body into cached from poker_state_cache where table_id = t.id and version = t.version;
  if cached is null then
    perform pg_advisory_xact_lock(hashtext('poker-pub:' || t.id::text));
    select * into t from poker_tables where id = p_table;
    if not found then return null; end if;
    select body into cached from poker_state_cache where table_id = t.id and version = t.version;
  end if;
  cur := t.hand_id;
  if cached is null then
    select id into last_done from poker_hands where table_id = t.id and status in ('COMPLETED', 'VOIDED')
      order by id desc limit 1;
    cached := jsonb_build_object(
      'hand', case when cur is not null then public._poker_hand_json(cur) end,
      'last_hand', case when last_done is not null then public._poker_hand_json(last_done) end,
      'recent', (select coalesce(jsonb_agg(x.j order by x.id desc), '[]'::jsonb) from (
          select h2.id, jsonb_build_object('id', h2.id, 'hand_no', h2.hand_no, 'board', to_jsonb(h2.board),
            'fee_total', h2.fee_total, 'completed_at', h2.completed_at,
            'pot', (select coalesce(sum(total_bet), 0) from poker_hand_players where hand_id = h2.id),
            'winners', (select coalesce(jsonb_agg(jsonb_build_object('seat_no', hp2.seat_no, 'username', pr.username,
                          'won', hp2.won, 'hand_name', hp2.hand_name) order by hp2.won desc), '[]'::jsonb)
                        from poker_hand_players hp2 join profiles pr on pr.id = hp2.user_id
                        where hp2.hand_id = h2.id and hp2.won > 0)) j
          from poker_hands h2 where h2.table_id = t.id and h2.status = 'COMPLETED' order by h2.id desc limit 12) x)
    );
    insert into poker_state_cache (table_id, version, body) values (t.id, t.version, cached)
      on conflict (table_id) do update set version = excluded.version, body = excluded.body;
  end if;
  if uid is not null then
    select * into ms from poker_seats where table_id = t.id and user_id = uid and status = 'SEATED';
    if found then
      me := jsonb_build_object('seat_id', ms.id, 'seat_no', ms.seat_no, 'stack', ms.stack, 'pending', ms.pending,
        'state', ms.state, 'leaving', ms.leaving, 'chain_link', ms.chain_link, 'owes_bb', ms.owes_bb,
        'buy_in_total', ms.buy_in_total, 'timeouts', ms.timeouts, 'missed_reveals', ms.missed_reveals,
        'sat_out_reason', ms.sat_out_reason);
    end if;
    if cur is not null then
      select * into hp from poker_hand_players where hand_id = cur and user_id = uid;
      if found then
        select hc.cards into cards from poker_hole_cards hc where hc.hand_id = cur and hc.user_id = uid;
        select * into h from poker_hands where id = cur;
        me := coalesce(me, '{}'::jsonb) || jsonb_build_object(
          'hand_id', cur, 'hand_seat', hp.seat_no, 'hole_cards', to_jsonb(cards), 'link', hp.link,
          'revealed', hp.reveal is not null,
          'legal', case when h.status = 'BETTING' and h.to_act = hp.seat_no then public._poker_legal(cur, hp.seat_no) end);
      end if;
    end if;
  end if;
  return jsonb_build_object(
    'server_time', clock_timestamp(),
    'config', (select jsonb_build_object('enabled', enabled, 'fee_bps', fee_bps, 'action_seconds', action_seconds,
                 'reveal_seconds', reveal_seconds) from poker_config),
    'table', jsonb_build_object('id', t.id, 'type_id', t.type_id, 'name', t.name, 'status', t.status,
      'small_blind', t.small_blind, 'big_blind', t.big_blind, 'min_buy_in', t.min_buy_in, 'max_buy_in', t.max_buy_in,
      'max_seats', t.max_seats, 'fee_bps', t.fee_bps, 'button_seat', t.button_seat, 'hand_count', t.hand_count,
      'seated', t.seated, 'version', t.version, 'account_type', t.account_type),
    'seats', (select coalesce(jsonb_agg(jsonb_build_object(
        'seat_id', s.id, 'seat_no', s.seat_no, 'user_id', s.user_id, 'username', p.username, 'avatar_url', p.avatar_url,
        'is_bot', p.is_bot,
        'stack', s.stack, 'pending', s.pending, 'state', s.state, 'leaving', s.leaving, 'owes_bb', s.owes_bb
      ) order by s.seat_no), '[]'::jsonb)
      from poker_seats s join profiles p on p.id = s.user_id where s.table_id = t.id and s.status = 'SEATED'),
    'hand', cached -> 'hand',
    'last_hand', cached -> 'last_hand',
    'recent', cached -> 'recent',
    'me', me
  );
end $$;

drop function public.poker_lobby();
create function public.poker_lobby() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_open int; v_ver numeric; v_seated bigint; v_cfg text; v_types jsonb; v_tables jsonb; v_mine jsonb;
  c poker_lobby_cache;
begin
  select enabled::text || ':' || fee_bps::text || ':' || action_seconds::text into v_cfg from poker_config;
  select count(*)::int, coalesce(sum(version), 0), coalesce(sum(seated), 0)
    into v_open, v_ver, v_seated
  from poker_tables where status = 'OPEN';
  select * into c from poker_lobby_cache where id;
  if not found or c.open_count is distinct from v_open or c.version_sum is distinct from v_ver
     or c.seated_sum is distinct from v_seated or c.cfg is distinct from v_cfg
     or c.built_at <= clock_timestamp() - interval '2 seconds' then
    perform pg_advisory_xact_lock(hashtext('poker_lobby_cache'));
    select enabled::text || ':' || fee_bps::text || ':' || action_seconds::text into v_cfg from poker_config;
    select count(*)::int, coalesce(sum(version), 0), coalesce(sum(seated), 0)
      into v_open, v_ver, v_seated
    from poker_tables where status = 'OPEN';
    select * into c from poker_lobby_cache where id;
    if not found or c.open_count is distinct from v_open or c.version_sum is distinct from v_ver
       or c.seated_sum is distinct from v_seated or c.cfg is distinct from v_cfg
       or c.built_at <= clock_timestamp() - interval '2 seconds' then
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', ty.id, 'label', ty.label, 'category', ty.category, 'small_blind', ty.small_blind,
          'big_blind', ty.big_blind, 'min_buy_in', ty.min_buy_in, 'max_buy_in', ty.max_buy_in,
          'max_seats', ty.max_seats,
          'tables', (select count(*) from poker_tables t where t.type_id = ty.id and t.status = 'OPEN'),
          'players', (select count(*) from poker_seats s
                        join poker_tables t on t.id = s.table_id
                        join profiles p on p.id = s.user_id and not p.is_bot
                        where t.type_id = ty.id and t.status = 'OPEN' and s.status = 'SEATED')
        ) order by ty.sort), '[]'::jsonb) into v_types
      from poker_table_types ty where ty.enabled;
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', t.id, 'type_id', t.type_id, 'name', t.name, 'seated', t.seated, 'max_seats', t.max_seats,
          'hand_count', t.hand_count, 'live', t.hand_id is not null,
          'players', (select coalesce(jsonb_agg(jsonb_build_object(
                        'username', p.username, 'avatar_url', p.avatar_url, 'is_bot', p.is_bot)
                        order by s.seat_no), '[]'::jsonb)
                      from poker_seats s join profiles p on p.id = s.user_id
                      where s.table_id = t.id and s.status = 'SEATED')
        ) order by t.type_id, t.seated desc, t.id), '[]'::jsonb) into v_tables
      from poker_tables t where t.status = 'OPEN';
      insert into poker_lobby_cache (id, open_count, version_sum, seated_sum, cfg, types, tables, built_at)
      values (true, v_open, v_ver, v_seated, v_cfg, v_types, v_tables, clock_timestamp())
      on conflict (id) do update set open_count = excluded.open_count, version_sum = excluded.version_sum,
        seated_sum = excluded.seated_sum, cfg = excluded.cfg, types = excluded.types, tables = excluded.tables,
        built_at = excluded.built_at;
    else
      v_types := c.types;
      v_tables := c.tables;
    end if;
  else
    v_types := c.types;
    v_tables := c.tables;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'table_id', t.id, 'name', t.name, 'stack', s.stack, 'state', s.state) order by s.id), '[]'::jsonb)
    into v_mine
  from poker_seats s join poker_tables t on t.id = s.table_id
  where s.user_id = auth.uid() and s.status = 'SEATED';
  return jsonb_build_object(
    'enabled', (select enabled from poker_config),
    'fee_bps', (select fee_bps from poker_config),
    'action_seconds', (select action_seconds from poker_config),
    'types', v_types,
    'tables', v_tables,
    'mine', v_mine
  );
end $$;
revoke all on function public.poker_lobby() from public;
grant execute on function public.poker_lobby() to anon, authenticated;

-- A next_due_at write with the same version is not a table event.
drop trigger if exists poker_tables_feed on public.poker_tables;
create trigger poker_tables_feed after update on public.poker_tables
  for each row
  when (old.version is distinct from new.version)
  execute function public._feed_broadcast('poker', 'row');
