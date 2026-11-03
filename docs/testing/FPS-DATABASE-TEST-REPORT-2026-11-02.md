# Five-map database and gameplay validation — 2026-11-02

Branch: `fps-database-test-environment`. Scope: isolated Fresh test only (`rymzkgqoekjluzmzstap`). No production database connection, production record changes, merge or deployment occurred.

## Environment and schema

The existing ignored `.env.fps-staging` and `.env.fps-staging-mail` supply the dedicated API URL, publishable key, service credential, database URL and runtime secret. `.env.fps-staging-users.json` supplies synthetic test identities. Nothing falls back to production. `assertStaging()` checks the exact API project, database hostname, pooler account, database name and protocol before connections. Forty synthetic sessions were refreshed. Staging cron jobs remain disabled.

Initial comparison found 313 of 315 repository migration versions. Inspected and applied **only in staging**:

- `20261017060000`: historical removal of `pvp_test`; that schema was confirmed absent first.
- `20261101164510`: indexed authoritative FPS session check.

Afterward there are no missing or extra migration versions. The catalog inspection records 10 FPS tables, 25 functions, 29 indexes and 12 trigger entries. All seven public FPS tables have RLS enabled. No direct table policies are installed: access is through deliberately granted RPCs, with direct writes denied. The three private tables live in `fps_private`. Migration-version parity is not a claim of byte-for-byte parity with production function definitions; production was not queried.

The authoritative map catalog and gameplay configuration are shared code. Runtime Durable Object checkpoints own map selection; do not invent a five-row SQL map catalog or a database map_id column to satisfy a test.

## Five-map results

The accompanying `FPS-DATABASE-TEST-EVIDENCE-2026-11-02.json` records exact run outcomes. All five paid matches completed naturally with a 0–7 result; Showdown needed eight rounds because one was drawn. Final database checks confirm zero active synthetic cash or Practice matches, zero locked synthetic cents, and passing financial invariants. The map identifiers and display names come from the repository registry.

| Map        | ID         | Database/runtime recovery | Full Practice | Synthetic paid PvP | Asset references |
| ---------- | ---------- | ------------------------- | ------------- | ------------------ | ---------------- |
| Dustfront  | dustfront  | Pass                      | Pass          | Pass               | Pass             |
| Frostline  | frostline  | Pass                      | Pass          | Pass               | Pass             |
| Lost Trail | lost-trail | Pass                      | Pass          | Pass               | Pass             |
| Crossfire  | crossfire  | Pass                      | Pass          | Pass               | Pass             |
| Showdown   | suburbia   | Pass                      | Pass          | Pass               | Pass             |

Each map's recovery suite uses two real authenticated synthetic users, database entry/join RPCs, actual Worker code in Miniflare, signed WebSockets and the real isolated Supabase ledger. Six checks per map: scheduled reconciliation, explicit map selection, private spectator denial, ticket replay denial, forged-health rejection, and checkpoint restart with exactly-once refund. All 30 checks passed.

Each full Practice match runs the actual bot and simulation through WebSockets until seven wins, persists the completed result, verifies bot movement across multiple positions, and checks unchanged wallet transaction count, balance and rating. All five passed. Frostline included a drawn round and finished after eight rounds; seven wins remained the completion criterion.

The paid path uses two synthetic authenticated player accounts. One test client stands still; the opposing scripted client sends ordinary movement, aiming and shooting inputs using the existing bot planner. The match is a real paid-PvP backend match, not the Practice mode. No test writes health, transforms, round scores or completion flags. Natural completion must persist and settle the $2 synthetic pot as $1.90 payout plus $0.10 fee. This is backend gameplay coverage, not a claim that two humans manually played each map in real browsers.

## Ledger and security

The existing real-database ledger suite passed all 12 checks: schema/session/cron identity, REST and financial ACLs, concurrent joins, exact-once result/settlement, concurrent rematch, join/cancel races, flood protection, result/expiry conflicts, expiry race, injected posting rollback and independent reconciliation, rating updates, and global conservation with no orphan locked FPS money.

Nine additional security checks passed: anonymous/authenticated direct score forgery denied; unrelated cancellation denied; private details hidden with MATCH_NOT_FOUND; incorrect invitation denied; valid join retry keeps exactly two entries; third-player join denied; participant result forgery denied; RLS enabled; authorized service refund succeeds. No RLS, session check or rate limit was disabled.

The staging build passed. Scanning all 1,595 public build files found none of the staging service key, runtime secret or database URL. Secrets remain server-only and ignored. No real accounts, balances or deposits were copied.

## Browser and regression checks

