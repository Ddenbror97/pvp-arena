import { isOnchainMethod, type BtcPayment } from "@/lib/crypto/btcpay/policy";

const TXID = /^[0-9a-f]{64}$/;

const EVM_EXPLORERS: Record<number, string> = {
  8453: "https://basescan.org",
  1: "https://etherscan.io",
};

/** A mainnet Bitcoin transaction id. Anything else is not a public explorer target. */
export function bitcoinTxid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toLowerCase();
  return TXID.test(id) ? id : null;
}

/** Public mainnet status page. The product does not offer a testnet explorer. */
export function mempoolTxUrl(txid: unknown): string | null {
  const id = bitcoinTxid(txid);
  return id ? `https://mempool.space/tx/${id}` : null;
}

/**
 * Explorer for a funding row. Bitcoin ids (no chain) go to mempool.space.
 * An EVM hash keeps its chain explorer, including the previous Base fallback.
 */
export function fundingExplorerHref(hash: string | null, chainId: number | null): string | null {
  if (!hash) return null;
  if (chainId == null) {
    const btc = mempoolTxUrl(hash);
    if (btc) return btc;
    return hash.startsWith("0x") ? `https://basescan.org/tx/${hash}` : null;
  }
  const explorer = EVM_EXPLORERS[chainId] ?? "https://basescan.org";
  return `${explorer}/tx/${hash}`;
}

/**
 * On-chain id a player can follow. A payment still confirming wins over one
 * already settled. Lightning and invalid outputs are not links.
 */
export function traceablePaymentTxid(
  payments: readonly BtcPayment[] | null,
  onchainMethod: string,
): string | null {
  if (!payments) return null;
  let settled: string | null = null;
  for (const payment of payments) {
    if (!isOnchainMethod(payment.method, onchainMethod)) continue;
    const id = bitcoinTxid(payment.txid);
    if (!id) continue;
    if (payment.status === "Processing") return id;
    if (payment.status === "Settled" && !settled) settled = id;
  }
  return settled;
}
