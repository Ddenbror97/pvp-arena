-- Access tokens stay cryptographically valid until exp. Logout (scope local or
-- global) deletes the auth.sessions row. Browser bets already reject a missing
-- row via the live_session trigger. Withdrawals and wallet changes hop to the
-- service role after a signature check, so they never saw that row. This
-- function is the same check, callable with the user's JWT before that hop.

create or replace function public._assert_live_session()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare c jsonb; sid uuid; sub uuid; exp numeric;
begin
  c := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  -- Service role, scheduler, and in-database jobs carry no user session.
  if c is null or coalesce(c->>'role', '') <> 'authenticated' then
    return;
  end if;
  -- Session-less authenticated claims are not browser access tokens. The
  -- trigger has always allowed them (server tooling). A real sign-in token
  -- always includes session_id, and that row must still be active.
  if c->>'session_id' is null then
    return;
  end if;
  begin
    sid := (c->>'session_id')::uuid;
    sub := (c->>'sub')::uuid;
    exp := nullif(c->>'exp', '')::numeric;
  exception when others then
    raise exception 'SESSION_REVOKED';
  end;
  if exp is not null and exp <= extract(epoch from clock_timestamp()) then
    raise exception 'SESSION_EXPIRED';
  end if;
  if sub is null or not exists (
    select 1 from auth.sessions s
    where s.id = sid and s.user_id = sub and (s.not_after is null or s.not_after > now())
  ) then
    raise exception 'SESSION_REVOKED';
  end if;
end $$;

revoke execute on function public._assert_live_session() from public, anon;
grant execute on function public._assert_live_session() to authenticated, service_role;

create or replace function public._require_live_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._assert_live_session();
  return new;
end $$;

revoke execute on function public._require_live_session() from public, anon, authenticated;
