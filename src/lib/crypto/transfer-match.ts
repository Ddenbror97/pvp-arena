/**
 * Pure matching rules for Base deposits. A balance change is not an input:
 * a credit needs the transfer itself, from a transaction, a log, or a trace.
 */

export type NativeTxView = {
  from?: string | null;
  to?: string | null;
  value?: bigint | null;
};

/** Top-level native transfer. The sender may be a contract; only to and value identify the deposit. */
export function nativeTransferMatches(
  tx: NativeTxView | null | undefined,
  dest: string,
  units: bigint,
): boolean {
  if (!tx?.from || !tx.to || tx.value == null) return false;
  return tx.to.toLowerCase() === dest.toLowerCase() && tx.value === units;
}

/** Two providers must report the same sender, recipient, and value. */
export function nativeTransfersAgree(
  a: NativeTxView | null | undefined,
  b: NativeTxView | null | undefined,
  dest: string,
  units: bigint,
): boolean {
  if (!nativeTransferMatches(a, dest, units) || !nativeTransferMatches(b, dest, units)) return false;
  return a!.from!.toLowerCase() === b!.from!.toLowerCase();
}

export type Erc20LogView = {
  address?: string | null;
  topics?: readonly string[] | null;
  data?: string | null;
};

/** One ERC-20 Transfer log. Other tokens and other recipients do not match. */
export function erc20LogMatches(
  log: Erc20LogView | null | undefined,
  expected: { token: string; from: string; to: string; units: bigint; transferTopic: string },
): boolean {
  if (!log?.address || !log.topics || log.topics.length < 3 || !log.data) return false;
  if (log.address.toLowerCase() !== expected.token.toLowerCase()) return false;
  if ((log.topics[0] ?? "").toLowerCase() !== expected.transferTopic.toLowerCase()) return false;
  if ((log.topics[1] ?? "").slice(-40).toLowerCase() !== expected.from.toLowerCase().slice(2)) return false;
  if ((log.topics[2] ?? "").slice(-40).toLowerCase() !== expected.to.toLowerCase().slice(2)) return false;
  try {
    return BigInt(log.data) === expected.units;
  } catch {
    return false;
  }
}

export type InternalHit = { hash: string; to: string; value: bigint };

export type InternalTrace<T extends InternalHit = InternalHit> = T & { logIndex: number };

/**
 * Unexplained internal ETH is searched from genesis. A sliding window would
 * eventually walk past the payout and never look again.
 */
export function internalSearchFloor(_tip: bigint): bigint {
  return 0n;
}

/**
 * Decide what an internal-ETH scan may record.
 * `open` means every source failed, so the payout is not processed.
 * `none` means a source answered and did not confirm this transfer.
 * A balance change is not an input.
 */
export function settleInternalTransfers<T extends InternalTrace>(
  groups: Array<T[] | null>,
): { transfers: T[]; status: "open" | "recorded" | "none" } {
  if (groups.every((group) => group == null)) return { transfers: [], status: "open" };
  const flat = groups.flatMap((group) => group ?? []);
  const transfers = flat.filter((tx, index) => {
    const earlier = flat.findIndex(
      (other) =>
        other.hash.toLowerCase() === tx.hash.toLowerCase() &&
        other.to.toLowerCase() === tx.to.toLowerCase() &&
        other.value === tx.value &&
        other.logIndex === tx.logIndex,
    );
    if (earlier !== index) return false;
    return internalTransferConfirmed(
      groups.map((group) => group?.map((hit) => ({ hash: hit.hash, to: hit.to, value: hit.value })) ?? null),
      tx.hash,
      tx.to,
      tx.value,
    );
  });
  return { transfers, status: transfers.length > 0 ? "recorded" : "none" };
}

/**
 * Confirm one internal transfer.
 * `null` means that source could not trace. An empty list means it traced and found nothing.
 * A source that found nothing disagrees with a source that found the transfer.
 * Two hits of the same value in one transaction are ambiguous and are not confirmed.
 */
export function internalTransferConfirmed(
  results: Array<InternalHit[] | null>,
  hash: string,
  dest: string,
  units: bigint,
): boolean {
  const tx = hash.toLowerCase();
  const to = dest.toLowerCase();
  let sources = 0;
  for (const list of results) {
    if (list == null) continue;
    const matched = list.filter(
      (hit) => hit.hash.toLowerCase() === tx && hit.to.toLowerCase() === to && hit.value === units,
    );
    if (matched.length !== 1) return false;
    sources++;
  }
  return sources > 0;
}
