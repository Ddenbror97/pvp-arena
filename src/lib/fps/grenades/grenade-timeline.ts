import type { GrenadeType, ThrowKind } from "./rules";
import { GRENADES, throwKindOf } from "./rules";

/**
 * First-person grenade presentation: what the hands show for the local player's grenade handling,
 * and which authored clip (art/blender/grenades) plays at what time. Pure; no Three.js.
 */
export type GrenadeModelMeta = {
  name: string;
  height: number;
  radius: number;
  gripRadius: number;
  gripHeight: number;
  /** Right palm centre (model space, glTF axes) and the ring's pinch point. */
  grip: [number, number, number];
  pinch: [number, number, number];
  ringCentre: [number, number, number];
  /** Unit direction the pin comes out (model space) and its length (m). */
  pull: [number, number, number];
  pinLength: number;
  pinPivot: [number, number, number];
  hinge: [number, number, number];
};
export type GrenadeMetadata = {
  /** Size of the held grenade in camera space relative to the real model. */
  scale: number;
  pullTravel: number;
  primeSeconds: number;
  pinSeconds: number;
  throwSeconds: number;
  recoveryFrom: number;
  release: Record<"overhand" | "medium" | "underhand" | "jump", number>;
  cues: Record<string, [number, string][]>;
  models: Record<GrenadeType, GrenadeModelMeta>;
};
export function readGrenadeMetadata(extras: unknown): GrenadeMetadata {
  const raw = (extras as { grenades?: string } | undefined)?.grenades;
  if (!raw) throw new Error("Grenade GLB has no metadata (scene extras `grenades`)");
  return JSON.parse(raw) as GrenadeMetadata;
}

export type GrenadeView =
  | { kind: "hidden" }
  | { kind: "equip"; type: GrenadeType; t: number }
  /** Ready in the hand; `move` 0 standing, 1 walking, 2 sprinting (blends the loops). */
  | { kind: "ready"; type: GrenadeType; t: number; move: number }
  /** Button held: the pin pull, then the wind-up for `throw`. */
  | { kind: "hold"; type: GrenadeType; t: number; throw: ThrowKind }
  | { kind: "throw"; type: GrenadeType; t: number; throw: ThrowKind; air: boolean }
  | { kind: "inspect"; type: GrenadeType; t: number };

export const throwClip = (kind: ThrowKind, air: boolean) =>
  air && kind === "over"
    ? "jump_throw"
    : kind === "over"
      ? "throw_overhand"
      : kind === "medium"
        ? "throw_medium"
        : "throw_underhand";

/** The clip and time the view calls for (loops wrap). */
export function clipFor(meta: GrenadeMetadata, view: Exclude<GrenadeView, { kind: "hidden" }>) {
  const t = Math.max(0, view.t);
  switch (view.kind) {
    case "equip":
      return { clip: `${view.type}_equip`, time: Math.min(t, GRENADES.equipMs / 1000) };
    case "ready":
      // Moving: the walk loop (its stride bob); standing: the breathing idle.
      return view.move > 0.25
        ? { clip: `${view.type}_walk`, time: t % 0.8 }
        : { clip: `${view.type}_idle`, time: t % 3 };
    case "hold":
      return t < meta.pinSeconds
        ? { clip: `${view.type}_pin_pull`, time: t }
        : {
            clip: `${view.type}_cock_${view.throw}`,
            time: Math.min(t - meta.pinSeconds, meta.primeSeconds - meta.pinSeconds),
          };
    case "throw":
      return {
        clip: `${view.type}_${throwClip(view.throw, view.air)}`,
        time: Math.min(t, meta.throwSeconds),
      };
    case "inspect":
      return { clip: `${view.type}_inspect`, time: Math.min(t, 3.2) };
  }
}

/** Seconds into the throw clip the grenade leaves the hand (the server's releaseMs). */
export const releaseSeconds = (kind: ThrowKind) => GRENADES.releaseMs[kind] / 1000;

