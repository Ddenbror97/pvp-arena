# Phase 3 Backend Reliability and Infrastructure Audit

Date: 2026-10-21

Status: **Phase 3 complete for the checks that the isolated environment could run.**

Scope: real GoTrue sessions, Realtime channel authorization, logical backup and restore, cron overlap and recovery, and concurrent authenticated clients. Phase 1 game, wallet, and ledger suites were not re-run. Phase 2's RLS, admin, referral, and chat suites were not re-run. No production database, cron, or financial service was contacted.

## Executive summary

The executed checks passed on `pvp-spinarena-test` and on a local Postgres used only as a restore and cron target. Real sign-in tokens carry `session_id`. Logout, a past `not_after`, and a deleted `auth.sessions` row all make `_assert_live_session` return `SESSION_REVOKED`. A rolled-back coinflip create with a live session would have opened a game; the same call with the logged-out session raised `SESSION_REVOKED` and left no game. Refresh-token reuse of a parent or grandparent token was rejected after 12 seconds, and the current token still worked.

Anonymous and cross-user Realtime clients could not join `wallet:<other>`. The owner received a wallet broadcast whose fields were `kind`, `account_type`, and `id`. The balance was not in the payload. A hidden chat row was not delivered. A client `send()` was acknowledged locally and was not delivered to a second subscriber. `postgres_changes` on `wallet_accounts` delivered nothing. That table is not in the `supabase_realtime` publication.

A schema-only dump of `public` restored onto local Postgres 17 with 0 errors. The restored ledger rejected a repeated idempotency key and an unbalanced posting. On a migration replay in `pvp_test`, eight overlapping `crypto_run_gate` calls opened one run, a missed tick ran once, the immediate next call was skipped, and a crashed transaction retried successfully. A duplicate ledger key and an unbalanced posting were rejected.

209 real GoTrue sessions were obtained. Concurrent waves of 50, 100, and 209 authenticated requests had 0 errors. Sign-in rate limiting stopped token creation before 250 and 500, so those sizes were not claimed. No critical or high application defect was reproduced. No product code was changed.

**Recommendation: GO for this Phase 3 scope.** That is not approval to deploy, to merge into production, or to move money.

## Environment

| Check | Result |
| --- | --- |
| Approved project | `pvp-spinarena-test`, ref `qyykpkzmthkrvmtmgvwo`, Postgres 17 |
| Production ref `dkyabirifoixnfbmheay` | Not queried. The test file refuses that ref, `gqeaadpdtuussxdlnmof`, and `fdsovopvmjogjcllmxwj` before a connection |
| Restore and cron target | Local Postgres 17 on `127.0.0.1` only. Databases `phase3_audit` and `phase3_restore` were created for the run and dropped afterward |
| Hosted money state | `crypto_job_bearer` 0 rows, ledger transactions 0, posting sum 0. `real_money_enabled` is false. Cron jobs were not edited |
| Cleanup | Synthetic `phase3-*@audit.invalid` users 0, dump role 0, owned wallets 0, phase3 chat rows 0, coinflip games 0 |

`pvp_minute_dispatch` and `crypto_invoke_cron` were not called on the hosted `public` schema. The bearer table is empty, so the HTTP call would not be made, but `leaderboard_tick` would still run against live campaigns. Cron behavior was measured in `pvp_test` on the local database, where a missing bearer cannot reach `https://pvpspinarena.com`.

## Coverage matrix

