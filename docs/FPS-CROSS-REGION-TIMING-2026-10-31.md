# FPS network timing and bounded hit compensation — 2026-10-31

This release targets perceived response and hit fairness for US, European and South American players. The authoritative runtime remains near the existing US primary database. It does not claim to remove geographical distance or establish measured player RTT from three countries.

## Implementation

- The actual authenticated room socket exchanges single-use server challenges. The server measures a rolling RTT median, p95 and jitter; no client clock or claimed ping controls authority. Three valid samples are required before compensation starts. Recent minimum RTT resists transient spikes, and rewind is always capped at 200 ms.
- Shot lookback includes the outgoing target-snapshot trip, the incoming input trip, the fixed 50 ms presentation buffer and server-owned command arrival/queue time. History records the exact poses and wall-clock timestamps published to clients, rather than mislabelling pre-step poses with a subsequent physics time. No client timestamps, damage or hitbox claims were added to Input.
- Only authoritative opponent hit volumes rewind. Ammo, cooldown, current armor, damage and world occlusion remain server-owned. Bots continue to use current authoritative poses. Round boundaries clear history; hidden history never leaves the runtime.
- Shots, hits and phase changes publish immediately after authoritative adjudication. They do not restart the existing 20 Hz movement deadline. Simulation remains approximately 29.4 Hz on its existing integer-millisecond cadence.
- Spectator history is bounded by time and count, retaining more than the required five-second delay when combat frames increase publication frequency. Private rooms skip spectator serialization, and player projections are generated only for connected seats.
- Final/reconnect snapshots use the identified event queue. Raw last-tick shots previously replayed at settlement without an event ID, causing duplicate visual/audio events and misleading acknowledgement samples.
- The HUD shows game RTT. Hover details show jitter, snapshot frequency, server tick rate, session-check duration and locally measured shot acknowledgement. Missing samples say not measured. TCP/WebSocket packet loss is not fabricated. Server logs emit bounded aggregate network samples without usernames or session credentials.

## Evidence

- 755 unit tests pass, including complete out-and-back snapshot/input travel at 30, 100 and 180 ms RTT, moving-target hits, world cover, round resets, input-claim rejection, nonce replay/forgery, runtime socket timing, session revocation and five-second spectating. TypeScript and targeted lint pass.
- Hosted synthetic paid BO5 matches passed at baseline and with 100/180 ms added RTT plus ordered jitter. The final timing-corrected build was retested at +100 ms: three rounds, reconnect, exact payout/fee, no browser errors, median measured game RTT 257 ms and median command-to-shot acknowledgement 281 ms. Raw data is in local test-results/network-verified-hosted/**/network-measurements.json. These include browser/event-loop effects and are not controlled country-to-country benchmarks.
- The earlier baseline/180 ms acknowledgement tails included a duplicated terminal shot; those tail values are not reliable latency evidence. The event-queue fix and test measurement deduplication correct this.
- The preceding shared movement release is PR #19, deployed to both Practice and cash PvP, with a full seven-round production smoke passing.

## Database-path experiment

A temporary staging-only Hyperdrive configuration used a minimal role with only session-check access, result caching disabled, no wallet table access and no inherited public definer functions. Expiring a synthetic session was immediately denied by both HTTP and pooled SQL. Warm-client measurements improved some paths, but fresh-client-per-check medians were 82 ms versus 49 ms HTTP at the enam location hint and 181 ms versus 92 ms at weur. The experimental path was not promoted. The temporary Worker, Hyperdrive configuration and database role were removed; the synthetic session expiry was restored.

Location hints are placement suggestions, not proof of an exact regional location. We did not infer continental player latency from a hint. Higher tick rates, binary framing, WebTransport, latency-based entry filtering and regional relays were not enabled without infrastructure and comparative evidence; doubling tick traffic while session checks remain on the critical path could regress play. Current exact-session validation is preserved, with no positive authorization lease.

## Release controls

No database migration, cash configuration, stakes, fees, namespace or secret changes are required. New FPS entries pause while active paid and practice rooms drain; existing rounds and settlements continue. A seven-second grace protects the delayed result stream. The original entry setting is restored in a finally block. Production verification uses only zero-funded QA, followed by account/session cleanup and financial/configuration checks.

Primary references: [Cloudflare data location](https://developers.cloudflare.com/durable-objects/reference/data-location/), [Hyperdrive connection lifecycle](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/), [Postgres.js integration](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/postgres-js/), [Valve's lag-compensation implementation](https://github.com/ValveSoftware/source-sdk-2013/blob/master/src/game/server/player_lagcompensation.cpp). The bounds and protocol here are specific to PvPStrike.
