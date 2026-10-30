# FPS pre-production decision — 2026-10-30

> Historical initial NO-GO report. Remediation and current verification are
> recorded in [the release verification report](FPS-RELEASE-VERIFICATION-2026-10-30.md).
> The original findings below are preserved as the investigation baseline.

**NO GO. Production release stopped.** A hosted test confirmed that an already
admitted game WebSocket continues accepting player input after the corresponding
Supabase Auth session is revoked. Production was not deployed or migrated.
Production financial settings were not changed. The deployed staging build is
preserved for investigation; it must not be described as release-ready.

## 1. Tests executed and counts

- Latest unit run: **625 passed, 0 failed, 0 pending** (`preprod-unit-final.json`).
- Fresh remote staging ledger suite: **12 checks passed**. It covers competing
  joins, immutable result intents, duplicate settlement, rematches, refunds,
  expiry races, posting rollback/recovery, rate limits, ranking and conservation.
- Hosted load/reconnect/refund scenario: **passed**, 12 paid synthetic matches,
  24 automated clients, four reconnects and exactly 12 refund transactions.
- New active-session revocation gate: **FAILED**. Logout returned 204. The old
  access token's HTTP request returned 400 / `SESSION_REVOKED`, while the open
  socket accepted movement/fire input sequence 100 and remained open.
- Full database rerun was **aborted after the security release stop**, not passed.
  Its progress log recorded **177 observed passes, 54 failures and 32 nonexecuted
  cases across 27 reported files**. These are partial progress counts, not a final
  suite total. Failures include slot-bot timeout, jackpot, coinflip, security and
  the historical Phase 2 load test. They require individual triage; not all are
  established production defects. Some historical hosted audit cases target a
  different project and were not run against it without authorization.
- Broad browser reruns were blocked/aborted by the local fixture server's
  dependency-optimizer stalls. A full 19-case browser suite was **not completed**.
  The Linux-specific 8-ball registration fixture also requires a separately
  configured email sink/test project. It is not counted as passed.
- The earlier two-browser BO5, six bot rounds, heads, grip, walking and runtime
  restart checks remain prior-run evidence. They were **not all repeated
  successfully in this release attempt** and do not close the gates above.

Raw evidence lives in ignored `test-results/preprod-*`; it must not be published
indiscriminately because database dumps, traces and logs can contain private data.

## 2. Stress results and verified concurrency

The successful hosted run lasted 45 seconds after setup: **12 simultaneous
matches / 24 automated identities**, with 28 total socket admissions including
four reconnects. It is neither 24 human testers nor a maximum capacity estimate.

- Entry creation: 12 samples, p50 **1,274.03 ms**, p95 **1,294.93 ms**.
- Join: 12 samples, p50 **429.70 ms**, p95 **545.08 ms**.
- Socket admission: 28 samples, p50 **217.40 ms**, p95 **279.79 ms**.
- Input acknowledgement: 16,910 samples, p50 **146.92 ms**, p95 **201.41 ms**.
- Snapshot gaps: 19,206 samples, p50 **37.24 ms**, p95 **70.39 ms**.
- Reconnect to snapshot: four samples, p50 **249.19 ms**, p95 **249.34 ms**.
- Sent 28,638 inputs; deliberately discarded 1,508 input messages. Half the
  clients delayed sends by 100–200 ms and discarded every tenth input. Ack timing
  starts when a message is actually sent, so it excludes the injected send delay.

This is application-level impairment over WebSockets/TCP, not measured IP packet
loss, mobile disruption or a realistic regional last mile. Socket/room CPU and
memory limits were not established. Entry creation was the slowest observed
admission step; SQL span and lock-wait profiling is needed before attributing
that delay to a particular query or claiming higher capacity.

## 3. US regional measurements

Temporary authenticated, read-only Cloudflare probes requested US East and West
placement and were deleted afterward. Each completed ten sequential samples per
endpoint, all HTTP 200. Samples are server-to-server, not US player gameplay.

