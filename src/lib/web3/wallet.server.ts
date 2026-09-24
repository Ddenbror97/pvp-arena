import { buildWalletMessage, isValidEvmAddress, normalizeAddress, signatureMatches, shortAddress } from "./message";

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

async function admin(): Promise<Rpc> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (fn, args) => supabaseAdmin.rpc(fn as never, args as never) as never;
}

async function log(rpc: Rpc, event: string, userId: string, details: Record<string, unknown>) {
  const { error } = await rpc("wallet_log", { p_event: event, p_user: userId, p_details: details });
  if (error) console.error("wallet_log failed");
}

export type ChallengeResult = { ok: true; challengeId: string; message: string } | { ok: false; code: string };

export async function issueChallenge(userId: string, rawAddress: string): Promise<ChallengeResult> {
  if (!isValidEvmAddress(rawAddress) && !/^0x[0-9a-f]{40}$/.test(rawAddress)) return { ok: false, code: "INVALID_ADDRESS" };
  const { checksummed } = normalizeAddress(rawAddress);
  const rpc = await admin();
  await rpc("wallet_touch", { p_user: userId, p_address: checksummed });
  const { data, error } = await rpc("wallet_issue_challenge", { p_user: userId, p_address: checksummed });
  if (error || !data) return { ok: false, code: "GENERIC" };
  const r = data as { ok: boolean; code?: string; id: string; address: string; nonce: string; issued_at: string; expires_at: string; version: number };
  if (!r.ok) {
    await log(rpc, "WALLET_VERIFICATION_FAILED", userId, { address: shortAddress(checksummed), reason: r.code });
    return { ok: false, code: r.code ?? "GENERIC" };
  }
  await log(rpc, "WALLET_VERIFICATION_REQUESTED", userId, { address: shortAddress(checksummed) });
  return {
    ok: true,
    challengeId: r.id,
    message: buildWalletMessage({ address: r.address, nonce: r.nonce, issuedAt: r.issued_at, expiresAt: r.expires_at, version: r.version }),
  };
}

export type VerifyResult = { ok: true; address: string } | { ok: false; code: string };

export async function verifyChallenge(userId: string, challengeId: string, signature: string): Promise<VerifyResult> {
  const rpc = await admin();
  const { data, error } = await rpc("wallet_get_challenge", { p_id: challengeId, p_user: userId });
  if (error) return { ok: false, code: "GENERIC" };
  const c = data as { address: string; nonce: string; issued_at: string; expires_at: string; version: number; consumed: boolean; expired: boolean } | null;
  const fail = async (code: string, addr?: string) => {
    await log(rpc, "WALLET_VERIFICATION_FAILED", userId, { address: addr ? shortAddress(addr) : null, reason: code });
    return { ok: false as const, code };
  };
  if (!c) return fail("NOT_FOUND");
  if (c.consumed) return fail("CONSUMED", c.address);
  if (c.expired) return fail("EXPIRED", c.address);
  // Message is rebuilt from the stored challenge, never from browser input.
  const message = buildWalletMessage({ address: c.address, nonce: c.nonce, issuedAt: c.issued_at, expiresAt: c.expires_at, version: c.version });
  if (!(await signatureMatches(message, signature, c.address))) return fail("INVALID_SIGNATURE", c.address);
  const { normalized } = normalizeAddress(c.address);
  const res = await rpc("wallet_consume_and_verify", { p_id: challengeId, p_user: userId, p_normalized: normalized });
  if (res.error || !res.data) return fail("GENERIC", c.address);
  const r = res.data as { ok: boolean; code?: string };
  if (!r.ok) return fail(r.code ?? "GENERIC", c.address);
  await log(rpc, "WALLET_VERIFIED", userId, { address: shortAddress(c.address) });
  return { ok: true, address: c.address };
}

export const CLIENT_EVENTS = ["WALLET_CONNECTION_STARTED", "WALLET_CONNECTED", "WALLET_DISCONNECTED"] as const;

export async function recordEvent(userId: string, event: (typeof CLIENT_EVENTS)[number], address: string | null) {
  const rpc = await admin();
  let safe: string | null = null;
  if (address && /^0x[0-9a-fA-F]{40}$/.test(address)) {
    safe = shortAddress(normalizeAddress(address).checksummed);
    if (event === "WALLET_CONNECTED") await rpc("wallet_touch", { p_user: userId, p_address: normalizeAddress(address).checksummed });
  }
  await log(rpc, event, userId, { address: safe });
  return { ok: true };
}
