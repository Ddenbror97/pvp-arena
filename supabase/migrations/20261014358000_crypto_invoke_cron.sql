-- Crypto cron dispatcher, as already deployed by scripts/setup-pg-crypto-cron.mjs.
-- The bearer token is never stored in a migration; that script writes it to crypto_job_bearer.
-- Without a token row the function raises 'crypto job token missing' and makes no request.

create table if not exists public.crypto_job_bearer (
  id boolean primary key default true check (id),
  token text not null check (token ~ '^[0-9a-f]{64}$')
);
alter table public.crypto_job_bearer enable row level security;
revoke all on public.crypto_job_bearer from public, anon, authenticated;
grant all on public.crypto_job_bearer to service_role;

create or replace function public.crypto_invoke_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = public, net
as $$
declare
  tok text;
  req_id bigint;
begin
  if p_path not in ('crypto-deposits', 'crypto-withdrawals', 'crypto-reconcile') then
    raise exception 'invalid crypto cron path';
  end if;
  select token into tok from public.crypto_job_bearer where id;
  if tok is null then
    raise exception 'crypto job token missing';
  end if;
  select net.http_post(
    url := 'https://pvpspinarena.com/api/public/cron/' || p_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || tok
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) into req_id;
  return req_id;
end;
$$;

revoke all on function public.crypto_invoke_cron(text) from public, anon, authenticated;
grant execute on function public.crypto_invoke_cron(text) to service_role;
