# Supabase advisory review

Last closed review: **2026-10-15** (production PVPSPINARENA). Re-run advisors after DDL; compare counts here rather than treating linter output as a blanket fix list.

2026-10-15 counts: 15 anon / 90 authenticated SECURITY DEFINER, 1 mutable search_path (`slot_tick_worker`), 128 RLS-without-policy (incl. `pvp_test`), 53 unindexed FKs (all `pvp_test`), 174 unused indexes, Auth DB connections absolute (10).

## Completed on production

| Item                             | Migration / action                                       | Advisor effect                                                  |
| -------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| RLS initplan (28 policies)       | `20261014220000_rls_auth_initplan_wrap`                  | Auth RLS Initialization Plan lint **cleared**                   |
| FK hot-path indexes (8)          | `20261014221000_fk_indexes_advisor_hot_paths`            | Unindexed FK **110 → 102**; eight `public` FKs covered          |
| Writer-lock RPC exposure         | `20261014180000_withdraw_basis_writer_lock_grants`       | Trigger helper not browser-callable                             |
| Referral playthrough trigger RPC | `20261014230000_referral_reward_lock_playthrough_grants` | Removes erroneous `anon`/`auth` EXECUTE on trigger-only definer |

**No website or worker redeploy** required for these DB-only changes.

Regression: `tests/db/security.integration.test.ts`, `tests/db/perf-hot-paths.integration.test.ts`, rollout suite.

---

## SECURITY DEFINER + browser EXECUTE (14 anon / 76 auth warnings)

The linter flags **any** `SECURITY DEFINER` function callable by `anon` or `authenticated`. That is expected for this app: the Data API is **deny-by-default** with an explicit RPC surface, not table-wide grants.

### How we enforce the boundary

1. **`tests/db/security.integration.test.ts`** — `anon` may execute **exactly** `PUBLIC_FNS` (13 RPCs after trigger revokes; fair-play / slot math helpers are `SECURITY INVOKER` and do not appear in this definer list). `authenticated` may execute **exactly** `SIGNED_IN_FNS` (includes admin/partner/game RPCs gated **inside** the function with `has_role`, live session, or PIN step-up).
2. **Deny list** — settlement ticks, ledger internals, `_withdraw_basis(uuid)`, money-moving crypto/BTCPay RPCs, etc. must have `EXECUTE` false for `anon`/`authenticated`.
3. **Trigger-only definer helpers** — revoke browser `EXECUTE` (writer lock, referral playthrough lock); triggers do not need client EXECUTE.
4. **Money-moving server RPCs** — must contain `_require_server_caller()` (`security.integration.test.ts` guarded list).
5. **`search_path`** pinned on every definer function (same test file).

### Intentional `anon` SECURITY DEFINER RPCs (15)

Read-only public UX (none of them writes): `daily_chest_status`, `get_profile_stats`, leaderboard public board/list/partner, partner/referral peek + terms, prestige identities/state, `real_play_open`, `roulette_round_bets`, `poker_lobby`, `poker_table_state`, `poker_hand_detail`. Each uses controlled SQL and/or RLS-safe projections — **do not blanket-revoke** without a product break.

`leaderboard_tick` was on this list until `20261015044000`. It advances campaigns and pays prizes, so it is now `service_role` only; `pvp-minute-dispatch` runs it every minute and the browser no longer calls it.

### Admin RPCs must fail closed

Every admin RPC executable by `authenticated` rejects a request with no user. Leaderboard admin RPCs use `_lb_require_admin()`; poker admin RPCs use `_poker_require_admin()`, which accepts a userless call only from a server caller (`_require_server_caller()`), never from an `anon`/`authenticated` JWT. Do not write `if uid is not null then <admin checks> end if`.

### Revealed seeds

Live seeds sit in `*_game_secrets` / `poker_hand_secrets` (no client grant). The client-readable `server_seed` column on each game table has a CHECK that it is null until the game is finished; `security.integration.test.ts` fails if a readable seed column lacks one.

### `slot_tick_worker` mutable search_path

