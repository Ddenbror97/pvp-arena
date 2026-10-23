import { PHYSICS_VERSION, simulate, type PhysicsId, type ShotInput } from "./physics";
import {
  ENGINE_VERSION,
  RULES_VERSION,
  applyForfeit,
  applyPlayedShot,
  applyTimeout,
  freshTable,
  placeCue,
  seedHash,
  stateHash,
  type Seat,
  type TableState,
} from "./rules";

/**
 * A pool match is proved by replaying published inputs. The rack seed only
 * places the balls. Each step is a shot, a timeout, or a forfeit. The winner
 * is the ruleset's output. A paid winner that disagrees with this replay is
 * not a verified result.
 */
export type MatchStep =
  | { kind: "shot"; input: ShotInput; hash: string }
  | { kind: "timeout"; hash: string }
  | { kind: "forfeit"; seat: Seat; hash: string };

export type Replay = {
  ok: boolean;
  engine: typeof ENGINE_VERSION;
  rules: typeof RULES_VERSION;
  seedOk: boolean;
  steps: { shot: number; ok: boolean; got: string; expected: string }[];
  finalHash: string;
  winner: TableState["winner"];
  reason: string | null;
};

export async function committedSeedOk(seed: Uint8Array, publishedHash: string): Promise<boolean> {
  return (await seedHash(seed)) === publishedHash;
}

export function stepsFromRecord(events: unknown): MatchStep[] | null {
  if (!Array.isArray(events)) return null;
  const steps: MatchStep[] = [];
  for (const raw of events) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as { kind?: unknown; seat?: unknown; state_hash?: unknown; input?: unknown };
    if (typeof row.state_hash !== "string" || (row.seat !== "A" && row.seat !== "B")) return null;
    if (row.kind === "timeout") {
      steps.push({ kind: "timeout", hash: row.state_hash });
      continue;
    }
    if (row.kind === "forfeit") {
      steps.push({ kind: "forfeit", seat: row.seat, hash: row.state_hash });
      continue;
    }
    if (row.kind !== "shot" || !row.input || typeof row.input !== "object") return null;
    const input = row.input as Partial<ShotInput>;
    if (
      typeof input.angleMilli !== "number" ||
      typeof input.power !== "number" ||
      typeof input.spinX !== "number" ||
      typeof input.spinY !== "number"
    ) {
      return null;
    }
    steps.push({
      kind: "shot",
      hash: row.state_hash,
      input: {
        angleMilli: input.angleMilli,
        power: input.power,
        spinX: input.spinX,
        spinY: input.spinY,
        placeX: typeof input.placeX === "number" ? input.placeX : null,
        placeY: typeof input.placeY === "number" ? input.placeY : null,
        calledPocket: typeof input.calledPocket === "number" ? input.calledPocket : null,
      },
    });
  }
  return steps;
}

export function bytesFromHex(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Replay a match from the committed seed and the accepted step list. */
export async function replayMatch(
  seed: Uint8Array,
  publishedHash: string,
  stepsIn: readonly MatchStep[],
  physics: PhysicsId = PHYSICS_VERSION,
): Promise<Replay> {
  const seedOk = await committedSeedOk(seed, publishedHash);
  let state = freshTable(seed, physics);
  const steps: Replay["steps"] = [];
  for (const step of stepsIn) {
    if (step.kind === "timeout") state = applyTimeout(state);
    else if (step.kind === "forfeit") state = applyForfeit(state, step.seat);
    else {
      const placed = placeCue(state, step.input);
      if (placed) {
        steps.push({ shot: state.shot, ok: false, got: placed, expected: step.hash });
        break;
      }
      const sim = simulate(state.balls, step.input, false, state.physics);
      const applied = applyPlayedShot(state, sim, step.input.calledPocket);
      if (applied.event.reason === "CALL_POCKET") {
        steps.push({ shot: state.shot, ok: false, got: "CALL_POCKET", expected: step.hash });
        break;
      }
      state = applied.state;
    }
    const got = stateHash(state);
    steps.push({ shot: state.shot, ok: got === step.hash, got, expected: step.hash });
    if (got !== step.hash || state.winner) break;
  }
  return {
    ok: seedOk && steps.length === stepsIn.length && steps.every((s) => s.ok),
    engine: ENGINE_VERSION,
    rules: RULES_VERSION,
    seedOk,
    steps,
    finalHash: stateHash(state),
    winner: state.winner,
    reason: state.reason,
  };
}
