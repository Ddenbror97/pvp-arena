# FPS Duel operations

## Current delivery

The local feature lives at `/fps-duel`, with gameplay at `/fps/$matchId`.
It uses existing casino authentication, live-session checks, profiles, wallet
and ledger. The original Three.js arena uses the supplied purple branding
references. The arena combines procedural geometry with licensed authored
rifle, hand and character assets; see `FPS-AUTHORED-ASSETS.md` for attribution.

Local transport tests use two explicit test drivers over real workerd WebSockets.
They complete BO5, reject forged combat, replace reconnects, enforce private
rooms and spectator capacity, and retry a failed settlement with identical
results. The database endpoint in those transport tests is an isolated stub;
the separate PGlite tests execute the migrations and real ledger/basis helpers.
Neither isolated test alone demonstrates authenticated deployed play. The
separate opt-in staging checks below use the complete remote Postgres schema,
real Auth sessions and synthetic USD ledger funds.
See `FPS-LEDGER.md` for the financial contract and attribution restrictions.

## Provision an isolated staging environment

1. Use a disposable Supabase project with the existing schema, auth and ledger
   prerequisites. Apply migrations through the normal reviewed migration
   pipeline, in order. The enum migration must commit before the RPC migration.
   Both FPS launch flags start false. Do not test against real user balances.
2. In `workers/fps/wrangler.jsonc`, configure a separate staging Worker name,
   exact casino `ALLOWED_ORIGIN`, and staging `SUPABASE_URL`. Provision secrets
   with `wrangler secret put ... --config workers/fps/wrangler.jsonc`:
   `FPS_RUNTIME_SECRET` (random, at least 32 characters) and
   `SUPABASE_SERVICE_ROLE_KEY`. The latter belongs only to the match service.
3. Deploy the match Worker with its SQLite Durable Object migration. The source
   configuration includes a once-per-minute scheduled handler. Confirm execution and
   alerting in the actual staging account.
4. Configure the casino's server-only `FPS_RUNTIME_ORIGIN` (HTTPS origin only)
   and the same `FPS_RUNTIME_SECRET`, then deploy the casino to staging. Never
   expose either secret through Vite variables or source control. The casino also
   requires its server-only Supabase service key. Its deployment must include
   `global_fetch_strictly_public` for public fetches to the separate Worker on
   the same Cloudflare account (the deployment patcher adds this flag).
5. `/health` must return `configured: true`; this checks required configuration,
   not database reachability or accounting correctness. Enable only practice
   in staging after checking auth, membership and recovery. Cash remains false.
6. Sign in as two distinct real test users in separate browser profiles. Verify
   public matchmaking, private invitation preview, readiness, BO5 and BO9,
   full results, rematches, spectator delay and reconnects. Confirm wallets
   from database postings, not browser text alone. Use test funds only.

The browser sends intent only. Signed admission lasts 60 seconds and is consumed
once. Runtime input messages are capped at 512 characters and 70 per second;
seats have one current connection. Spectators have 16 separate slots and cannot
displace player seats. Private rooms reject spectator tickets. Configure edge
rate limits for admission/server-function requests before opening public entry.
Never retain admission query strings, invitation tokens or auth headers in logs.

## Lifecycle and recovery

Both players must ready within 60 seconds of runtime initialization. During
play a disconnected seat has 30 seconds to reconnect. A single missing player
forfeits; both absent cancels/refunds. Three drawn rounds cancel/refund. The
runtime caps a match at 20 minutes. Waiting database rooms expire after ten
minutes; funding sets a 20-minute database deadline. Side spawns alternate.

One Durable Object owns simulation, snapshots and outcome. Gameplay is not
written to Postgres every frame. Checkpoints occur every two seconds. A runtime
restart during play records a cancellation; it does not resume an incomplete
financially consequential round. A terminal result is persisted before its
callback and is never replaced because a later persistence attempt fails.

Callbacks first commit `fps_record_result`, then invoke `fps_finish` using the
same immutable match/runtime/result. Recorded results are excluded from expiry.
A temporary callback failure logs `fps_settlement_retry` and retries after
15 seconds. The independent scheduled handler drains `fps_reconcile` before
`fps_expire`, at most five batches of 100 per task per run. It reports failures
and backlog rather than concealing them. Completed room storage is retained
for 24 hours; SQL ledger/audit/result evidence persists.

