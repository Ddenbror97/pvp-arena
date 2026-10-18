-- Optional Didit identity check. One row per account. No document images or numbers are stored.
create table public.identity_checks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id text,
  session_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'in_review', 'expired')),
  verified_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  constraint identity_verified check ((status = 'approved') = (verified_at is not null))
);
create unique index identity_checks_session on public.identity_checks (session_id) where session_id is not null;

alter table public.identity_checks enable row level security;
revoke all on table public.identity_checks from public, anon, authenticated;
grant select, insert, update, delete on table public.identity_checks to service_role;