| System | Already covered | This audit | Left open |
| --- | --- | --- | --- |
| Game engines, wallet, deposit replay, withdrawal races | Phase 1 suites, including duplicate deposit credit | Not re-run | No new game-engine evidence |
| RLS, admin step-up, referrals, chat limits | Phase 2, 14 tests | Not re-run | No new RLS matrix |
| GoTrue login, refresh, logout | Phase 2 simulated `request.jwt.claims` only | Real password grant, refresh family, logout, `not_after`, deleted session | Access-token `exp` was not waited out. Tokens are issued with a 3600 second lifetime |
| Realtime | SQL policies only | Live private channels for wallet, game, and chat | No load test of thousands of sockets |
| Backup | Not run in Phase 2 | Logical `public` dump restored locally. Vendor backup list is empty and PITR is off | No point-in-time snapshot was available to restore |
| Cron overlap and recovery | Security suite covers game-tick collapse on `pvp_test` | `crypto_run_gate` overlap, missed tick, crash rollback, ledger idempotency | Hosted `pvp-minute-dispatch` was not invoked |
| Concurrent clients | Phase 2 queued 1,000 reads on 8 sessions | 50, 100, and 209 real sessions | 250 and 500 were not reached |

## Tests

Command: `npx vitest run tests/db/phase3-audit.integration.test.ts`

**7 passed, 0 failed, 0 skipped.**

| Check | Result |
| --- | --- |
| Forbidden project refs refused before connect | Pass |
| All 149 public tables have RLS. No policy uses `user_metadata` | Pass |
| `live_session` triggers on coinflip entries and games, jackpot entries, roulette bets, and ledger transactions | Pass |
| `supabase_realtime` publication does not include `wallet_accounts` | Pass |
| Real login JWT role `authenticated`, `session_id` present, `exp` about 3600 seconds | Pass |
| `_assert_live_session` with that token | Pass |
| Refresh rotates the token. Parent and grandparent reuse after 12 seconds | Pass (`400`). Current token still `200`. Session stayed live |
| `not_after` in the past, then deleted session | Pass (`SESSION_REVOKED`) |
| Global logout, then the old access token | Pass (logout `204`, RPC `SESSION_REVOKED`) |
| Tampered access token | Pass (`401`) |
| Anonymous call to `_assert_live_session` | Pass (rejected) |
| Live session coinflip create inside a rolled-back probe | Pass (`PROBE OK`, game id returned, then rolled back) |
| Logged-out session, same probe | Pass (`SESSION_REVOKED`). Hosted coinflip games afterward: 0 |
| Anon and user B joining `wallet:<A>` | Pass (`CHANNEL_ERROR`, 0 events) |
| Owner wallet, `game:coinflip`, and anon `chat:jackpot` | Pass (`SUBSCRIBED`) |
| Wallet broadcast fields | Pass (`kind`, `account_type`, `id`). `balance` absent |
| Hidden chat insert | Pass (0 delivered events) |
| Client broadcast of `{kind: forged, balance: 1}` | Not delivered to the second subscriber. `send()` still returned `ok` |
| Reconnect with a new client | Pass (`SUBSCRIBED`) |
| `postgres_changes` on `wallet_accounts` | Pass (0 rows). The channel status was `SUBSCRIBED` and the publication is empty |
| Other user's REST read of the planted wallet | Pass (`[]`) |
| Schema-only dump of hosted `public` restored on local Postgres 17 | Pass (0 restore errors, `ledger_balanced` present, 14 constraints on the ledger and wallet tables) |
| Restored duplicate idempotency key and one-sided posting | Pass (`23505`, `LEDGER_UNBALANCED`) |
| Eight parallel `crypto_run_gate('deposits', 30)` | Pass (exactly 1 opened) |
| Gate last run set to epoch, then called twice | Pass (first runs, second skipped) |
| Gate committed inside a transaction that rolls back, then called again | Pass (retry runs) |
| Duplicate ledger key and unbalanced posting on `pvp_test` | Pass (`23505`, `LEDGER_UNBALANCED`) |
| Role connection limit 2, third connection | Pass (`too many connections`) |
| Two sessions updating rows in opposite order | Pass (`deadlock detected`). Both rows remained. A new connection succeeded |
| `statement_timeout` 200ms around `pg_sleep(2)` | Pass (`57014`). Next connection returned 1 |
| Authenticated waves | Pass at 50, 100, and 209. 0 errors. 250 and 500 not run |

## Findings

