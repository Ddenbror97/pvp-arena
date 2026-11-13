import { segmentOccluded } from "./visibility-occlusion";
import { traceWorld, type Vector } from "./collision";
import { eyeHeight, PLAYER_RADIUS } from "./map";
import { mapOf, type GameMap } from "./maps/registry";
import type { MatchState, Seat } from "./protocol";
import { publicGrenadeWorld, smokeHides, type GrenadeWorld } from "./grenades/world";
import { hearingRange, distanceGain, soundOccluded } from "./spatial-audio";
import { characterSide } from "./sides";

type PublicState = Omit<MatchState, "server">;
/** Send a pose only when some of its combat silhouette has an unobstructed sight line. */
export function canSeeOpponent(state: PublicState, seat: Seat): boolean {
  if (state.phase !== "live") return true;
  const own = state.players[seat],
    enemy = state.players[seat === "A" ? "B" : "A"];
  const origin = { x: own.x, y: own.y + eyeHeight(own), z: own.z };
  const dx = enemy.x - own.x,
    dz = enemy.z - own.z,
    length = Math.hypot(dx, dz) || 1;
  const sideX = (dz / length) * PLAYER_RADIUS * 0.9,
    sideZ = (-dx / length) * PLAYER_RADIUS * 0.9;
  const map = mapOf(state);
  const heights = [eyeHeight(enemy) + 0.1, eyeHeight(enemy), eyeHeight(enemy) * 0.55];
  for (const height of heights)
    for (const side of [-1, 0, 1]) {
      const x = enemy.x + sideX * side - origin.x,
        y = enemy.y + height - origin.y,
        z = enemy.z + sideZ * side - origin.z,
        distance = Math.hypot(x, y, z);
      if (
        distance < 0.01 ||
        (!traceWorld(
          origin,
          { x: x / distance, y: y / distance, z: z / distance },
          Math.max(0, distance - 0.025),
          map,
        ) &&
          // Smoke hides as well as walls (the practice bot cannot see through it either).
          !smokeHides(state.grenades, origin, {
            x: enemy.x + sideX * side,
            y: enemy.y + height,
            z: enemy.z + sideZ * side,
          }))
      )
        return true;
    }
  return false;
}

/**
 * Opponent reveal for redaction (anti-wallhack), tuned so an honest player never sees the
 * opponent blink out while any part of the drawn operator is on screen.
 *
 * `canSeeOpponent` (kept for the practice bot's perception) tests nine body points from
 * the viewer's current server position. The client, however, draws the opponent about
 * one RTT + REMOTE_DELAY_MS + the server's command wait *later* than the server step that
 * produced the pose, with its own camera already that far ahead. Measured on the arena with
 * roaming players at 135 ms RTT, the old rule hid the opponent in ~18% of the frames where
 * part of them was drawn on screen (late pop-ins and early vanishes at cover edges). This
 * rule:
 *  - samples the rendered envelope: boots to head top, arm width, and the rifle muzzle;
 *  - tests from the viewer's position extrapolated over that latency window (start, middle,
 *    end) and from a small lateral peek margin around each, so starting a peek from rest is
 *    covered too;
 *  - holds a reveal for REVEAL_HOLD_MS after the last sight line, so a sight line that
 *    closes for a step or two (thin cover, a turn) does not blink the opponent out.
 * It reveals early by design (bounded by the window and margin); it never reveals an
 * opponent that has no line of sight from any of those nearby viewpoints.
 */
export const REVEAL_MARGIN_M = 0.4;
export const REVEAL_HOLD_MS = 200;
export const MAX_REVEAL_AHEAD_MS = 450;
const REVEAL_WIDTH_M = 0.38;
const REVEAL_HEIGHTS = [0.06, 0.3, 0.55, 0.8, 0.94, 1] as const;

/** Viewer horizontal velocity (m/ms) and how far ahead of this step the client draws. */
export type ViewerMotion = { vx: number; vz: number; aheadMs: number };

/** Segment occlusion with a cheap bounds prefilter (same slab test as traceWorld). */
function blockedByWorld(o: Vector, t: Vector, map: GameMap) {
  const x = t.x - o.x,
    y = t.y - o.y,
    z = t.z - o.z,
    d = Math.hypot(x, y, z);
  return (
    d >= 0.01 && segmentOccluded(map, o.x, o.y, o.z, x / d, y / d, z / d, Math.max(0, d - 0.025))
  );
}

