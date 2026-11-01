# Cross-region latency: US / EU / LatAm (2026-11-01)

The constraints are fixed. The match server stays in the US, next to the database
(Supabase **us-east-2, Ohio**; the match Worker uses the `enam` hint). Session revocation
stays strict: no command received after a session is revoked is ever applied, and there is
no grace window.

## 1. What we have (audit)

| Layer | Current design | Assessment |
| --- | --- | --- |
| Edge routing | Players connect to the nearest Cloudflare PoP over WebSocket. Traffic then rides Cloudflare's backbone to the match Durable Object. | This is the same idea as Riot Direct: one private backbone instead of the public internet. Already in place. |
| Server placement | One Durable Object per match, `locationHint: "enam"` (Virginia, about 10–12 ms from the Ohio database). | Correct for a US-based server. Cloudflare has no South American DO region: `sam` spawns in Eastern North America. So US East is also the latency midpoint for EU ↔ LatAm. |
| Simulation | 30 Hz fixed step and 20 Hz snapshots. The client draws opponents 100 ms in the past. Server-side lag compensation rewinds up to 250 ms. | In line with industry practice for this tick rate (see the 2026-11-01 network audit). |
| Command authority | Every movement and shot command waits for a database session check that **starts after the command arrived** (strict revocation). | **The largest server-side delay; see section 2.** |
| Transport | WebSocket over TCP. | Durable Objects offer no UDP or WebTransport, so TCP head-of-line blocking on loss cannot be removed. No change. |

## 2. Root causes found (measured)

The test harness (`tests/fps-runtime.test.ts`) uses a real Durable Object runtime. It measures
how long each command takes from being sent until it shows as applied in a snapshot. Session
reads are 72 ms (the measured production REST median from Virginia) or 150 ms (the measured
slow tail).

1. **Serial session reads.** The next read started only after the previous one finished, so
   a command could wait for a whole in-flight read and then its own read: up to 2× the read
   time.
2. **Permanent command backlog (queue build-up).** The server applied exactly one command per
   34 ms tick, which is exactly the client's send rate. Any backlog (from match start, one
   slow read or one network burst) therefore never drained. The server's own telemetry showed
   ~145 ms of server-side delay against a ~76 ms read: ~70 ms of pure queueing on every
   command for the rest of the match.
3. **The session-check SQL scanned every session and every user.** The planner ran the
   `exists` check as a hashed sub-plan with full sequential scans of `auth.sessions` and
   `auth.users`. That costs about 1 ms today, but it grows with the user base on every
   command's critical path.
4. **The HTTP path dominates the read.** In-database execution is 0.2–5 ms. Most of the
   72 ms median is TLS, the API gateway and PostgREST, not distance or SQL.

## 3. Changes (strict revocation preserved)

| Change | Where | Industry reference |
| --- | --- | --- |
| **Pipelined strict reads.** Up to 4 overlapping reads, at least 25 ms apart. A read starts as soon as a command arrives, not at the next tick. Each read still freezes command watermarks when it starts, and newer completed reads supersede older ones. A positive result can never authorize a command received after its read began. Any failure pauses input, as before. | `workers/fps/index.ts` | Request pipelining / overlapping I/O |
| **Bounded command catch-up.** Each player earns one command credit per tick, capped at 3. A backlog of already-authorized movement-only commands is folded into the current tick within that budget. Fire, reload and weapon-switch commands always take the normal combat path. Average movement can never exceed real time. | `src/lib/fps/simulation.ts` (`applyQueuedMovement`), `workers/fps/index.ts` | Source engine usercmd budget (`sv_maxusrcmdprocessticks`); Overwatch's input buffer management |
| **Index-based session check.** A `LATERAL ... LIMIT 1` lookup on the `sessions(user_id)` and `users(id)` indexes, with constant cost per session. Identical results: 559/559 production cases checked inside the database. | `supabase/migrations/20261101170000_fps_check_sessions_indexed.sql` (**not yet applied**) | — |
| **Per-region latency telemetry.** Players are tagged with Cloudflare's edge continent (NA, SA, EU, …) at connect. Every 30 s the room logs `fps_region_latency` with p50/p95/p99/max per continent for server-side command delay and measured RTT, plus room-wide session-read p50/p95/p99. No user identifiers. | `workers/fps/latency.ts`, `workers/fps/index.ts` | — |

