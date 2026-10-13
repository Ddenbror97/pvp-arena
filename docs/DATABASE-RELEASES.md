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
| `20261014180000` | `withdraw_basis_writer_lock_grants` | Revoke RPC execute on trigger-only `_withdraw_basis_writer_lock` | 2026-10-13 | Applied via Supabase MCP; see `docs/SUPABASE-ADVISORY-REVIEW.md` |

## Rollout test gate

Branch `wallet-hardening-phase2`: GitHub Actions **DB integration (rollout)** run **#14** on commit **`61e0bd1`** completed in ~44s (same band as green runs #11–#13 after `4aecc08`). Confirm the checkmark in the Actions UI; local mirror below also passed **17/17**.

Local equivalent:

```bash
node scripts/ci/postgres-extensions.mjs
npm run test:db:rollout
```

## Wallet-hardening rollout fixes (test/code)

Commit `4aecc08`: partner-leaderboard cohort fixture, withdraw-basis parity bench fixes, migration `20261014143000` in repo.
