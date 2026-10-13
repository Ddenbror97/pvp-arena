-- Public races list only campaigns that are still running.
-- Cancelled, finished, and not-yet-started campaigns stay off that page.
-- A direct link to a cancelled campaign is not a public board.

create or replace function public.leaderboard_public_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.starts_at desc), '[]'::jsonb) from (
    select c.id, c.name, c.status, c.starts_at, c.ends_at, c.timezone, c.prize_pool_cents, c.ranked_at,
      p.username as partner_username,
      (select count(*) from leaderboard_entries e where e.campaign_id = c.id and e.qualifying_cents > 0) as participants
    from leaderboard_campaigns c
    join profiles p on p.id = c.partner_user_id
    where c.visibility = 'public'
      and c.status = 'active'
    order by c.starts_at desc
    limit 50
  ) x
$$;

create or replace function public.leaderboard_public_board(p_campaign uuid, p_limit integer, p_offset integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  st text;
begin
  select status into st from leaderboard_campaigns where id = p_campaign;
  if st = 'cancelled' then raise exception 'NOT_FOUND'; end if;
  return public._lb_public_row(p_campaign, p_limit, p_offset);
end $$;
