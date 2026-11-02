import type { WorldHit, Vector } from "./collision";
import type { Surface } from "./map";
import type { GameMap, MapDefinition } from "./maps/types";

/** Sound materials are independent of bullet/impact materials and collision geometry. */
export type FootstepSurface = Surface | "snow" | "dirt";
export const STEP_VARIANTS = ["wood", "metal", "snow", "dirt"] as const;
export type MapFootsteps = {
  readonly floor?: FootstepSurface;
  /** Only upward, walkable faces use these overrides; walls keep their impact material. */
  readonly tops?: Readonly<Record<string, FootstepSurface>>;
  /** Cleared/sheltered ground, planks or paving within a map's default ground material. */
  readonly regions?: readonly {
    readonly x: number;
    readonly z: number;
    readonly w: number;
    readonly d: number;
    readonly surface: FootstepSurface;
  }[];
};
const valid = (s: string) => s === "concrete" || STEP_VARIANTS.some((v) => v === s);

/** Validate authored sound metadata once, alongside the map's compiled collision sets. */
export function validateFootsteps(map: MapDefinition): void {
  const sounds = map.footsteps;
  if (!sounds) return;
  if (sounds.floor && !valid(sounds.floor)) throw Error(`INVALID_FOOTSTEP_SURFACE:${map.id}`);
  for (const [id, surface] of Object.entries(sounds.tops ?? {})) {
    if (!map.boxes.some((b) => b.id === id) || !valid(surface))
      throw Error(`INVALID_FOOTSTEP_TOP:${map.id}:${id}`);
  }
  for (const zone of sounds.regions ?? []) {
    if (
      ![zone.x, zone.z, zone.w, zone.d].every(Number.isFinite) ||
      zone.w <= 0 ||
      zone.d <= 0 ||
      !valid(zone.surface)
    )
      throw Error(`INVALID_FOOTSTEP_REGION:${map.id}`);
  }
}

/** Shared authoritative lookup, called only when a grounded stride emits a step. */
export function footstepSurface(
  map: GameMap,
  position: Vector,
  hit: WorldHit | null,
): FootstepSurface {
  if (hit && hit.solidId !== map.floor.id)
    return (hit.normal.y > 0 ? map.footsteps?.tops?.[hit.solidId] : undefined) ?? hit.surface;
  for (const zone of map.footsteps?.regions ?? []) {
    if (Math.abs(position.x - zone.x) <= zone.w / 2 && Math.abs(position.z - zone.z) <= zone.d / 2)
      return zone.surface;
  }
  return map.footsteps?.floor ?? hit?.surface ?? map.floor.surface;
}