## 4. Results (same test, old vs new runtime code)

Command sent → applied in a snapshot, local runtime (no network latency):

| Session read | Old p50 / p95 / p99 | New p50 / p95 / p99 | Change at p95 |
| --- | --- | --- | --- |
| 72 ms (production median) | 222 / 263 / 267 ms | **113 / 173 / 178 ms** | −90 ms |
| 150 ms (slow tail) | 288 / 346 / 378 ms | **206 / 255 / 288 ms** | −91 ms |

- Every player gets this server-side saving on top of their own network RTT. It matters most
  for EU and LatAm players, whose shots are already 90–180 ms away.
- A 1-second slow-database run (120 ms reads) moved the player in 100% of snapshots.
  Previously it was 88–97%.
- A command flood at ~2.2× the tick rate travelled exactly walking speed. The catch-up budget
  does not allow a speed hack.
- All 906 unit and runtime tests pass, including both strict-revocation tests: "revoking
  rejects queued movement and fire" and "an in-flight positive read cannot authorize a
  command received after revocation".
- Database reads per room rise from about 12–14/s (back-to-back) to at most about 40/s. Each
  read is a single indexed lookup once the migration is applied.

## 5. Measuring US / EU / LatAm in production

After the match Worker deploy, query Workers Observability for `event = "fps_region_latency"`.
Each record carries:

- `regions[]` with `continent`;
- `commandDelayMs {p50, p95, p99, max}`: server-side;
- `rttMs {p50, p95, p99, max}`: WebSocket round trip;
- room-wide `sessionReadMs`.

The player-perceived "shot to confirmation" time is approximately
`rttMs + commandDelayMs + snapshot cadence (≤ 50 ms)`.

Track p95 and p99 per continent, not averages. **No production numbers exist yet.** This
environment cannot run browsers from EU or LatAm, so regional figures will come from this
telemetry.

## 6. Recommended next steps (not done; each needs a decision or infrastructure)

1. **Persistent database connection for session checks** (largest remaining win).
   - A Hyperdrive pool with a Postgres client held by the match Durable Object for the
     duration of the match. That replaces ~65 ms of HTTP overhead with about one Virginia ↔
     Ohio round trip (~10–15 ms).
   - Expected effect: command delay p50 down by a further ~50 ms. Revocation semantics are
     unchanged.
   - Needs: a Hyperdrive configuration, a least-privilege role allowed only to execute
     `fps_private.check_sessions`, and a secret.
   - The 2026-10-31 experiment measured a *fresh client per check* (82 ms), not a persistent
     connection, so it doesn't decide this.
   - Validate with this telemetry before promoting.
2. **Apply the session-check migration**, then rerun the performance advisor.
3. **Ping-aware matchmaking display.** Show each room's measured RTT in the lobby, and prefer
   same-continent opponents when both are available. Riot and Valve both use regional queues
   with ping limits.
4. **Tick rate.** A higher simulation and snapshot rate (60/30 Hz) would cut interpolation
   delay and peeker's advantage. That's the root of Valorant's 128-tick decision. It doubles
   messages and Durable Object CPU, so decide only after the telemetry above shows command
   delay is no longer dominant.
5. **Not applicable on Cloudflare Durable Objects today:** UDP/WebTransport (removes TCP
   head-of-line blocking on lossy links) and moving a live match between regions (objects
   don't migrate).

## Sources

- [Cloudflare Durable Objects data location (location hints)](https://developers.cloudflare.com/durable-objects/reference/data-location/)
- [VALORANT's 128-Tick Servers (Riot Games Technology)](https://technology.riotgames.com/node/112)
- [Riot on peeker's advantage (PC Gamer interview)](https://pcgamer.com/valorant-peekers-advantage-interview)
- [Game Backend Deep Dive: VALORANT (Edgegap)](https://edgegap.com/blog/game-backend-deep-dive-valorant-riot-games)
- [Cloudflare WebSockets with Workers and Durable Objects](https://websocket.org/guides/infrastructure/cloudflare/)
- [Valve Source SDK lag compensation](https://github.com/ValveSoftware/source-sdk-2013/blob/master/src/game/server/player_lagcompensation.cpp)