Accepted. It is a procedure that commits per table, and a procedure with a `SET` clause cannot commit. It is not SECURITY DEFINER, only `service_role` can call it, and every object it references is schema-qualified. `security.integration.test.ts` fails if another function loses its pinned search_path, if the worker becomes SECURITY DEFINER, or if its body calls an unqualified non-`pg_catalog` function or table.

### Intentional `authenticated` SECURITY DEFINER RPCs (~63 beyond anon)

Game actions, wallet-adjacent flows, promo/partner/referral, admin RPCs. Admin paths re-check role inside the function; exposure to `authenticated` is required for PostgREST but not equivalent to “any user is admin.”

### When the linter still shows 14 / 76

After trigger revokes, counts should match **intentional** RPCs only. Treat remaining rows as **documented acceptance**, not misconfiguration, unless a new function appears outside the allowlist test.

---

## Leaked password protection (Auth — not SQL)

| Status               | Action                                                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open (dashboard)** | Supabase Dashboard → **Authentication** → **Providers** → **Email** → enable **Prevent use of leaked passwords** ([password security](https://supabase.com/docs/guides/auth/password-security)). Requires Pro-plan `password_hibp` entitlement. |

This cannot be applied via Postgres migration. After enabling, re-run **security** advisors; `auth_leaked_password_protection` should clear.

---

## RLS enabled, no policy (~121)

**Intentional deny-by-default** for Data API roles when table grants are revoked and access is **service_role / RPC-only only**. Do **not** add permissive policies or disable RLS to silence the linter.

| Category              | Examples                                                                  |
| --------------------- | ------------------------------------------------------------------------- |
| Admin step-up         | `admin_pins`, `admin_pin_grants`, `admin_stepup`, …                       |
| Crypto workers        | `crypto_job_runs`, `crypto_chain_cursor`, `crypto_settings`, …            |
| Treasury / config     | `chain_assets`, `btcpay_invoices`, internal ledger caches                 |
| Withdraw basis caches | `withdraw_basis_*` (client roles revoked)                                 |
| Test harness          | `pvp_test.test_auth_users` / `test_auth_sessions` (RLS on, zero policies) |

Periodic check: new tables with RLS and no policies should be classified here before launch. `security.integration.test.ts` fails if `anon` or `authenticated` can read any of them (`withdraw_basis_poker_put`, added with poker, is covered).

---

## `pg_net` in `public` (extension lint)

Supabase installs **`pg_net` in `public`**. Moving it is a **platform/extension** concern, not part of app index work; plan any schema move with Supabase support and dependent objects.

**Owned boundary:** `tests/db/security.integration.test.ts` asserts no `anon`/`authenticated`-callable function, trigger, or RLS policy **transitively calls** `net.http_*`. Platform `PUBLIC` execute on `pg_net` itself is not revocable; the app must not proxy into it from the API surface.

---

## Unindexed foreign keys (~102 remaining)

| Rule         | Detail                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| Done         | Eight hot-path `public` indexes in `20261014221000`                                                             |
| Backlog      | ~102 advisor rows (includes **`pvp_test` mirror** — skip indexing there if test-only)                           |
| Next batches | Prioritize live `public` FKs on high-traffic joins/cascades; skip PK-covered FKs documented in `20261012190000` |
| Do not       | One migration for all ~110                                                                                      |

---

## Unused indexes (~127)

Includes the eight new FK indexes and many CI/low-traffic paths. **Do not drop** on linter alone; re-evaluate after representative production workload (`pg_stat_user_indexes`).

`poker_hands_completed_created_idx` serves the per-minute poker leaderboard ingest (`status = 'COMPLETED'` within a campaign window). With a handful of completed hands the planner prefers a sequential scan; keep it.

---

## Auth DB connections (absolute cap 10)

Informational unless scaling compute or metrics show Auth pool exhaustion. Switch to percentage-based allocation when resizing ([going into prod](https://supabase.com/docs/guides/deployment/going-into-prod)).

---

## Production apply order (reference)

Use `node --env-file=.env scripts/audit/apply-migration.mjs supabase/migrations/<file>.sql` and log in `docs/DATABASE-RELEASES.md`.

1. `20261014180000` — writer lock grants
2. `20261014220000` — RLS initplan
3. `20261014221000` — FK hot-path indexes
4. `20261014230000` — referral playthrough trigger grants
