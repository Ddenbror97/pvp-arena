-- _withdraw_basis_writer_lock() is trigger-only (before insert on ledger_transactions).
-- It is not an API entrypoint; callers must not invoke it via PostgREST/RPC.
-- Default EXECUTE to PUBLIC would flag security advisors and is not intentional.

revoke all on function public._withdraw_basis_writer_lock() from public, anon, authenticated;
grant execute on function public._withdraw_basis_writer_lock() to service_role;

-- 20261013220000 replaced these bodies; re-assert least privilege (idempotent).
revoke all on function public._withdraw_basis_rebuild_full() from public, anon, authenticated;
grant execute on function public._withdraw_basis_rebuild_full() to service_role;

revoke all on function public._withdraw_basis_sync() from public, anon, authenticated;
grant execute on function public._withdraw_basis_sync() to service_role;
