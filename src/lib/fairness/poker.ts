/**
 * Poker v1 fairness (docs/POKER.md, "Provably fair deck"). Mirrors `_poker_entropy`
 * and `_poker_shuffle` in SQL.
 *
 * Every dealt player contributes the next preimage of a SHA-256 hash chain they
 * committed to before the hand's server seed commitment was published.
 *
 *   entropy = SHA-256("PVPCasino:poker:v1:entropy:{hand}:" + "{seat}={value}|..." sorted by seat)
 *   draw(i, counter) = first 4 bytes (big-endian) of
 *     HMAC-SHA256(server_seed, "PVPCasino:poker:v1:{hand}:{entropy}:{i}:{counter}")
 *   Fisher-Yates from i = 51 down to 1 over [0..51], j = draw mod (i + 1),
 *   rejecting draws >= floor(2^32 / (i + 1)) * (i + 1).
 */
import { bytesToHex, hexToBytes, hmacKey, hmacSha256, sha256Hex } from "./core";

export const POKER_PROTOCOL = "v1";
const MAX_COUNTER = 1000;

export type EntropyReveal = { seat: number; value: string };

export function entropyMessage(handId: number | string, reveals: readonly EntropyReveal[]) {
  const parts = [...reveals]
    .sort((a, b) => a.seat - b.seat)
    .map((r) => `${r.seat}=${r.value.toLowerCase()}`);
  return `PVPCasino:poker:v1:entropy:${handId}:${parts.join("|")}`;
}

export async function pokerEntropy(handId: number | string, reveals: readonly EntropyReveal[]) {
  return sha256Hex(new TextEncoder().encode(entropyMessage(handId, reveals)));
}

export const shuffleMessage = (
  handId: number | string,
  entropy: string,
  i: number,
  counter: number,
) => `PVPCasino:poker:v1:${handId}:${entropy}:${i}:${counter}`;

export async function pokerShuffle(seedHex: string, handId: number | string, entropyHex: string) {
  const key = await hmacKey(seedHex);
  const deck = Array.from({ length: 52 }, (_, i) => i);
  const counters: number[] = [];
  for (let i = 51; i >= 1; i--) {
    const n = i + 1;
    const lim = Math.floor(2 ** 32 / n) * n;
    let j = -1;
    let counter = 0;
    for (; counter <= MAX_COUNTER; counter++) {
      const h = await hmacSha256(key, shuffleMessage(handId, entropyHex, i, counter));
      const r = ((h[0]! << 24) >>> 0) + (h[1]! << 16) + (h[2]! << 8) + h[3]!;
      if (r < lim) {
        j = r % n;
        break;
      }
    }
    if (j < 0) throw new Error("DRAW_EXHAUSTED");
    counters.push(counter);
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return { deck, counters };
}

/** Next link check: SHA-256(bytes(value)) must equal the committed link. */
export async function chainStep(valueHex: string) {
  return sha256Hex(hexToBytes(valueHex));
}

/**
 * A hash chain of `length` links. links[0] is the public head; links[k] is
 * revealed for the k-th hand and satisfies SHA-256(links[k]) = links[k-1].
 */
export async function buildChain(secretHex: string, length: number) {
  if (!/^[0-9a-f]{64}$/.test(secretHex)) throw new Error("INVALID_SECRET");
  if (!Number.isInteger(length) || length < 1 || length > 5000) throw new Error("INVALID_LENGTH");
  const links = new Array<string>(length + 1);
  links[length] = secretHex;
  for (let k = length; k > 0; k--) links[k - 1] = await chainStep(links[k]!);
  return links;
}

export function randomSecret(): string {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return bytesToHex(b);
}

export type PokerHandProof = {
  id: number | string;
  server_seed: string;
  server_seed_hash: string;
  entropy: string;
  reveals: EntropyReveal[];
  /** Committed links frozen when the hand opened, by seat. */
  links: Record<number, string>;
  /** The commitment this client saw before the deal, if it watched the hand live. */
  observed_seed_hash?: string | null;
};

/** Full verification of a completed hand: commitment, every reveal, entropy, and the deck. */
export async function verifyPokerHand(h: PokerHandProof) {
  const hashOk = (await sha256Hex(hexToBytes(h.server_seed))) === h.server_seed_hash;
  // null: not watched live, so only the published commitment can be checked.
  const commitmentOk =
    h.observed_seed_hash == null
      ? null
      : h.observed_seed_hash.toLowerCase() === h.server_seed_hash.toLowerCase();
  const revealChecks = await Promise.all(
    h.reveals.map(async (r) => ({
      seat: r.seat,
      ok: (await chainStep(r.value)) === h.links[r.seat]?.toLowerCase(),
    })),
  );
  const entropy = await pokerEntropy(h.id, h.reveals);
  const { deck } = await pokerShuffle(h.server_seed, h.id, entropy);
  return {
    hashOk,
    commitmentOk,
    revealsOk:
      revealChecks.every((r) => r.ok) && revealChecks.length === Object.keys(h.links).length,
    revealChecks,
    entropyOk: entropy === h.entropy,
    deck,
  };
}
