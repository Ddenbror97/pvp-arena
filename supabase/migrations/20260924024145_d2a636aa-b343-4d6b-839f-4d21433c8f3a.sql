-- ===== F-1: least-privilege grants =====
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

grant select on public.coinflip_config, public.coinflip_entries, public.coinflip_games, public.coinflip_payouts,
  public.coinflip_results, public.jackpot_config, public.jackpot_entries, public.jackpot_games,
  public.jackpot_payouts, public.jackpot_players to anon, authenticated;
-- F-2: only public profile columns
grant select (id, username, avatar_url, created_at) on public.profiles to anon, authenticated;
grant select on public.ledger_postings, public.ledger_transactions, public.wallet_accounts, public.user_roles,
  public.user_wallets, public.audit_logs, public.game_chat_messages to authenticated;

create or replace function public._no_truncate() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_schema = 'public' then
    raise exception 'IMMUTABLE_FINANCIAL_RECORD: truncate of % is not allowed', tg_table_name;
  end if;
  return null;
end $$;
revoke execute on function public._no_truncate() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['ledger_transactions','ledger_postings','wallet_accounts','jackpot_games','jackpot_entries',
    'jackpot_players','jackpot_payouts','jackpot_game_secrets','coinflip_games','coinflip_entries','coinflip_payouts',
    'coinflip_results','coinflip_game_secrets','audit_logs'] loop
    execute format('create trigger no_truncate before truncate on public.%I for each statement execute function public._no_truncate()', t);
  end loop;
end $$;

-- ===== F-2: own account status =====
create or replace function public.get_my_account_status() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('self_excluded_until', p.self_excluded_until, 'age_confirmed_at', p.age_confirmed_at)
  from public.profiles p where p.id = auth.uid()
$$;
revoke execute on function public.get_my_account_status() from public, anon, authenticated;
grant execute on function public.get_my_account_status() to authenticated;

-- ===== F-3: tick gate =====
create table public.worker_tick_gate (name text primary key, last_run_at timestamptz not null default '-infinity');
grant all on public.worker_tick_gate to service_role;
alter table public.worker_tick_gate enable row level security;
insert into public.worker_tick_gate(name) values ('jackpot'), ('coinflip');

create or replace function public._tick_gate(p_name text) returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean; r text;
begin
  r := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  -- Scheduler / internal callers are never throttled.
  if session_user <> 'authenticator' and r not in ('anon', 'authenticated') then return true; end if;
  if not pg_try_advisory_xact_lock(hashtext('pvp_tick:' || p_name)) then return false; end if;
  update public.worker_tick_gate set last_run_at = clock_timestamp()
    where name = p_name and last_run_at <= clock_timestamp() - interval '250 milliseconds'
    returning true into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public._tick_gate(text) from public, anon, authenticated;

create or replace function public.jackpot_tick() returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; res text;
begin
  if not public._tick_gate('jackpot') then
    return jsonb_build_object('settled', 0, 'throttled', true, 'server_time', clock_timestamp());
  end if;
  for r in select id from jackpot_games
           where (status = 'ACTIVE' and scheduled_end_at <= clock_timestamp()) or status = 'DRAWING'
           order by id limit 10 loop
    res := jackpot_settle(r.id);
    if res = 'settled' then n := n + 1; end if;
  end loop;
  perform _ensure_open_game();
  return jsonb_build_object('settled', n, 'server_time', clock_timestamp());
end $$;

create or replace function public.coinflip_tick() returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; res text; n_settled int := 0; n_cancelled int := 0; n_failed int := 0;
begin
  if not public._tick_gate('coinflip') then
    return jsonb_build_object('settled', 0, 'cancelled', 0, 'failed', 0, 'throttled', true, 'server_time', clock_timestamp());
  end if;
  for r in select id from coinflip_games
           where (status = 'WAITING' and expires_at <= clock_timestamp())
              or (status = 'READY' and animation_start_at <= clock_timestamp())
              or (status = 'FLIPPING' and animation_end_at <= clock_timestamp())
              or status = 'SETTLEMENT'
           order by id limit 50 for update skip locked loop
    begin
      res := coinflip_advance(r.id);
    exception when others then
      perform _audit_cf(null, 'RECOVERY_FAILED', r.id, jsonb_build_object('error', left(sqlerrm, 500)));
      res := 'error';
    end;
    if res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    elsif res in ('failed','error') then n_failed := n_failed + 1; end if;
  end loop;
  return jsonb_build_object('settled', n_settled, 'cancelled', n_cancelled, 'failed', n_failed, 'server_time', clock_timestamp());
