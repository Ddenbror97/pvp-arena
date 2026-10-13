-- Test promo activity only. Codes are already gone. Drop the claim and
-- wager rows so playthrough starts empty. Ledger credits stay where they are.

delete from public.promo_wagers;
delete from public.promo_claims;
delete from public.promo_claim_attempts;
