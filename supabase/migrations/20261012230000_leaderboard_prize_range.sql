-- Partners choose the prize pool. $1.00 through $1,500.00, and never above
-- the template cap. The partner save inserts a 1-cent draft before the tiers
-- are written; that placeholder is allowed and replaced in the same transaction.
-- Finished campaigns are not rewritten.

create or replace function public._lb_prize_pool_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cap bigint;
begin
  if tg_op = 'INSERT' and new.status = 'draft' and new.prize_pool_cents = 1 then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.prize_pool_cents is not distinct from old.prize_pool_cents
     and new.status is not distinct from old.status then
    return new;
  end if;
  select max_prize_pool_cents into cap
  from public.leaderboard_templates
  where id = new.template_id;
  if new.prize_pool_cents < 100 then
    raise exception 'PRIZE_FLOOR';
  end if;
  if new.prize_pool_cents > least(coalesce(cap, 150000), 150000) then
    raise exception 'PRIZE_CAP';
  end if;
  return new;
end
$$;

revoke all on function public._lb_prize_pool_guard() from public, anon, authenticated;

drop trigger if exists leaderboard_prize_range on public.leaderboard_campaigns;
create trigger leaderboard_prize_range
  before insert or update on public.leaderboard_campaigns
  for each row execute function public._lb_prize_pool_guard();
