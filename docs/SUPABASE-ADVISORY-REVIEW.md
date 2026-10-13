# Supabase advisory review (2026-10-13)

Snapshot counts from the linter are starting points. Verify against `pg_policies`, `pg_constraint`, and `has_function_privilege` after each apply.

## `_withdraw_basis_writer_lock()` (SECURITY DEFINER + EXECUTE)

| Question | Finding |
|----------|---------|
| Purpose | `BEFORE INSERT` trigger on `ledger_transactions`; bumps `withdraw_basis_meta.ledger_real_tx_count` for real rows and takes the same advisory lock as `_withdraw_basis_sync`. |
| Overloads | Single zero-argument function returning `trigger`. |
| Callers | Postgres trigger executor only. Application/worker code calls `_withdraw_basis_sync`, `_withdraw_basis_rebuild_full`, `_withdraw_basis(uuid)` — not this function directly. |
| Body hardening | `SECURITY DEFINER`, `set search_path = public`; no user id parameter; side effects limited to internal cache metadata. |
| Intended API exposure | **No.** PostgREST must not expose it to `anon` / `authenticated`. |
| Fix | `20261014180000_withdraw_basis_writer_lock_grants.sql` — `REVOKE ALL` from `PUBLIC`, `anon`, `authenticated`; `GRANT EXECUTE` to `service_role` (optional for RPC symmetry; triggers do not require EXECUTE). |
| Production check (read-only, 2026-10-13) | `anon`/`auth` EXECUTE **false** after apply; trigger still on `ledger_transactions`. |

Regression: `tests/db/security.integration.test.ts` (dedicated case + deny list for `_withdraw_basis(uuid)`).

## RLS performance (~28 initplan findings)

| Question | Finding |
|----------|---------|
| Root cause | `auth.uid()` / `has_role(auth.uid(), …)` in `USING` without `(select …)` wrapper → per-row re-evaluation. |
| Row-independent? | **Yes** for all 28 `SELECT` policies listed in `20261012190000_perf-hot-paths.sql` / `20261014220000_rls_auth_initplan_wrap.sql`. |
| Row-dependent policies | None in this batch; do **not** wrap expressions that reference `NEW`/`OLD` or column values tied to the row under test. |
| Repo | `20261012190000` (CI/test chain) + forward **`20261014220000_rls_auth_initplan_wrap.sql`** for production catch-up. |
| Production (2026-10-13) | **28 policies** still matched raw `auth.uid()` in `pg_policies` — **`20261012190000` not in `schema_migrations`** until `20261014220000` is applied. |

Regression: `tests/db/perf-hot-paths.integration.test.ts` (≥28 wrapped policies in `pvp_test`).

## Unindexed foreign keys (~110 advisor / ~56 strict catalog check)

| Question | Finding |
|----------|---------|
| Approach | Add indexes only when the FK leading column lacks a usable index and the table participates in hot joins/cascades. |
| Explicit skips | `jackpot_players(user_id)` — composite PK `(game_id, user_id)`; `roulette_payouts(bet_id)` — PK. Documented in `20261012190000`. |
| First batch | `20261014221000_fk_indexes_advisor_hot_paths.sql` — roulette wheel_version, roulette_bets→ledger, partner_referrals, promo_wagers, crypto deposit addresses, slot_payouts→ledger. |
| Remaining | Low-traffic config/admin FKs (partners.created_by, daily_chest reward keys, etc.) — **review per table** before indexing. |

Regression: `tests/db/perf-hot-paths.integration.test.ts` (named FK indexes present after schema build).

## RLS enabled, no policies

**Intentional deny-by-default** for Data API roles when combined with revoked table grants and/or no `anon`/`authenticated` policies. Examples (non-exhaustive):

- Admin step-up: `admin_pins`, `admin_pin_grants`, `admin_stepup`, …
- Crypto workers: `crypto_job_runs`, `crypto_chain_cursor`, `crypto_settings`, `crypto_withdrawals`, …
- Treasury/config: `chain_assets`, `chain_networks`, `btcpay_invoices`, …
- Internal caches: `withdraw_basis_*` (revoked from client roles in `20261013200000`)

**Do not** add permissive policies or disable RLS solely to clear the advisor. Confirm each table is service-role / RPC-only.

Test harness reference: `test_auth_users` / `test_auth_sessions` in `perf-hot-paths.integration.test.ts` (RLS on, zero policies, no client grants).

## Apply order (production — owner action)

1. `20261014180000` — if not already recorded (writer lock grants).
2. `20261014220000` — RLS initplan wrap.
3. `20261014221000` — FK hot-path indexes.

Do **not** apply from agent sessions; use `scripts/audit/apply-migration.mjs` and update `docs/DATABASE-RELEASES.md`.

Re-run Supabase security/performance advisors after apply; do not claim “all clear” until linter output confirms.
