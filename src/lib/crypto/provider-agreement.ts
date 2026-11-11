/**
 * Whether independent RPC providers agree that a deposit's transaction is on the chain, before
 * it is credited. A provider either attests to it, cannot say (it no longer serves a block that
 * old, or did not answer), or says otherwise. Crediting needs two providers that attest and
 * match, and no provider that says otherwise.
 *
 * "Cannot say" used to count as disagreement. On 2026-11-11 a deposit 1.3 million blocks (three days) old, recorded late
 * from a skipped range, could not be credited because one of the two providers had stopped
 * serving its block. A third provider may now stand in for one that cannot say; it can never
 * outvote one that says otherwise.
 */
export type ProviderEvidence = {
  receipt: {
    status: string;
    blockHash: string;
    blockNumber: bigint;
    logs: ReadonlyArray<{
      logIndex: number | null;
      address: string;
      data: string;
      topics: readonly string[];
    }>;
  } | null;
  block: { hash: string | null; number: bigint | null; transactions: readonly unknown[] } | null;
};

export type Reading =
  | { kind: "attests"; blockHash: string; log: string | null }
  | { kind: "unavailable"; what: "receipt" | "block" }
  | { kind: "refuses"; why: "status" | "block_number" | "block_hash" | "not_in_block" | "log" };

/** What one provider's receipt and block say about `txHash` at `blockNumber`. */
export function readEvidence(
  evidence: ProviderEvidence,
  txHash: string,
  blockNumber: bigint,
  logIndex: number | null,
): Reading {
  const { receipt, block } = evidence;
  if (!receipt) return { kind: "unavailable", what: "receipt" };
  if (receipt.status !== "success") return { kind: "refuses", why: "status" };
  if (receipt.blockNumber !== blockNumber) return { kind: "refuses", why: "block_number" };
  if (!block) return { kind: "unavailable", what: "block" };
  if (block.hash !== receipt.blockHash || block.number !== blockNumber)
    return { kind: "refuses", why: "block_hash" };
  const wanted = txHash.toLowerCase();
  const included = block.transactions.some(
    (t) =>
      (typeof t === "string" ? t : (t as { hash?: string } | null)?.hash)?.toLowerCase() === wanted,
  );
  if (!included) return { kind: "refuses", why: "not_in_block" };
  let log: string | null = null;
  if (logIndex != null) {
    const found = receipt.logs.find((l) => l.logIndex === logIndex);
    if (!found) return { kind: "refuses", why: "log" };
    log = [found.address.toLowerCase(), found.data, ...found.topics].join("|");
  }
  return { kind: "attests", blockHash: receipt.blockHash, log };
}

export type Agreement = { ok: true; by: string[] } | { ok: false; reason: string };

/** Whether anything a provider said rules the credit out, whatever another provider adds. */
function ruledOut(readings: Record<string, Reading>): boolean {
  return Object.values(readings).some((r) => r.kind === "refuses");
}

/**
 * Whether another provider could still make the difference: nobody says otherwise, and fewer
 * than two attest. Two that attest and differ are a disagreement no third provider settles.
 */
export function anotherCouldHelp(readings: Record<string, Reading>): boolean {
  if (ruledOut(readings)) return false;
  return Object.values(readings).filter((r) => r.kind === "attests").length < 2;
}

/** Two attesting providers that match, and none that says otherwise. */
export function agreement(readings: Record<string, Reading>): Agreement {
  const names = Object.keys(readings);
  const summary = names
    .map((name) => {
      const r = readings[name]!;
      return `${name}:${r.kind === "attests" ? "ok" : r.kind === "refuses" ? `refuses_${r.why}` : `no_${r.what}`}`;
    })
    .join(",");
  if (ruledOut(readings)) return { ok: false, reason: summary };
  const attesting = names.filter((name) => readings[name]!.kind === "attests");
  if (attesting.length < 2) return { ok: false, reason: summary };
  const first = readings[attesting[0]!] as Extract<Reading, { kind: "attests" }>;
  for (const name of attesting.slice(1)) {
    const other = readings[name] as Extract<Reading, { kind: "attests" }>;
    if (other.blockHash !== first.blockHash || other.log !== first.log)
      return { ok: false, reason: `${summary},mismatch` };
  }
  return { ok: true, by: attesting };
}