A Chrome Practice browser test passed in 3.6 minutes against the local app and isolated database: automatic entry/loading, seven-win completion, reload/reconnect, persisted result, Play again, and unchanged money/rating data. This is one browser match on the server-selected map; full real-browser gameplay was not repeated five times.

The full FPS suite initially reported 661 passes, one intentional skip and two 15-second timeouts under parallel load. Serial rerun of those two layout files with a 60-second budget passed all 23 cases. No line-of-sight assertion failed. The final isolation/registry/shared-engine regression run passed 31 checks. Typecheck and changed-file lint passed.

## Assets and storage

All five registry GLBs exist, have valid GLB headers/lengths and embedded buffers/textures with no missing external references. IDs are unique, all five are enabled in rotation, spawns are finite and collision collections exist. The separate staging project has its own avatars bucket. Map models are repository/CDN files, not Supabase Storage objects; no map bucket was invented, copied, deleted or overwritten. This does not certify every unrelated avatar storage policy.

## Harness fixes and observations

- Older staging harnesses still requested best-of-five. Updated only their test requests/config to best-of-13 and winning score seven.
- Recovery bundling now uses Node compatibility, matching the Worker's newer Postgres dependency.
- Added explicit per-map selection, separate synthetic users to respect rate limits, per-map reports, and scoped cleanup of rooms created by the run. Removed the old broad prior-room recovery loop.
- Added reusable database catalog, assets, permission, full-match and public-secret-boundary scripts. No new dependency, game rule, map geometry, weapon, render or production code changed.
- Local runtime tests pin compatibility date 2026-10-26, supported by the installed workerd; the production source config is 2026-11-01. This is a documented runtime-version coverage limit, not a production configuration change.
- Local database session reads include workstation-to-staging network cost; these are not production regional RTT or latency benchmarks. No performance SLA is inferred from these runs.

## Rerun locally / CI

Supply the same isolated-project secrets and synthetic fixture files through secure CI secrets or ignored local files. Never load production env files. The scripts reject any other Supabase project. Use individual `--map=<registry-id>` runs or the combined matrix. Entry rate limits remain active, so avoid repeatedly flooding the same fixtures within ten minutes.

Prepare and start the **local-only** runtime (do not deploy this generated private config):

```powershell
node --env-file=.env.fps-staging --env-file=.env.fps-staging-mail scripts/fps/prepare-test-runtime.mjs
node node_modules/wrangler/bin/wrangler.js dev --config .wrangler/fps-db-test/runtime.private.json --port 8789 --local --test-scheduled
```

In another terminal:

```powershell
node --env-file=.env.fps-staging scripts/fps/refresh-staging-users.mjs
node --env-file=.env.fps-staging scripts/fps/inspect-test-database.mjs
node --env-file=.env.fps-staging scripts/fps/verify-staging-ledger.mjs
node --env-file=.env.fps-staging scripts/fps/verify-staging-security.mjs
node --env-file=.env.fps-staging --env-file=.env.fps-staging-mail scripts/fps/verify-five-map-database.mjs
node --env-file=.env.fps-staging --env-file=.env.fps-staging-mail scripts/fps/verify-five-map-gameplay.mjs
node --env-file=.env.fps-staging --env-file=.env.fps-staging-mail scripts/fps/verify-five-map-gameplay.mjs --cash
node scripts/fps/verify-map-assets.mjs
```

`verify-five-map-database.mjs`, `verify-five-map-gameplay.mjs` and the underlying runtime verifier accept `--map=suburbia` (or another exact registry ID). Build with staging env files before running `verify-public-secret-boundary.mjs` with those same files. Browser test: start Vite on 127.0.0.1:4180 using staging files, set FPS_STAGING_APP_URL=http://127.0.0.1:4180 and FPS_STAGING_E2E=1, then run tests/e2e/fps-practice-staging.spec.ts with Playwright. Its targets are restricted to that local address or the known staging hostname.

## Limits and remaining checklist item

Completed synthetic financial audit records are retained in the dedicated test database. Active reservations are cleaned through existing cancel/refund/settlement paths; immutable ledger history is not deleted or bypassed. Therefore **strict zero-accumulation test-data teardown is not satisfied**. A disposable database/project reset or a separate transactional catalog fixture is needed for that stronger requirement. Do not describe this environment as having passed that acceptance criterion.

The tests establish the measured functional and financial checks, not a guarantee of bug-free code, exhaustive admin/storage policy coverage, cross-region performance, GPU behavior or manual real-browser play on every map. No production code fix or release is justified by the harness problems found here. Keep this branch isolated; do not merge/deploy without approval.
