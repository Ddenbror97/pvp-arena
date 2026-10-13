/** Satoshi quote arguments for btcpay_request_payout in isolated tests. */
export const BTC_QUOTE_RATE = "82606000000";

export function quotedSats(cents: number): string {
  return ((BigInt(cents) * 1_000_000_000_000n) / BigInt(BTC_QUOTE_RATE)).toString();
}

export function quoteExpiry(): string {
  return new Date(Date.now() + 180_000).toISOString();
}
