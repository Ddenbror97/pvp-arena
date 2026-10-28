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

function playListedStep(
  state: TableState,
  step: MatchStep,
): { state: TableState; got: string } | { error: string } {
  if (step.kind === "timeout") {
    const next = applyTimeout(state);
    return { state: next, got: stateHash(next) };
  }
  if (step.kind === "forfeit") {
    const next = applyForfeit(state, step.seat);
    return { state: next, got: stateHash(next) };
  }
  const working = structuredClone(state);
  const placed = placeCue(working, step.input);
  if (placed) return { error: placed };
  const sim = simulate(working.balls, step.input, false, working.physics);
  const applied = applyPlayedShot(working, sim, step.input.calledPocket);
  if (applied.event.reason === "CALL_POCKET") return { error: "CALL_POCKET" };
  return { state: applied.state, got: stateHash(applied.state) };
}

/**
 * The stored rack is the last accepted step, or the fresh rack when nothing
 * has been played. The shot path uses this instead of resimulating every
 * earlier shot. Replaying the whole match on every stroke is what stalled
 * the stand-in after a few shots.
 */
export function tableLinks(
  seed: Uint8Array,
  table: TableState,
  prior: readonly MatchStep[],
): boolean {
  if (prior.length === 0) return stateHash(freshTable(seed, table.physics)) === stateHash(table);
  return prior[prior.length - 1]?.hash === stateHash(table);
}

/** A table already rolled through the first `steps` accepted hashes. */
export type ReplayCursor = {
  seedKey: string;
  physics: PhysicsId;
  steps: number;
  lastHash: string;
  state: TableState;
};

/**
 * Roll `stepsIn` from the rack, or from a cursor that already matches a prefix.
 * A stale cursor fails. The caller retries with a null cursor before rejecting a shot.
 */
export function resumeReplay(
  seed: Uint8Array,
  seedKey: string,
  stepsIn: readonly MatchStep[],
  physics: PhysicsId,
  cursor: ReplayCursor | null,
): { ok: true; state: TableState; cursor: ReplayCursor } | { ok: false } {
  const reusable =
    cursor != null &&
    cursor.seedKey === seedKey &&
    cursor.physics === physics &&
    cursor.steps <= stepsIn.length &&
    (cursor.steps === 0 || stepsIn[cursor.steps - 1]?.hash === cursor.lastHash);
  let state = reusable ? cursor.state : freshTable(seed, physics);
  const from = reusable ? cursor.steps : 0;
  for (let i = from; i < stepsIn.length; i++) {
    const step = stepsIn[i];
    if (!step) return { ok: false };
    const played = playListedStep(state, step);
    if ("error" in played || played.got !== step.hash) return { ok: false };
    state = played.state;
    if (state.winner && i < stepsIn.length - 1) return { ok: false };
  }
  return {
    ok: true,
    state,
    cursor: {
      seedKey,
      physics,
      steps: stepsIn.length,
      lastHash: stepsIn.length > 0 ? (stepsIn[stepsIn.length - 1]?.hash ?? "") : stateHash(state),
      state,
    },
  };
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
    const played = playListedStep(state, step);
    if ("error" in played) {
      steps.push({ shot: state.shot, ok: false, got: played.error, expected: step.hash });
      break;
    }
    state = played.state;
    steps.push({
      shot: state.shot,
      ok: played.got === step.hash,
      got: played.got,
      expected: step.hash,
    });
    if (played.got !== step.hash || state.winner) break;
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
