-- Manual review of the open roulette integrity incidents (games 45944, 45987,
-- 45988, 45989, 45990, 45994, 45995), first seen 2026-10-12 14:30 UTC.
--
-- Finding: three accounts (83661f26, 8414f24a, 8f783b11) that claimed $1 promo
-- codes and played roulette between 05:16 and 05:43 UTC were later removed by
-- hand. Their profiles, auth users, roulette_bets and roulette_payouts rows are
-- gone. The roulette_bets/roulette_payouts guards reject every delete, so the
-- removal ran with triggers disabled. The ledger is intact: every bet still has
-- its roulette_entry and roulette_settlement transaction, each balances, the
-- winnings and fees match the 2x multiplier and 5% win fee, and the three
-- wallets are at 0. No money is missing or owed; only the per-bet detail rows
-- are lost, so pot, entry-debit and outcome checks cannot match again.
-- The rows cannot be restored without recreating the deleted profiles.
--
-- 1. The 17 incidents are acknowledged with this note. They stay in the table;
--    the hourly recheck stops alerting on them.
-- 2. A profile that has ledger history can no longer be deleted. Close such an
--    account by banning or self-excluding it instead. The guard does not stop a
--    superuser who disables triggers, which is how this purge happened.

-- prod-only:begin
update public.integrity_incidents
set acknowledged_at = now(),
    acknowledged_note = 'Reviewed 2026-10-15: bettor accounts were hand-deleted with triggers '
      || 'disabled; roulette_bets/roulette_payouts rows lost. Ledger entries and settlements are '
      || 'complete and balanced, wallets at 0, no money missing. Not restorable. Profiles with '
      || 'ledger history are now protected from deletion (20261015030000).'
where acknowledged_at is null
  and fingerprint in (
    'rlp:45944', 'rle:45944',
    'rlp:45987', 'rle:45987', 'rlo:45987',
    'rlp:45988', 'rle:45988', 'rlo:45988',
    'rlp:45989', 'rle:45989',
    'rlp:45990', 'rle:45990', 'rlo:45990',
    'rlp:45994', 'rle:45994',
    'rlp:45995', 'rle:45995'
  );
-- prod-only:end

create or replace function public._profile_history_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.ledger_transactions t where t.user_id = old.id)
     or exists (
       select 1 from public.wallet_accounts w
       where w.owner_id = old.id and w.balance <> 0
     ) then
    raise exception 'PROFILE_HAS_LEDGER_HISTORY'
      using hint = 'Ban or self-exclude the account; game and ledger history must keep its owner.';
  end if;
  return old;
end
$$;
revoke all on function public._profile_history_guard() from public, anon, authenticated;

drop trigger if exists profile_history_guard on public.profiles;
create trigger profile_history_guard
  before delete on public.profiles
  for each row execute function public._profile_history_guard();
