# Database release log

Supabase migrations are ordered by the **14-digit prefix** on each file (`YYYYMMDDHHMMSS_name.sql`). That timestamp is the **authoring/version id** (typically UTC when the file was created), not a guarantee that production applied it on that calendar day in every timezone. **Never rename** a migration that already appears in `supabase_migrations.schema_migrations`.

Apply production changes with:

`node --env-file=.env scripts/audit/apply-migration.mjs supabase/migrations/<file>.sql`

Record each production apply here. Do not re-run apply solely to update this doc if the version row already exists.

## Applied on production (PVPSPINARENA)

| Version | Name | Purpose | Applied (UTC) | Notes |
|---------|------|---------|---------------|-------|
| `20261014143000` | `leaderboard-sync-skip-zero-deposit` | `_lb_sync` skips zero deposit-funded qualifying stakes (`greatest(min_wager_cents, 1)`); fixes check violation when `min_wager_cents = 0` | 2026-10-13 | Confirmed in `schema_migrations`; **DB-only** — no worker deploy required |
| `20261014160000` | `remove_promo_code_burst` | Removes per-code promo burst caps | 2026-10-13 | Same apply session as above |
| `20261014170000` | `crypto_my_activity_withdraw_room` | Wallet withdraw room in `crypto_my_activity`; ETH quote bonus check | 2026-10-13 | Same apply session as above |
| `20261014180000` | `withdraw_basis_writer_lock_grants` | Revoke RPC execute on trigger-only `_withdraw_basis_writer_lock` | 2026-10-13 | Privileges verified read-only; see `docs/SUPABASE-ADVISORY-REVIEW.md` |
| `20261014220000` | `rls_auth_initplan_wrap` | Wrap 28 row-independent RLS policies with `(select auth.uid())` | 2026-10-13 | Applied via `scripts/audit/apply-migration.mjs`; advisors rerun — RLS initplan lint cleared |
| `20261014221000` | `fk_indexes_advisor_hot_paths` | Eight hot-path FK covering indexes on `public` | 2026-10-13 | Advisors: unindexed FK count −8 on `public`; ~102 total (incl. `pvp_test` mirror) |
| `20261014325000` | `withdraw_basis_game_scope` | Key withdraw-basis stakes by `(user, game, game_id)` so same-numbered rounds in different games never pool or delete each other's stakes; full basis replay | 2026-10-14 | Dry run (`scripts/audit/dry-run-migration.mjs`, rolled back): 140 players, 0 balance changes, 1.5 s, rebuild idempotent. **DB-only** |
| `20261014340000` | `roulette_integrity_open_recheck` | Unacknowledged roulette incidents are re-checked every hourly run regardless of the 48-hour window; WARNING only when new, back after a clean run, or once per 24 h while open; manual acknowledgement requires a note | 2026-10-14 18:01 | Live body matched `20261011180000` (md5) before replace. Dry run (rolled back): 143 ms, 76 incidents unchanged, recheck set = 7 purged games. Rollback: re-run the `20261011180000` function block; keep the columns. **DB-only** |
| `20261014230000` | `referral_reward_lock_playthrough_grants` | Revoke RPC execute on trigger-only `referral_reward_lock_playthrough()` | 2026-10-13 | Clears spurious anon SECURITY DEFINER RPC lint; see `docs/SUPABASE-ADVISORY-REVIEW.md` |
| `20261014330000` | `poker` | Poker schema, RPCs and worker; `poker_config.enabled = false` | 2026-10-14 23:3x | Applied after 340000 (no shared functions). Staging `test-pvpspinarena` validated first. Poker stays disabled |
| `20261014350000`–`20261014354000` | `poker_lock_order_worker`, `poker_settlement_recovery`, `poker_hardening`, `poker_collusion_signals`, `poker_active_table_cap` | Worker lock order, settlement retry/stuck/recovery, hardening, collusion signals, 10-table cap | 2026-10-14 23:3x | 0.9–1.0 s each. After each: ledger balanced, real total 0, basis rebuild idempotent (rolled-back check) |
| `20261014355000` | `withdraw_basis_per_user` | Per-user withdraw basis applied at write time (deferred trigger); backfills `withdraw_basis_applied` | 2026-10-14 23:3x | 2.4 s under a ledger share-row-exclusive lock; 3,664 real txs backfilled (240 test_credit txs excluded by design) |
| `20261014356000`, `20261014357000` | `lock_order`, `poker_nudge_and_collusion` | Cross-game wallet lock order; poker nudge rate limit and multiway collusion attribution | 2026-10-14 23:3x | All game workers 0 failures in the following 5 min |
| `20261014358000` | `crypto_invoke_cron` | Brings the existing `crypto_invoke_cron` and `crypto_job_bearer` (created by `scripts/setup-pg-crypto-cron.mjs`) into migrations; no token stored | 2026-10-14 | Same body as live (25 s timeout); token row untouched |

## Rollout test gate

Branch `wallet-hardening-phase2`: GitHub Actions **DB integration (rollout)** run **#14** on commit **`61e0bd1`** completed in ~44s (same band as green runs #11–#13 after `4aecc08`). Confirm the checkmark in the Actions UI; local mirror below also passed **17/17**.

Local equivalent:

```bash
node scripts/ci/postgres-extensions.mjs
npm run test:db:rollout
```

## Wallet-hardening rollout fixes (test/code)

Commit `4aecc08`: partner-leaderboard cohort fixture, withdraw-basis parity bench fixes, migration `20261014143000` in repo.
