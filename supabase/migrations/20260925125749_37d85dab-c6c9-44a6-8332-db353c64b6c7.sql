create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select (auth.uid() is null or _user_id = auth.uid())
     and exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public._coinflip_entry_check()
returns trigger language plpgsql set search_path = public as $$
declare g public.coinflip_games;
begin
  select * into g from public.coinflip_games where id = new.game_id;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_JOINABLE'; end if;
  if g.account_type <> (select account_type from public.money_domain_config) or not public._play_domain_open() then
    raise exception 'REAL_MONEY_DISABLED';
  end if;
  if new.amount <> g.amount then raise exception 'WAGER_MISMATCH'; end if;
  if new.slot = 1 and (new.user_id <> g.creator_id or new.side <> g.creator_side) then raise exception 'ENTRY_MISMATCH'; end if;
  if new.slot = 2 and (new.user_id = g.creator_id or new.side = g.creator_side) then raise exception 'ENTRY_MISMATCH'; end if;
  return new;
end $$;