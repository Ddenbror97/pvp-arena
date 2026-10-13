/** True when the account open in the extension is one this player already verified. */
export function matchingVerifiedAddress(
  connected: string,
  verified: readonly string[],
): string | null {
  const needle = connected.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(needle)) return null;
  return verified.find((item) => item.toLowerCase() === needle) ?? null;
}