type Body = Pick<MatchState["players"]["A"], "x" | "y" | "z" | "yaw" | "crouched">;
function envelopeVisible(eye: Vector, enemy: Body, map: GameMap, smoke?: GrenadeWorld) {
  const blocked = (o: Vector, t: Vector, m: GameMap) =>
    blockedByWorld(o, t, m) || smokeHides(smoke, o, t);
  const dx = enemy.x - eye.x,
    dz = enemy.z - eye.z,
    length = Math.hypot(dx, dz) || 1,
    sideX = dz / length,
    sideZ = -dx / length,
    top = eyeHeight(enemy) + 0.1;
  for (const fraction of REVEAL_HEIGHTS)
    for (const side of [0, -REVEAL_WIDTH_M, REVEAL_WIDTH_M]) {
      const target = {
        x: enemy.x + sideX * side,
        y: enemy.y + top * fraction,
        z: enemy.z + sideZ * side,
      };
      if (!blocked(eye, target, map)) return true;
    }
  // The rifle reaches ~0.8 m ahead of the chest and is often the first thing around a corner.
  const muzzle = {
    x: enemy.x - Math.sin(enemy.yaw) * 0.8,
    y: enemy.y + top * 0.8,
    z: enemy.z - Math.cos(enemy.yaw) * 0.8,
  };
  return !blocked(eye, muzzle, map);
}

/** Latency-aware, conservative line of sight for redaction (no hold; see RevealGate). */
export function revealsOpponent(
  state: Pick<PublicState, "phase" | "players" | "mapId" | "grenades">,
  seat: Seat,
  motion?: ViewerMotion,
): boolean {
  if (state.phase !== "live") return true;
  return revealsBody(
    mapOf(state),
    state.players[seat],
    state.players[seat === "A" ? "B" : "A"],
    state.grenades,
    motion,
  );
}

/** Shared latency-aware snapshot reveal for duels and team modes. Bot aim perception stays separate. */
export function revealsBody(
  map: GameMap,
  own: Body,
  enemy: Body,
  smoke?: GrenadeWorld,
  motion?: ViewerMotion,
): boolean {
  const eyeY = own.y + eyeHeight(own),
    dx = enemy.x - own.x,
    dz = enemy.z - own.z,
    length = Math.hypot(dx, dz) || 1,
    sideX = dz / length,
    sideZ = -dx / length;
  const ahead = motion ? Math.max(0, Math.min(MAX_REVEAL_AHEAD_MS, motion.aheadMs)) : 0,
    speed = motion ? Math.hypot(motion.vx, motion.vz) : 0,
    // Never extrapolate faster than a sprint (7.5 m/s) or from a teleport.
    scale = speed > 0.0076 ? 0.0076 / speed : 1,
    vx = motion ? motion.vx * scale : 0,
    vz = motion ? motion.vz * scale : 0;
  for (const fraction of ahead > 0 && speed > 1e-5 ? [0, 0.5, 1] : [0])
    for (const side of [0, -REVEAL_MARGIN_M, REVEAL_MARGIN_M]) {
      const eye = {
        x: own.x + vx * ahead * fraction + sideX * side,
        y: eyeY,
        z: own.z + vz * ahead * fraction + sideZ * side,
      };
      if (envelopeVisible(eye, enemy, map, smoke)) return true;
    }
  return false;
}

/** Per-room reveal state: one decision per recipient per physics step, with a short hold. */
export class RevealGate {
  private lastSeen: Record<Seat, number> = { A: -Infinity, B: -Infinity };
  private round = -1;
  constructor(private readonly holdMs = REVEAL_HOLD_MS) {}
  update(
    state: Pick<MatchState, "phase" | "players" | "round" | "mapId" | "grenades">,
    at: number,
    motion: Partial<Record<Seat, ViewerMotion>>,
  ): Record<Seat, boolean> {
    if (state.round !== this.round) {
      this.round = state.round;
      this.lastSeen = { A: -Infinity, B: -Infinity };
    }
    const result = { A: true, B: true };
    for (const seat of ["A", "B"] as const) {
      if (state.phase !== "live") continue;
      if (revealsOpponent(state, seat, motion[seat])) this.lastSeen[seat] = at;
      result[seat] = at - this.lastSeen[seat] <= this.holdMs;
    }
    return result;
  }
}

