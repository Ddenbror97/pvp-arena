/**
 * Seed commitments this browser saw while a hand was live. The verifier compares the
 * published hash with the one shown before the deal, so a server that swapped the
 * commitment afterwards would fail verification on the players' own devices.
 */
const KEY = "pvp-poker-commitments";
const MAX = 300;
const memory = new Map<string, string>();

function load(): [string, string][] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [...memory];
  }
}

/** First sighting wins: a later, different hash for the same hand must not overwrite it. */
export function rememberCommitment(handId: number | string, hash: string) {
  const id = String(handId);
  if (memory.has(id)) return;
  const all = load();
  if (all.some(([k]) => k === id)) return;
  memory.set(id, hash);
  all.push([id, hash]);
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(-MAX)));
  } catch {
    /* private mode: kept for this page only */
  }
}

export function observedCommitment(handId: number | string): string | null {
  const id = String(handId);
  return memory.get(id) ?? load().find(([k]) => k === id)?.[1] ?? null;
}
