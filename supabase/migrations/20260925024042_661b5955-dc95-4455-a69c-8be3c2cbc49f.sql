create or replace function public._wallet_challenge_house_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public._is_house_address(new.normalized_address) or public._is_house_address(new.wallet_address) then
    raise exception 'RESERVED_ADDRESS' using errcode = 'P0001', hint = 'Treasury and payout addresses cannot be player wallets';
  end if;
  return new;
end $$;
revoke all on function public._wallet_challenge_house_guard() from public, anon, authenticated;
drop trigger if exists wallet_challenges_house_guard on public.wallet_verification_challenges;
create trigger wallet_challenges_house_guard before insert or update on public.wallet_verification_challenges
  for each row execute function public._wallet_challenge_house_guard();