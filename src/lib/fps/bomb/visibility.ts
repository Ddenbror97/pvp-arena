import { eyeHeight, PLAYER_RADIUS } from "../map";
import type { GameMap } from "../maps/types";

type Body = { x: number; y: number; z: number; crouched?: boolean };

/**
 * True when a sight/bullet solid blocks the segment from `o` along unit `(dx, dy, dz)` within
 * `reach`. Exactly `traceWorld(o, d, reach, map) !== null` (the same slab arithmetic on the same
 * bounds, so the same answer to the last bit) without its nearest-hit search, normal or
 * allocations, and with the segment's bounding box as a prefilter. The room runs this for every
 * recipient × enemy × 9 rays every snapshot; it was 88% of a full room's CPU time.
 */
function occluded(
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

const HEIGHTS = [1, 1, 0.55] as const;
const SIDES = [-1, 0, 1] as const;

/**
 * Some of `target`'s combat silhouette is visible from `viewer`'s eye: the same test as the 1v1
 * canSeeOpponent (head top, eye, chest × centre and both sides), for any pair of players.
 * Used by the bomb bots and by the room's per-recipient snapshot filtering.
 */
export function canSee(map: GameMap, viewer: Body, target: Body): boolean {
  const ox = viewer.x,
    oy = viewer.y + eyeHeight(viewer),
    oz = viewer.z;
  const dx = target.x - viewer.x,
    dz = target.z - viewer.z,
    length = Math.hypot(dx, dz) || 1;
  const sideX = (dz / length) * PLAYER_RADIUS * 0.9,
    sideZ = (-dx / length) * PLAYER_RADIUS * 0.9;
  const h = eyeHeight(target);
  for (let i = 0; i < 3; i++) {
    const height = i === 0 ? h + 0.1 : h * HEIGHTS[i]!;
    for (const side of SIDES) {
      const x = target.x + sideX * side - ox,
        y = target.y + height - oy,
        z = target.z + sideZ * side - oz,
        distance = Math.hypot(x, y, z);
      if (
        distance < 0.01 ||
        !occluded(
          map,
          ox,
          oy,
          oz,
          x / distance,
          y / distance,
          z / distance,
          Math.max(0, distance - 0.025),
        )
      )
        return true;
    }
  }
  return false;
}