end $$;
revoke execute on function public.jackpot_tick() from public;
revoke execute on function public.coinflip_tick() from public;
grant execute on function public.jackpot_tick() to anon, authenticated;
grant execute on function public.coinflip_tick() to anon, authenticated;

-- ===== F-4: avatar allowlist =====
create or replace function public.update_avatar(p_avatar_url text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_avatar_url is null or length(p_avatar_url) > 200
     or p_avatar_url !~ '^https://api\.dicebear\.com/9\.x/(shapes|rings|glass|identicon|bottts-neutral|thumbs)/svg\?seed=[A-Za-z0-9_]{1,40}$' then
    raise exception 'INVALID_AVATAR';
  end if;
  update profiles set avatar_url = p_avatar_url where id = auth.uid();
end $$;
-- ===== F-5: sign-up limiter =====
create table public.signup_attempts (
  id bigint generated always as identity primary key,
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index signup_attempts_ip on public.signup_attempts (ip_hash, created_at);
create index signup_attempts_email on public.signup_attempts (email_hash, created_at);
create index signup_attempts_time on public.signup_attempts (created_at);
grant all on public.signup_attempts to service_role;
alter table public.signup_attempts enable row level security;

create or replace function public.signup_rate_check(p_ip_hash text, p_email_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ts timestamptz := clock_timestamp();
begin
  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$' or (p_ip_hash is not null and p_ip_hash !~ '^[0-9a-f]{64}$') then
    raise exception 'INVALID_INPUT';
  end if;
  perform pg_advisory_xact_lock(hashtext('signup:ip:' || coalesce(p_ip_hash, '-')));
  perform pg_advisory_xact_lock(hashtext('signup:email:' || p_email_hash));
  if p_ip_hash is not null then
    if (select count(*) from signup_attempts where ip_hash = p_ip_hash and created_at > ts - interval '10 minutes') >= 5
       or (select count(*) from signup_attempts where ip_hash = p_ip_hash and created_at > ts - interval '1 hour') >= 20 then
      return jsonb_build_object('ok', false, 'reason', 'IP_LIMIT');
    end if;
  end if;
  if (select count(*) from signup_attempts where email_hash = p_email_hash and created_at > ts - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'EMAIL_LIMIT');
  end if;
  if (select count(*) from signup_attempts where created_at > ts - interval '1 minute') >= 60 then
    return jsonb_build_object('ok', false, 'reason', 'GLOBAL_LIMIT');
  end if;
  insert into signup_attempts(ip_hash, email_hash, created_at) values (p_ip_hash, p_email_hash, ts);
  delete from signup_attempts where created_at < ts - interval '1 day';
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.signup_rate_check(text, text) from public, anon, authenticated;
grant execute on function public.signup_rate_check(text, text) to service_role;

-- ===== F-6: server-counted online players =====
create table public.chat_presence (user_id uuid primary key, last_seen_at timestamptz not null default now());
create index chat_presence_seen on public.chat_presence (last_seen_at);
grant all on public.chat_presence to service_role;
alter table public.chat_presence enable row level security;

create or replace function public.chat_heartbeat() returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into chat_presence(user_id, last_seen_at) values (uid, now())
    on conflict (user_id) do update set last_seen_at = excluded.last_seen_at
    where chat_presence.last_seen_at < now() - interval '10 seconds';
  if random() < 0.02 then delete from chat_presence where last_seen_at < now() - interval '1 day'; end if;
  return (select count(*)::int from chat_presence where last_seen_at > now() - interval '60 seconds');
end $$;
revoke execute on function public.chat_heartbeat() from public, anon, authenticated;
grant execute on function public.chat_heartbeat() to authenticated;

-- realtime-auth:begin
drop policy if exists "chat rooms presence" on realtime.messages;
drop policy if exists "chat rooms receive" on realtime.messages;
create policy "chat rooms receive" on realtime.messages for select to authenticated
  using (realtime.topic() in ('chat:jackpot', 'chat:coinflip') and realtime.messages.extension = 'broadcast');
-- realtime-auth:end

-- ===== F-7: pot ceilings =====
alter table public.jackpot_config add column max_pot bigint not null default 100000000;
alter table public.jackpot_config add constraint max_pot_bounds check (max_pot >= max_entry and max_pot <= 1000000000000);
alter table public.jackpot_games add constraint pot_hard_cap check (pot_amount <= 1000000000000);
alter table public.coinflip_config add constraint max_wager_cap check (max_wager <= 50000000);
alter table public.coinflip_games add constraint pot_hard_cap check (pot_amount <= 100000000);

create or replace function public._jackpot_pot_cap() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.pot_amount > old.pot_amount and new.pot_amount > (select max_pot from jackpot_config where id) then
    raise exception 'POT_LIMIT_REACHED';
  end if;
  return new;
end $$;
revoke execute on function public._jackpot_pot_cap() from public, anon, authenticated;
create trigger jackpot_pot_cap before update of pot_amount on public.jackpot_games
  for each row execute function public._jackpot_pot_cap();

-- ===== Session liveness for user-initiated financial actions =====
create or replace function public._require_live_session() returns trigger language plpgsql security definer set search_path = public as $$
declare c jsonb; sid uuid; sub uuid;
begin
  c := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  if c is null or coalesce(c ->> 'role', '') <> 'authenticated' then return new; end if;
  begin
    sid := (c ->> 'session_id')::uuid;
    sub := (c ->> 'sub')::uuid;
  exception when others then raise exception 'SESSION_REVOKED';
  end;
  if sid is null or sub is null or not exists (
    select 1 from auth.sessions s where s.id = sid and s.user_id = sub and (s.not_after is null or s.not_after > now())
  ) then
    raise exception 'SESSION_REVOKED';
  end if;
  return new;
end $$;
revoke execute on function public._require_live_session() from public, anon, authenticated;
create trigger live_session before insert on public.jackpot_entries for each row execute function public._require_live_session();
create trigger live_session before insert on public.coinflip_entries for each row execute function public._require_live_session();
create trigger live_session before insert on public.ledger_transactions for each row
  when (new.kind = 'test_credit_grant') execute function public._require_live_session();
create trigger live_session before update on public.coinflip_games for each row
  when (new.status = 'CANCELLED' and new.cancel_reason = 'CREATOR_CANCELLED') execute function public._require_live_session();

-- ===== Integrity monitor (detective only; never changes balances) =====
create table public.integrity_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  incidents_found integer not null default 0
);
create table public.integrity_incidents (
  id bigint generated always as identity primary key,
  check_name text not null,
  fingerprint text not null unique,
  details jsonb not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrences integer not null default 1,
  last_run_id bigint
);
grant all on public.integrity_runs, public.integrity_incidents to service_role;
grant select on public.integrity_incidents, public.integrity_runs to authenticated;
alter table public.integrity_runs enable row level security;
alter table public.integrity_incidents enable row level security;
create policy "admins read integrity incidents" on public.integrity_incidents for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins read integrity runs" on public.integrity_runs for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger no_truncate before truncate on public.integrity_incidents for each statement execute function public._no_truncate();

create or replace function public.integrity_check() returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; run bigint;
begin
  insert into integrity_runs default values returning id into run;
  for r in
    select 'account_balance_mismatch' chk, 'acct:' || a.id fp,
           jsonb_build_object('account_id', a.id, 'owner_id', a.owner_id, 'kind', a.kind, 'balance', a.balance, 'ledger_sum', coalesce(s.total, 0)) d
      from wallet_accounts a left join (select account_id, sum(amount) total from ledger_postings group by 1) s on s.account_id = a.id
      where a.balance <> coalesce(s.total, 0)
    union all
    select 'account_last_posting_mismatch', 'acctlast:' || a.id, jsonb_build_object('account_id', a.id, 'owner_id', a.owner_id, 'balance', a.balance, 'last_balance_after', l.balance_after)
      from wallet_accounts a join lateral (select p.balance_after from ledger_postings p where p.account_id = a.id order by p.id desc limit 1) l on true
      where l.balance_after <> a.balance
    union all
    select 'negative_balance', 'neg:' || a.id, jsonb_build_object('account_id', a.id, 'owner_id', a.owner_id, 'kind', a.kind, 'balance', a.balance)
      from wallet_accounts a where a.kind <> 'test_faucet' and a.balance < 0
    union all
    select 'unbalanced_transaction', 'tx:' || p.tx_id, jsonb_build_object('tx_id', p.tx_id, 'sum', sum(p.amount))
      from ledger_postings p group by p.tx_id having sum(p.amount) <> 0
    union all
    select 'transaction_without_postings', 'txempty:' || t.id, jsonb_build_object('tx_id', t.id, 'kind', t.kind, 'game_id', t.game_id)
      from ledger_transactions t where not exists (select 1 from ledger_postings p where p.tx_id = t.id)
    union all
    select 'asset_sum_nonzero', 'global:' || a.asset || ':' || a.account_type, jsonb_build_object('asset', a.asset, 'account_type', a.account_type, 'sum', sum(a.balance))
      from wallet_accounts a group by a.asset, a.account_type having sum(a.balance) <> 0
    union all
    select 'jackpot_pot_mismatch', 'jp:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status, 'pot', g.pot_amount, 'payout', g.payout_amount, 'rake', g.rake_amount,
             'entries_sum', (select coalesce(sum(e.amount), 0) from jackpot_entries e where e.game_id = g.id))
      from jackpot_games g
      where g.pot_amount <> (select coalesce(sum(e.amount), 0) from jackpot_entries e where e.game_id = g.id)
         or (g.status = 'COMPLETED' and g.payout_amount + g.rake_amount <> g.pot_amount)
    union all
    select 'jackpot_ticket_ranges', 'jpt:' || g.id, jsonb_build_object('game_id', g.id)
      from jackpot_games g
      where exists (select 1 from (select e.ticket_start, lag(e.ticket_end, 1, 0::bigint) over (order by e.ticket_start) prev
                                   from jackpot_entries e where e.game_id = g.id) x where x.ticket_start <> x.prev)
    union all
    select 'jackpot_entry_debit_mismatch', 'jpe:' || g.id, jsonb_build_object('game_id', g.id,
             'entries', (select count(*) from jackpot_entries e where e.game_id = g.id),
             'debits', (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'jackpot_entry'))
      from jackpot_games g
      where (select count(*) from jackpot_entries e where e.game_id = g.id)
         <> (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'jackpot_entry')
    union all
    select 'jackpot_settlement_count', 'jps:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status,
             'settlements', (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'jackpot_settlement'))
      from jackpot_games g
      where (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'jackpot_settlement')
         <> case when g.status = 'COMPLETED' then 1 else 0 end
    union all
    select 'coinflip_entry_debit_mismatch', 'cfe:' || g.id, jsonb_build_object('game_id', g.id)
      from coinflip_games g
      where (select count(*) from coinflip_entries e where e.game_id = g.id)
         <> (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_entry')
    union all
    select 'coinflip_outcome_mismatch', 'cfo:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status,
             'winner_payouts', (select count(*) from coinflip_payouts p where p.game_id = g.id and p.kind = 'WINNER' and p.status = 'SETTLED'),
             'refund_payouts', (select count(*) from coinflip_payouts p where p.game_id = g.id and p.kind = 'REFUND' and p.status = 'SETTLED'),
             'settlements', (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_settlement'),
             'refunds', (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_refund'))
      from coinflip_games g
      where (select count(*) from coinflip_payouts p where p.game_id = g.id and p.kind = 'WINNER' and p.status = 'SETTLED') <> case when g.status = 'COMPLETED' then 1 else 0 end
         or (select count(*) from coinflip_payouts p where p.game_id = g.id and p.kind = 'REFUND' and p.status = 'SETTLED') <> case when g.status = 'CANCELLED' then 1 else 0 end
         or (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_settlement') <> case when g.status = 'COMPLETED' then 1 else 0 end
         or (select count(*) from ledger_transactions t where t.game_id = g.id and t.kind = 'coinflip_refund') <> case when g.status = 'CANCELLED' then 1 else 0 end
         or (g.status = 'COMPLETED' and (g.payout_amount + g.fee_amount <> g.pot_amount or not exists (
               select 1 from coinflip_payouts p where p.game_id = g.id and p.kind = 'WINNER' and p.beneficiary_id = g.winner_id and p.amount = g.payout_amount)))
  loop
    n := n + 1;
    insert into integrity_incidents(check_name, fingerprint, details, last_run_id) values (r.chk, r.fp, r.d, run)
      on conflict (fingerprint) do update set details = excluded.details, last_seen_at = now(),
        occurrences = integrity_incidents.occurrences + 1, last_run_id = run;
    raise warning 'INTEGRITY_INCIDENT % %', r.chk, r.d::text;
  end loop;
  update integrity_runs set finished_at = clock_timestamp(), incidents_found = n where id = run;
  return jsonb_build_object('run_id', run, 'incidents', n);
end $$;
revoke execute on function public.integrity_check() from public, anon, authenticated;
grant execute on function public.integrity_check() to service_role;

-- prod-only:begin
do $$ begin
  perform cron.schedule('pvp-integrity-check', '0 * * * *', 'select public.integrity_check()');
exception when others then raise warning 'integrity cron not scheduled: %', sqlerrm;
end $$;
-- prod-only:end