No application defect was confirmed. No product SQL or application code was changed. The new file is `tests/db/phase3-audit.integration.test.ts`.

### Informational

1. **Vendor backups are not restorable from the API.** WAL-G is enabled, PITR is off, and the backup list is empty. Recovery evidence is the logical dump, not a point-in-time snapshot. The logical dump of `public` restored cleanly and enforced the ledger rules.

2. **A client `send()` returns `ok` without delivering the payload.** The second subscriber on the same private wallet topic did not receive `{kind: forged, balance: 1}`. There is no `INSERT` policy on `realtime.messages`. The ack is not a cross-user leak. The wallet UI treats the broadcast as a refetch hint.

3. **`postgres_changes` can subscribe while the publication is empty.** No wallet row was delivered. Game and wallet feeds are database broadcasts, which is the intended path after `20261015035000`.

4. **The direct parent of the active refresh token was rejected after 12 seconds.** GoTrue documents a short reuse interval and a parent exception for a lost response. After 12 seconds both the parent and the grandparent returned `400`, and the current token still refreshed. That is stricter than the parent exception and it did not kill the live session.

5. **Sign-in rate limiting capped real sessions at 209.** Four sign-in responses were rate limited. Further password grants were not forced. 250 and 500 concurrent sessions were not exercised.

6. **Slow statements on the test project are maintenance and catalog queries.** The slowest application statement in `pg_stat_statements`, excluding this audit's own `pvp_test` builds, is `delete from cron.job_run_details` at about 1.2 seconds mean across 12 calls. `settlement_worker_health()` is about 343 milliseconds mean. Hosted `deadlocks` is 0 and waiting locks were 0. These were not changed.

7. **Hosted `max_connections` is 60.** During the 209-client wave, `pg_stat_activity` showed 40 backends and 7 active. The shared pool was not exhausted. A disposable role with `CONNECTION LIMIT 2` rejected the third connection on the local database. The shared 60-connection limit was not driven to failure, because the test project's cron workers use the same server.

## Performance

Workload: each client is a distinct GoTrue session. About 9 in 10 requests read that user's profile row. About 1 in 10 calls `/auth/v1/user`. No bets, deposits, or withdrawals were sent. Latency is end to end from this runner.

| Sessions | OK | Errors | Elapsed | Median | p95 | p99 | Backends | Active |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 50 | 0 | 829 ms | 788 ms | 804 ms | 812 ms | 37 | 2 |
| 100 | 100 | 0 | 694 ms | 342 ms | 640 ms | 660 ms | 41 | 6 |
| 209 | 209 | 0 | 5,299 ms | 4,371 ms | 5,259 ms | 5,265 ms | 40 | 7 |

The 50-session median includes first contact. At 209 sessions the requests still all succeeded, and latency moved from under a second to several seconds. That is the measured concurrent-client result. It is not a 250-session or 500-session result.

## Remaining risks

| Priority | Gap | Why it still matters |
| --- | --- | --- |
| Medium | No PITR snapshot | A logical schema dump does not prove a vendor backup can be restored to a timestamp |
| Medium | Access-token expiry at 3600 seconds | Logout and a deleted session fail closed. A stolen access token remains valid until `exp` unless the money path checks `auth.sessions`, which the bet probe showed it does |
| Low | 250 and 500 sessions | Sign-in rate limiting stopped the run at 209. Latency was already several seconds there |
| Low | Hosted minute dispatcher | Not invoked, so a live overlap of `leaderboard_tick` with the existing cron was not added to this project |
| Informational | `send()` ack without delivery | No second subscriber received the forged wallet payload |

## Final recommendation

**Phase 3 is complete for the scope above. GO.** Critical and high findings: none confirmed. The suite passed 7 tests. Cleanup on `qyykpkzmthkrvmtmgvwo` left no synthetic users, no dump role, and no ledger rows. Production was not connected to and was not modified.

This is not approval to deploy, to merge into production, to enable PITR, or to change a cron schedule.
