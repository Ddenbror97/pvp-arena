import { bridgeApproaches } from "./bridges";
import type { WorldMeta } from "./world";

/**
 * The roads' grade, shared by the road mesh (structures-renderer.ts) and the layout (what
 * stands on a road stands on its surface).
 *
 * Owner, 2026-11-16: "audit and fix the roads to be correct, no broken roads, items under the
 * road" (a guardrail lying beside a road; a 14 m pyramid of asphalt near Northstar). A road's
 * surface was the highest ground within 2 m of each vertex: where a road runs through a cutting
 * that picked up the cutting's walls, and the carriageway's edges climbed them (17 m at worst;
 * the builder before it, the highest of the corner, the centreline and half a quad along, rose
 * 13 m at the same places). A road is now graded as a road is built:
 *
 *  - along its centreline: the highest ground within `along` m before and after each point
 *    (no crest pokes through between vertices 4 m apart);
 *  - level across, leaning into a side slope by at most `lean` m (the ground's own height there,
 *    sampled within a metre): steeper than that is a cutting's wall, which stands at the edge;
 *  - a function of the position alone: where roads overlap (junctions, round joints), each
 *    point takes the highest grade of the roads that reach it, so the pieces are one surface.
 */
export const ROAD_GRADE = {
  /** Centreline samples before and after a point (m). */
  along: 2,
  /** How far beyond a road's half-width a point still takes its grade (m). */
  reach: 1.2,
  /** The most a road's side leans up into the ground across (m). */
  lean: 3,
  /** Grid cell for the segment index (m). */
  cell: 32,
  /** The drawn surface's rise over the grade (m; the renderer's PAVED_LIFT.road). */
  lift: 0.08,
  /**
   * Where roads meet, a road's grade carries on past its edge (and its end) falling `ramp` m per
   * m for up to `blend` m, so a side road rises onto a higher main road on a slope instead of a
   * step at the main road's reach (owner, 2026-11-22: "smooth transitions"; 308 road ends rose
   * 0.3–1 m in half a metre there).
   */
  ramp: 0.3,
  blend: 8,
} as const;

/**
 * What the layout stands on a road's surface when its base falls on one: everything but the
 * rail track (its rails run on through a level crossing) and the bridge pieces.
 */
export const OFF_ROAD_SURFACE = new Set(["rail-track", "rail-crossing", "rail-bridge"]);

type Segment = { ax: number; az: number; dx: number; dz: number; length: number; half: number };

export type RoadGrade = {
  /**
   * The ground of the road at (x, z) (no lift), or null where no road reaches. `lean` false:
   * the centreline grade alone (level across).
   */
  at: (x: number, z: number, lean?: boolean, reach?: number) => number | null;
};

export function createRoadGrade(
  meta: WorldMeta,
  heightAt: (x: number, z: number) => number,
): RoadGrade {
  const segments: Segment[] = [];
  for (const r of [...meta.roads, ...bridgeApproaches(meta)]) {
    const half = r.width / 2;
    for (let k = 0; k + 1 < r.points.length; k++) {
      const [ax, az] = r.points[k]!,
        [bx, bz] = r.points[k + 1]!;
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 0.01) continue;
      segments.push({ ax, az, dx: (bx - ax) / length, dz: (bz - az) / length, length, half });
    }
  }
  // Each cell lists the segments whose reach touches it.
  const grid = new Map<number, number[]>();
  const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
  segments.forEach((s, n) => {
    const r = s.half + ROAD_GRADE.reach + ROAD_GRADE.along + ROAD_GRADE.blend;
    const xs = [s.ax, s.ax + s.dx * s.length],
      zs = [s.az, s.az + s.dz * s.length];
    const i0 = Math.floor((Math.min(...xs) - r) / ROAD_GRADE.cell),
      i1 = Math.floor((Math.max(...xs) + r) / ROAD_GRADE.cell),
      j0 = Math.floor((Math.min(...zs) - r) / ROAD_GRADE.cell),
      j1 = Math.floor((Math.max(...zs) + r) / ROAD_GRADE.cell);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const list = grid.get(key(i, j));
        if (list) list.push(n);
        else grid.set(key(i, j), [n]);
      }
  });
  /** A segment's centreline grade at t along it (clamped to it, then ± `along`). */
  const profile = (s: Segment, t: number) => {
    let h = -Infinity;
    for (const o of [
      -ROAD_GRADE.along,
      -ROAD_GRADE.along / 2,
      0,
      ROAD_GRADE.along / 2,
      ROAD_GRADE.along,
    ])
      h = Math.max(h, heightAt(s.ax + s.dx * (t + o), s.az + s.dz * (t + o)));
    return h;
  };
  return {
    at(x, z, lean = true, reach: number = ROAD_GRADE.reach) {
      const list = grid.get(key(Math.floor(x / ROAD_GRADE.cell), Math.floor(z / ROAD_GRADE.cell)));
      if (!list) return null;
      let grade = -Infinity,
        on = false;
      for (const n of list) {
        const s = segments[n]!;
        const t = (x - s.ax) * s.dx + (z - s.az) * s.dz;
        const across = Math.abs(-(x - s.ax) * s.dz + (z - s.az) * s.dx);
        // Past a segment's ends its neighbour (or the road's end, half a half-width on) carries.
        // Beyond that (and beyond its reach to the side) it only blends a road meeting it.
        const out = Math.max(0, across - s.half - reach, -s.half - t, t - s.length - s.half);
        if (out > ROAD_GRADE.blend) continue;
        if (out === 0) on = true;
        const g = profile(s, Math.max(0, Math.min(s.length, t))) - out * ROAD_GRADE.ramp;
        if (g > grade) grade = g;
      }
      if (!on) return null;
      if (!lean) return grade;
      // The side leans into the ground by at most `lean` (a cutting's wall stands at the edge).
      let ground = heightAt(x, z);
      for (const [ox, oz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const)
        ground = Math.max(ground, heightAt(x + ox, z + oz));
      return Math.max(grade, Math.min(ground, grade + ROAD_GRADE.lean));
    },
  };
}
