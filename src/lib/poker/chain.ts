/**
 * The player's side of the deck fairness protocol (docs/POKER.md). Each seat commits the
 * head of a SHA-256 hash chain; every hand reveals the next preimage. Only the secret end
 * of each chain is stored (localStorage, per user); links are rebuilt on demand.
 */
import { buildChain, randomSecret } from "@/lib/fairness/poker";

const LENGTH = 300;
/** Rotate before the chain runs out so a hand never lacks a preimage. */
const ROTATE_AT = 8;
const KEEP_MS = 14 * 24 * 3600 * 1000;

type Stored = { secret: string; created: number };

const key = (userId: string) => `pvp-poker-chains:${userId}`;
const cache = new Map<string, string[]>();

function read(userId: string): Stored[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)) ?? "[]") as Stored[];
    return Array.isArray(raw) ? raw.filter((c) => /^[0-9a-f]{64}$/.test(c.secret)) : [];
  } catch {
    return [];
  }
}

function write(userId: string, chains: Stored[]) {
  try {
    const now = Date.now();
    localStorage.setItem(
      key(userId),
      JSON.stringify(chains.filter((c) => now - c.created < KEEP_MS)),
    );
  } catch {
    /* private mode: chains live for this page only */
  }
}

async function links(secret: string) {
  let l = cache.get(secret);
  if (!l) {
    l = await buildChain(secret, LENGTH);
    cache.set(secret, l);
  }
  return l;
}

/** A fresh chain, persisted before its head is sent so a reload can still reveal. */
export async function newChainHead(userId: string): Promise<string> {
  const secret = randomSecret();
  write(userId, [...read(userId), { secret, created: Date.now() }]);
  return (await links(secret))[0]!;
}

/** The preimage of `link` from any stored chain, or null if this browser never made it. */
export async function revealFor(userId: string, link: string): Promise<string | null> {
  const want = link.toLowerCase();
  for (const c of read(userId)) {
    const l = await links(c.secret);
    const i = l.indexOf(want);
    if (i >= 0 && i < l.length - 1) return l[i + 1]!;
  }
  return null;
}

/** True when the seat's committed link can't be continued from this browser, or nearly ran out. */
export async function chainNeedsRotation(userId: string, link: string | null | undefined) {
  if (!link) return true;
  const want = link.toLowerCase();
  for (const c of read(userId)) {
    const l = await links(c.secret);
    const i = l.indexOf(want);
    if (i >= 0) return l.length - 1 - i <= ROTATE_AT;
  }
  return true;
}
