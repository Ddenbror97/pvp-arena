-- Allow LIQUIDITY_PENDING on crypto_withdrawals (worker already writes this status).
-- Version 20260926160100: 20260926160000 is the public-chat migration. Production
-- never recorded either file under 20260926160000. This constraint file keeps
-- its own version so a fresh db push can record both. The check is idempotent:
-- it drops the status check and adds the same wider list, including LIQUIDITY_PENDING.
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.crypto_withdrawals'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%PENDING%APPROVED%';
  if c is not null then
    execute format('alter table public.crypto_withdrawals drop constraint %I', c);
  end if;
end $$;

alter table public.crypto_withdrawals
  add constraint crypto_withdrawals_status_check
  check (status in (
    'PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING',
    'CONFIRMED','REJECTED','FAILED','RELEASED'
  ));
