create table public.crypto_job_tokens (
  id boolean primary key default true check (id),
  token_sha256 text not null check (token_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
grant all on public.crypto_job_tokens to service_role;
alter table public.crypto_job_tokens enable row level security;

create or replace function public.crypto_verify_job_token(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from crypto_job_tokens where length(coalesce(p_token,'')) >= 32
    and token_sha256 = encode(extensions.digest(p_token, 'sha256'), 'hex'))
$$;
revoke all on function public.crypto_verify_job_token(text) from public, anon, authenticated;
grant execute on function public.crypto_verify_job_token(text) to service_role;