# FPS session connection pool

Production uses the cache-disabled Hyperdrive configuration
`c8cfc572b3014d6da467d75faa305c1d`, provisioned against the production Supabase
database. Its login role `pvpstrike_hyperdrive` has no inherited role memberships,
no superuser/DDL privileges and a five-connection limit. It has schema USAGE and
EXECUTE on `fps_private.check_sessions(jsonb)`; credentials are stored in Hyperdrive.
The role has a 1200 ms statement timeout. Its password was generated with Node crypto.

Each Durable Object owns its own one-connection client, with a ten-second idle
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
