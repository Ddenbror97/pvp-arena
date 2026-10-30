# FPS controlled-release verification — 2026-10-30

Decision: **NO GO pending the UUID/MetaMask residual-risk approval.**
Source and production artifact scans passed; the frozen commit and build
identifiers are recorded in the generated release manifest and dashboard. All complete test
suites below passed. Production remains unchanged. This decision concerns a
cash-disabled practice release; it never authorizes public cash, deposits,
withdrawals or other production financial operations.

## Complete verification

- Unit suite: **648 passed, 0 failed, 0 pending** in the isolated final run.
- Integration/database suite: **397 passed, 0 failed, 0 pending**, 38 files.
  Every historical hosted case was pointed at the authorized Fresh project;
  the recording case ran in verification mode without replacing tracked assets.
- Browser suite: **19 passed**, including real registration/OTP, both roles,
  movement/aiming/shooting, body/head hits, walking/arms/head models, six complete
  bot rounds (5–1), a hosted paid synthetic BO5 and both games' settlement checks.
- Hosted security: **6/6 passed** on the final close-handshake runtime: local
  logout, global logout, administrative revocation, session not-after expiry,
  an actual 60-second JWT and an actual authorization-service failure.
- Fresh staging financial suite: **12/12 passed**: competing joins, immutable
  result intent, duplicate payout prevention, rematches, cancellation/expiry
  races, posting rollback/recovery, ranking and balance conservation.
- Runtime/fault suite: **5/5 passed**, including independent scheduled recovery,
  private spectators, replay denial, forged health and checkpoint restart refund.
- Auth/privacy suite: **3/3 passed**, including private capabilities and use of
  still-unexpired JWTs after real Auth logout.
- App and runtime TypeScript checks and changed-source lint passed. Production
  build passed. Exact Git/build hashes are recorded in `test-results/fps-release-manifest.json`
  and the release-check dashboard.

The original 54 failures are individually mapped to passing cases in
`FPS-DB-FAILURE-TRIAGE-2026-10-30.json`; all 54 also passed in the final complete
suite. The complete run has no nonexecuted/skipped cases. Historical migrations
were not edited to obtain these results.

## Fixes and investigation outcomes

Existing sockets now require fresh authoritative session checks, including
pre-read command watermarks that close the in-flight revocation race. Tickets
bind session ownership and JWT expiry. Failed authorization pauses input and
clears queued commands; prolonged failure cancels/refunds through the ordinary
immutable result flow. Replacement sockets cannot inherit old commands.

The sustained test exposed an incomplete close handshake. The runtime now
explicitly reciprocates a peer close; tests require a clean normal close before
replacement. The passing sustained run had four clean handshakes and zero
unexpected disconnects. An admission 503 is retried with fresh one-use tickets
and bounded browser-equivalent backoff; the final run required no retries.

Windows fixture failures came from CRLF-dependent historical patch matching,
unreserved multi-statement migration transactions, Vite watching local database
files, stale dependency prebundles and Linux-only paths. Fixtures now normalize
their copies, reserve a connection and isolate caches/watchers. Production
migration files were retained. The 8-ball fixture uses the actual registration
flow and synthetic USD ledger. Its clock drives only its own test match because
historical staging cron/HTTP jobs are disabled. Tests follow current lobby
controls and absence rules; financial assertions remain intact.

The complete rerun also found a real poker seat-version bug. A forward-only
migration makes changed seats publish a new version while preserving no-op
returns, existing function hardening and ACLs. All 21 poker audit/recording
regressions passed. The roulette cap fixture now explicitly keeps all concurrent
requests inside the betting window; cap and exact-deadline assertions remain.

## Performance and concurrency

Increasing hosted levels passed at 2, 5, 12 and 20 matches. The sustained final
bound is **20 matches / 40 automated authenticated identities for 180 seconds**.
It is a demonstrated target, not maximum capacity or 40 human testers.

- Entry creation p50/p95: **1,252.7 / 1,319.3 ms**.
- Input acknowledgement p50/p95: **182.2 / 250.8 ms**, 107,883 samples.
- Snapshot spacing p50/p95: **51.4 / 77.3 ms**, 123,145 samples.
- Reconnect p50/p95: **271.5 / 288.4 ms**, four samples.
- Sampled DB connections peaked at **29**; sampled lock-waiting connections
  peaked at **0**. Samples are not proof of zero waits between observations.
- Provider namespace/isolate metrics during the load window: maximum sampled
  memory **40,108,044 bytes**, summed CPU **129,829,942 microseconds** across
  active objects; zero exceeded-CPU, exceeded-memory or fatal-internal counters.
  CPU is aggregate across objects, not per-player latency or workstation CPU.
