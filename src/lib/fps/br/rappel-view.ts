import * as THREE from "three";
import { RAPPEL_CLIMB_CYCLE, rappelClipMs, type RappelClipName } from "../rappel-clip";
import { HOP_MS, RAPPEL, rappelNormal, type RappelSeen } from "./rappel";
import type { StaticWorld } from "./static-world";

/**
 * A body on a rappel as it is drawn (rappel.ts moves it; rappel-clip.ts is its animation): from
 * the wall, the stage and the body's place (one's own predicted state, or another player's row)
 * to the character's frame on the wall, the clip and the moment in it, and the rope's line
 * (rappel-rope.ts). One way for one's own figure and everyone else's.
 *
 * What plays:
 * - over the edge: `on`, at the stage's own pace; back over it: the same, backwards;
 * - hanging, in a hop: `hop` and `hop2` in turn, at the hop's own pace (the body is where the
 *   server has it in the hop, so the boots leave the wall and meet it when the body does);
 * - hanging, on the wall: `idle`, and `climb` while the body moves on it, its phase the height
 *   (so a boot stays where it is put, walking up or down);
 * - the landing: `land`.
 * Presentation only.
 */
export type RappelFigure = {
  /** Drawn on a rope this frame. */
  on: boolean;
  /** What the character is given (authored-character.ts Motion.rappel): kept and rewritten. */
  motion: {
    clip: RappelClipName;
    ms: number;
    clip2: RappelClipName | null;
    ms2: number;
    mix: number;
    wall: number;
    lip: [number, number, number];
  };
  /** The roof's edge where the rope comes over it, and where it is tied off on the roof. */
  lip: THREE.Vector3;
  anchor: THREE.Vector3;
  /** The floor under the rope. */
  land: number;
  /** The wall's normal (out from it). */
  nx: number;
  nz: number;
  /** When this rope was thrown, the braced stance last began, the hop last began (ms). */
  since: number;
  idleAt: number;
  hops: number;
  hopping: boolean;
  /** Which way the body faced when it took the rope. */
  startYaw: number;
  /** Walking on the wall (0..1), from the body's own movement. */
  walk: number;
  lastY: number;
  /** In a hop (0..1 of it), else −1: the rope's tail swings with it. */
  hop: number;
};

export const rappelFigure = (): RappelFigure => ({
  on: false,
  motion: {
    clip: "idle",
    ms: 0,
    clip2: null,
    ms2: 0,
    mix: 0,
    wall: RAPPEL.standOff,
    lip: [0, 1, -1],
  },
  lip: new THREE.Vector3(),
  anchor: new THREE.Vector3(),
  land: 0,
  nx: 1,
  nz: 0,
  since: 0,
  idleAt: 0,
  hops: 0,
  hopping: false,
  startYaw: 0,
  walk: 0,
  lastY: 0,
  hop: -1,
});

const ease = (t: number) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};
const euler = new THREE.Euler();
const local = new THREE.Vector3();

/** How far back from the edge the rope is tied off on the roof (m). */
const ANCHOR_IN = 1.15;

/**
 * Put a character's root on the wall and say what it plays. `x, y, z`: the body's point as
 * drawn; `yaw`: the way the player looks (the body's facing as it takes the rope). `world`
 * finds the roof under the rope's anchor once, as the rope is thrown.
 */
