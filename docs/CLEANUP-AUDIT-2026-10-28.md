# Production cleanup audit — 28 Oct 2026

The logging change described below was applied later the same day. The outcome, the code removals, and the tests are in `docs/CLEANUP-APPLY-2026-10-28.md`. This file is the measurement that justified the change. It is kept as written.

Read-only inspection of pvpspinarena.com (`dkyabirifoixnfbmheay`) and this repository. No production data was written. No migration was applied. No Worker was deployed. No game, wallet, or security behavior was changed.

Log window: 27 Oct 2026 12:40 BRT through 28 Oct 2026 12:40 BRT. Database sizes were read at about 12:46 BRT the same day.

## Verdict

**NO-GO** for a production change from this pass.

The included log-ingestion quota is being used by `pg_cron` itself. Four game workers each run every second, and each run writes two Postgres log lines. Turning that off is `cron.log_statement = off`. That setting is `PGC_POSTMASTER` in current pg_cron, so it takes effect only after a Postgres restart. `cron.log_run` stays `on`, so `cron.job_run_details` still records every run, including failures.

That restart is a production infrastructure change. It is not applied here.

## Log ingestion

Measured event counts and `event_message` bytes. This is the text of each log line. It is not the billed ingestion figure from the Supabase usage page. The 2.33 GB figure was supplied with this task and was not re-read from a billing API (`GET /v1/projects/{ref}/usage` returned 404).

| Source | Events / 24h | event_message bytes |
|---|---:|---:|
| postgres_logs | 712,655 | 28,788,241 |
| edge_logs | 79,842 | 11,363,517 |
| realtime_logs | 312 | 30,619 |
| pgbouncer_logs | 124 | 13,871 |
| auth_logs | 102 | 35,533 |
| postgrest_logs | 67 | 5,560 |
| auth_audit_logs | 37 | 20,236 |
| storage_logs | 11 | 2,107 |

Postgres breakdown for the same 24 hours:

| Kind | Events | event_message bytes |
|---|---:|---:|
| `cron job N starting:` | 355,883 | 18,074,417 |
| `cron job N completed:` / `COMMAND completed:` | 355,881 | 10,584,379 |
| everything else | 891 | 129,445 |

Cron start and complete lines are 711,764 of 712,655 Postgres events (99.9%) and 28,658,796 of 28,788,241 message bytes (99.6%).

One hour of those lines (28 Oct 2026 11:40–12:40 BRT) named the jobs:

| Job | Schedule | Sample line |
|---|---|---|
| `pvp-jackpot-worker` (job 22) | 1 second | `select public.jackpot_tick()` |
| `pvp-roulette-worker` (job 1) | 1 second | `select public.roulette_tick()` |
| `pvp-slot-worker` (job 13) | 1 second | `call public.slot_tick_worker()` |
| `pvp-coinflip-worker` (job 21) | 1 second | `select public.coinflip_tick()` |
| `pvp-minute-dispatch` (job 19) | every minute | about 100 lines in that hour |

Application `console.log` in the Cloudflare Worker does not appear in this stream. Silencing Worker logs would not move this quota.

### Why the lines exist

Production settings, read from `pg_settings`:

| Setting | Value |
|---|---|
| `log_min_messages` | warning |
| `log_statement` | ddl |
| `log_min_duration_statement` | -1 (duration logging off) |
| `cron.log_statement` | on |
| `cron.log_run` | on |
| `cron.log_min_messages` | warning |

`cron.log_statement` forces a LOG line when a job starts and when it finishes, including when `log_min_messages` is warning. In pg_cron those `ereport(LOG)` calls are wrapped in `if (CronLogStatement)`. The GUC context is `PGC_POSTMASTER`.

`cron.log_run = on` is separate. It writes `cron.job_run_details`. Failed runs are already kept 7 days. Successful runs of the one-second jobs are kept 12 hours (`20261015010000_cron_history_retention.sql`). That table is the stall-investigation record. It does not depend on `cron.log_statement`.

Function `RAISE WARNING` paths (integrity incidents, settlement failures) still pass `log_min_messages = warning` after `cron.log_statement` is off.

### Proposed change, not applied

