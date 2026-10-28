# Production cleanup apply — 28 Oct 2026

Follow-up to `docs/CLEANUP-AUDIT-2026-10-28.md`. The PostgreSQL logging change is live on `dkyabirifoixnfbmheay`. The code diff does not deploy a Worker and does not change game, wallet, or settlement behavior.

Times below are UTC unless noted. BRT is UTC−3.

## 1. Logging fix

Staging project `ljpqxsndqywbndnpitja` returns `404 Resource has been removed`. The account has one project, production `dkyabirifoixnfbmheay`. The change was not rehearsed on a second project.

Supported mechanism, from the Supabase Management API for custom Postgres config (`cron.log_statement` is a postmaster GUC):

```
PUT /v1/projects/dkyabirifoixnfbmheay/config/database/postgres
{"cron.log_statement": false, "restart_database": true}
```

The call returned HTTP 200 with `{"cron.log_statement": false}`. Postgres came back at `2026-10-28 15:51:43 UTC` (12:51 BRT). Recovery logged a fast shutdown (`database system was not properly shut down`) and then `database system is ready to accept connections` and `pg_cron scheduler started`.

Confirmed from `pg_settings` after the restart:

| Setting | Value | pending_restart |
|---|---|---|
| `cron.log_statement` | off | false |
| `cron.log_run` | on | false |

`cron.job_run_details` kept receiving rows. In the first minutes after 15:51:43 UTC the four one-second workers each recorded about 140 succeeded runs and zero failures. `pvp-minute-dispatch` and `pvp-settlement-health` also succeeded. No withdrawal was `PENDING`, `HELD`, `APPROVED`, `SUBMITTING`, or `SUBMITTED`. No deposit was `DETECTED` or `CONFIRMED`. One roulette round was `SPINNING` and one pool match was `WAITING`, which is ordinary open state, not a stuck settlement.

### Log volume

Postgres log events, `event_message` text, same query on both sides of 15:51:43 UTC. The before window is 15:45:00–15:51:43 (about 6.7 minutes). The after window in this sample ends about 15:56.

| Window | Events | Cron start/complete lines | event_message bytes |
|---|---:|---:|---:|
| Before | 2,598 | 2,434 | 105,478 |
| After | 17 | 0 | 1,167 |

The 17 after-restart lines are startup, recovery, and realtime logical decoding. None are `cron job N starting` or `completed`. The prior 24-hour audit counted 711,764 of those lines (99.9% of postgres_logs). At the pre-restart rate that is about 6 cron log lines a second. They stopped.

Rollback, which restarts Postgres again:

```
PUT /v1/projects/dkyabirifoixnfbmheay/config/database/postgres
{"cron.log_statement": true, "restart_database": true}
```

Do not roll back while a withdrawal is `SUBMITTING` or a deposit is uncredited. The statement is also in `scripts/audit/cron-log-statement.sql`. It is not a migration.

## 2. Database retention

No rows were deleted by this pass. No index was rebuilt. Staging is gone, so a new retention migration was not applied to production.

| Relation | Total bytes | What it is |
|---|---:|---|
| `cron.job_run_details` | 88,219,648 | ~182k rows. Hourly `pvp-cron-history-retention` deleted 14,242–14,244 rows on each of the last three hours. The primary key alone is 56,156,160 bytes. A btree on ~182k `bigint` keys should be a few megabytes. The extra size is index bloat from insert-and-delete churn, not extra history. |
| `public.roulette_games` | 56,287,232 | 94,153 games from 2026-09-24 through the restart. Fairness history. Kept. |
| `public.audit_logs` | 51,978,240 | 85,172 of the rows are the four roulette lifecycle actions, oldest 2026-10-21, which is the 7-day window in `ops_retention()`. Money, promo, and security actions are older and were not expired. `pvp-ops-retention` succeeded at 13:41, 14:41, and 15:41 UTC. |

`pg_database_size` after restart: 395,144,339 bytes (about 377 MiB). Connections: 24, with 3 active.

Next action for the cron index, when a staging database exists again: `REINDEX INDEX CONCURRENTLY cron.job_run_details_pkey`. That rewrites the index. It does not delete run history. It was not run here.

## 3. Code removed

Importer scan of `src/**/*.ts` and `src/**/*.tsx`, excluding routes, the generated route tree, and guide content. One file had no importer and no string reference:

- `src/integrations/supabase/cron-auth.ts` — generated `authenticateCronRequest` for `LOVABLE_CRON_SECRET`. Live cron HTTP routes authenticate with the job token in `src/lib/crypto/jobs.server.ts` and `src/lib/pool/stand-in.server.ts`.

Dependencies with no import anywhere in source:

- `@jsquash/jpeg`
- `@jsquash/png`

Avatar upload uses `@jsquash/webp` only. `package.json`, `package-lock.json`, and `bun.lock` were updated. `npm audit fix` was not run.

