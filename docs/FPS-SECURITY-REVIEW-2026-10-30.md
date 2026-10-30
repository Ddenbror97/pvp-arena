# FPS controlled-release security review — 2026-10-30

The intended release permits desktop practice only. Public FPS cash, deposits,
withdrawals and production financial operations are not authorized by this review.

## Session authority and transport

Admission v2 binds the exact Auth session UUID and original JWT expiry. The
service-only RPC checks session ownership, expiry and user bans. Private Auth
lookups are isolated from browser roles, with explicit grants and fixed search
paths. Each simulation decision uses a new database read; no positive lease is
cached. Input sequence watermarks are captured before the read, so a command
arriving after an in-flight authorization read must wait for another read.

Existing connections close on logout/revocation/expiry. Malformed, missing,
duplicate or foreign status rows fail closed. Outages pause simulation and clear
commands; a prolonged outage cancels through the ordinary immutable refund flow.
Replacement connections cannot inherit queued inputs from an older connection.
Close handlers explicitly reciprocate normal close frames without replacing
server-initiated policy close reasons.

The final hosted matrix passed six paid synthetic cases: local logout, global
logout, administrative session deletion, session not-after expiry, an actual
60-second JWT, and a real authorization-service failure. Each retained result
integrity and produced one refund with exact balance restoration. Permanent
unit/integration tests cover the race and malformed-response boundaries.

## UUID dependency remediation

The six inherited findings are fixed. A clean lockfile install and npm audit now
report zero vulnerabilities at every severity. The two vulnerable UUID 9.0.1
copies are removed; SDK and MetaMask utils versions are unchanged.

The fix pins UUID 11.1.1 only beneath the exact verified parents
`@metamask/utils@9.3.0` and `@metamask/utils@11.12.1`. This is intentionally
outside those parents' declared UUID 9.x range. It is a reviewed, version-scoped
compatibility decision, not an unrestricted override or npm audit fix --force.
Other MetaMask packages already use this same patched UUID version.

The [upstream advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq)
and [11.1.1 changelog](https://github.com/uuidjs/uuid/blob/v11.1.1/CHANGELOG.md)
identify the backported buffer-bounds fix. Version 11.1.1 retains both CommonJS
and ESM, unlike later ESM-only releases. Inspection of both installed utils
versions found UUID used only as `uuid.v4()` in their filesystem helper.

Permanent regression tests resolve UUID from both actual MetaMask consumer
contexts, load their real CJS and ESM helpers, check unique v4 paths and the
unchanged deterministic/random-buffer v4 contract, and require v3/v5/v6 to
reject short buffers, negative offsets and overflow without partial writes.
All 14 new cases and the existing 25 wallet cases passed.

The actual browser SDK bundle also initialized its EVM client/provider and
cleanly disconnected in Chromium with analytics disabled. No wallet permissions,
signatures, transactions or external requests were made. That test passed with
zero page errors. The updated lockfile then passed the complete 662-case unit,
397-case database and 19-case browser suites, all six hosted security cases and
the repeated financial, sustained-load and US gameplay checks.

The exact parent-version selectors deliberately require fresh review when the
SDK or utils versions change. This resolves the advisory rather than accepting
its remaining risk; the former dependency waiver is no longer requested.

## Competitive fairness and limits

The runtime is authoritative for movement, shot cadence/ammunition, damage,
hitboxes and result intent. Inputs cannot specify health/damage. Tickets are
one-use, private spectators require authorization, message/connection limits
are enforced, and snapshots omit occluded opponent poses. Tests cover movement,
hits/headshots, crouch/jump geometry, visibility, duplicate input, replacement
connections, settlement races and recovery.

Server latency rewind is not implemented. The measured East/West latency
difference can affect competitive fairness. Browser automation/aim assistance,
collusion and sophisticated third-party anti-cheat assurance are not certified.
These limitations do not authorize public cash; a separate competitive/cash
review is required before enabling it.

## Approved operational exceptions

The user explicitly waived alert delivery and incident-response setup. Delivery
is not verified and structured logs are not represented as delivered alerts.
The user also approved the documented restored-copy quarantine of 39 existing
orphaned Auth MFA claims; source production Auth rows remain unchanged. See the
separate production recovery evidence. No synthetic staging data is transferred
to production by these procedures.
