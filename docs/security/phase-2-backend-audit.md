# Phase 2 Backend Security, Integrity, and Reliability Audit

Date: 2026-10-21

Scope: authorization boundaries, admin step-up, bonuses and referrals, partner accounting, house-bot kill switch, self-exclusion, chat moderation, worker privileges, migration drift, and a bounded read-load measurement. The five game-engine suites and the wallet/ledger suites were not re-run. This audit does not authorize a production deploy, a migration, or a financial operation.

## Executive summary

The executed checks passed on the isolated test project. No critical or high application defect was reproduced. Anonymous and authenticated sessions cannot read private financial tables, private profile columns, admin PINs, or the crypto job bearer. A planted wallet for one account was invisible to the other account, and an attempted balance change did not apply. Admin money RPCs that are executable by `authenticated` all call a step-up guard. Partner credit is idempotent under a concurrent replay and rejects a reused request id. Self-exclusion blocks coinflip, jackpot, roulette, slott, poker, a bot call, and the withdrawal function before a withdrawal row is written. Referral self-claims, duplicate claims, stale accounts, and a shared wallet are refused or held in `FRAUD_REVIEW` with no reward row. Partner commission of 10,002 cents at 150 bps is 150 cents. Chat stores a hostile string literally, rate-limits a flood and a duplicate, and anon cannot insert.

**Recommendation: GO for this Phase 2 scope.** That means the checks below passed and no release-blocking authorization or accounting defect was found in them. It is not a statement that the platform is fully secure, and it is not approval to deploy, merge to production, or move money.

## Environment verification

| Check | Result |
| --- | --- |
| Approved project | `pvp-spinarena-test`, ref `qyykpkzmthkrvmtmgvwo`, region `us-east-2`, Postgres 17 |
| Connection used | Session pooler `aws-0-us-east-2.pooler.supabase.com`, database `postgres`, disposable login `phase2_audit_e4cb` |
| Production ref `dkyabirifoixnfbmheay` | Not used. `supabase/config.toml` and the app `.env` still point there. Tests refuse that ref. |
| Other projects | `gqeaadpdtuussxdlnmof` and the retired ref `fdsovopvmjogjcllmxwj` were refused. The Supabase MCP token only lists an unrelated organization, so it was not used for SQL. |
| Local Postgres on port 5433 | Not used. |

Safety checks performed before any mutation:

- Every script compared the database URL with `qyykpkzmthkrvmtmgvwo` and aborted on the production ref, the unrelated project, or localhost.
- Public probes that insert a wallet run inside a `DO` block that raises after the assertion. A follow-up owner query found no `user_available` USD rows with the planted balances 111 or 222.
- `pvp_test` was built from the repo migrations and dropped at the end of the suite. It is not present now.
- The disposable login was granted `anon`, `authenticated`, and `service_role` only so `SET ROLE` works. It was not superuser and was not given `BYPASSRLS`. After the suite, `DROP OWNED` and `DROP ROLE` removed it. A follow-up catalog query returned zero roles with that name.
- `crypto_invoke_cron` was called only inside `pvp_test`, and only after confirming `crypto_job_bearer` had zero rows. It raised `crypto job token missing` before `net.http_post`. `pvp_minute_dispatch` was not called, because a bearer would make it POST to `https://pvpspinarena.com/api/public/cron/`.
- No production cron job was altered. No public bot flag, withdrawal, or ledger row was written. Shared test flags were read only: `mainnet_enabled` false, `watch_only` true, `real_play_enabled` false. `deposits_enabled` and `withdrawals_enabled` are true on that project, which is why public money functions were not invoked.
- No real OTP, payment, or blockchain transfer was sent.

Isolation limit: `pvp_test` shares the test project's Postgres instance, advisory locks, and extensions with `public`. Game workers on `public` were left running. Behavioral fixtures stayed in `pvp_test` or in rolled-back `public` transactions.

## Coverage matrix

"Executed" means this audit ran the check and inspected the returned value or the following database state. "Present, not re-run" means a suite already exists and was not executed again.

