import { PHYSICS_VERSION, simulate, type ShotInput } from "./physics";
import { applyPlayedShot, placeCue, stateHash, type ShotEvent, type TableState } from "./rules";
import { replayMatch, type MatchStep } from "./verify";

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
  physics?: "pool-phys-v1" | "pool-phys-v2" | "pool-phys-v3",
): Promise<{ ok: true; winner: "A" | "B" | null; hash: string } | { ok: false; error: string }> {
  const replay = await replayMatch(seed, publishedHash, steps, physics ?? PHYSICS_VERSION);
  if (!replay.ok) return { ok: false, error: "REPLAY_MISMATCH" };
  return { ok: true, winner: replay.winner, hash: replay.finalHash };
}
