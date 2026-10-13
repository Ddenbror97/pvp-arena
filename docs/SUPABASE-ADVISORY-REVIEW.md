# Supabase advisory review (2026-10-13)

## Fixed in repo

| Finding | Action |
|---------|--------|
| `public._withdraw_basis_writer_lock()` callable by `anon` / `authenticated` | **Not intentional.** Trigger-only `SECURITY DEFINER` helper; migration `20261014180000_withdraw_basis_writer_lock_grants.sql` revokes `EXECUTE` from `PUBLIC`, `anon`, `authenticated` and grants `service_role` only. Ledger writes still run the trigger as today. |

## Review backlog (no blanket change)

| Category | Count (approx.) | Stance |
|----------|-----------------|--------|
| RLS performance (initplan / auth wrap) | ~28 | Tune per hot path; many tables are service-role-only or low QPS. |
| Unindexed foreign keys | ~110 | Add indexes when a FK participates in joins or cascades on hot paths; not a mass-migration item. |
| RLS enabled, no policies | varies | Often **intentional** — table unreachable via PostgREST for `anon`/`authenticated`. Confirm per table before adding policies. |

Re-run advisors after applying `20261014180000` and confirm the writer-lock finding clears.
