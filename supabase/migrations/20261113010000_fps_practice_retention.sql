-- Retention for the FPS duel's helper rows (backend cleanup 2026-11-12).
--
-- Solo practice sessions (fps_private.practice_matches) are free matches against a bot, one row
-- each, outside the ledger. Nothing ever deleted them: 123 rows after twelve days of one
-- player, one more for every practice anyone starts. A finished one (COMPLETED or CANCELLED)
-- is removed 30 days after it was created. A FUNDED one is live and is never touched.
--
-- The waiting-seat lease and the ready window (fps_private.waiting_presence, ready_windows)
-- are only read while their match is WAITING or FUNDED. They are removed 7 days after their
-- match completed or was cancelled. The match itself, its entries and its audit rows are
-- financial records and stay.
--
-- The hourly pvp-ops-retention job runs it, up to 5,000 rows a run.

create or replace function fps_private.prune(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_practice integer; v_presence integer; v_ready integer;
begin
  if p_limit is null or p_limit < 1 or p_limit > 50000 then
    raise exception 'INVALID_LIMIT';
  end if;

  with doomed as (
    select p.id
    from fps_private.practice_matches p
    where p.status in ('COMPLETED', 'CANCELLED')
      and p.created_at < now() - interval '30 days'
    order by p.created_at
    limit p_limit
  )
  delete from fps_private.practice_matches p using doomed d where p.id = d.id;
  get diagnostics v_practice = row_count;

  delete from fps_private.waiting_presence w
  using public.fps_matches m
  where m.id = w.match_id
    and m.status in ('COMPLETED', 'CANCELLED')
    and coalesce(m.completed_at, m.created_at) < now() - interval '7 days';
  get diagnostics v_presence = row_count;

  delete from fps_private.ready_windows r
  using public.fps_matches m
  where m.id = r.match_id
    and m.status in ('COMPLETED', 'CANCELLED')
    and coalesce(m.completed_at, m.created_at) < now() - interval '7 days';
  get diagnostics v_ready = row_count;

  return v_practice + v_presence + v_ready;
end
$$;
revoke all on function fps_private.prune(integer) from public, anon, authenticated, service_role;

-- The same job as before (20261110234000), with the FPS rows added.
CREATE OR REPLACE FUNCTION public.ops_retention()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare v_audit integer; v_chat integer; v_rounds integer; v_fps integer;
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

  v_rounds := public._roulette_prune_empty(5000);
  v_fps := fps_private.prune(5000);

  return jsonb_build_object('audit_logs', v_audit, 'chat_messages', v_chat,
    'roulette_rounds', v_rounds, 'fps_rows', v_fps);
end
$$;
