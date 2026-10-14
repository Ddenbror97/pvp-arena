export type RpcFailure = { code?: string | null | undefined; status?: number | null | undefined };

// Failures a second identical call can succeed past: connection loss, gateway/server
// restarts, serialization or deadlock aborts. Anything else (read-only transaction 405,
// permission denied, business raises, bad input) fails the same way again.
const TRANSIENT_CODES = new Set([
  "40001", // serialization_failure
  "40P01", // deadlock_detected
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
  "53300", // too_many_connections
  "PGRST000", // PostgREST could not connect to the database
  "PGRST001",
  "PGRST002", // schema cache not loaded yet
  "PGRST003", // pool acquisition timeout
]);

export function isTransientRpcFailure(f: RpcFailure): boolean {
  const code = f.code ?? "";
  if (TRANSIENT_CODES.has(code) || code.startsWith("08")) return true;
  // A database error code is authoritative; status alone only classifies gateway/network failures.
  if (code) return false;
  const s = f.status;
  if (s == null) return false;
  return s === 0 || s === 502 || s === 503 || s === 504 || (s >= 520 && s <= 527);
}
