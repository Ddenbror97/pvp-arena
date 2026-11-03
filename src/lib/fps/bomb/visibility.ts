import { traceWorld } from "../collision";
import { eyeHeight, PLAYER_RADIUS } from "../map";
import type { GameMap } from "../maps/types";

type Body = { x: number; y: number; z: number; crouched?: boolean };

/**
 * Some of `target`'s combat silhouette is visible from `viewer`'s eye: the same test as the 1v1
 * canSeeOpponent (head top, eye, chest × centre and both sides), for any pair of players.
 * Used by the bomb bots and by the room's per-recipient snapshot filtering.
 */
export function canSee(map: GameMap, viewer: Body, target: Body): boolean {
  const origin = { x: viewer.x, y: viewer.y + eyeHeight(viewer), z: viewer.z };
  const dx = target.x - viewer.x,
    dz = target.z - viewer.z,
    length = Math.hypot(dx, dz) || 1;
  const sideX = (dz / length) * PLAYER_RADIUS * 0.9,
    sideZ = (-dx / length) * PLAYER_RADIUS * 0.9;
  const h = eyeHeight(target);
  for (const height of [h + 0.1, h, h * 0.55])
    for (const side of [-1, 0, 1]) {
      const x = target.x + sideX * side - origin.x,
        y = target.y + height - origin.y,
        z = target.z + sideZ * side - origin.z,
        distance = Math.hypot(x, y, z);
      if (
        distance < 0.01 ||
        !traceWorld(
          origin,
          { x: x / distance, y: y / distance, z: z / distance },
          Math.max(0, distance - 0.025),
          map,
        )
      )
        return true;
    }
  return false;
}
