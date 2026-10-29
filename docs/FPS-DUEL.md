# FPS Duel implementation and release gates

## Existing integration points

React 19/TanStack Start routes, the AuthProvider, live-session middleware, player
profiles, USD-cent wallet and double-entry Postgres ledger remain authoritative.
Pool is the lobby reference. Poker and Pool demonstrate transaction-scoped game
locks and account holds. Promo/referral attribution belongs to the existing
database hooks; the FPS ledger design is documented separately in FPS-LEDGER.md.

## Implementation stages

1. Shared simulation and protocol: `src/lib/fps/{map,protocol,simulation}.ts`.
   Fixed server tick, original symmetric cover, validated inputs, collision,
   deterministic weapon rules, best-of-5/9 rounds and adversarial tests.
2. Authoritative runtime: `workers/fps/`, one Cloudflare Durable Object per match.
   Signed short-lived admission, one active connection per seat, bounded input,
   snapshots, reconnect deadlines, durable results and retryable settlement.
3. Casino integration: `src/lib/fps/duel.functions.ts`, `/fps-duel` and
   `/fps/$matchId`, existing authentication/wallet/header, Three.js rendering,
   pointer lock, resize/focus handling and explicit desktop-only controls.
4. Database migrations: default-disabled lobby, public/private matchmaking,
   exact-cent holds/refunds/5% settlement, durable audit and ratings.
5. Isolated database integration, two authenticated browser clients, restart and
   settlement fault injection, security review, latency/CPU/load measurement.

Gameplay is not written to Postgres each frame. The runtime is deployed
separately from the casino Worker. A 30 Hz simulation and 20 Hz snapshots are
initial configuration targets, not measured capacity promises. A runtime crash
during play cancels/refunds instead of trusting an incomplete result. A completed
durable result retries settlement with the same match identifier.

The supplied arena image guides branding, lighting and composition; the arena
geometry and hit detection are original. The rifle reference is artwork, not a
3D model. The renderer must not claim to have imported a model from that image.

## Release gate

No live schema changes, funded tests, or deployment are performed as part of
local implementation. `fps_config.enabled` and `cash_enabled` begin false.
Cash play requires isolated financial/concurrency tests and a real two-user
deployment test. A successful build is not a production-readiness certificate.

The local playable vertical slice and operational recovery are implemented.
The isolated test drivers complete real-time rounds over workerd WebSockets;
they do not establish deployed authenticated cash play. `FPS-OPERATIONS.md`
contains provisioning, measured local performance, monitoring and remaining
fairness/attribution/concurrency release gates. Existing promo/partner reward
allowlists have not been extended; unsupported restricted funds fail closed.