- East hint: egress trace **IAD**, ingress **GIG**; `cf-placement` header absent.
  Runtime health p50/p95 **27/150 ms**; database REST **72/220 ms**; app SSR
  **59/832 ms**. Egress is evidence of US routing, not an independently confirmed
  execution placement header.
- West hint: placement **remote-SEA**, egress **SEA**, ingress **GIG**.
  Runtime health p50/p95 **5/55 ms**; database REST **78/296 ms**; app SSR
  **20/354 ms**.

With only ten samples, the reported nearest-rank p95 is the largest observation.
Cold starts are included. REST duration includes routing, PostgREST and database
work; it is not a pure SQL execution time. US residential/mobile matchmaking,
in-game jitter and actual packet loss remain unverified.

## 4. Security and dependencies

The decisive blocker is **revoked-session control of an established WebSocket**.
Evidence: `preprod-active-session-revocation.json`, zero-stake match
`d310b8e9-8fdf-49a8-98ec-d9144dd3c4d1`. Admission carries player identity and a
short-lived ticket, but the running connection is not bound to a subsequently
revocable Auth session. HTTP revocation does not close this gap. The original
runtime and ticket handling must be fixed and regression-tested, including
expiration, revocation, reconnects, active paid synthetic matches, and failure of
the revocation-check dependency. No authentication-protocol fix is claimed here.

Latest npm audit: **0 critical, 0 high, 6 moderate**. All six are propagation of
the UUID advisory through the existing MetaMask chain:

1. `@metamask/connect-evm` 2.1.1: direct SDK; latest checked version is still
   2.1.1. No compatible top-level update removing the chain was demonstrated.
2. `@metamask/connect-multichain` 1.2.0: transitive propagation through utils,
   RPC errors and the mobile client; a safe chain-wide update is not established.
3. `@metamask/mobile-wallet-protocol-dapp-client` 0.3.0: includes older utils 9.3.0.
   Its parent dependency constraints must be reviewed before replacement.
4. `@metamask/rpc-errors` 7.0.3: inherits the utils finding; no direct vulnerable
   UUID buffer call was identified in the inspected application path.
5. `@metamask/utils` 11.12.1 and nested 9.3.0: inspected UUID usage was `v4()` in
   a Node filesystem temporary-directory helper. No reachable browser/server
   `v3/v5/v6` call with attacker-controlled output buffers was identified.
   Latest utils 12.0.1 is a major update outside the current parent constraints.
6. `uuid` 9.0.1: the underlying finding affects output-buffer bounds in
   `v3/v5/v6`. Patched UUID releases exist, but forcing a major transitive override
   solely to clear the audit was not justified. See the
   [maintainer advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).

Reachability review reduces the assessed exposure; it is not a formal residual-risk
acceptance. No forced MetaMask/UUID upgrade was applied. The compatible Rolldown
pin was corrected from 1.2.1 to Vite 8.3.5's required 1.2.14; this alone did not
resolve the local browser fixture stalls.

## 5. Alerts and monitoring

Alert delivery was **not tested**, following the user's "pass this" response.
There is no claimed verification of server-failure, ledger, settlement or payment
alerts, or of a staffed monitoring dashboard. Existing structured runtime logs
are not equivalent to delivered alerts. This gate remains open.

## 6. Database, ledger and recovery

Staging remains `rymzkgqoekjluzmzstap` with all 304 repository migrations. Database
cron jobs stay disabled to isolate historical production URLs; the separate
deployed FPS recovery cron remains installed. Deposits/withdrawals are disabled
there, and all funding is synthetic with balanced custody postings and receipts.

After all hosted tests: **zero open FPS rooms, zero locked balances, zero orphaned
flows**, posting sum zero and all money-domain invariants true. The revocation
test room is `CANCELLED` with its result recorded. No synthetic funds were moved
to production. Real payment rails were not exercised.