| System | Existing coverage | This audit | Gap left open |
| --- | --- | --- | --- |
| Game engines, wallet, promo races, withdrawal basis | Large `tests/db` suites | Not re-run | No new game-engine evidence |
| RLS and grants | `security.integration.test.ts`, `rls.integration.test.ts` (the live JS client was not pointed at this project) | Executed on `public` with `SET ROLE` | Realtime websocket client not opened |
| Admin step-up | Helpers and leaderboard/promo tests | Executed: revoked session, live session without step-up, concurrent top-up | Real PIN/OTP delivery not exercised |
| Referrals and partner commission | Partner cohort and lock-order tests | Executed: self, duplicate, stale, shared wallet, trunc formula | No live deposit rail |
| House bots | `bots.integration.test.ts` resets flags before asserting "disabled" | Executed: fresh schema is enabled by `20261020221000`; kill switch and retry leave no `bot_calls` row | Public bot flags were not changed |
| Self-exclusion | Game tests set the column directly | Executed through `request_self_exclusion`, then five games, bot call, and `crypto_request_withdrawal` | Chat is not exclusion-gated in the product function |
| Chat | `chat.integration.test.ts` | Executed: literal storage, duplicate, 5-per-10s flood, anon insert denied | No websocket subscription lifecycle |
| Workers | Security suite covers tick collapse | Executed: browser execute denied; empty bearer does not call out | Overlapping `pvp_minute_dispatch` not invoked, on purpose |
| Migrations | CI applies the chain on isolated Postgres | Executed: version diff against the test project | No backup/restore |
| Load | `perf-hot-paths` and withdraw-basis bench exist | Executed: 100, 250, 500, and 1,000 queued reads | Not 1,000 simultaneous sessions |

## Tests executed

Command: `vitest run tests/db/phase2-audit.integration.test.ts` against the approved test URL.

Final run: **14 passed, 0 failed, 0 skipped.** Earlier failures in this session were incorrect assertions (audit column name, same-length exclusion expectation, schema usage, and a money-migration precondition). They were corrected in the test, not by changing product behavior. The final file is the one that passed.

| Check | Result |
| --- | --- |
| Anon denied on wallets, ledger, pins, withdrawals, bearer, referrals, top-ups, and private profile columns | Pass (`42501`) |
| Anon can read profile id and username | Pass (intentional display grant) |
| Synthetic authenticated user sees 0 wallets and 0 ledger rows; private columns denied | Pass |
| `admin_overview` as anon | Pass (`42501`) |
| `partner_admin_topup` as a non-admin | Pass (`FORBIDDEN`), no top-up row |
| Browser-executable `admin_%`, `partner_admin%`, `promo_admin%` functions missing a step-up call | Pass (empty list) |
| Planted cross-user wallet | Pass (`visible=1 own_sum=111 other=0 touched=-1 victim=222`), planted rows gone afterward |
| `request_self_exclusion` null, 7, shorten-from-400-days, extend to 1825 | Pass |
| Excluded user: coinflip, jackpot, roulette, slott, poker | Pass (`SELF_EXCLUDED`) |
| Bot call on a game opened before exclusion | Pass, game stays `WAITING` |
| Bot flags off, including the same idempotency key | Pass (`BOTS_DISABLED`), zero `bot_calls` |
| Admin top-up without a live session / without step-up / non-admin | Pass (`SESSION_REVOKED`, `ADMIN_STEP_UP`, `FORBIDDEN`) |
| Two concurrent top-ups, same request id | Pass, one credit, one `duplicate: true`, replay with a different amount is `REQUEST_REUSED` |
| Referral self, second claim, 31-minute-old account, shared wallet | Pass (`self`, `kept`, `existing_user`, `FRAUD_REVIEW`, zero reward rows) |
| `_partner_window` 10,001 + 1 cents at 150 bps | Pass (`commission_cents = 150`), not executable by anon or authenticated |
| Chat hostile string, duplicate, flood, hidden row, anon insert | Pass |
| `crypto_invoke_cron` with an empty bearer | Pass (`crypto job token missing`) |
| Queued `referral_terms` reads | Pass, 0 errors at 100, 250, 500, and 1,000 tasks |

Migration diff, via the management API as the database owner: 265 versions applied, 266 migration files in the repo, 0 missing, 0 extra. The extra file is the known superseded migration `20260925125620`, which the test schema builder also skips.

`public` catalog, read only: 149 tables, all with row level security, 0 views, 0 policies referencing `user_metadata`.

## Findings and fixes

No application defect was confirmed. No product SQL or application code was changed. The new file is `tests/db/phase2-audit.integration.test.ts`.

### Informational

