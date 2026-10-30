# FPS controlled-release verification — 2026-10-30

Decision: **GO for controlled desktop practice only.** All required technical
checks passed on the frozen code candidate. Alert delivery was explicitly waived
by the user, and restored-copy quarantine of 39 existing Auth claims was approved.
Public FPS cash, deposits, withdrawals and production financial operations remain
outside this release authorization. Production rollout and smoke completed successfully, as recorded below.
The production rollout remains limited to zero-stake practice.

## Frozen code and build

Verified code commit: `af42d73fb1966632d6eede2c5140c82f86207571` on `codex/fps-duel`.
Merging current main changed history only; the tested file tree stayed identical.
Subsequent release-report-only commits do not change application or migration code.
PR: [FPS controlled release](https://github.com/Ddenbror97/pvp-arena/pull/3).
GitHub rollout CI [run 40](https://github.com/Ddenbror97/pvp-arena/actions/runs/41113198484) passed on this code.

App entry SHA-256: `66ce94135a127d58358f716121a5ece67c263a6d828c09eaebc46632c614100d`.
Package lock SHA-256: `fffe015ef1a2105d48fccaba092de5b3f972e53c1546b65193415baa65e37a3a`.
Complete artifact-file manifest SHA-256: `b44f23d7c956aea1b3a3adfdb4e43e7536e68d7fad5428b2a58216e67f4b4fe0`.
The ignored release manifest records configuration hashes and later deployment IDs.
The production build, runtime dry build, app/runtime TypeScript and changed-source
lint passed. All 2,288 tracked files and 1,731 artifact files were scanned: no
supplied credentials, and no Fresh project references in production artifacts.

## Complete verification

- Unit: **662 passed, zero failed or pending**.
- Database/integration: **397 passed across 38 files, zero failed or pending**.
- Browser: **19 passed in one complete run**, including real registration/OTP,
  8-ball gameplay/settlement, both FPS roles and hitboxes, wrists/grips, walking,
  mouse controls, six bot rounds (5–1), a hosted paid synthetic BO5 and reconnect.
- Hosted security: **6/6 passed**: local/global logout, administrative revocation,
  session not-after, actual 60-second JWT expiry and authorization-service failure.
  Each case refunded once and restored balances exactly.
- Financial integrity: **12/12** ledger cases; runtime/recovery **5/5**; Auth/privacy
  **3/3**. Concurrent joins, immutable result intent, duplicate settlement,
  rematches, expiry races and posting rollback/recovery passed.
- Dependency audit: **zero vulnerabilities** at every severity. Fourteen new actual
  consumer/advisory cases and all 25 existing wallet cases passed. The real browser
  SDK initialized and disconnected with no external requests or page errors.

All original 54 database failures are individually mapped to passing cases in
`FPS-DB-FAILURE-TRIAGE-2026-10-30.json`; all passed again in the complete run.
No historical migration was modified and no case was excluded to obtain a pass.

## Security fixes and dependency decision

Every established socket requires fresh authoritative Auth session checks.
Tickets bind session identity and original JWT expiry. Pre-read input watermarks
prevent commands arriving during a check from inheriting that older decision.
Authorization failures pause input and clear queued commands; prolonged failure
cancels through the immutable result/refund flow. Replacement sockets cannot
inherit older queued inputs. The server reciprocates peer close frames correctly.

Two exact verified MetaMask utils versions now resolve upstream UUID 11.1.1.
This narrowly scoped pin is outside their declared ^9 range; CJS/ESM caller,
v4 compatibility, advisory buffer-boundary and browser SDK tests justify the
compatibility decision. It is not a blanket forced override. Future parent
upgrades require re-review. See `FPS-SECURITY-REVIEW-2026-10-30.md`.

## Performance and US scope

The final sustained run (2026-10-30T19:21:14.016Z–2026-10-30T19:24:52.673Z) passed **20 matches,
40 authenticated automated clients and 180 seconds** of gameplay. Four clean
reconnects, zero admission retries/unexpected disconnects and 20 single refunds
with restored balances were verified. This is a demonstrated bound, not maximum capacity.

Input acknowledgement p50/p95: **185.0/254.5 ms**.
Snapshot spacing p50/p95: **54.9/77.3 ms**.
Reconnect p50/p95: **251.2/262.6 ms**.
Entry creation p50/p95: **1893.2/2028.2 ms**.
Half the clients delay outgoing messages by 100–200 ms and discard every tenth
input; acknowledgement timing starts at actual send. This simulates application
delivery impairment, not measured IP packet loss.

Sampled database connections peaked at **33** with zero lock waits/ungranted locks.
The load-window session-check executor mean was **0.313 ms** across 89,384 calls.
Cumulative direct and REST entry/join SELECT means were **140.969/31.500 ms**;
these exclude network and commit time and do not attribute all entry latency.
The 2.03-second p95 entry wait remains a measured limitation, not gameplay latency.
Provider samples peaked at **47,456,268 bytes** memory; aggregate CPU was
**126,477,052 microseconds** across objects. CPU/memory-limit and fatal-internal
errors were zero; all sampled invocation outcomes were successful.

US placed probes: **remote-IAD: p95 input acknowledgement 125 ms, 900 live snapshots; remote-SEA: p95 input acknowledgement 142 ms, 901 live snapshots**. Both ran authenticated movement/fire for 60 seconds,
then a single refund restored balances and temporary probes were deleted.
These are IAD/SEA server probes, not residential/mobile last-mile certification.
Local browser frame times were **13.9 ms median / 20.9 ms p95** on this workstation.
No all-device FPS guarantee, latency rewind or independent anti-aimbot/collusion
certification is claimed. Public cash requires separate competitive review.

## Production backup, migrations and rollback

Production API credentials and service connectivity returned HTTP 200. A distinct
production runtime secret is prepared. Payment credentials were inventoried only.
The unchanged 33,724,330-byte exported-snapshot archive was checksum-verified and
restored again in an isolated local database. The user-approved procedure preserves
all 39 existing orphaned MFA claims in a private restored-only quarantine and
restores all FKs. Source production Auth records and the archive remain unchanged.
All original users, financial rows/sums/settings match; all five migrations passed
again with FPS cash disabled. See `FPS-PRODUCTION-RECOVERY-2026-10-30.md`.

Only these five migrations are selected by the real CLI dry run:

- `20261029192715_fps_ledger_matchmaking.sql`
- `20261029192803_fps_ledger_rpcs.sql`
- `20261030123754_fps_ledger_fk_indexes.sql`
- `20261030152706_fps_live_session_authorization.sql`
- `20261030165225_poker_seat_action_version.sql`

The private CLI workspace uses actual remote historical statements; 35 recorded
entries missing from the checkout were not invented or repaired. Historical source
migrations and remote history stay unchanged.

Rollback baseline: `49556866-a68b-4f64-96ab-f17d918ddae5`.
Nine genuine isolated old/candidate/provider-rollback SSR probes passed, and the
temporary Worker was deleted. The previous version restores its existing FPS 404.
Migrations remain additive/signature-compatible; rollback disables FPS and retains
cash disabled. This was the verified baseline before rollout; its provider version remains available.

## Existing production diagnostics and operational exceptions

Read-only production checks found two October 12 BTCPay withdrawal transactions
with missing provider payout records (1,304 and 1,303 cents). Both transactions
have zero-sum postings; the existing reconciliation diagnostic reports two orphaned
provider flows with net -2,607 cents. They predate FPS, are preserved unchanged,
and are not represented as zero or repaired by this non-financial release.
All existing money invariant booleans pass; player-locked and game escrow are zero
at preflight. This is not certification of every historical payment record.

Alert delivery and incident-response setup were explicitly waived by the user;
alerts are not tested/delivered and no responder is invented. Structured logs do
not replace that waived requirement. The only other approved exception is the
39-row restored-copy Auth quarantine. No dependency waiver is needed.

## Controlled rollout status

The completed rollout applied only the five reviewed migrations and production
runtime/app, then enabled practice with `cash_enabled=false`. Existing financial
settings, routes, cron schedules and secrets are preserved. No staging users,
balances, receipts or runtime checkpoints are transferred. Production smoke verified two real Auth sessions, private zero-stake gameplay/
reconnect, revocation, recovery and zero financial postings.

Private raw evidence, credentials, Auth data and backups remain ignored under
`test-results/`, `.env.*` and `.wrangler/`; they must not be published.

## Production rollout and smoke — completed

[PR #3](https://github.com/Ddenbror97/pvp-arena/pull/3) merged without rewriting
history: `8640328a988ba353ae4263b5c97e8ae6d31443c6`. Only the five reviewed
migrations applied; remote migration count is 298, latest `20261030165225`.

Live app: [FPS practice](https://pvpspinarena.com/fps-duel).
App deployment: `f6b59b96-0ce1-43bb-a68a-2e019a5431e2`.
Runtime deployment: `fadedff7-98a8-418e-b253-4bab0f8e527a`.
Production runtime uses a separate Durable Object namespace. The first immediate
health probe preceded secret-version propagation; the feature stayed closed.
Bounded readiness checks then passed before enabling practice.

Both real Auth QA users completed a private **3–0 BO5**, using production
matchmaking, admission, movement/fire/damage, reload/reconnect and authoritative
result recording. The browser smoke passed in 1.5 minutes without page errors.
Balances remained zero and no QA ledger transaction was created. Production
screenshots are retained privately under `test-results/production-practice-round-*.png`.

A second private practice match verified established-socket logout: close code
**1008 within 262 ms** including the logout request. Both disconnected seats then
recovered to a cancelled terminal result. There were no financial postings.
The two QA accounts were subsequently disabled, all their Auth sessions revoked,
and zero open QA matches, ledger transactions or nonzero QA balances remained.

Postflight verified practice enabled, **FPS cash disabled**, all 31 existing
app secrets preserved (one new FPS secret added), all existing public variables,
both routes and the existing minute cron preserved. Existing financial settings
and every production money-invariant value exactly match the preflight snapshot,
including the two explicitly documented historical provider-flow diagnostics.
No staging balances, receipts, users or checkpoints were copied.

Live-tail monitoring observed 33 app events and 17 runtime events with **zero
exceptions or HTTP 5xx**. Two runtime socket invocations were cancelled during
the deliberate logout/disconnect probe; they were WebSocket paths with no
exceptions. The new production namespace's aggregate analytics query returned
no rows through 2026-10-30T19:43:59.959Z; **no production CPU/memory or zero-error
aggregate inference is made**. The detailed capacity/provider figures above are
from the measured Fresh staging run. Alerts remain explicitly waived.

The rollback baseline still returns HTTP 200 from the provider version API after
rollout. Rollback remains available and would withdraw FPS while retaining the
compatible migrations; FPS must be disabled first. Final status: **GO, deployed
and smoke-verified for controlled practice only**. Public cash and payment
operations require separate authorization.
