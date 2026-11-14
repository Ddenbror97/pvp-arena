import type { WorldMeta } from "./world";

/**
 * Free-standing walls built from world data (no models), shared by the server (collision boxes)
 * and the client (one merged mesh): Blackwater Prison's perimeter (concept map E6, spec §3
 * "secure compound"; the flagship's outline since 2026-11-14). Each wall is a straight run
 * between two points with a flat top.
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
  height: 8,
  thickness: 1.6,
  /**
   * The wall's corners (bearing in degrees, 0 east, 90 south; m from the POI centre): the
   * owner's red outline of the yard (2026-11-14, build_world.py PRISON_RIM), about 24 m inside
   * its rim so the wall stands on the level yard all round.
   */
  ring: [
    [-180, 264],
    [-150, 244],
    [-120, 198],
    [-90, 158],
    [-60, 168],
    [-30, 176],
    [0, 172],
    [30, 178],
    [60, 174],
    [90, 162],
    [115, 154],
    [135, 172],
    [160, 224],
  ] as ReadonlyArray<readonly [number, number]>,
  /**
   * Gates at corners (corner index: opening m): the south gate (the road up through the
   * gorge), the north gate (the goat path over the north ridge), posterns east (the canyon)
   * and west (the saddle).
   */
  gates: { 0: 4, 3: 8, 6: 4, 9: 12 } as Readonly<Record<number, number>>,
} as const;

/** The wall's corners in world metres. */
export function prisonWallCorners(meta: WorldMeta): Array<[number, number]> {
  const prison = meta.pois.find((p) => p.id === "blackwater-prison");
  if (!prison) return [];
  return PRISON_WALL.ring.map(([b, r]) => {
    const a = (b * Math.PI) / 180;
    return [prison.x + Math.cos(a) * r, prison.z + Math.sin(a) * r] as [number, number];
  });
}

/**
 * The prison perimeter (the flagship, 2026-11-14): a run between each pair of corners, pulled
 * back from the corners that are gates.
 */
export function islandWalls(meta: WorldMeta): WallRun[] {
  const out: WallRun[] = [];
  const prison = meta.pois.find((p) => p.id === "blackwater-prison");
  if (!prison || prison.padHeight === undefined) return out;
  const { height, thickness, gates } = PRISON_WALL;
  const base = prison.padHeight - 0.5,
    top = prison.padHeight + height;
  const points = prisonWallCorners(meta);
  const n = points.length;
  for (let k = 0; k < n; k++) {
    let a = points[k]!,
      b = points[(k + 1) % n]!;
    const ga = gates[k],
      gb = gates[(k + 1) % n];
    if (ga) a = towards(a, b, ga / 2);
    if (gb) b = towards(b, a, gb / 2);
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
