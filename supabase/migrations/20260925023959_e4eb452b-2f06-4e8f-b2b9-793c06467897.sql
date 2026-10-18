create or replace function public._is_house_address(p_addr text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chain_treasury_accounts where lower(address) = lower(p_addr));
$$;
revoke all on function public._is_house_address(text) from public, anon, authenticated;

create or replace function public._user_wallet_house_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public._is_house_address(new.normalized_address) or public._is_house_address(new.address) then
    raise exception 'RESERVED_ADDRESS' using errcode = 'P0001', hint = 'Treasury and payout addresses cannot be player wallets';
  end if;
  return new;
end $$;
revoke all on function public._user_wallet_house_guard() from public, anon, authenticated;

drop trigger if exists user_wallets_house_guard on public.user_wallets;
create trigger user_wallets_house_guard before insert or update on public.user_wallets
  for each row execute function public._user_wallet_house_guard();

drop trigger if exists wallet_challenges_house_guard on public.wallet_verification_challenges;
create trigger wallet_challenges_house_guard before insert or update on public.wallet_verification_challenges
  for each row execute function public._user_wallet_house_guard();

create or replace function public._treasury_player_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.user_wallets where normalized_address = lower(new.address)) then
    raise exception 'ADDRESS_LINKED_TO_PLAYER' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public._treasury_player_guard() from public, anon, authenticated;

drop trigger if exists treasury_player_guard on public.chain_treasury_accounts;
create trigger treasury_player_guard before insert on public.chain_treasury_accounts
  for each row execute function public._treasury_player_guard();