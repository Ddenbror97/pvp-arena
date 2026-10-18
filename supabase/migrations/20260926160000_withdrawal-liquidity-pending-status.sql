-- Allow LIQUIDITY_PENDING on crypto_withdrawals (worker already writes this status).
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