1. **Fresh databases enable house bots.** `20261020221000_enable_bots.sql` sets `bot_config.enabled`, coinflip, and poker on. The older "ships disabled" test turns the flags off in `beforeEach` before it asserts. The kill switch still stops `coinflip_call_bot`, including a retry of the same key. The shared test project also has those flags on, plus slott. This audit did not change them. Severity: informational. The behavior matches the migration.

2. **Repeating the same exclusion length extends it.** `request_self_exclusion` computes `now() + days`. A second 180-day request is a few milliseconds longer than the first, so `EXCLUSION_ALREADY_LONGER` does not fire. Setting the end 400 days out and then requesting 180 or 365 is rejected. Requesting 1825 extends it. This matches the function and does not let a player shorten an exclusion.

3. **`_assert_live_session` returns when the JWT role is not `authenticated` or `session_id` is absent.** The migration comment says that path is for the service role, cron, and server tooling, and that a real sign-in token always carries `session_id`. This audit did not mint a GoTrue token. A simulated authenticated claim with a missing session row fails closed with `SESSION_REVOKED` on `partner_admin_topup`.

4. **Table owners bypass row level security.** `FORCE ROW LEVEL SECURITY` is off. The `postgres` role can read tables that browser roles cannot, including `crypto_job_bearer`. Browser roles receive `42501` on that table. This is normal Postgres ownership, not a grant to the browser. No bearer value was selected.

5. **Profile display columns are world-readable.** Policy `profiles public` is `USING true`. Column grants for anon and authenticated are `id`, `username`, `avatar_url`, `created_at`, and `is_bot`. `self_excluded_until`, `age_confirmed_at`, and `bot_style` return `42501`.

6. **Chat is not self-exclusion gated.** `chat_send` enforces room, length, mute, ban, and rate limits. It does not read `self_excluded_until`. No product rule in that function requires a block. Not treated as a defect.

7. **Backup and restore were not run.** No isolated restore target was available, and the shared test project must not be reset. This is an unverified control, not a successful restore.

8. **Realtime sockets were not opened.** Channel policies exist in migrations and in the existing security suite. This audit did not subscribe.

9. **`pvp_minute_dispatch` was not executed.** Doing so can HTTP POST to production when a bearer row exists. The privilege check and the empty-bearer failure are what this audit ran.

## Performance

Workload: concurrent `select pvp_test.referral_terms()` on the test project. Client pool max 8. Tasks were queued on those 8 sessions. This is not a 1,000-session capacity result. Latency includes queue wait. `referral_terms` is a single-row config read, not a bet path.

| Tasks | OK | Errors | Elapsed | Throughput | Median | p95 | p99 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 100 | 0 | 159 ms | 630/s | 25.5 ms | 128.5 ms | 153.7 ms |
| 250 | 250 | 0 | 42 ms | 6,003/s | 27.8 ms | 38.8 ms | 40.0 ms |
| 500 | 500 | 0 | 66 ms | 7,622/s | 37.3 ms | 62.8 ms | 64.0 ms |
| 1,000 | 1,000 | 0 | 112 ms | 8,938/s | 57.3 ms | 104.1 ms | 109.8 ms |

The 100-task p95 is higher because it includes the first contact. No pool exhaustion, timeout, or error was observed, so the run was not stopped early. Lock waits, `pg_stat_statements`, and server CPU were not sampled. No slow-query regression is claimed.

## Remaining risks

- Game-engine, promo-race, and wallet suites were not re-executed. Their prior passes are not new evidence from this session.
- A forged or session-less production JWT was not presented to PostgREST. Signature verification sits in front of the SQL early-return.
- Realtime subscribe, revoke-during-subscription, and presence were not exercised against a live socket.
- Backup, restore, and point-in-time recovery were not performed.
- The 1,000-task figure is a queued read on 8 sessions.
- Public cron on the test project keeps calling `public` workers. This audit did not pause them and did not feed them new public rows.
- `DROP OWNED` on the disposable role revoked only that role's grants. It was not a superuser. Catalog ownership of application tables was checked first and was empty.

## Final recommendation

**GO for the Phase 2 scope above.** Critical and high findings: none confirmed. The P0 checks that were run passed, on `qyykpkzmthkrvmtmgvwo` only, with planted public rows confirmed absent afterward. Remaining gaps are listed and were not counted as passes.

This is not approval to deploy, to merge into production, to apply a migration on production, or to turn on a payout rail.
