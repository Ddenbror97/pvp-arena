/** Ambience helpers that need no renderer (unit-tested in tests/br-seagulls.test.ts). */
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The towns by the sea (owner, 2026-11-17: "sea birds sound for neighbourhoods at the sea …
 * played at the town not only close to the water"): the seagulls are heard all over them. Each
 * town's area is where its own placements stand (its centre and the distance that holds 95 % of
 * them), measured once from the layout; the gulls fade out over SEAGULL_FADE_M beyond it.
 * (West Point's and Island Village's shores are inland water: no gulls.)
 */
export const SEAGULL_TOWNS = new Set(["fishers-cove", "bayview", "bayview-seafront", "eastport"]);
export const SEAGULL_FADE_M = 150;
/** Shore placements this far beyond a town's buildings still belong to its waterfront. */
const SHORE_REACH_M = 250;
export function seagullAreas(layout: ReadonlyArray<{ x: number; z: number; poi?: string }>) {
  const byTown = new Map<string, Array<{ x: number; z: number }>>();
  const shore: Array<{ x: number; z: number }> = [];
  for (const p of layout)
    if (p.poi === "shore") shore.push(p);
    else if (p.poi && SEAGULL_TOWNS.has(p.poi)) {
      let list = byTown.get(p.poi);
      if (!list) byTown.set(p.poi, (list = []));
      list.push(p);
    }
  const area = (list: ReadonlyArray<{ x: number; z: number }>) => {
    const x = list.reduce((a, p) => a + p.x, 0) / list.length,
      z = list.reduce((a, p) => a + p.z, 0) / list.length;
    const d = list.map((p) => Math.hypot(p.x - x, p.z - z)).sort((a, b) => a - b);
    return { x, z, r: d[Math.floor(d.length * 0.95)] ?? 0 };
  };
  const towns = [...byTown.values()].map(area);
  // Each town's waterfront as an area of its own: the piers, quays and boats (poi "shore") just
  // beyond its buildings (Eastport's fish quay stands 230 m from the middle of its streets).
  const fronts = towns.flatMap((t) => {
    const near = shore.filter((p) => Math.hypot(p.x - t.x, p.z - t.z) < t.r + SHORE_REACH_M);
    return near.length ? [area(near)] : [];
  });
  return [...towns, ...fronts];
}
/** How much of a seagull town is round (x, z): 1 inside one, 0 past its fade. */
export function seagullPresence(
  areas: ReadonlyArray<{ x: number; z: number; r: number }>,
  x: number,
  z: number,
) {
  let best = 0;
  for (const a of areas)
    best = Math.max(best, 1 - smooth(a.r, a.r + SEAGULL_FADE_M, Math.hypot(x - a.x, z - a.z)));
  return best;
}
