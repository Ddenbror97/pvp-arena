import { segmentOccluded } from "../visibility-occlusion";
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
        (!segmentOccluded(
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
