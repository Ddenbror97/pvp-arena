import { eyeHeight, PLAYER_RADIUS } from "../map";
import type { GameMap } from "../maps/types";
import { smokeHides, type GrenadeWorld } from "../grenades/world";

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
export function canSee(
  map: GameMap,
  viewer: Body,
  target: Body,
  /** Smoke clouds hide as well as walls. */
  smoke?: Pick<GrenadeWorld, "smokes" | "now">,
): boolean {
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
        (!occluded(
          map,
          ox,
          oy,
          oz,
          x / distance,
          y / distance,
          z / distance,
          Math.max(0, distance - 0.025),
        ) &&
          !smokeHides(smoke, { x: ox, y: oy, z: oz }, { x: ox + x, y: oy + y, z: oz + z }))
      )
        return true;
    }
  }
  return false;
}

/** Snapshot reveal covers the rendered silhouette, not just the bot's aim points.
 * The cheap perception test stays unchanged; the extra rays only run for occluded targets.
 * Boots/shoulders may be visible under a ledge or beside cover while all nine aim points hide.
 */
export function canReveal(
  map: GameMap,
  viewer: Body,
  target: Body & { yaw?: number },
  smoke?: Pick<GrenadeWorld, "smokes" | "now">,
) {
  if (canSee(map, viewer, target, smoke)) return true;
  const ox = viewer.x,
    oy = viewer.y + eyeHeight(viewer),
    oz = viewer.z;
  const dx = target.x - ox,
    dz = target.z - oz,
    length = Math.hypot(dx, dz) || 1;
  const sx = dz / length,
    sz = -dx / length,
    top = eyeHeight(target) + 0.1;
  const visible = (x: number, y: number, z: number) => {
    const vx = x - ox,
      vy = y - oy,
      vz = z - oz,
      distance = Math.hypot(vx, vy, vz);
    return (
      distance < 0.01 ||
      (!occluded(
        map,
        ox,
        oy,
        oz,
        vx / distance,
        vy / distance,
        vz / distance,
        Math.max(0, distance - 0.025),
      ) &&
        !smokeHides(smoke, { x: ox, y: oy, z: oz }, { x, y, z }))
    );
  };
  for (const fraction of [0.08, 0.3, 0.55, 0.8, 1])
    for (const side of [-0.38, 0, 0.38])
      if (visible(target.x + sx * side, target.y + top * fraction, target.z + sz * side))
        return true;
  return (
    target.yaw !== undefined &&
    visible(
      target.x - Math.sin(target.yaw) * 0.8,
      target.y + top * 0.8,
      target.z - Math.cos(target.yaw) * 0.8,
    )
  );
}