The first local migration fixture failed on CRLF-sensitive historical patches;
normalizing only fixture input fixed that. Explicit migration transactions then
required reserving one pool connection; the shared test helper and its callers
were updated, and the wallet suite subsequently passed. This is not permission
to ignore later test failures or to rewrite historical migration files.

A **1,885,521-byte synthetic staging public+auth logical backup** was restored
to an isolated local PG18 database. The first restore reported the pre-existing
default `public` schema; a fresh restore target with that default removed then
restored with **zero errors**. The restored data had 324 ledger transactions,
40 synthetic Auth users, 2,504 constraints, and all accounting invariants true.
This validates that logical subset, not a complete vendor/PITR disaster recovery
or a production backup. The isolated local test cluster was stopped after abort.

## 7. Production deployment status

**Not deployed.** Production project `dkyabirifoixnfbmheay` was queried read-only:
it is healthy in US East 2, latest migration `20261029180000`, and has neither
`fps_config` nor `fps_matches`. No production migration or financial-setting
change was made. Production environment secrets, service connectivity, payment
dependencies and monitoring have not been certified by this attempt. The FPS
architecture uses Durable Objects and Postgres; Redis is not a required FPS
service identified in the code.

Git base HEAD: `02f2d321fbce640b2ff56f98b367e0d83c837e33`, branch `codex/fps-duel`.
There are uncommitted changes. That HEAD is **not** a commit containing all the
tested changes. No exact release commit has been approved or published, and no
new production rollout or production smoke test is claimed.

The final local candidate build and both TypeScript projects pass. Its public
artifact scan found no supplied secrets in 1,465 files. This does not override
the security and test failures. For identifying this **unreleased** build:

- Server entrypoint SHA-256:
  `da8aa34a4d9dbe1cd2fa2e734828c9595751aa028e09b408621078bc16abb5af`.
- Package lock SHA-256:
  `8784c2b79066d492d9546f8cc8fbedcfc6c3b9f2efae0f640a937565466916fa`.

The server-entry hash identifies that file, not a combined checksum of every asset.

## 8. Outstanding bugs and risks

- Confirmed established-WebSocket session-revocation defect.
- 54 observed broad database test failures, plus nonexecuted/aborted cases.
- Local browser fixture server stalls; full browser coverage not completed.
- Historical Linux-only/other-project test fixtures need safe, portable setup.
- US end-user latency, loss, sustained regional gameplay and peak capacity unverified.
- Alert delivery, production secrets and full production restore readiness unverified.
- Six moderate dependency findings await formal review; latency rewind and broader
  competitive anti-cheat coverage remain existing cash-launch limitations.

## 9. Rollback readiness

Cloudflare production deployment history is available. Latest listed version was
`49556866-a68b-4f64-96ab-f17d918ddae5` (2026-10-29 19:20:29Z), preceded by
`c14fd435-cea9-47b7-ac18-66025fef6e1c`. Availability in history does not establish
either as a formally approved stable rollback. No production rollback was invoked,
and no verified production backup or restoration rehearsal is claimed. A release
must record the approved previous version, migration compatibility and recovery
procedure before any rollout.

## 10. Requirements before another release / public cash

First fix and prove active-session revocation and expiration for established
connections. Then triage every failed/skipped/aborted suite and rerun complete
unit, integration, financial and hosted browser coverage against a frozen
candidate. Verify US end-user behavior and a stated peak-concurrency target;
review profiling, failure recovery and anti-cheat fairness. Verify real alert
delivery, production configuration, migrations, a production backup and restore,
and a tested rollback. Record exact commit/build identifiers and risk approvals.

Only after controlled-release gates pass may a disabled-cash production rollout
proceed. Public cash, deposits, withdrawals and financial operations still require
**separate explicit authorization** and must never inherit synthetic staging data.
