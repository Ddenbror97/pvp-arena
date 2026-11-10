import type { BrCheckpoint } from "../../src/lib/fps/br/match";

/**
 * The battle royale checkpoint as stored values (foundation audit 2026-11-10). One value held
 * the whole match, about 1 MB, nine tenths of it the ground loot, against a limit of 2 MB per
 * stored value. The loot is stored beside the rest in chunks of LOOT_CHUNK rows.
 */
export const LOOT_CHUNK = 4000;
export const LOOT_KEY = "br:checkpoint:loot:";
type LootRows = NonNullable<BrCheckpoint["lootRows"]>;

/** The checkpoint without its loot, and the loot in chunks. */
export function splitCheckpoint(checkpoint: BrCheckpoint & { lootRows: LootRows }) {
  const { lootRows, ...data } = checkpoint;
  const chunks: LootRows[] = [];
  for (let i = 0; i < lootRows.length; i += LOOT_CHUNK)
    chunks.push(lootRows.slice(i, i + LOOT_CHUNK));
  return { data: data as BrCheckpoint, chunks };
}

/** The stored keys of `count` loot chunks. */
export const lootKeys = (count: number) =>
  Array.from({ length: Math.max(0, count) }, (_, i) => `${LOOT_KEY}${i}`);

/** The checkpoint with its loot back (chunks missing from storage count as empty). */
export function joinCheckpoint(
  data: BrCheckpoint,
  keys: string[],
  stored: Map<string, LootRows>,
): BrCheckpoint {
  const lootRows: LootRows = [];
  for (const key of keys) for (const row of stored.get(key) ?? []) lootRows.push(row);
  return { ...data, lootRows };
}
