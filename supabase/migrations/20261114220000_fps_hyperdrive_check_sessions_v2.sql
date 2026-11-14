-- The FPS rooms' Hyperdrive login (pvpstrike_hyperdrive, docs/FPS-HYPERDRIVE-2026-11-01.md) reads
-- sessions with fps_private.check_sessions(jsonb). The anti-cheat enforcement migration
-- (20261114030000) added fps_private.check_sessions_v2(jsonb, text), granted to service_role
-- only: with FPS_AC_ENFORCE=1 every admission failed with "permission denied for function
-- check_sessions_v2", every room refused every player, and the FPS loading screens never ended
-- (2026-11-14). The login gets the same EXECUTE on v2 as it has on v1. It is provisioned outside
-- migrations, so environments without it are left as they are.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'pvpstrike_hyperdrive') then
    execute 'grant execute on function fps_private.check_sessions_v2(jsonb, text) to pvpstrike_hyperdrive';
  end if;
end
$$;
