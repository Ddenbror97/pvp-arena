import { PHYSICS_VERSION, simulate, type PhysicsId, type ShotInput } from "./physics";
import { applyPlayedShot, placeCue, stateHash, type ShotEvent, type TableState } from "./rules";
import { committedSeedOk, resumeReplay, type MatchStep, type ReplayCursor } from "./verify";

export function playShot(
  state: TableState,
  input: ShotInput,
): { ok: false; error: string } | { ok: true; state: TableState; event: ShotEvent; hash: string } {
  const working = structuredClone(state);
  const placed = placeCue(working, input);
  if (placed) return { ok: false, error: placed };
  const sim = simulate(working.balls, input, false, state.physics);
  const applied = applyPlayedShot(working, sim, input.calledPocket);
  if (applied.event.reason === "CALL_POCKET") return { ok: false, error: "CALL_POCKET" };
  const hash = stateHash(applied.state);
  return { ok: true, state: applied.state, event: applied.event, hash };
}

/**
 * The paid winner has to be the winner this replay derives. A server process
 * that names someone else must not settle.
 */
export async function confirmedWinner(
  seed: Uint8Array,
  publishedHash: string,
  steps: readonly MatchStep[],
  physics?: PhysicsId,
): Promise<{ ok: true; winner: "A" | "B" | null; hash: string } | { ok: false; error: string }> {
  const rolled = await confirmFrom(null, seed, publishedHash, steps, physics);
  return rolled;
}

const replayCursors = new Map<string, ReplayCursor>();
const REPLAY_CURSOR_MAX = 48;

function rememberCursor(key: string, cursor: ReplayCursor) {
  replayCursors.delete(key);
  replayCursors.set(key, cursor);
  while (replayCursors.size > REPLAY_CURSOR_MAX) {
    const oldest = replayCursors.keys().next().value;
    if (oldest == null) break;
    replayCursors.delete(oldest);
  }
}

/**
 * Same check as a from-scratch replay. A warm cursor rolls only the new step,
 * so one table's twentieth shot does not resimulate the break on the worker.
 * A stale cursor is discarded and the shot is rolled from the rack.
 */
export async function confirmStep(
  matchKey: string,
  seed: Uint8Array,
  publishedHash: string,
  steps: readonly MatchStep[],
  physics?: PhysicsId,
): Promise<{ ok: true; winner: "A" | "B" | null; hash: string } | { ok: false; error: string }> {
  const id = physics ?? PHYSICS_VERSION;
  const cacheKey = `${matchKey}:${publishedHash}:${id}`;
  const rolled = await confirmFrom(cacheKey, seed, publishedHash, steps, id);
  return rolled;
}

async function confirmFrom(
  cacheKey: string | null,
  seed: Uint8Array,
  publishedHash: string,
  steps: readonly MatchStep[],
  physics?: PhysicsId,
): Promise<{ ok: true; winner: "A" | "B" | null; hash: string } | { ok: false; error: string }> {
  if (!(await committedSeedOk(seed, publishedHash))) return { ok: false, error: "REPLAY_MISMATCH" };
  const id = physics ?? PHYSICS_VERSION;
  const seedKey = `${publishedHash}:${id}`;
  const cached = cacheKey ? (replayCursors.get(cacheKey) ?? null) : null;
  let rolled = resumeReplay(seed, seedKey, steps, id, cached);
  if (!rolled.ok && cached) {
    if (cacheKey) replayCursors.delete(cacheKey);
    rolled = resumeReplay(seed, seedKey, steps, id, null);
  }
  if (!rolled.ok) return { ok: false, error: "REPLAY_MISMATCH" };
  if (cacheKey) rememberCursor(cacheKey, rolled.cursor);
  return { ok: true, winner: rolled.state.winner, hash: rolled.cursor.lastHash };
}
