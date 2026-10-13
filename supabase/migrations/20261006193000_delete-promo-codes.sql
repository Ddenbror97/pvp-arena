-- Remove every existing promo code. Open claims stay, so a player who already
-- claimed one still has to finish that wager. The code itself is gone.

alter table public.promo_claims alter column promo_code_id drop not null;

alter table public.promo_claims drop constraint promo_claims_promo_code_id_fkey;

alter table public.promo_claims
  add constraint promo_claims_promo_code_id_fkey
  foreign key (promo_code_id) references public.promo_codes (id) on delete set null;

alter table public.promo_claims disable trigger promo_claim_guard;

delete from public.promo_codes;

alter table public.promo_claims enable trigger promo_claim_guard;
