/** A slower read must not rewind a match the viewer has already moved forward. */
export function preferNewerSlotGame<T extends { id: number; status: string; next_spin: number }>(
  prev: T | null | undefined,
  next: T | null,
): T | null {
  if (!next) return prev ?? null;
  if (!prev || prev.id !== next.id) return next;
  const prevDone = prev.status === "COMPLETED" || prev.status === "CANCELLED";
  const nextDone = next.status === "COMPLETED" || next.status === "CANCELLED";
  if (prevDone && !nextDone) return prev;
  if (next.next_spin < prev.next_spin) return prev;
  return next;
}

/**
 * Fetch first, then merge with the cache as it stands when the response arrives.
 * Reading the cache before the await drops a spin that landed while the request was in flight.
 */
export async function reconcileAfter<P, N, R>(
  load: () => Promise<N>,
  read: () => P,
  merge: (prev: P, next: N) => R,
): Promise<R> {
  const next = await load();
  return merge(read(), next);
}

/**
 * Last spin number when the cache is 1..n with no gaps.
 * A hole or a cache that does not start at 1 asks for the full history.
 */
export function slotSpinCursor(spins: { spin_no: number }[] | undefined): number {
  if (!spins || spins.length === 0) return 0;
  const nos = spins.map((spin) => spin.spin_no).sort((a, b) => a - b);
  if (nos[0] !== 1) return 0;
  for (let i = 0; i < nos.length; i++) {
    if (nos[i] !== i + 1) return 0;
  }
  return nos[nos.length - 1]!;
}

/** Keep a spin the server has already returned if an older poll arrives later. Server rows win ties. */
export function mergeSlotSpins<T extends { game_id: number; spin_no: number }>(
  prev: T[] | undefined,
  next: T[],
): T[] {
  const gameId = next[0]?.game_id ?? prev?.[0]?.game_id;
  const byNo = new Map<number, T>();
  for (const spin of prev ?? []) {
    if (gameId == null || spin.game_id === gameId) byNo.set(spin.spin_no, spin);
  }
  for (const spin of next) byNo.set(spin.spin_no, spin);
  return [...byNo.values()].sort((a, b) => a.spin_no - b.spin_no);
}