export function poseRappelFigure(
  f: RappelFigure,
  seen: RappelSeen,
  x: number,
  y: number,
  z: number,
  yaw: number,
  now: number,
  dtMs: number,
  root: THREE.Object3D,
  world: StaticWorld | null,
) {
  const [nx, nz] = rappelNormal(seen.dir);
  // How far out from the wall's face the body's point is, and where along it.
  const out = nx !== 0 ? (x - seen.wall) * nx : (z - seen.wall) * nz;
  if (!f.on) {
    f.on = true;
    f.since = now - (seen.stage === "on" ? seen.of * RAPPEL.onMs : 5000);
    f.idleAt = now;
    f.hopping = false;
    f.startYaw = yaw;
    f.walk = 0;
    f.lastY = y;
    f.nx = nx;
    f.nz = nz;
    f.land = seen.land;
    // The edge on the rope's line (where the body went over it), and the roof behind it.
    const ex = nx !== 0 ? seen.wall : x,
      ez = nx !== 0 ? z : seen.wall;
    f.lip.set(ex, seen.top, ez);
    const ax = ex - nx * ANCHOR_IN,
      az = ez - nz * ANCHOR_IN;
    const roof = world ? world.supportAt(ax, az, 0.05, seen.top + 0.3) : seen.top;
    f.anchor.set(ax, Math.abs(roof - seen.top) < RAPPEL.parapet + 0.4 ? roof : seen.top, az);
  }
  // The rope's edge point follows the body along the wall (A and D slide the rope with it).
  if (seen.stage !== "on") {
    if (nx !== 0) f.lip.z += (z - f.lip.z) * (1 - Math.exp(-dtMs / 90));
    else f.lip.x += (x - f.lip.x) * (1 - Math.exp(-dtMs / 90));
  }
  // Facing the wall (the root's −z into it); turning to it from the way it faced on the roof.
  const wallYaw = Math.atan2(nx, nz);
  let facing = wallYaw;
  if (seen.stage === "on") {
    const k = ease(seen.of / 0.34);
    facing =
      f.startYaw + Math.atan2(Math.sin(wallYaw - f.startYaw), Math.cos(wallYaw - f.startYaw)) * k;
  }
  root.position.set(x, y, z);
  root.quaternion.setFromEuler(euler.set(0, facing, 0, "YXZ"));
  root.updateMatrixWorld(true);
  const m = f.motion;
  m.wall = out;
  root.worldToLocal(local.copy(f.lip));
  m.lip[0] = local.x;
  m.lip[1] = local.y;
  m.lip[2] = local.z;
  m.clip2 = null;
  m.mix = 0;
  m.ms2 = 0;
  f.hop = -1;
  const vy = dtMs > 0 ? Math.abs(y - f.lastY) / (dtMs / 1000) : 0;
  f.lastY = y;
  if (seen.stage === "on" || seen.stage === "up") {
    m.clip = "on";
    m.ms = (seen.stage === "on" ? seen.of : 1 - seen.of) * rappelClipMs("on");
    f.idleAt = now;
    f.hopping = false;
    f.walk = 0;
  } else if (seen.stage === "land") {
    m.clip = "land";
    m.ms = seen.of * rappelClipMs("land");
    f.hopping = false;
  } else if (seen.of > 0) {
    // A hop: the next one of the two, from the stance (or from the idle's look round).
    if (!f.hopping || seen.of * HOP_MS < m.ms - 200) {
      f.hops++;
      f.hopping = true;
    }
    m.clip = f.hops % 2 ? "hop" : "hop2";
    m.ms = seen.of * HOP_MS;
    const lead = 1 - ease(m.ms / 130);
    if (lead > 0 && now - f.idleAt > 200) {
      m.clip2 = "idle";
      m.ms2 = f.walk > 0.5 ? 0 : now - f.idleAt;
      m.mix = lead;
    }
    f.hop = seen.of;
    f.walk = 0;
  } else {
    if (f.hopping) {
      f.hopping = false;
      f.idleAt = now;
    }
    // On the wall: braced, or walking on it (S up it, the last of the rope down it).
    f.walk += ((vy > 0.25 ? 1 : 0) - f.walk) * (1 - Math.exp(-dtMs / 110));
    if (f.walk > 0.98) f.idleAt = now;
    m.clip = "idle";
    m.ms = now - f.idleAt;
    if (f.walk > 0.01) {
      const s = seen.top - RAPPEL.hip - y;
      const cycles = -s / RAPPEL_CLIMB_CYCLE;
      m.clip2 = "climb";
      m.ms2 = (cycles - Math.floor(cycles)) * rappelClipMs("climb");
      m.mix = f.walk;
    }
  }
  return m;
}
