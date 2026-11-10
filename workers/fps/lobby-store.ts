/**
 * A lobby's small tables, kept in the Durable Object's storage (foundation audit 2026-11-10).
 * The lobbies held their room lists only in memory: after an eviction or a deploy the lobby
 * forgot every open match, and new players started fresh matches instead of filling them.
 * The tables are tiny (one row per live match), so the whole table is written on each change.
 */
export async function loadTable<V>(ctx: DurableObjectState, key: string) {
  return new Map<string, V>((await ctx.storage.get<Array<[string, V]>>(key)) ?? []);
}

export function saveTable<V>(ctx: DurableObjectState, key: string, table: Map<string, V>) {
  // Not awaited: the object's output gate holds the response until the write is durable.
  void ctx.storage.put(key, [...table]);
}

/** Rooms report at least this often while they run, so a quiet match is not forgotten. */
export const LOBBY_HEARTBEAT_MS = 60_000;
