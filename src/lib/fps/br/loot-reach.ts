import type { StaticWorld } from "./static-world";

/** How far short of an item the look to it may stop: what it lies on or in (a shelf's lip). */
const SLACK = 0.3;
/** Where an item is reached for: this far over where it lies. */
export const LOOT_GRAB_HEIGHT = 0.15;

/**
 * The pickup's sight rule, one for the room (actions.ts) and for the client's prompt and its
 * nearby list (loot-renderer.ts, br-arena.ts), which mirror it: the look from the eye to the
 * item (bodies' boxes, not the shot-only fill) is not stopped more than 0.3 m short of it.
 *
 * And not from under the floor it lies on (post-development audit, 2026-11-28). The allowance
 * is wider than a thin floor: the fire station's, the brick shop's, the wooden farmhouse's and
 * the water tower's decks are 10 cm slabs, so a player on the storey below was offered the
 * loot of the storey above and the room gave it (about 40 items a match). An eye lower than
 * the item's floor with something solid straight over it has to see the item with nothing in
 * between; an item on a landing or a ledge seen clear from the stair or the street stays in
 * reach, and so does one on a table seen from a crouch (nothing over the eye).
 */
export function lootInSight(
  world: StaticWorld,
  ex: number,
  ey: number,
  ez: number,
  item: { x: number; y: number; z: number },
  dist = Math.hypot(item.x - ex, item.y + LOOT_GRAB_HEIGHT - ey, item.z - ez),
): boolean {
  const ty = item.y + LOOT_GRAB_HEIGHT;
  const hit = world.raycast(ex, ey, ez, item.x - ex, ty - ey, item.z - ez, dist, true);
  if (!hit) return true;
  if (hit.distance < dist - SLACK) return false;
  return !(ey < item.y && world.raycast(ex, ey, ez, 0, 1, 0, ty - ey, true));
}
