import type { GameMap, SolidBounds } from "./maps/types";
import { RAY_PAD, sightIndex } from "./solid-index";

/** The slab test of one solid against the segment (its bounding box first; rounding margin 1 mm). */
function hits(
  s: SolidBounds,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  reach: number,
  ex: number,
  ey: number,
  ez: number,
) {
  // A box the segment's bounding box misses cannot be hit within reach.
  if (
    s.maxX < Math.min(ox, ex) - 1e-3 ||
    s.minX > Math.max(ox, ex) + 1e-3 ||
    s.maxY < Math.min(oy, ey) - 1e-3 ||
    s.minY > Math.max(oy, ey) + 1e-3 ||
    s.maxZ < Math.min(oz, ez) - 1e-3 ||
    s.minZ > Math.max(oz, ez) + 1e-3
  )
    return false;
  let near = 0,
    far = Infinity;
  if (Math.abs(dx) < 1e-10) {
    if (ox < s.minX || ox > s.maxX) return false;
  } else {
    const a = (s.minX - ox) / dx,
      b = (s.maxX - ox) / dx;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  if (Math.abs(dy) < 1e-10) {
    if (oy < s.minY || oy > s.maxY) return false;
  } else {
    const a = (s.minY - oy) / dy,
      b = (s.maxY - oy) / dy;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  if (Math.abs(dz) < 1e-10) {
    if (oz < s.minZ || oz > s.maxZ) return false;
  } else {
    const a = (s.minZ - oz) / dz,
      b = (s.maxZ - oz) / dz;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  return far >= 0 && near <= reach;
}

/** The reference: every solid tested (the answer segmentOccluded must give; used by its test). */
export function segmentOccludedScan(
  map: GameMap,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  reach: number,
) {
  const ex = ox + dx * reach,
    ey = oy + dy * reach,
    ez = oz + dz * reach;
  for (const s of map.worldBounds)
    if (hits(s, ox, oy, oz, dx, dy, dz, reach, ex, ey, ez)) return true;
  return false;
}

/**
 * Allocation-free sight-segment slab test shared by both FPS modes. Only the solids in the grid
 * cells the segment passes are tested (solid-index.ts): the same test on the same bounds, so
 * the same answer as the full scan (segmentOccludedScan) to the last bit.
 */
export function segmentOccluded(
  map: GameMap,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  reach: number,
) {
  const ex = ox + dx * reach,
    ey = oy + dy * reach,
    ez = oz + dz * reach;
  const index = sightIndex(map);
  for (const s of index.big) if (hits(s, ox, oy, oz, dx, dy, dz, reach, ex, ey, ez)) return true;
  const g = index.sight;
  if (++index.ray >= 0xffffffff) {
    index.seen.fill(0);
    index.ray = 1;
  }
  const mark = index.ray,
    seen = index.seen,
    last = g.cols - 1,
    lastRow = g.rows - 1;
  const a0 = Math.min(last, Math.max(0, Math.floor((Math.min(ox, ex) - RAY_PAD - g.x0) / g.cell))),
    a1 = Math.min(last, Math.max(0, Math.floor((Math.max(ox, ex) + RAY_PAD - g.x0) / g.cell)));
  const sx = ex - ox,
    sz = ez - oz;
  for (let a = a0; a <= a1; a++) {
    // The part of the segment inside this column (grown by the pad), and its z extent. The
    // edge columns also hold everything beyond them.
    let zLo = Math.min(oz, ez),
      zHi = Math.max(oz, ez);
    if (Math.abs(sx) >= 1e-9) {
      const xl = a === 0 ? -Infinity : g.x0 + a * g.cell - RAY_PAD,
        xh = a === last ? Infinity : g.x0 + (a + 1) * g.cell + RAY_PAD;
      const ta = (xl - ox) / sx,
        tb = (xh - ox) / sx;
      const t0 = Math.max(0, Math.min(ta, tb)),
        t1 = Math.min(1, Math.max(ta, tb));
      if (t0 > t1) continue;
      const za = oz + sz * t0,
        zb = oz + sz * t1;
      zLo = Math.min(za, zb);
      zHi = Math.max(za, zb);
    }
    const b0 = Math.min(lastRow, Math.max(0, Math.floor((zLo - RAY_PAD - g.z0) / g.cell))),
      b1 = Math.min(lastRow, Math.max(0, Math.floor((zHi + RAY_PAD - g.z0) / g.cell)));
    for (let b = b0; b <= b1; b++) {
      const cell = g.cells[b * g.cols + a]!;
      for (let i = 0; i < cell.length; i++) {
        const s = cell[i]!;
        if (seen[s.n] === mark) continue;
        seen[s.n] = mark;
        if (hits(s, ox, oy, oz, dx, dy, dz, reach, ex, ey, ez)) return true;
      }
    }
  }
  return false;
}
