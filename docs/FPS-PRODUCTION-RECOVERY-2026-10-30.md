# Production recovery rehearsal — 2026-10-30

Status: isolated recovery passed; the user approved the documented restored-copy Auth quarantine procedure. No production data or settings were changed.

A read-only, exported-snapshot backup of production public/Auth schemas was created. The private original archive is retained under ignored .wrangler/production-backup-verification. Its SHA-256 is 8832cdb94d6ff252911a42605f519dff110ec06c5802cd55819c225a44860821, size 33724330 bytes. The source migration is 20261029180000.

A strict, unmodified restore failed because production already contains 39 auth.mfa_amr_claims rows referencing missing auth.sessions rows, despite the source FK being marked validated. A separate read-only source query confirmed the same 39 orphans. This was not introduced by the candidate or the backup. No production Auth rows were deleted or repaired.

The tested recovery procedure restores pre-data and data, moves ONLY those orphaned MFA claims to recovery_quarantine.auth_mfa_amr_claims inside the new isolated database, and then restores post-data with --exit-on-error. The quarantine schema/table deny PUBLIC, anon and authenticated access. All 218 original claim rows remain either in Auth or the private quarantine; the 179 valid claims retain their sessions. The original archive remains byte-for-byte unchanged. No FK is suppressed or marked NOT VALID.

The complete recovery succeeded with all Auth FKs enforced. Snapshot counts match: 179 profiles, 192 Auth users, 453 wallet accounts, 6067 transactions and 15966 postings. Financial sums, original settings, and all money_real_invariants checks match/pass. Comparisons normalize session time zone to UTC to avoid hashing display-only timestamp offsets.

All five pending candidate migrations applied successfully to the isolated restored production schema. Existing balances, ledger rows, users and production financial settings remained unchanged. New FPS cash_enabled stayed false.

This is a verified recovery with an explicit preserved-row quarantine step, not a clean unmodified restore. The user explicitly approved this restored-copy quarantine procedure on 2026-10-30. Production Auth cleanup is not authorized or performed. Logical restoration uses no-owner/no-privileges, so hosted ACLs, service secrets, runtime connectivity and rollback remain separate gates.

No synthetic staging balances, users or receipts were copied to this database or to production.
