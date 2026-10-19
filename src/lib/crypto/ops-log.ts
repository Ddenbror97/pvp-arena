const BLOCKED_KEY =
  /token|xprv|xpub|private|secret|seed|bearer|authorization|password|raw_tx|signed_raw/i;

/**
 * One JSON line for the worker log. Values that look like keys, RPC URLs, or
 * bearer tokens are redacted. The caller must not pass those fields.
 */
export function logCryptoOps(
  event: string,
  fields: Record<string, string | number | boolean | null>,
): void {
  const safe: Record<string, string | number | boolean | null> = { event };
  for (const [key, value] of Object.entries(fields)) {
    if (BLOCKED_KEY.test(key)) continue;
    if (typeof value === "string") safe[key] = redactOpsValue(value);
    else safe[key] = value;
  }
  console.log(JSON.stringify(safe));
}

/** Strips RPC URLs, extended keys, and 32-byte hex from a log value. */
export function redactOpsValue(message: string): string {
  let out = message.replace(/https?:\/\/\S+/g, "[rpc]");
  out = out.replace(
    /\b(?:xprv|xpub|yprv|ypub|zprv|zpub|tprv|tpub)[1-9A-HJ-NP-Za-km-z]{20,}\b/g,
    "[redacted]",
  );
  out = out.replace(/0x[0-9a-fA-F]{64}/g, "[redacted]");
  return out.slice(0, 240);
}

/** Counts of action codes. Addresses and transaction bytes are omitted. */
export function countActions(actions: readonly { action: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of actions) {
    const action = row.action.slice(0, 80);
    counts[action] = (counts[action] ?? 0) + 1;
  }
  return counts;
}
