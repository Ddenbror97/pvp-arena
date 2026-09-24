create extension if not exists pg_net;
create table public.crypto_job_runs (name text primary key, last_run_at timestamptz not null default 'epoch');
grant all on public.crypto_job_runs to service_role;
alter table public.crypto_job_runs enable row level security;
insert into public.crypto_job_runs (name) values ('deposits'),('withdrawals'),('reconcile');
create or replace function public.crypto_run_gate(p_name text, p_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if not pg_try_advisory_xact_lock(hashtext('crypto_job:' || p_name)) then return false; end if;
  update crypto_job_runs set last_run_at = clock_timestamp()
    where name = p_name and last_run_at <= clock_timestamp() - make_interval(secs => p_seconds) returning true into ok;
  return coalesce(ok, false);
end $$;
revoke all on function public.crypto_run_gate(text, integer) from public, anon, authenticated;
grant execute on function public.crypto_run_gate(text, integer) to service_role;