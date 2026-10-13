/** BTCPay-Sig is `sha256=` plus the hex HMAC-SHA256 of the raw body. */
export async function btcpaySignature(secret: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}`;
}

export function signaturesMatch(expected: string, presented: string): boolean {
  if (expected.length !== presented.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ presented.charCodeAt(i);
  return diff === 0;
}

export async function verifyBtcpaySignature(
  secret: string,
  rawBody: string,
  header: string | null,
): Promise<boolean> {
  if (!header || !secret) return false;
  const expected = await btcpaySignature(secret, rawBody);
  return signaturesMatch(expected, header.trim());
}