/** Pure recipient projection. Never mutate the simulation or the delayed spectator history. */
export function snapshotForPlayer<T extends { state: PublicState }>(
  frame: T,
  seat: Seat,
  /** The runtime's RevealGate decision for this frame; defaults to the strict sight test. */
  reveal?: boolean,
) {
  const remote = seat === "A" ? "B" : "A",
    visible = reveal ?? canSeeOpponent(frame.state, seat);
  const events = frame.state.events.map((event) => {
    const { audio, hit, ...rest } = event;
    let cue = audio;
    if (audio?.position) {
      const own = frame.state.players[seat],
        dx = audio.position.x - own.x,
        dz = audio.position.z - own.z,
        distance = Math.hypot(dx, dz);
      const blocked = soundOccluded(
        mapOf(frame.state),
        { x: own.x, y: own.y + eyeHeight(own), z: own.z },
        audio.position,
      );
      const range = hearingRange(
          audio.kind,
          event.primary === "awp",
          // Only the Police's own M4A1-S is suppressed (not a bought AWP, MP5 or the Deagle).
          !!event.seat &&
            characterSide(frame.state, event.seat) === "A" &&
            !event.primary &&
            event.weapon !== "sidearm",
        ),
        scale = event.seat === seat ? 1 : distanceGain(distance, range, blocked);
      const pan = distance > 0.1 ? (dx * Math.cos(own.yaw) - dz * Math.sin(own.yaw)) / distance : 0;
      const { position: _position, ...details } = audio;
      cue = {
        ...details,
        gain: Math.round(scale * 64) / 64,
        distance: Math.round(distance / 2) * 2,
        pan: event.seat === seat ? 0 : Math.round(Math.max(-1, Math.min(1, pan)) * 8) / 8,
        ...(event.seat !== seat && Math.round(scale * 64) > 0
          ? { bearing: (Math.round((Math.atan2(dx, -dz) * 16) / Math.PI) * Math.PI) / 16 }
          : {}),
        occluded: !!blocked,
      };
    }
    return {
      ...rest,
      ...(cue ? { audio: cue } : {}),
      ...(hit && (visible || hit.victim === seat) ? { hit } : {}),
    };
  });
  const grenades = publicGrenadeWorld(frame.state.grenades);
  if (visible)
    return {
      ...frame,
      state: { ...frame.state, events, ...(grenades ? { grenades } : {}) },
      visibility: { A: true, B: true },
    };
  // A hidden enemy's zoom and grenade handling are not revealed (their primary is: the AWP
  // report gives it away; thrown grenades are public once in the air).
  const {
    scoped: _scoped,
    scopedAt: _scopedAt,
    nade: _nade,
    nadeHold: _nadeHold,
    nadeThrow: _nadeThrow,
    nadeBack: _nadeBack,
    grenades: _grenades,
    ...enemy
  } = frame.state.players[remote];
  return {
    ...frame,
    visibility: { A: seat === "A", B: seat === "B" },
    state: {
      ...frame.state,
      events,
      ...(grenades ? { grenades } : {}),
      players: {
        ...frame.state.players,
        [remote]: {
          ...enemy,
          x: 0,
          y: 0,
          z: 0,
          yaw: 0,
          pitch: 0,
          velocityY: 0,
          airCrouchOffset: 0,
          crouched: false,
          ammo: 0,
          reserve: 0,
          reloadUntil: 0,
          lastShotAt: 0,
          lastSeq: -1,
          sprayCount: 0,
          recoilPitch: 0,
          recoilYaw: 0,
          recoilUpdatedAt: 0,
          stepDistance: 0,
          triggerHeld: false,
          moving: false,
          sprinting: false,
        },
      },
    },
  };
}

/** A physics step's public poses, recorded by the runtime after each simulation step. */
export type TrailStep = {
  at: number;
  phase: MatchState["phase"];
  /** The match's map (absent: Dustfront), for the strict sight-test fallback. */
  mapId?: string;
  /** RevealGate decision per recipient for this step (absent: strict sight test). */
  reveal?: Record<Seat, boolean>;
  players: Record<
    Seat,
    Pick<
      MatchState["players"]["A"],
      "x" | "y" | "z" | "yaw" | "pitch" | "crouched" | "hp" | "velocityY"
    >
  >;
};
/** One opponent pose from an intermediate physics step; `pose` is absent when redacted. */
export type TrailEntry = { poseAt: number; pose?: TrailStep["players"]["A"] };

/**
 * Intermediate physics poses since the previous snapshot. When a timer catches up more
 * than one physics step, the snapshot alone omits the intervening poses; the client
 * would extrapolate them (overshoot + pull-back at direction changes). Bundling those
 * skipped steps adds no messages. With one snapshot per step the trail is empty. Each step is
 * redacted with the same sight-line rule as the snapshot itself, using that step's poses.
 */
export function trailForPlayer(
  steps: readonly TrailStep[],
  seat: Seat,
  afterAt: number,
  beforeAt: number,
): TrailEntry[] {
  const remote = seat === "A" ? "B" : "A";
  return steps
    .filter((step) => step.at > afterAt && step.at < beforeAt)
    .map((step) => {
      const visible =
        step.reveal?.[seat] ??
        canSeeOpponent(
          {
            phase: step.phase,
            players: step.players,
            events: [],
            ...(step.mapId === undefined ? {} : { mapId: step.mapId }),
          } as unknown as PublicState,
          seat,
        );
      return visible ? { poseAt: step.at, pose: { ...step.players[remote] } } : { poseAt: step.at };
    });
}

export function trailStep(
  state: Pick<MatchState, "phase" | "players" | "mapId">,
  at: number,
  reveal?: Record<Seat, boolean>,
): TrailStep {
  const pick = (p: MatchState["players"]["A"]) => ({
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: p.yaw,
    pitch: p.pitch,
    crouched: !!p.crouched,
    hp: p.hp,
    velocityY: p.velocityY ?? 0,
  });
  return {
    at,
    phase: state.phase,
    ...(state.mapId === undefined ? {} : { mapId: state.mapId }),
    ...(reveal ? { reveal: { ...reveal } } : {}),
    players: { A: pick(state.players.A), B: pick(state.players.B) },
  };
}
