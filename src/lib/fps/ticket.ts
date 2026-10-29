export type Admission = {
  v: 1;
  aud: "fps-duel";
  matchId: string;
  sub: string;
  role: "player" | "spectator";
  nonce: string;
  exp: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const decode = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function key(secret: string) {
  if (secret.length < 32) throw new Error("FPS runtime key must contain at least 32 characters");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signAdmission(claims: Admission, secret: string): Promise<string> {
  const body = encode(new TextEncoder().encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign("HMAC", await key(secret), new TextEncoder().encode(body));
  return `${body}.${encode(new Uint8Array(sig))}`;
}

export async function verifyAdmission(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<Admission | null> {
  if (token.length > 2048) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        await key(secret),
        decode(parts[1]),
        new TextEncoder().encode(parts[0]),
      ))
    )
      return null;
    const c = JSON.parse(new TextDecoder().decode(decode(parts[0]))) as Admission;
    if (
      c.v !== 1 ||
      c.aud !== "fps-duel" ||
      !UUID.test(c.matchId) ||
      !UUID.test(c.sub) ||
      !UUID.test(c.nonce) ||
      !["player", "spectator"].includes(c.role) ||
      !Number.isSafeInteger(c.exp) ||
      c.exp <= now ||
      c.exp > now + 65_000
    )
      return null;
    return c;
  } catch {
    return null;
  }
}

export async function equalSecret(a: string, b: string): Promise<boolean> {
  if (b.length < 32 || a.length > 256) return false;
  const hashes = await Promise.all(
    [a, b].map((s) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
  );
  const left = new Uint8Array(hashes[0]!),
    right = new Uint8Array(hashes[1]!);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i]! ^ right[i]!;
  return difference === 0;
}
