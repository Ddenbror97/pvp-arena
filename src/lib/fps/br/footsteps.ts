import type { FootstepSurface } from "../footstep-surfaces";
import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import type { Placement } from "./layout";
import { turnBox, type CollisionData } from "./static-world";
import type { WorldMeta } from "./world";

/** Distance-driven strides, independent of render FPS; reconnects/jumps never replay steps. */
export class BrStrides {
  private tracks = new Map<
    number,
    { x: number; y: number; z: number; at: number; distance: number }
  >();
  advance(
    id: number,
    x: number,
    y: number,
    z: number,
    grounded: boolean,
    quiet: boolean,
    now: number,
  ) {
    const old = this.tracks.get(id);
    if (!old) {
      this.tracks.set(id, { x, y, z, at: now, distance: 0 });
      return false;
    }
    const distance = Math.hypot(x - old.x, z - old.z),
      dy = Math.abs(y - old.y),
      gap = now - old.at;
    old.x = x;
    old.y = y;
    old.z = z;
    old.at = now;
    if (
      !grounded ||
      quiet ||
      gap > 250 ||
      distance > 4 ||
      dy > 0.45 ||
      (gap > 0 && (distance / gap) * 1000 < 2.4)
    ) {
      old.distance = 0;
      return false;
    }
    old.distance += distance;
    if (old.distance < 1.8) return false;
    old.distance %= 1.8;
    return true;
  }
}

/** Indexed once at load; material queries happen at stride frequency, not on every frame. */
export function createBrFootstepSurface(
  hf: Heightfield,
  cover: LandCoverMap,
  layout: Placement[],
  collision: CollisionData,
  meta: WorldMeta,
) {
  type Top = {
    x0: number;
    x1: number;
    z0: number;
    z1: number;
    y0: number;
    y1: number;
    surface: FootstepSurface;
  };
  const grid = new Map<string, Top[]>(),
    size = 64;
  const bounds = new Map<string, number[]>();
  for (const [model, boxes] of Object.entries(collision.models)) {
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const box of boxes)
      for (let k = 0; k < 3; k++) {
        b[k] = Math.min(b[k]!, box[k]!);
        b[k + 3] = Math.max(b[k + 3]!, box[k + 3]!);
      }
    bounds.set(model, b);
  }
  for (const p of layout) {
    const b = bounds.get(p.model);
    if (!b || !Number.isFinite(b[0])) continue;
    const [x0, y0, z0, x1, y1, z1] = turnBox(b, p.turn);
    const surface: FootstepSurface = /metal|container|warehouse|tower/.test(p.model)
      ? "metal"
      : /wood|barn|cabin/.test(p.model)
        ? "wood"
        : "concrete";
    const top = {
      x0: x0 + p.x,
      x1: x1 + p.x,
      z0: z0 + p.z,
      z1: z1 + p.z,
      y0: y0 + p.y,
      y1: y1 + p.y,
      surface,
    };
    for (let x = Math.floor(top.x0 / size); x <= Math.floor(top.x1 / size); x++)
      for (let z = Math.floor(top.z0 / size); z <= Math.floor(top.z1 / size); z++) {
        const key = x + ":" + z;
        let rows = grid.get(key);
        if (!rows) grid.set(key, (rows = []));
        rows.push(top);
      }
  }
  return (x: number, y: number, z: number): FootstepSurface => {
    for (const bridge of meta.bridges) {
      const dx = bridge.b[0] - bridge.a[0],
        dz = bridge.b[1] - bridge.a[1];
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - bridge.a[0]) * dx + (z - bridge.a[1]) * dz) / Math.max(1, dx * dx + dz * dz),
        ),
      );
      if (
        Math.abs(y - bridge.deck) < 0.5 &&
        Math.hypot(x - bridge.a[0] - dx * t, z - bridge.a[1] - dz * t) < bridge.width / 2
      )
        return "metal";
    }
    for (const b of grid.get(Math.floor(x / size) + ":" + Math.floor(z / size)) ?? [])
      if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && y >= b.y0 - 0.2 && y <= b.y1 + 0.3)
        return b.surface;
    if (y > 395 && hf.slopeAt(x, z) < 0.6) return "snow";
    const c = cover.classAt(x, z);
    return c === "road" || c === "urban" || c === "rock" ? "concrete" : "dirt";
  };
}