/**
 * The local player's grenade handling as the hands show it, predicted from their own buttons on
 * the local clock (milliseconds) with exactly the server's rules (world.ts stepGrenadeHandling):
 * the draw, the hold from the press (the pin), the release (left only overhand, right only
 * underhand, both at any point medium) no earlier than primeMs after the press, the grenade
 * leaving releaseMs later and the previous weapon coming back recoverMs after the release.
 * The server stays authoritative over what is carried and what was thrown.
 */
export class LocalGrenadeHands {
  type: GrenadeType | null = null;
  private drawnAt = 0;
  private hold: { since: number; mask: number } | null = null;
  private thrown: {
    kind: ThrowKind;
    release: number;
    spawn: number;
    air: boolean;
    left: boolean;
  } | null = null;
  private inspectAt: number | null = null;

  /** Draw `type` (from another weapon or another grenade). */
  equip(type: GrenadeType, now: number) {
    if (this.thrown && !this.thrown.left) return false;
    this.type = type;
    this.drawnAt = now;
    this.hold = null;
    this.thrown = null;
    this.inspectAt = null;
    return true;
  }
  /** Put away (weapon switch, death, round reset). */
  clear() {
    this.type = null;
    this.hold = null;
    this.thrown = null;
    this.inspectAt = null;
  }
  get busy() {
    return !!this.hold || (!!this.thrown && !this.thrown.left);
  }
  inspect(now: number) {
    if (this.type && !this.hold && !this.thrown && now >= this.drawnAt + GRENADES.equipMs)
      this.inspectAt = now;
  }
  /**
   * One input tick. Returns "spawn" when the grenade leaves the hand this tick (the caller
   * predicts the flight) and "done" when the previous weapon should come back.
   */
  step(fire: boolean, alt: boolean, now: number, airborne: boolean): "spawn" | "done" | null {
    if (!this.type) return null;
    const t = this.thrown;
    if (t) {
      if (!t.left && now >= t.spawn) {
        t.left = true;
        return "spawn";
      }
      if (t.left && now >= t.release + GRENADES.recoverMs) {
        this.clear();
        return "done";
      }
      return null;
    }
    const mask = (fire ? 1 : 0) | (alt ? 2 : 0);
    if (!this.hold) {
      if (mask && now >= this.drawnAt + GRENADES.equipMs) {
        this.hold = { since: now, mask };
        this.inspectAt = null;
      }
      return null;
    }
    this.hold.mask |= mask;
    if (mask) return null;
    const kind = throwKindOf(this.hold.mask);
    const release = Math.max(now, this.hold.since + GRENADES.primeMs);
    this.thrown = {
      kind,
      release,
      spawn: release + GRENADES.releaseMs[kind],
      air: airborne,
      left: false,
    };
    this.hold = null;
    return null;
  }
  /** The throw in progress (kind and timing), if any. */
  get throwing() {
    return this.thrown;
  }
  view(now: number, move: number): GrenadeView {
    const type = this.type;
    if (!type) return { kind: "hidden" };
    if (this.thrown && now >= this.thrown.release)
      return {
        kind: "throw",
        type,
        t: (now - this.thrown.release) / 1000,
        throw: this.thrown.kind,
        air: this.thrown.air,
      };
    if (this.hold || this.thrown) {
      const since = this.hold?.since ?? this.thrown!.release - GRENADES.primeMs;
      const kind = this.hold ? throwKindOf(this.hold.mask) : this.thrown!.kind;
      return { kind: "hold", type, t: (now - since) / 1000, throw: kind };
    }
    if (now < this.drawnAt + GRENADES.equipMs)
      return { kind: "equip", type, t: (now - this.drawnAt) / 1000 };
    if (this.inspectAt !== null && now - this.inspectAt < 3200)
      return { kind: "inspect", type, t: (now - this.inspectAt) / 1000 };
    return { kind: "ready", type, t: (now - this.drawnAt) / 1000, move };
  }
}
