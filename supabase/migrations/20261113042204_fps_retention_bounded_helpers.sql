-- Keep the entire FPS retention call within its advertised row budget. Financial
-- match, entry and audit records remain untouched; only expired helper rows go.
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
    select p.id from fps_private.practice_matches p
    where p.status in ('COMPLETED', 'CANCELLED')
      and p.created_at < now() - interval '30 days'
    order by p.created_at, p.id
    limit p_limit
  )
  delete from fps_private.practice_matches p using doomed d where p.id = d.id;
  get diagnostics v_practice = row_count;

  with doomed as (
    select w.match_id from fps_private.waiting_presence w
    join public.fps_matches m on m.id = w.match_id
    where m.status in ('COMPLETED', 'CANCELLED')
      and coalesce(m.completed_at, m.created_at) < now() - interval '7 days'
    order by coalesce(m.completed_at, m.created_at), w.match_id
    limit (p_limit - v_practice)
  )
  delete from fps_private.waiting_presence w using doomed d where w.match_id = d.match_id;
  get diagnostics v_presence = row_count;

  with doomed as (
    select r.match_id from fps_private.ready_windows r
    join public.fps_matches m on m.id = r.match_id
    where m.status in ('COMPLETED', 'CANCELLED')
      and coalesce(m.completed_at, m.created_at) < now() - interval '7 days'
    order by coalesce(m.completed_at, m.created_at), r.match_id
    limit (p_limit - v_practice - v_presence)
  )
  delete from fps_private.ready_windows r using doomed d where r.match_id = d.match_id;
  get diagnostics v_ready = row_count;

  return v_practice + v_presence + v_ready;
end
$$;
revoke all on function fps_private.prune(integer) from public, anon, authenticated, service_role;
