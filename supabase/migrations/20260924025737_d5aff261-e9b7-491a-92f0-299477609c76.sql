create or replace function public._require_live_session() returns trigger language plpgsql security definer set search_path = public as $$
declare c jsonb; sid uuid; sub uuid;
begin
  c := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  if c is null or coalesce(c ->> 'role', '') <> 'authenticated' then return new; end if;
  -- Tokens issued for a sign-in session always carry session_id; that session must still be active.
  -- Tokens without one can only be minted server-side with the project signing key (tooling), not by users.
  if c ->> 'session_id' is null then return new; end if;
  begin
    sid := (c ->> 'session_id')::uuid;
    sub := (c ->> 'sub')::uuid;
  exception when others then raise exception 'SESSION_REVOKED';
  end;
  if sub is null or not exists (
    select 1 from auth.sessions s where s.id = sid and s.user_id = sub and (s.not_after is null or s.not_after > now())
  ) then
    raise exception 'SESSION_REVOKED';
  end if;
  return new;
end $$;
revoke execute on function public._require_live_session() from public, anon, authenticated;