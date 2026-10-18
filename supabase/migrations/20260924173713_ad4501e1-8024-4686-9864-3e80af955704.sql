-- Lock down the three guard functions added with the crypto rails. They only need
-- to run as triggers when a record is saved, so nobody calls them directly.
revoke all on function public.crypto_allowlist_guard() from public, anon, authenticated;
revoke all on function public.crypto_deposit_guard() from public, anon, authenticated;
revoke all on function public.crypto_withdrawal_guard() from public, anon, authenticated;

grant execute on function public.crypto_allowlist_guard() to service_role;
grant execute on function public.crypto_deposit_guard() to service_role;
grant execute on function public.crypto_withdrawal_guard() to service_role;