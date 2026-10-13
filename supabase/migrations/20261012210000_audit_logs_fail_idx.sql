-- Build outside a transaction. CREATE INDEX CONCURRENTLY cannot run inside
-- the migration transaction this project uses, and a plain CREATE INDEX takes
-- ShareLock, which blocks writes on audit_logs for the whole build.
--
-- Matches admin_ops_query('live') in 20261006170100:
--   where action ~* '(fail|error|critical)' order by id desc limit 1
-- On 2026-10-12 the table had 195,601 rows and zero rows matched that
-- predicate, so the primary key walk reads the table to prove the limit is
-- empty. This predicate is not a copy of audit_logs_game (game_id, id).
--
-- Apply with scripts that autocommit this statement, then record version
-- 20261012210000. Do not wrap it in BEGIN.

create index concurrently if not exists audit_logs_fail_id_idx
  on public.audit_logs (id desc)
  where action ~* '(fail|error|critical)';
