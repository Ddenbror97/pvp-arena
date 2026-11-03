import { traceWorld, type Vector } from "./collision";
import type { GameMap } from "./maps/types";

export type SoundKind = "shot" | "step" | "reload" | "knife" | "bomb";
/** Shared hearing model for every FPS mode. Suppressed rifles carry less than an AWP. */
export function hearingRange(kind: SoundKind, awp = false, suppressed = false) {
  return kind === "shot"
    ? awp
      ? 110
      : suppressed
        ? 55
        : 90
    : kind === "step"
      ? 25
      : kind === "bomb"
        ? 200
        : 12;
}
export function distanceGain(distance: number, range: number, occluded = false) {
  const d = Math.max(0, distance - 1.5);
  return (
    (Math.pow(Math.max(0, 1 - distance / range), 1.25) / (1 + Math.pow(d / 14, 1.15))) *
    (occluded ? 0.45 : 1)
  );
}
/** Air loses high frequencies gradually; walls add a separate, stronger obstruction. */
export function distanceFilter(distance: number, occluded: boolean) {
  return Math.max(
    900,
    Math.min(occluded ? 1800 : 18000, 18000 * Math.exp(-Math.max(0, distance) / 30)),
  );
}
export function soundOccluded(map: GameMap, eye: Vector, source: Vector) {
  const dx = source.x - eye.x,
    dy = Math.max(source.y, 0.15) - eye.y,
    dz = source.z - eye.z;
  const distance = Math.hypot(dx, dy, dz);
  return (
    distance > 0.2 &&
    !!traceWorld(
      eye,
      { x: dx / distance, y: dy / distance, z: dz / distance },
      Math.max(0, distance - 0.1),
      map,
    )
  );
}
