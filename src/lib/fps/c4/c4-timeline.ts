/**
 * The C4 clips' timing and keypad state, read from the cues the Blender build writes into the
 * GLB (art/blender/c4/animate_c4.py → scene extras `c4`). Pure functions: the viewmodel, the
 * LCD and the tests use the same data, so the screen, the clicks and the fingertip agree.
 *
 * Cosmetic only. The room decides when a plant or a defuse starts, is interrupted and completes
 * (bomb/match.ts: BOMB_RULES.plantMs, the defuser's defuseMs); the presentation follows its clock.
 */
export type C4Cue = readonly [number, string];
export type C4Metadata = {
  scale: number;
  plantSeconds: number;
  /** Length the defuse clip is authored for (the 10 s defuse without a kit). */
  defuseSeconds: number;
  /** Seconds at the start (approach, stabilise) and end (confirmation) that are never warped. */
  defuseFixed: [number, number];
  /** Fictional entry sequence: the digits, then the confirmation key. */
  code: string[];
  cues: Record<string, C4Cue[]>;
  model: {
    keyTravel: number;
    /** Cap-top centre of each key, device space (metres). */
    keys: Record<string, [number, number, number]>;
    screen: { x: [number, number]; y: [number, number]; z: number };
    size: [number, number, number];
  };
};

export function readC4Metadata(extras: unknown): C4Metadata {
  const raw = (extras as { c4?: string } | undefined)?.c4;
  if (!raw) throw new Error("C4 GLB has no metadata (scene extras `c4`)");
  return JSON.parse(raw) as C4Metadata;
}

/** Keys pressed by `seconds` into a clip (cue "press:<key>"), in order. */
export function pressesBefore(meta: C4Metadata, clip: string, seconds: number) {
  const out: string[] = [];
  for (const [t, name] of meta.cues[clip] ?? [])
    if (t <= seconds && name.startsWith("press:")) out.push(name.slice(6));
  return out;
}

export type C4DisplayState = {
  /**
   * "off": dark; "entry": taking the arming code; "armed": confirmed; "disarm": a defuse in
   * progress; "safe": defused.
   */
  mode: "off" | "entry" | "armed" | "disarm" | "safe";
  /** Digits entered so far (the confirmation key is not a digit). */
  digits: number;
  /** Total digits in the code. */
  length: number;
  /** Defuse progress 0 → 1 (the room's clock). */
  progress?: number;
};

/** What the LCD shows `seconds` into the plant clip. */
export function plantDisplay(meta: C4Metadata, seconds: number): C4DisplayState {
  const cues = meta.cues["c4_plant"] ?? [];
  const at = (name: string) => cues.find(([, n]) => n === name)?.[0] ?? Infinity;
  const length = meta.code.length - 1;
  if (seconds < at("power")) return { mode: "off", digits: 0, length };
  if (seconds >= at("armed")) return { mode: "armed", digits: length, length };
  return {
    mode: "entry",
    digits: Math.min(length, pressesBefore(meta, "c4_plant", seconds).length),
    length,
  };
}

/** Cues crossed going from `from` to `to` seconds in a clip (for sounds), in time order. */
export function cuesBetween(meta: C4Metadata, clip: string, from: number, to: number) {
  if (!(to > from)) return [] as string[];
  return (meta.cues[clip] ?? []).filter(([t]) => t > from && t <= to).map(([, n]) => n);
}

/**
 * How far each key is pushed in (0 → 1 of its travel) with the fingertip pad at `tip` (device
 * space, metres). A key moves only under the pad and only by how far the pad is below its cap
 * top, so it rises again as the finger lifts.
 */
export function keyDepressions(
  meta: C4Metadata,
  tip: { x: number; y: number; z: number },
  out: Record<string, number> = {},
) {
  const travel = meta.model.keyTravel;
  for (const [key, [x, y, z]] of Object.entries(meta.model.keys)) {
    const near = Math.hypot(tip.x - x, tip.y - y) < KEY_RADIUS;
    out[key] = near ? Math.min(1, Math.max(0, (z - tip.z) / travel)) : 0;
  }
  return out;
}
/** Half the key pitch (13.6 mm): the pad is over a key when its centre is this close. */
export const KEY_RADIUS = 0.0065;