Nothing else in `src` was unused under that scan. Guide pages, NowPayments IPN (`nowpaymentsIpnGone`), ledger tables, and historical migrations stay. Game math was not edited.

`supabase/migrations/20261028180000_admin_live_finite_age.sql` rewrites `admin_ops_query` so a `worker_tick_gate` row still at `-infinity` contributes a null age instead of failing the live view. Production gates were all finite at 13:44 BRT, so the live payload does not change until a worker has never ticked. This migration was checked on isolated Postgres and was not applied to production.

## 4. What was not changed

- Worker bundle and Cloudflare deploy. `npm run build` succeeded. The server output is 9.1 MB and contains `@jsquash/webp` only. Jpeg and png were not in the bundle before this removal, so the upload size does not move.
- Wallet balances, ledger rows, game rows.
- Retention windows (12 hours for successful one-second cron runs, 7 days for failed runs and roulette lifecycle audit rows).
- Indexes, despite the bloated cron primary key. No `idx_scan` evidence survived the restart, and there is no staging project to rehearse `REINDEX`.

## 5. Checks

At 16:42 UTC, about 50 minutes after the restart: `cron.log_statement` still `off`, `cron.log_run` still `on`, postmaster start still `15:51:43 UTC`, 23 connections.

Every cron job has at least one succeeded run since the restart, and none failed:

| Job | Runs since restart | Last start (UTC) |
|---|---:|---|
| `pvp-coinflip-worker` | 2,972 | 16:42:01 |
| `pvp-jackpot-worker` | 2,972 | 16:42:01 |
| `pvp-roulette-worker` | 2,971 | 16:42:01 |
| `pvp-slot-worker` | 2,971 | 16:42:01 |
| `pvp-minute-dispatch` | 51 | 16:42:00 |
| `pvp-settlement-health` | 4 | 16:38:00 |
| `pvp-crypto-reconcile` | 3 | 16:30:00 |
| `pvp-integrity-check` | 1 | 16:00:00 |
| `pvp-cron-history-retention` | 1 | 16:17:00 (`DELETE 14252`) |
| `pvp-roulette-integrity` | 1 | 16:30:00 |
| `pvp-ops-retention` | 1 | 16:41:00 |

Postgres logs from 16:30 to 16:42 UTC: 51 events, 0 lines matching `cron job`, 0 lines matching error, fatal, or warning. The lines are checkpoints and `permission denied` from the anonymous RLS probe below. That probe is supposed to be denied.

Open money state just after the restart was one roulette round in `BETTING`. No withdrawal was in `PENDING`, `HELD`, `APPROVED`, `SUBMITTING`, or `SUBMITTED`. No deposit was `DETECTED` or `CONFIRMED`.

Repository, on an isolated Postgres 16 (not production):

| Check | Result |
|---|---|
| `tsc --noEmit` | Passed after optional props accept `undefined` and Turnstile reads `process.env["NODE_ENV"]`. |
| `npm run lint` | Still fails on `main`: 2,106 problems, almost all `prettier/prettier`, in files this change does not reformat. |
| `vitest run --project unit` | 502 passed. The pool cue test now expects `closest(".pool-screen, .pool-stage")`, which is the host the lobby stage and the match screen both use. |
| `vitest run --project db` | 367 passed, 11 skipped, 1 failed before the age fix. `admin_ops_query('live')` subtracted `clock_timestamp()` from `worker_tick_gate.last_run_at`, and that column defaults to `-infinity` until the first tick. Postgres refuses that subtraction, and the handler reported `ADMIN_UNAVAILABLE`. `20261028180000_admin_live_finite_age.sql` leaves the age null for a non-finite timestamp. `tests/db/perf-hot-paths.integration.test.ts` then passed. The migration is in this branch and was not applied to production. |
| Anonymous API RLS (`tests/db/rls.integration.test.ts`) | 9 passed against the configured project. Reads of wallet, ledger, audit, and secrets came back empty. No money was moved. |
| `npm run build` | Passed. Server output 9.1 MB. The bundle contains `@jsquash/webp` and does not contain jpeg or png codecs. |

## Verdict for deploying this branch

**GO** to merge this branch, including `20261028180000_admin_live_finite_age.sql`. Typecheck and the unit suite pass. The migration only changes the age of a worker that has never ticked. It does not delete rows or change settlement.

**NO-GO** for a database delete, a shorter retention window, or `REINDEX INDEX CONCURRENTLY cron.job_run_details_pkey` until a staging database exists. The logging change is already in production and does not ride on this branch. The finite-age migration has not been applied to production.

## 6. Confirmation at 17:19 BRT

Checked again at 2026-10-28 20:19:23 UTC (17:19 BRT). No second restart was issued. `pg_postmaster_start_time()` is still `2026-10-28 15:51:43 UTC` (12:51 BRT).

