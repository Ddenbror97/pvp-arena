/**
 * Pure matching rules for Base deposits. A balance change is not an input:
 * a credit needs the transfer itself, from a transaction, a log, or a trace.
 */

type NativeTxView = {
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
  if (!nativeTransferMatches(a, dest, units) || !nativeTransferMatches(b, dest, units))
    return false;
  return a!.from!.toLowerCase() === b!.from!.toLowerCase();
}

type Erc20LogView = {
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
  if ((log.topics[1] ?? "").slice(-40).toLowerCase() !== expected.from.toLowerCase().slice(2))
    return false;
  if ((log.topics[2] ?? "").slice(-40).toLowerCase() !== expected.to.toLowerCase().slice(2))
    return false;
  try {
    return BigInt(log.data) === expected.units;
  } catch {
    return false;
  }
}