export type C4Presentation =
  | { kind: "hidden" }
  /** Planting: `elapsed` seconds since the room's plant start. */
  | { kind: "plant"; elapsed: number }
  /** The room confirmed the plant `since` seconds ago. */
  | { kind: "complete"; since: number }
  /** The plant was interrupted `since` seconds ago, `at` seconds into it. */
  | { kind: "cancel"; since: number; at: number };

/** Length of the complete and cancel clips (s): how long the weapon stays lowered after them. */
export const C4_EXIT_SECONDS = 0.3;

/** What the first-person plant needs from the room's latest snapshot. */
export type C4PlantInput = {
  /** The local player is alive and has a first-person view this frame. */
  showWeapon: boolean;
  team: "police" | "terrorist" | undefined;
  you: number;
  bomb: { state: string; carrier?: number; plantStartedAt?: number } | undefined;
  /** Server clock and local clock (ms). */
  serverNow: number;
  now: number;
};
export type C4PlantState = {
  presentation: C4Presentation;
  /** Local time the exit clip started (ms). */
  exitAt: number;
  /** Last plant time shown (s). */
  elapsed: number;
};
export const initialC4PlantState = (): C4PlantState => ({
  presentation: { kind: "hidden" },
  exitAt: 0,
  elapsed: 0,
});

/**
 * Advance the first-person plant from the room's state. Only a living Terrorist who is the
 * room's planting carrier plants; the clip sits at the room's plant clock (server time since
 * `plantStartedAt`). When the room ends the plant, "planted" plays the completion and anything
 * else (released key, left the site, died, round over) plays the cancel; neither can be
 * triggered by the local animation, which only follows.
 */
export function stepC4Plant(state: C4PlantState, input: C4PlantInput): C4PlantState {
  const { bomb } = input;
  const planting =
    input.showWeapon &&
    input.team === "terrorist" &&
    bomb?.state === "planting" &&
    bomb.carrier === input.you &&
    bomb.plantStartedAt !== undefined;
  if (planting) {
    const elapsed = Math.max(0, (input.serverNow - bomb!.plantStartedAt!) / 1000);
    return { ...state, presentation: { kind: "plant", elapsed }, elapsed };
  }
  const p = state.presentation;
  if (p.kind === "plant")
    return {
      ...state,
      exitAt: input.now,
      presentation:
        input.showWeapon && bomb?.state === "planted"
          ? { kind: "complete", since: 0 }
          : { kind: "cancel", since: 0, at: state.elapsed },
    };
  if (p.kind === "complete" || p.kind === "cancel") {
    const since = (input.now - state.exitAt) / 1000;
    return {
      ...state,
      presentation:
        !input.showWeapon || since > C4_EXIT_SECONDS + 0.15 ? { kind: "hidden" } : { ...p, since },
    };
  }
  return state;
}

/** Whether the C4 (not the rifle) owns the first-person view. */
export const c4Raised = (p: C4Presentation) =>
  p.kind === "plant" ||
  ((p.kind === "complete" || p.kind === "cancel") && p.since < C4_EXIT_SECONDS);

/**
 * Clip time for a defuse `elapsed` seconds into a `total`-second defuse (the room's defuseMs):
 * the approach and the final confirmation keep their authored timing, the keypad section in
 * between is stretched or squeezed to fit (a 5 s kit defuse types twice as fast). Never past the
 * confirmation press: the device only shows "safe" once the room says defused.
 */
export function defuseClipTime(meta: C4Metadata, elapsed: number, total: number) {
  const authored = meta.defuseSeconds;
  const [head, tail] = meta.defuseFixed;
  const t = Math.min(total, Math.max(0, elapsed));
  if (Math.abs(total - authored) < 1e-6) return t;
  if (t <= head) return t;
  if (t >= total - tail) return authored - (total - t);
  const middle = Math.max(1e-6, total - head - tail);
  return head + ((t - head) / middle) * (authored - head - tail);
}

