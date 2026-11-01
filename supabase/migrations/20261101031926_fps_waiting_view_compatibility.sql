begin;
-- Cached clients poll their owned waiting screen rather than the new global RPC.
-- Keep that explicit presence alive, without allowing a late tab to resurrect a room.
create or replace function public.fps_view(p_match uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare g fps_private.practice_matches; u uuid; result jsonb;
begin
  select * into g from fps_private.practice_matches where id=p_match;
  if found then
    if auth.jwt()->>'role' is distinct from 'service_role' then
      u:=public._fps_user();
      if u<>g.owner_id then raise exception 'MATCH_NOT_FOUND'; end if;
    end if;
    return fps_private.practice_json(g.id);
  end if;
  result:=fps_private.fps_view(p_match);
  if auth.jwt()->>'role'='authenticated' and result->>'status'='WAITING'
    and result->>'creator_id'=auth.uid()::text then
    perform public.fps_queue_status();
    result:=fps_private.fps_view(p_match);
  end if;
  return result;
end $$;
-- CREATE OR REPLACE preserves the existing authenticated/service-only ACL.
commit;
