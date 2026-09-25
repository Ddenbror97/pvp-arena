revoke execute on function public.reset_test_credits(uuid) from anon, authenticated;
revoke execute on function public.claim_test_credits(uuid) from anon, authenticated;
revoke execute on function public.crypto_credit_deposit(uuid, uuid) from anon, authenticated;
revoke execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean) from anon, authenticated;