/** What the LCD shows during a defuse (`clip` seconds into c4_defuse, `progress` 0–1). */
export function defuseDisplay(meta: C4Metadata, clip: number, progress: number): C4DisplayState {
  const length = 8;
  return {
    mode: "disarm",
    digits: Math.min(length, pressesBefore(meta, "c4_defuse", clip).length),
    length,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

export type C4View =
  | C4Presentation
  /** Defusing: `elapsed` of `total` seconds on the room's clock. */
  | { kind: "defuse"; elapsed: number; total: number }
  /** The room confirmed the defuse `since` seconds ago. */
  | { kind: "defused"; since: number }
  /** The defuse was interrupted `since` seconds ago. */
  | { kind: "defuse-cancel"; since: number };

/** Lengths of the defuse exit clips (s). */
export const DEFUSE_EXIT_SECONDS = { defused: 0.6, "defuse-cancel": 0.35 } as const;

export type C4Input = C4PlantInput & {
  bomb:
    | {
        state: string;
        carrier?: number;
        plantStartedAt?: number;
        defuser?: number;
        defuseStartedAt?: number;
        defuseMs?: number;
      }
    | undefined;
};
export type C4State = { view: C4View; exitAt: number; elapsed: number };
export const initialC4State = (): C4State => ({ view: { kind: "hidden" }, exitAt: 0, elapsed: 0 });

/**
 * Advance the first-person C4 from the room's state: the Terrorist carrier's plant (stepC4Plant)
 * and the Police defuser's defuse. Only a living Police player whom the room has made the
 * defuser defuses; the clip follows the room's defuse clock and length (5 s with a kit, 10 s
 * without). When the room ends the defuse, "defused" plays the completion (and only then shows
 * the device safe); anything else (released key, out of reach, died, round over) plays the
 * cancel. The planted bomb stays where it is either way.
 */
export function stepC4(state: C4State, input: C4Input): C4State {
  const { bomb } = input;
  const defusing =
    input.showWeapon &&
    input.team === "police" &&
    bomb?.state === "planted" &&
    bomb.defuser === input.you &&
    bomb.defuseStartedAt !== undefined;
  if (defusing) {
    const total = (bomb!.defuseMs ?? 10_000) / 1000;
    const elapsed = Math.min(total, Math.max(0, (input.serverNow - bomb!.defuseStartedAt!) / 1000));
    return { ...state, view: { kind: "defuse", elapsed, total }, elapsed };
  }
  const v = state.view;
  if (v.kind === "defuse")
    return {
      ...state,
      exitAt: input.now,
      view:
        input.showWeapon && bomb?.state === "defused"
          ? { kind: "defused", since: 0 }
          : { kind: "defuse-cancel", since: 0 },
    };
  if (v.kind === "defused" || v.kind === "defuse-cancel") {
    const since = (input.now - state.exitAt) / 1000;
    return {
      ...state,
      view:
        !input.showWeapon || since > DEFUSE_EXIT_SECONDS[v.kind] + 0.15
          ? { kind: "hidden" }
          : { ...v, since },
    };
  }
  // Plant (or nothing): the Terrorist side.
  const plant = stepC4Plant(
    { presentation: v as C4Presentation, exitAt: state.exitAt, elapsed: state.elapsed },
    input,
  );
  return { view: plant.presentation, exitAt: plant.exitAt, elapsed: plant.elapsed };
}

/** Whether the C4 (not the rifle) owns the first-person view. */
export const c4Up = (v: C4View) =>
  v.kind === "defuse" ||
  ((v.kind === "defused" || v.kind === "defuse-cancel") && v.since < DEFUSE_EXIT_SECONDS[v.kind]) ||
  c4Raised(v as C4Presentation);
