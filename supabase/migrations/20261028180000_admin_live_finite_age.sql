-- admin_ops_query('live') subtracts last_run_at from clock_timestamp().
-- worker_tick_gate.last_run_at defaults to -infinity until the first tick.
-- That subtraction raises, and the handler turns the whole live view into
-- ADMIN_UNAVAILABLE. A worker that has never run now reports a null age.

do $mig$
declare
  src text;
  needle constant text := 'extract(epoch from (clock_timestamp() - last_run_at))';
  repl constant text := 'case when last_run_at > ''-infinity''::timestamptz and last_run_at < ''infinity''::timestamptz then extract(epoch from (clock_timestamp() - last_run_at)) end';
  n int;
begin
  select pg_get_functiondef('public.admin_ops_query(text, jsonb)'::regprocedure) into src;
  n := (length(src) - length(replace(src, needle, ''))) / length(needle);
  if n <> 2 then
    raise exception 'admin_ops_query age expression found % times', n;
  end if;
  execute replace(src, needle, repl);
end
$mig$;