| Setting | Value | pending_restart | source |
|---|---|---|---|
| `cron.log_statement` | off | false | configuration file |
| `cron.log_run` | on | false | default |

The Management API config read is `{"cron.log_statement": false}`. The setting is the running value, not a value waiting for a restart.

Postgres log events (`source = 'postgres_logs'`), same aggregation on both sides. The before window is 15:45:00–15:51:43 UTC (12:45–12:51 BRT, 403 seconds). The matched after window is 20:12:17–20:19:00 UTC (17:12–17:19 BRT, 403 seconds).

| Window | Events | Cron start/complete lines | event_message bytes | error / fatal / warning |
|---|---:|---:|---:|---:|
| Before, 403s | 2,646 | 2,482 | 107,410 | 0 |
| After, 403s | 7 | 0 | 805 | 0 |
| After, 19:20–20:20 UTC | 28 | 0 | 3,690 | 0 |

That is 6.57 postgres log events per second before the restart and 0.0078 per second in the later hour, about a 99.9% drop. The cron lines are gone. The 28 lines in that hour are checkpoints and realtime logical decoding.

The last 8,000 `cron.job_run_details` rows, 19:45:43–20:19:23 UTC, contain 0 failures. All 11 jobs are active. Each has succeeded since the restart, and the newest run of every one-second worker was at 20:19:24 UTC. `worker_tick_gate` ages at that moment were 1 second for roulette, jackpot, coinflip, and slot. `pvp-cron-history-retention` succeeded at 20:17 UTC with `DELETE 14250`, so run history is still being trimmed and `cron.log_run` is still recording rows.

No withdrawal was `PENDING`, `HELD`, `APPROVED`, `SUBMITTING`, or `SUBMITTED`. No deposit was `DETECTED` or `CONFIRMED`. `ledger_postings` sum to 0 across 15,888 rows. Wallet balances match the ledger (0 mismatches). No player wallet is negative. `money_real_invariants()` returned `ok_postings_zero`, `ok_custody_equals_liabilities`, and `ok_custody_equals_flows`. `settlement_retry` is empty. No roulette, coinflip, slot, or jackpot row is in a settlement status. One roulette round is `BETTING`. One pool match is `WAITING`. Jackpot 198 has one player and a pot of 100; the entry is from 15:07 UTC and the solo refund wait is 24 hours, so it is inside the normal wait. Nine older jackpot rows are `CANCELLED` with `completed_at` null; the newest of those is 2026-10-23.

`net._http_response` for the prior 30 minutes was HTTP 200 only: withdrawals, sweeps, and deposits all returned `ok: true`. The request queue was empty. Auth health returned 200, GoTrue v2.197.0. PostgREST, pg_cron, pg_net, and realtime were connected. Public tables: 160 of 160 have RLS. Policies using `user_metadata`: 0.

Log-ingestion billing was not readable. `GET /v1/projects/{ref}/billing/usage` and the organization usage routes returned 404. The billing-period quota is not reset by this note.

Remaining log volume in that same hour is API access lines, not cron statements: `edge_logs` 2,714 events (347,510 bytes), then realtime 12, auth 4, pgbouncer 3, and auth audit 2. The edge lines are `POST/GET/PATCH` responses from `dkyabirifoixnfbmheay.supabase.co`.

Checks run after this read:

| Check | Result |
|---|---|
| `tsc --noEmit` on this branch | Passed after `scripts/emit-guide-assets.ts` wrote the gitignored catalog. |
| `vitest run --project unit` on the pool checkout | 504 passed. |
| `npm run build` on the pool checkout | Passed. |
| `vitest run --project db` on the pool checkout, which does not contain the age migration | 367 passed, 11 skipped, 1 failed. The failure is still `admin_ops_query('live')` on a fresh schema whose tick gate is `-infinity`. |
| `tests/db/perf-hot-paths.integration.test.ts` on this branch | Passed. |
| `tests/db/realmoney.integration.test.ts` | 14 passed, including one-settlement idempotency for jackpot and roulette. |
| `tests/db/phase3-audit.integration.test.ts` | 2 passed, 5 skipped. The skipped cases target the old hosted test project, which is not this account. |
| `tests/db/rls.integration.test.ts` | 9 passed against production as the anonymous key. No money was moved. |

## Verdict

**GO** for the logging change. It is applied, the 12:51 BRT restart is still the running postmaster, the 11 jobs are succeeding, cron statement lines are gone, and ledger, deposits, withdrawals, and the four game workers are healthy.

**NO-GO** for a database delete, a shorter retention window, `REINDEX INDEX CONCURRENTLY cron.job_run_details_pkey`, or applying `20261028180000_admin_live_finite_age.sql` from this confirmation. Production tick gates are finite, so the live admin view is not hitting the fresh-schema crash. That migration stays in the branch until it ships with the branch.
