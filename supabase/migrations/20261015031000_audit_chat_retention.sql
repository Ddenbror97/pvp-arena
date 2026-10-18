-- Retention for audit_logs and chat (backend audit 2026-10-15).
--
-- audit_logs held 225k rows / 49 MB after three weeks. 96% are the four
-- roulette worker lifecycle rows written every round (ROUND_CREATED,
-- ROUND_LOCKED, SPIN_STARTED, ROUND_COMPLETED), about 34k a day. The same
-- timestamps live on roulette_games, and nothing reads these rows back.
--
-- Policy:
--   * roulette lifecycle rows: 7 days
--   * prestige_page_viewed: 30 days
--   * everything else (money, promo, referral, security, admin): kept
--   * chat messages: 90 days; messages with a moderation event: 365 days
--
-- audit_logs stays immutable. The guard allows a DELETE only inside
-- ops_retention() (transaction-local flag) and only for rows the policy
-- function marks expired, so the flag cannot remove anything else. UPDATE is
-- always rejected. Each hourly pass deletes at most 50,000 audit rows; the
-- first passes clear the ~140k backlog.

create or replace function public._audit_log_expired(p_action text, p_game_type text, p_created_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (p_game_type = 'roulette'
          and p_action in ('ROUND_CREATED', 'ROUND_LOCKED', 'SPIN_STARTED', 'ROUND_COMPLETED')
          and p_created_at < now() - interval '7 days')
      or (p_action = 'prestige_page_viewed' and p_created_at < now() - interval '30 days')
$$;
revoke all on function public._audit_log_expired(text, text, timestamptz) from public, anon, authenticated;

create or replace function public._audit_logs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and current_setting('pvp.audit_retention', true) = 'on'
     and public._audit_log_expired(old.action, old.game_type::text, old.created_at) then
    return old;
  end if;
  raise exception 'IMMUTABLE_RECORD %', tg_table_name;
end
$$;
revoke all on function public._audit_logs_guard() from public, anon, authenticated;

drop trigger if exists no_mutation on public.audit_logs;
create trigger no_mutation
  before delete or update on public.audit_logs
  for each row execute function public._audit_logs_guard();

create index if not exists audit_logs_created_brin on public.audit_logs using brin (created_at);

create or replace function public.ops_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_audit integer; v_chat integer;
begin
  perform set_config('pvp.audit_retention', 'on', true);
  with doomed as (
    select a.id
    from public.audit_logs a
    where a.created_at < now() - interval '7 days'
      and public._audit_log_expired(a.action, a.game_type::text, a.created_at)
    order by a.id
    limit 50000
  )
  delete from public.audit_logs a using doomed d where a.id = d.id;
  get diagnostics v_audit = row_count;
  perform set_config('pvp.audit_retention', 'off', true);

  delete from public.game_chat_messages m
  where m.created_at < now() - interval '90 days'
    and (m.created_at < now() - interval '365 days'
      or not exists (select 1 from public.game_chat_moderation_events e where e.message_id = m.id));
  get diagnostics v_chat = row_count;

  return jsonb_build_object('audit_logs', v_audit, 'chat_messages', v_chat);
end
$$;
revoke all on function public.ops_retention() from public, anon, authenticated;
grant execute on function public.ops_retention() to service_role;

-- prod-only:begin
select cron.schedule('pvp-ops-retention', '41 * * * *', $$select public.ops_retention()$$);
-- prod-only:end