Expiry can win the lock before the first SQL result intent commits. That
committed refund remains authoritative. The runtime confirms cancellation via
the service-only view, presents the refund, logs `fps_result_refunded`, and keeps
its original result as evidence. Other conflicts require investigation and must
not be converted into another payment. Disable cash entry during
an incident, keep reconciliation/refunds running, inspect SQL match, intent,
audit and ledger together, and resolve only through reviewed service operations.
Never manually edit balances, delete result intents or retry with a new winner.

## Monitoring and verification

Alert on `fps_runtime_error`, `fps_settlement_retry`, `fps_maintenance_failed`,
`fps_maintenance_backlog`, expired funded rows and unresolved recorded results.
Correlate by match UUID. Check house-fee/payout/hold conservation from the
ledger. Restrict service credentials, rotate them through the secret store,
and verify database advisors, RPC grants and RLS before enabling cash.

Useful local checks:

```text
npx tsc --noEmit
npx tsc -p workers/fps/tsconfig.json --noEmit
npx vitest run --project unit --maxWorkers=2
npx playwright test tests/e2e/fps-lobby.spec.ts
npm run build
node scripts/fps/bench-runtime.mjs
```

The browser smoke tests expect a local server on port 4173; use local/staging
public Supabase configuration. They verify layout, terms and WebGL startup,
not paid multiplayer. The casino production build and standalone match Worker
are separate artifacts; deploying one does not deploy the other.

On this Windows workstation, the 10-room/20-client local transport smoke
measured 29.31 Hz mean simulation, 20.05 Hz mean snapshots, and 49.10/54.30 ms
median/p95 input acknowledgements (2,178 samples). This is a short same-machine
test, without Supabase/auth or Internet transport; CPU/memory per match and
production capacity were not measured. Reproduce with the command above;
`FPS_BENCH_ROOMS` accepts 1–50 and results go to the ignored `test-results/` folder.
The long existing poker-shuffle distribution test may need
`--testTimeout=60000` on a busy workstation; do not skip its assertions.

Final local verification passed 625 unit tests, both browser smoke tests,
casino and match-worker TypeScript checks, and the production build. Targeted
FPS lint passed. Repository-wide ESLint remains blocked by existing formatting
and lint debt, dominated by Windows CRLF versus Prettier's LF expectations;
this feature does not mass-format unrelated guides or configuration files.

## Disposable staging verification (2026-10-30)

The explicitly authorized project is `rymzkgqoekjluzmzstap` (Fresh test
pvpspinarena). Production has not been migrated, funded or enabled by these
checks. The staging database has all 304 repository migrations. SQL copies are
normalized to LF for historical function-definition patches, and all database
cron jobs are disabled transactionally to isolate hard-coded historical endpoints.
Deposits and withdrawals are disabled. Synthetic deposits have balanced custody
postings and clearly marked synthetic receipts; this does not validate payment rails.

The scripts refuse any database target outside this staging project. Keep
`.env.fps-staging` and `.env.fps-staging-users.json` ignored and private. Credentials
are not command-line arguments or client build variables. Provision/reproduce with:

```text
node --env-file=.env.fps-staging scripts/fps/prepare-staging-schema.mjs
node --env-file=.env.fps-staging scripts/fps/setup-staging.mjs
node --env-file=.env.fps-staging scripts/fps/verify-staging-ledger.mjs
node --env-file=.env.fps-staging scripts/fps/verify-staging-auth.mjs
node --env-file=.env.fps-staging scripts/fps/verify-staging-runtime.mjs
```

Schema preparation writes an isolated CLI workspace; inspect its manifest before
applying migrations with that workspace. Setup funds through ledger postings only.
Auth verification intentionally revokes user 15's session; rerun setup to refresh
test sessions before any further financial/runtime suite. Run the financial suite
separately from browser matches because its final global checks require no open rooms.
Repeated financial tests respect the actual
8-entry/10-minute rate limiter; allow the window to pass rather than bypass it.

Verified with actual independent Postgres transactions: competing joins,
join/cancel races, duplicate result/settlement retries, rematch races, committed
results versus expiry, posting-failure rollback/retry and one-time Elo updates.
Global accounting invariants pass with no locked funds after completed tests.
REST checks cover secret-table/RPC permissions, private membership and revocation
of an otherwise unexpired Auth JWT. Real local workerd plus remote Supabase checks
cover scheduled reconciliation, one-time tickets, forged HP and a checkpointed
runtime restart with exactly one full refund.

