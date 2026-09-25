# Backend audit and hardening pass (backend only)

Follows your spec (sections 1–28) in the order investigate → measure → document → optimize → test → verify. There are no screen changes and no changes to game rules, payouts, fairness or wallet economics. Balances and deposits stay as they are, no USDC moves, and the live money settings stay as they are.

## Execution rules (from your approval)
- The audit never changes live game, wallet, ledger or settlement data. EXPLAIN ANALYZE runs only on read queries against live data. Write paths get plain EXPLAIN (no execution) or a disposable test-schema transaction.
- Every index change, cleanup and schema optimization is reversible: each migration comes with its rollback SQL, recorded in the report.
- An index is dropped only if it is demonstrably redundant (covered by another index or constraint). Being unused in the stats is not enough.
- Financial checks are strictly read-only. There are no automatic balance or ledger repairs. Any discrepancy stops the process and is reported as a blocking finding.

## Phase 1 — Inventory and measurement (read-only)
- Full catalog dump: tables, columns, constraints, defaults, triggers, functions (including security-definer), RLS policies, grants, enums, sequences, indexes, extensions, views, realtime publication, storage, cron jobs.
- Dependency maps: page → server function/RPC → DB function → tables; cron → worker → DB function → tables; realtime → table → page listeners. Built by scanning `src/` and `supabase/migrations/`.
- Measurements: slow-query stats (pg_stat_statements), index usage and unused indexes, table sizes and growth, sequential-scan hot spots, EXPLAIN ANALYZE on the top Jackpot, Coinflip and Roulette queries, wallet queries and cron-worker queries, plus cron run frequency and cost (including the 1-second Roulette worker).
- Flag unused, duplicate or legacy objects, such as the retired test-credit functions and old overloads (for example the crypto_* functions without a chain parameter). Nothing gets deleted in this phase.

## Phase 2 — Findings report
Write `/mnt/documents/backend-audit-report.md`, covering sections A–L of your spec. Each finding gets a severity (critical / high / medium / low), evidence, and a proposed fix.

## Phase 3 — Fixes (evidence-backed only)
- Correctness/security first: known open item `coinflip_join` real-play check (re-verify), any RLS/grant gaps, SECURITY DEFINER functions missing `search_path`.
- Performance: add indexes only where EXPLAIN shows a real scan on a hot path, and drop indexes that are unused and redundant. Before and after numbers are recorded for each one.
- Retention: propose pruning for high-growth, non-financial tables (chat presence, tick gates, job runs, auth events). Financial and audit history is never deleted.
- Cleanup: remove a dead object only after its dependencies are confirmed zero, and in its own migration.
- Each change is one small migration and portable (no hosted-only assumptions).

## Phase 4 — Tests and verification
- A regression test for every change, added to the existing DB test suite.
- Full suite runs in the background, sequentially. Security scan and linter re-run.
- Live checks: every ledger transaction balances, every balance matches its history, and real-money totals are unchanged.

## Phase 5 — Self-hosted migration report and release gate
Portability notes (pg_cron, pg_net, realtime, auth hooks, secrets, the Resend sender, worker endpoints) and a final verdict: PASS, PASS WITH CONDITIONS or DO NOT RELEASE.

## Technical notes
- Scale testing is analysis plus the existing 200-bet concurrency test only. It will be labelled theoretical where that's the case.
- The live DB has little data, so the measurements are indicative. The report will say so.
- This is a large pass and may take several turns. Each phase ends with a short progress note.
