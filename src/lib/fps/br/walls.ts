import type { WorldMeta } from "./world";

/**
 * Free-standing walls built from world data (no models), shared by the server (collision boxes)
 * and the client (one merged mesh): Blackwater Prison's star-shaped perimeter (concept map E6,
 * spec §3 "secure compound"). Each wall is a straight run between two points with a flat top.
 *
 * Gameplay module: no rendering state (fairness boundary).
 */
export type WallRun = {
  a: [number, number];
  b: [number, number];
  /** Bottom and top (m). */
  base: number;
  top: number;
  thickness: number;
};

export const PRISON_WALL = {
  height: 7,
  thickness: 1.6,
  /** Bastion tips and the mid-side points between them (m from the POI centre). */
  tip: 132,
  side: 104,
  /** Gate opening in the north wall (m). */
  gate: 12,
} as const;

/**
 * The prison perimeter: an eight-pointed bastion star (tips on the diagonals, as drawn), with a
 * gate in the middle of the north side.
 */
export function islandWalls(meta: WorldMeta): WallRun[] {
  const out: WallRun[] = [];
  const prison = meta.pois.find((p) => p.id === "blackwater-prison");
  if (!prison || prison.padHeight === undefined) return out;
  const { tip, side, height, thickness, gate } = PRISON_WALL;
  const base = prison.padHeight - 0.5,
    top = prison.padHeight + height;
  // Points every 45° from north (-z), alternating mid-side and bastion tip.
  const points: Array<[number, number]> = [];
  for (let k = 0; k < 8; k++) {
    const angle = -Math.PI / 2 + (k * Math.PI) / 4;
    const r = k % 2 === 0 ? side : tip;
    points.push([prison.x + Math.cos(angle) * r, prison.z + Math.sin(angle) * r]);
  }
  for (let k = 0; k < 8; k++) {
    let a = points[k]!,
      b = points[(k + 1) % 8]!;
    // The north mid-side point (k = 0) is the gate: pull both walls back from it.
    if (k === 0) a = towards(a, b, gate / 2);
    if (k === 7) b = towards(b, a, gate / 2);
    out.push({ a, b, base, top, thickness });
  }
  return out;
}

function towards(from: [number, number], to: [number, number], d: number): [number, number] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return [from[0] + ((to[0] - from[0]) * d) / len, from[1] + ((to[1] - from[1]) * d) / len];
}

/**
 * Collision for the walls as axis-aligned boxes: each run cut into pieces about as long as the
 * wall is thick, so a diagonal wall is a tight staircase of boxes (no gaps a player fits through).
 */
export function wallBoxes(walls: WallRun[]): number[][] {
  const boxes: number[][] = [];
  for (const w of walls) {
    const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const n = Math.max(1, Math.ceil(len / w.thickness));
    const h = w.thickness / 2;
    for (let k = 0; k < n; k++) {
      const t0 = k / n,
        t1 = (k + 1) / n;
      const x0 = w.a[0] + (w.b[0] - w.a[0]) * t0,
        z0 = w.a[1] + (w.b[1] - w.a[1]) * t0,
        x1 = w.a[0] + (w.b[0] - w.a[0]) * t1,
        z1 = w.a[1] + (w.b[1] - w.a[1]) * t1;
      boxes.push(
        [
          Math.min(x0, x1) - h,
          w.base,
          Math.min(z0, z1) - h,
          Math.max(x0, x1) + h,
          w.top,
          Math.max(z0, z1) + h,
        ].map((v) => +v.toFixed(3)),
      );
    }
  }
  return boxes;
}
