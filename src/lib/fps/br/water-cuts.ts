import type { WorldMeta } from "./world";

/** A half-plane: points with (x − px)·nx + (z − pz)·nz ≥ 0 are kept. */
export type HalfPlane = { px: number; pz: number; nx: number; nz: number };

/**
 * The lakes a dam divides, each cut to its own side of the dam's centre line (owner,
 * 2026-11-16: the Old Dam's reservoir showed as a pale sheet over the dam's downstream face).
 * A lake is drawn as a rectangle round its bounds at its own level, kept where the land cover
 * says water and the ground is under it; the reservoir's rectangle (61.5 m) reached past the
 * dam over the lower lake (30.45 m), where both hold, so its sheet stood 30 m above that lake
 * behind the dam's crest, and from above it was a hard-edged rectangle. Of the lakes whose
 * rectangles cross a dam's line, the highest keeps the upstream side and the rest the
 * downstream side; a lake alone on a dam's line keeps the side its middle is on.
 */
export function damCuts(meta: WorldMeta): Map<string, HalfPlane[]> {
  const out = new Map<string, HalfPlane[]>();
  for (const b of meta.bridges ?? []) {
    if (!b.solid) continue;
    const [ax, az] = b.a,
      [bx, bz] = b.b;
    const l = Math.hypot(bx - ax, bz - az);
    // bridges.ts bridgeSpans: `side` is the left normal of a → b, `down` the downstream sign.
    const sx = -(bz - az) / l,
      sz = (bx - ax) / l;
    const down = b.down ?? -1;
    const across = (w: WorldMeta["waterBodies"][number]) => {
      const [x0, z0, x1, z1] = w.bounds;
      let lo = Infinity,
        hi = -Infinity;
      for (const [x, z] of [
        [x0 - 20, z0 - 20],
        [x1 + 20, z0 - 20],
        [x0 - 20, z1 + 20],
        [x1 + 20, z1 + 20],
      ] as const) {
        const d = (x - ax) * sx + (z - az) * sz;
        lo = Math.min(lo, d);
        hi = Math.max(hi, d);
      }
      // (Only where the rectangle also overlaps the dam's own length.)
      const along = [x0 - 20, x1 + 20].flatMap((x) =>
        [z0 - 20, z1 + 20].map((z) => ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / l),
      );
      return lo < 0 && hi > 0 && Math.max(...along) > 0 && Math.min(...along) < l;
    };
    const lakes = meta.waterBodies.filter(across);
    if (!lakes.length) continue;
    const top = Math.max(...lakes.map((w) => w.level));
    for (const w of lakes) {
      const [x0, z0, x1, z1] = w.bounds;
      const mid = ((x0 + x1) / 2 - ax) * sx + ((z0 + z1) / 2 - az) * sz;
      // Sign along `side` to keep: upstream is −down.
      const keep = lakes.length === 1 ? Math.sign(mid) || -down : w.level === top ? -down : down;
      const cuts = out.get(w.id) ?? [];
      cuts.push({ px: ax, pz: az, nx: sx * keep, nz: sz * keep });
      out.set(w.id, cuts);
    }
  }
  return out;
}

/** Whether (x, z) is on every kept side (no cuts: everywhere). */
export function keptBy(cuts: readonly HalfPlane[] | undefined, x: number, z: number): boolean {
  if (!cuts) return true;
  for (const h of cuts) if ((x - h.px) * h.nx + (z - h.pz) * h.nz < 0) return false;
  return true;
}