`tests/e2e/fps-staging.spec.ts` signs in two real browser users, plays a paid BO5
using keyboard/mouse, reconnects the second user and verifies the single ledger
settlement: two 100-cent stakes, 190-cent payout and 10-cent fee. Enable it with
`FPS_STAGING_E2E=1`; `FPS_STAGING_APP_URL` selects the isolated hosted staging URL
or defaults to port 4180. It disables traces/video to avoid retaining passwords.

Build and deploy staging separately using
`node --env-file=.env.fps-staging scripts/fps/deploy-staging.mjs` after the staging
Vite build. This creates only `pvpspinarena-staging` and
`pvpspinarena-fps-staging`, uses no custom-domain routes, installs only the FPS
recovery cron and never runs the production config patcher. Casino/payment cron
is absent on the staging app. Deployment URLs and test reports are in ignored
`test-results/`. No management token, DB password, service key or runtime signing
secret was found in the 1,493 public build files.

The updated 10-room/20-client same-machine transport smoke measured 29.55 Hz
simulation, 20.06 Hz snapshots, and 44.70/55.61 ms median/p95 acknowledgements.
These measurements include visibility projections but exclude Internet latency,
auth, database throughput and client rendering.

The final hosted paid BO5 passed again after the security updates (three played
rounds and a second-browser reconnect). The separate six-round bot regression
finished 5–1; walking in both roles/directions and the hand/head mesh checks
passed. A 120-frame local headless WebGL sample while strafing measured 20.9 ms
median and 28 ms p95 frame intervals. This is a workstation sample, not a claim
of 60 FPS on every device. Both TypeScript projects, targeted lint, production
build, 625 unit tests, 12 remote ledger checks and final Auth/runtime checks pass.

The release pass also patched TanStack Start's unauthenticated reflected-XSS
advisory (GHSA-qx66-fv34-fjm8), serialization dependencies and compatible build
tools. Start is pinned to 1.168.60, with its matching Router 1.170.41 and shared
router-core 1.171.34 so Nitro does not resolve an older duplicate core during
SSR bundling. The root boundary uses the updated not-found match flag and
accepts unknown errors. Zod is upgraded to 4.6.7; existing schemas type-check.
Undici 7.30.1 patches the transport advisories while retaining the existing
Miniflare major. The resulting npm audit has no high or critical findings;
six moderate findings remain in the existing MetaMask/UUID dependency chain.

Database advisors report no ERROR findings and no missing FPS FK indexes after
the index migration. WARN findings remain for intentionally exposed security
definer RPCs, the existing `slot_tick_worker` mutable search path and disabled
Auth leaked-password protection. This is not a clean whole-casino security audit;
the public RPCs must retain their own authorization checks.

## Remaining release gates

- Verify production alert delivery before public cash entry. Independent hosted
  Cloudflare cron execution is verified: a committed unpaid staging result was
  settled without a callback or a manual reconcile call. New cron propagation
  took several minutes; the initial short observation window timed out.
- Benchmark intended regions, latency, packet loss, client frame rate,
  per-match CPU/memory, tick/snapshot rates, database load and settlement
  throughput. Configuration targets are 30 Hz simulation and 20 Hz snapshots;
  no concurrent-player capacity is claimed from local tests.
- Gameplay uses authoritative current-state hits without latency rewind.
  Player snapshots now redact opponent poses behind solid cover; the renderer
  snaps to the authoritative pose on reveal. Delayed read-only spectators retain
  their separate feed. Broader aim-assist detection is not complete.
  Regional latency matchmaking is not implemented. These fairness limits need
  review and measurement before a competitive cash launch.
- FPS cash entry conservatively rejects restricted bonus/partner funds and
  active partners. It does not extend existing promo/referral/partner reward
  allowlists. Supporting those paths requires a reviewed attribution extension;
  existing games' attribution behavior remains intact.
- Review the remaining six moderate MetaMask/UUID audit findings and the existing
  Nitro/Miniflare peer warning in the deployment toolchain. Do not use an
  unreviewed forced dependency upgrade.

Leave `fps_config.enabled=false` and `cash_enabled=false` until the corresponding
gates are verified. A passing local build is not a production launch approval.
