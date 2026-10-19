const WALLET_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type LinkedWallet = {
  address: string;
  becamePrimaryAt?: string | null;
};

/**
 * A cashout may go only to a wallet this account has verified.
 * A wallet that became primary in the last 24 hours waits, once the account
 * already has another verified wallet. The first wallet can cash out immediately.
 */
export function withdrawalDestinationAllowed(
  wallets: readonly LinkedWallet[],
  destination: string,
  now = Date.now(),
): { ok: true } | { ok: false; reason: "UNLINKED" | "COOLDOWN" } {
  const dest = destination.toLowerCase();
  const verified = wallets.filter((wallet) => /^0x[0-9a-f]{40}$/.test(wallet.address));
  const match = verified.find((wallet) => wallet.address.toLowerCase() === dest);
  if (!match) return { ok: false, reason: "UNLINKED" };
  const hasAnother = verified.some((wallet) => wallet.address.toLowerCase() !== dest);
  if (!hasAnother) return { ok: true };
  const becamePrimary = match.becamePrimaryAt ? Date.parse(match.becamePrimaryAt) : Number.NaN;
  if (!Number.isFinite(becamePrimary) || now - becamePrimary < WALLET_CHANGE_COOLDOWN_MS) {
    return { ok: false, reason: "COOLDOWN" };
  }
  return { ok: true };
}
