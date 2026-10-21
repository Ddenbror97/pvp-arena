import { mempoolTxUrl } from "@/lib/crypto/btc-trace";

/** One quiet line. Rendered only when a real mainnet transaction id exists. */
export function BitcoinTxTrace({ txid }: { txid: string | null | undefined }) {
  const href = mempoolTxUrl(txid);
  if (!href) return null;
  return (
    <p className="text-xs leading-snug text-muted-foreground">
      Trace your transaction{" "}
      <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
        here
      </a>
      .
    </p>
  );
}
