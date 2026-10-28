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

## 4. What was not changed

- Worker bundle and Cloudflare deploy. `npm run build` succeeded. The server output is 9.1 MB and contains `@jsquash/webp` only. Jpeg and png were not in the bundle before this removal, so the upload size does not move.
- Wallet balances, ledger rows, game rows.
- Retention windows (12 hours for successful one-second cron runs, 7 days for failed runs and roulette lifecycle audit rows).
- Indexes, despite the bloated cron primary key. No `idx_scan` evidence survived the restart, and there is no staging project to rehearse `REINDEX`.

## 5. Checks

Production, after 15:52:30 UTC through about 16:05 UTC: 7 postgres log events, 0 cron lines, 0 error or warning lines.

Cron runs with `start_time >= 2026-10-28 15:51:43+00`, all `succeeded`:

| Job | Runs | Last start (UTC) |
|---|---:|---|
| `pvp-coinflip-worker` | 554 | 16:01:06 |
| `pvp-slot-worker` | 553 | 16:01:06 |
| `pvp-roulette-worker` | 553 | 16:01:06 |
| `pvp-jackpot-worker` | 554 | 16:01:06 |
| `pvp-minute-dispatch` | 10 | 16:01:00 |
| `pvp-crypto-reconcile` | 1 | 16:00:00 |
| `pvp-integrity-check` | 1 | 16:00:00 |
| `pvp-settlement-health` | 1 | 15:53:00 |
| `pvp-cron-history-retention` | 0 | next slot 16:17 |
| `pvp-roulette-integrity` | 0 | next slot 16:30 |
| `pvp-ops-retention` | 0 | next slot 16:41 |

The three with zero post-restart runs are hourly. They were active, and their 15:17, 15:30, and 15:41 runs succeeded before the restart. Open money state at the same check: one roulette round in `BETTING`. No in-flight withdrawal or deposit.

Repository:

| Check | Result |
|---|---|
| `tsc --noEmit` | Fails on `main` already: `PoolLobby.tsx`, `PoolMatch.tsx` (`exactOptionalPropertyTypes`), and `turnstile.server.ts` (`NODE_ENV` index signature). This branch does not touch those files. |
| `npm run lint` | Fails on `main` already: 2,106 problems, almost all `prettier/prettier`, including files this branch does not touch. |
| `vitest run --project unit` | 501 passed, 1 failed. `tests/pool-view.test.ts` expects `closest(".pool-screen")` in `PoolTable.tsx`. That string is not in the file on `main`. |
| `npm run build` | Passed. |
| Database integration tests | Not run. This machine has the Postgres client only, `TEST_DATABASE_URL` is unset, and the staging project has been removed. These tests refuse the production database. |

## Verdict for deploying this branch

**GO** for the code diff: it deletes an unreferenced helper and two unused packages. It does not change a request path.

**NO-GO** for any further database delete, retention shortening, or index rebuild until staging exists and the cron primary-key `REINDEX` is rehearsed. The logging change is already in production and does not ride on this branch.
