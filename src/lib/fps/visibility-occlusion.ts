import type { GameMap } from "./maps/types";

/** Allocation-free sight-segment slab test shared by both FPS modes. */
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
  const loX = Math.min(ox, ex),
    hiX = Math.max(ox, ex),
    loY = Math.min(oy, ey),
    hiY = Math.max(oy, ey),
    loZ = Math.min(oz, ez),
    hiZ = Math.max(oz, ez);
  const sx = Math.abs(dx) < 1e-10,
    sy = Math.abs(dy) < 1e-10,
    sz = Math.abs(dz) < 1e-10;
  for (const s of map.worldBounds) {
    // A box the segment's bounding box misses cannot be hit within reach (rounding margin 1 mm).
    if (
      s.maxX < loX - 1e-3 ||
      s.minX > hiX + 1e-3 ||
      s.maxY < loY - 1e-3 ||
      s.minY > hiY + 1e-3 ||
      s.maxZ < loZ - 1e-3 ||
      s.minZ > hiZ + 1e-3
    )
      continue;
    let near = 0,
      far = Infinity;
    if (sx) {
      if (ox < s.minX || ox > s.maxX) continue;
    } else {
      const a = (s.minX - ox) / dx,
        b = (s.maxX - ox) / dx;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) continue;
    }
    if (sy) {
      if (oy < s.minY || oy > s.maxY) continue;
    } else {
      const a = (s.minY - oy) / dy,
        b = (s.maxY - oy) / dy;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) continue;
    }
    if (sz) {
      if (oz < s.minZ || oz > s.maxZ) continue;
    } else {
      const a = (s.minZ - oz) / dz,
        b = (s.maxZ - oz) / dz;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) continue;
    }
    if (far >= 0 && near <= reach) return true;
  }
  return false;
}