- All 20 matches refunded exactly once and restored their original balances.

Half the load clients inject 100–200 ms send delay and discard every tenth
application message. Ack timing starts at actual send and excludes that injected
delay. This does not measure IP packet loss. Entry creation includes public API
round trips, authorization and serialized financial work; no sampled lock wait
was observed, so the data does not establish that locks caused its latency.

## US gameplay

The final 60-second gameplay probes had confirmed **remote-IAD** and
**remote-SEA** execution placement and matching egress traces. Each received
1,134 live snapshots while moving/firing through authenticated sockets.

- East acknowledgement p50/p95: **46 / 74 ms**; snapshot p95 **74 ms**.
- West acknowledgement p50/p95: **104 / 138 ms**; snapshot p95 **73 ms**.

The match refunded once with exact balance restoration. Temporary probe Workers
were deleted. These are placed automated server clients, not residential/mobile
last-mile tests or a network packet-loss certificate.

## Security review and approvals

Audit: **0 critical, 0 high, 6 moderate** findings in the inherited MetaMask/UUID
chain. The reviewed call paths use UUID v4; the advisory affects v3/v5/v6 with
caller-supplied buffers. No reachable affected call was identified in FPS or the
inspected wallet paths. Compatible upstream ranges do not remove the whole
chain; no forced major override was applied. See the separate security review.
Residual-risk approval for the cash-disabled release is pending.

Server authority, rate bounds, hitboxes, one-use admission, private-room access,
visibility filtering, result integrity and recovery are tested. Server latency
rewind, anti-aimbot assurance, collusion detection and all end-user/device/network
conditions are not certified. These remain public-cash launch limitations.

The user explicitly **waived alert delivery and incident-response setup**.
Neither structured logs nor configuration inventory is represented as delivered
alerts. No alert destination or responder was invented.

## Production backup, migration and rollback

Production public/service API credentials verified with HTTP 200. A distinct
production runtime secret was prepared. Existing third-party payment credential
names were inventoried only; no payment operation was exercised.

A **33,724,330-byte** read-only exported-snapshot production archive was created.
The original unmodified restore exposed **39 pre-existing orphaned MFA claims**.
The user approved preserving those rows in a private quarantine only in the
restored copy. All original claims remain in Auth or quarantine, all FKs are
enforced, and all Auth users/financial rows/settings match the snapshot. Source
production Auth data is unchanged. See the approved recovery report.

All five pending migrations applied successfully to that isolated recovered
production schema. Existing financial rows, sums and settings remained unchanged;
money invariants passed and new FPS cash stayed disabled.

Production has 35 recorded historical entries missing from this checkout. The
private operator workspace was reconstructed from actual recorded remote history
and the five new source migrations. No remote history repair or historical
rewrite was performed. The real CLI dry run selects exactly these five:

- `20261029192715_fps_ledger_matchmaking.sql`
- `20261029192803_fps_ledger_rpcs.sql`
- `20261030123754_fps_ledger_fk_indexes.sql`
- `20261030152706_fps_live_session_authorization.sql`
- `20261030165225_poker_seat_action_version.sql`

Rollback baseline is the currently deployed production version
`49556866-a68b-4f64-96ab-f17d918ddae5`. Its exact modules were archived, deployed
to a private temporary Worker against migrated Fresh staging, replaced by the
candidate modules, and restored through the provider version-deployment API.
All nine SSR probes passed and the temporary Worker was deleted. The old version
correctly restores its existing `/fps-duel` 404; rollback withdraws the new feature.
The migrations are additive or preserve existing function signatures; rollback
retains them, keeps FPS cash disabled and disables the new feature if needed.

Prepared Worker configs preserve the two existing production routes, existing
minute cron and existing financial flags/secrets. The production runtime uses a
new empty namespace and production-only credentials. No staging users, balances,
receipts, runtime checkpoints or synthetic data are copied into production.

## Controlled rollout status

No production migration or deployment has occurred. Once the remaining approval is received, the authorized scope is the five
reviewed migrations, a new production runtime, the candidate app and practice
only with `cash_enabled=false`. Production smoke tests must exercise real Auth,
zero-stake matchmaking, gameplay, sockets, ledger invariants and recovery before
the rollout is reported complete. Public cash requires separate authorization.

Raw private evidence remains under ignored `test-results/` and `.wrangler/`.
Database archives, Auth data, credentials and raw traces must not be published.
