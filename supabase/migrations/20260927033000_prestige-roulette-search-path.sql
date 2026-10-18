-- prestige_on_roulette_bet is a settlement hook, and the roulette catalog
-- check requires every security-definer function with "roulette" in its name
-- to pin an empty search_path. The body is schema-qualified.

create or replace function public.prestige_on_roulette_bet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('WON', 'LOST') and old.status = 'ACCEPTED' and new.amount > 0 then
    perform public.prestige_award_wager(new.user_id, 'roulette', new.id::text, new.amount, jsonb_build_object('game_id', new.game_id));
  end if;
  return new;
end $$;

revoke all on function public.prestige_on_roulette_bet() from public, anon, authenticated;