```sql
alter database postgres set cron.log_statement = off;
-- takes effect after a Postgres restart
-- rollback, also after a restart:
-- alter database postgres set cron.log_statement = on;
```

Do not put this in `supabase/migrations`. A later `db push` would aim it at production. The statement is also saved at `scripts/audit/cron-log-statement.sql` with the same warning.

After a restart, confirm with one more 24-hour log query that `cron job % starting` events drop and that `cron.job_run_details` still receives new rows. Do not claim the 1 GB quota is met until the usage page shows it.

Edge logs are the second source: 79,842 events and 11.4 MB of message text in 24 hours. In the same one-hour sample the busiest paths were `btcpay_invoices`, `rpc/pool_lobby`, `crypto_verify_job_token`, `crypto_run_gate`, and the live game tables. Those are real reads from deposit polling and open games. They were left in place.

## Database

`pg_database_size` was 396,922,003 bytes (about 379 MiB). The task described 209 MB. This audit did not find a second measurement that reconciles the two figures.

Largest relations:

| Relation | Bytes |
|---|---:|
| `cron.job_run_details` | 88,219,648 |
| `public.roulette_games` | 56,279,040 |
| `public.audit_logs` | 51,978,240 |
| `public.roulette_results` | 25,509,888 |
| `public.roulette_game_secrets` | 9,379,840 |
| `public.crypto_price_snapshots` | 4,505,600 |
| `public.ledger_postings` | 3,555,328 |
| `public.ledger_transactions` | 2,752,512 |

`cron.job_run_details` is operational history with an hourly purge already installed. Shortening the 12-hour window would shrink that table and would also shorten the stall record. Not changed.

Ledger, roulette history, and `audit_logs` stay. No vacuum, reindex, or retention change was run. No `EXPLAIN` was run against production.

Active `cron.job` rows: the four one-second workers above, plus `pvp-minute-dispatch`, `pvp-cron-history-retention`, `pvp-crypto-reconcile`, `pvp-integrity-check`, `pvp-ops-retention`, `pvp-roulette-integrity`, and `pvp-settlement-health`. No duplicate job name was scheduled twice. The latest `pvp_minute_dispatch` (migration `20261019020000`) calls crypto withdrawals, deposits, sweeps, and the leaderboard. It does not call the one-second game ticks.

## Repository

Counted on this branch before any cleanup edit. Generated guide content is included in `src`.

| Tree | Files | Lines |
|---|---:|---:|
| `src` | 1,536 | 307,673 |
| `supabase` | 294 | 50,812 |
| `tests` | 104 | 25,441 |
| `scripts` | 14 | 8,678 |

No source file was deleted. Static “unused” reports were not used as a deletion list. Historical migrations were not rewritten. Worker routes, secrets, and the one-second schedules were not changed.

Worker upload size from the Turnstile deploy earlier on 28 Oct 2026 was 8,438.14 KiB. This audit did not rebuild the Worker, so there is no after measurement.

## Classification

**SAFE OPTIMIZE, needs approval and a restart:** `cron.log_statement = off`. Behavior of ticks, settlement, and `cron.job_run_details` stays. Postgres log volume from successful ticks should fall by the counts above. Confirm on the usage page after restart.

**KEEP:** ledger and custody tables, `audit_logs`, game history, RLS, Turnstile signup check, rate limits, one-second workers, `cron.log_run`, financial `RAISE WARNING` paths, Worker secrets.

**REVIEW:** `cron.job_run_details` at 88 MB. The 12-hour success window is intentional. Edge-log volume from deposit and lobby reads. Dashboard ingestion of 2.33 GB versus the message-byte total measured here (about 40 MB of `event_message` text per day). The billed byte definition was not available from the API.

**SAFE REMOVE:** none met the evidence bar in this pass.

## Checks that ran

- Supabase log SQL for the 24-hour window and a one-hour job sample.
- Read-only `pg_settings`, `cron.job`, relation sizes, and `pg_database_size`.
- pg_cron source check that start and complete lines are gated by `CronLogStatement`, and that the GUC is postmaster-level.
- Source line counts.

## Checks that did not run

Application routes, signup, games, deposits, withdrawals, the test suite, and a production build. Nothing in those paths changed, so they were not re-executed and are not reported as passed.
