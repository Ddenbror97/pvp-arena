# FPS session connection pool

Production uses the cache-disabled Hyperdrive configuration
`c8cfc572b3014d6da467d75faa305c1d`, provisioned against the production Supabase
database. Its login role `pvpstrike_hyperdrive` has no inherited role memberships,
no superuser/DDL privileges and a five-connection limit. It has schema USAGE and
EXECUTE on `fps_private.check_sessions(jsonb)` and (migration 20261114220000)
`fps_private.check_sessions_v2(jsonb, text)`; credentials are stored in Hyperdrive.
The role has a 1200 ms statement timeout. Its password was generated with Node crypto.

Each Durable Object owns its own four-connection client, with a ten-second idle
timeout. Clients are never shared between rooms. Every authorization decision
still performs a fresh query; failures fail closed. Environments without the
binding retain the REST path. Settlement and financial operations retain REST.

The production preparation script adds the binding. The shared development and
staging Wrangler configuration deliberately does not bind production Hyperdrive.
To roll back the transport, omit runtime.hyperdrive when preparing production.

A hosted South America probe returned the expected inactive result through both
paths. Warm samples were approximately 144 ms for Hyperdrive and 145 ms for REST;
this does not establish a 50 ms improvement or regional player latency. Observe
`fps_region_latency` after rollout for actual room and region measurements.

## Concurrency correction

The initial client used max=1 while the runtime overlapped up to four checks.
A hosted four-query probe reproduced head-of-line waiting: 132–134 ms for the
first check and 528–530 ms for the fourth. With max=4, warmed batches completed
each check in 128–151 ms. The transport pool and runtime now share one concurrency
constant. These measurements used a temporary South America Worker and unknown
session IDs, not the user's historical match. Historical log access returned 403.

## Incident 2026-11-14: every room refused every player

With `FPS_AC_ENFORCE=1` the rooms read sessions with `check_sessions_v2`, which the enforcement
migration granted to `service_role` only. Every admission failed with `permission denied for
function check_sessions_v2` (SQLSTATE 42501), every room answered 503 to every socket, and the
clients asked for match after match behind loading screens that never ended (Bomb Defusal
flicked between maps). Fixes: the grant (migration 20261114220000); the rooms fall back to the
v1 session check when v2 cannot be called at all (`fps_ac_enforcement_unavailable` in the
Worker log; v2 retried after a minute; sessions still fail closed); the clients stop after
four refused sockets in a row and show "Try again" on the loading screen. Any new function the
rooms call through Hyperdrive needs its own grant to `pvpstrike_hyperdrive`.
