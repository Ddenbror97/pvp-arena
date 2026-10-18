-- The isolated test harness created pvp_test on the primary, including
-- stand-ins for auth.users and auth.sessions. Those two tables have RLS off.
-- They are empty, and anon/authenticated cannot use the schema today.
-- They are not a client API. Enable RLS and leave them with no policies.
-- service_role already has the table grants and is the trusted role; this
-- file does not add anon or authenticated grants and does not add policies.

do $lock$
begin
  if to_regclass('pvp_test.test_auth_users') is null
     or to_regclass('pvp_test.test_auth_sessions') is null then
    return;
  end if;
  execute 'alter table pvp_test.test_auth_users enable row level security';
  execute 'alter table pvp_test.test_auth_sessions enable row level security';
  execute 'revoke all on table pvp_test.test_auth_users from public';
  execute 'revoke all on table pvp_test.test_auth_sessions from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table pvp_test.test_auth_users from anon';
    execute 'revoke all on table pvp_test.test_auth_sessions from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table pvp_test.test_auth_users from authenticated';
    execute 'revoke all on table pvp_test.test_auth_sessions from authenticated';
  end if;
end
$lock$;
