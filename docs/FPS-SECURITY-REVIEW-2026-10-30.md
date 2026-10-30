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

## Six remaining moderate dependency findings

The latest audit reports zero critical/high and six moderate findings, all from
one inherited UUID advisory chain:

- `@metamask/connect-evm` 2.1.1: direct SDK; latest published version checked.
- `@metamask/connect-multichain` 1.2.0: inherits mobile/RPC/utils findings.
- `@metamask/mobile-wallet-protocol-dapp-client` 0.3.0: includes utils 9.3.0.
- `@metamask/rpc-errors` 7.0.3: inherits utils.
- `@metamask/utils` 11.12.1 and nested 9.3.0: inherit UUID 9.0.1.
- `uuid` 9.0.1: lacks output-buffer bounds checks in v3/v5/v6.

The [maintainer advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq)
identifies caller-provided buffers/offsets in v3/v5/v6; v4 checks its bounds. The
inspected installed MetaMask utils code references UUID through `v4()` in its
Node filesystem helper. No affected v3/v5/v6 buffer call was found in the
application or inspected MetaMask paths. FPS simulation/admission use native
Web Crypto and do not import the MetaMask SDK.

This is bounded reachability review, not a claim that the package graph has no
vulnerable code. An uninspected or future caller could expose the affected API.
The latest utils 12.0.1 is outside the installed 11.x/9.x dependency contracts;
the latest direct SDK still inherits the older contracts. No compatible normal
update removes the complete chain. No forced major UUID/MetaMask override or
`npm audit fix --force` was applied. Recheck on SDK updates and before public
cash authorization. Acceptance of this residual risk is pending user approval.

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
