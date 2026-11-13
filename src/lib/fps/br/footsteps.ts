import type { FootstepSurface } from "../footstep-surfaces";
import { snowAt } from "./ground-noise";
import { isRock } from "./rock-ground";
import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import type { Placement } from "./layout";
import { turnBox, type CollisionData } from "./static-world";
import type { WorldMeta } from "./world";

/** Distance-driven strides, independent of render FPS; reconnects/jumps never replay steps. */
export class BrStrides {
  private tracks = new Map<
    number,
    { x: number; y: number; z: number; at: number; movedAt: number; distance: number }
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
      this.tracks.set(id, { x, y, z, at: now, movedAt: now, distance: 0 });
      return false;
    }
    const distance = Math.hypot(x - old.x, z - old.z),
      dy = Math.abs(y - old.y),
      gap = now - old.at;
    old.at = now;
    if (!grounded || quiet || gap > 250 || distance > 4 || dy > 0.45) {
      old.x = x;
      old.y = y;
      old.z = z;
      old.distance = 0;
      old.movedAt = now;
      return false;
    }
    // The predicted body advances at 30 Hz, while render frames may run at 60–240 Hz.
    // Repeated positions and millimetre snapshot corrections between physics ticks are
    // not a stop. Keep the spatial anchor until 2 cm of real travel has accumulated;
    // this also works for interpolated opponents at very high frame rates.
    const movementGap = now - old.movedAt;
    if (distance < 0.02) {
      if (movementGap > 150) old.distance = 0;
      return false;
    }
    old.x = x;
    old.y = y;
    old.z = z;
    old.movedAt = now;
    if (movementGap > 0 && (distance / movementGap) * 1000 < 2.4) {
      old.distance = 0;
      return false;
    }
    old.distance += distance;
    if (old.distance < 1.8) return false;
    old.distance %= 1.8;
    return true;
  }
}

/**
 * The surface under a body's feet, for its footsteps (indexed once at load; asked at stride
 * frequency). Owner, 2026-11-12: "stepping in snow sometimes dont sound snow, walking on snow =
 * always snow … at the iron peak". Before, any model whose bounding box held the feet decided
 * the sound (on the Iron Peaks' rock fields that is most of the snow: walking past a boulder
 * sounded concrete), and snow was "above 395 m and gentler than 31°" while the ground draws it
 * from about 370 m, broken up by noise, on slopes up to about 45°. Now a model only counts when
 * the feet stand on one of its boxes (or, for a building, are inside it off the snow), and the
 * snow is the terrain shader's own rule (snowAt).
 */
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
    p: Placement;
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
      p,
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
  /** Whether feet at (x, y, z) stand on one of the placement's boxes (a body's width round). */
  const standsOn = (t: Top, x: number, y: number, z: number) => {
    const lx = x - t.p.x,
      ly = y - t.p.y,
      lz = z - t.p.z;
    for (const box of collision.models[t.p.model]!) {
      const [x0, , z0, x1, y1, z1] = turnBox(box, t.p.turn);
      if (
        lx >= x0 - 0.3 &&
        lx <= x1 + 0.3 &&
        lz >= z0 - 0.3 &&
        lz <= z1 + 0.3 &&
        ly >= y1 - 0.35 &&
        ly <= y1 + 0.3
      )
        return true;
    }
    return false;
  };
  const ground = (x: number, z: number): FootstepSurface => {
    if (snowAt(hf, x, z) > 0.5) return "snow";
    const c = cover.classAt(x, z);
    return c === "road" || c === "urban" || c === "rock" ? "concrete" : "dirt";
  };
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
    const near = (grid.get(Math.floor(x / size) + ":" + Math.floor(z / size)) ?? []).filter(
      (b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && y >= b.y0 - 0.2 && y <= b.y1 + 0.3,
    );
    // On a model: the one whose box the feet stand on.
    for (const b of near) if (standsOn(b, x, y, z)) return b.surface;
    // A building's floor between its boxes counts as the building; a rock only under the feet.
    const inside = near.find((b) => !isRock(b.p.model));
    if (y - hf.heightAt(x, z) < 0.3) {
      // On the ground: snow wherever the ground shows snow, even in a ruin's walls.
      if (snowAt(hf, x, z) > 0.5) return "snow";
      return inside?.surface ?? ground(x, z);
    }
    return inside?.surface ?? near[0]?.surface ?? ground(x, z);
  };
}
