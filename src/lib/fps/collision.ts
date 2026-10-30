import { WORLD_SOLIDS, type Solid, type Surface } from "./map";
export type Vector = { x: number; y: number; z: number };
export type WorldHit = {
  distance: number;
  point: Vector;
  normal: Vector;
  surface: Surface;
  solidId: string;
};
/** Shared slab test for world surfaces and player hit volumes. Direction is a unit vector. */
export function rayBox(origin: Vector, direction: Vector, center: Vector, size: Vector): number {
  let near = 0,
    far = Infinity;
  for (const axis of ["x", "y", "z"] as const) {
    const lo = center[axis] - size[axis] / 2,
      hi = center[axis] + size[axis] / 2;
    if (Math.abs(direction[axis]) < 1e-10) {
      if (origin[axis] < lo || origin[axis] > hi) return Infinity;
    } else {
      const a = (lo - origin[axis]) / direction[axis],
        b = (hi - origin[axis]) / direction[axis];
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) return Infinity;
    }
  }
  return far < 0 ? Infinity : near;
}
export function traceWorld(origin: Vector, direction: Vector, maxDistance = 100): WorldHit | null {
  let distance = maxDistance,
    solid: Solid | null = null;
  for (const candidate of WORLD_SOLIDS) {
    const hit = rayBox(origin, direction, candidate, {
      x: candidate.w,
      y: candidate.h,
      z: candidate.d,
    });
    if (hit <= distance && Number.isFinite(hit)) {
      distance = hit;
      solid = candidate;
    }
  }
  if (!solid) return null;
  const point = {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance,
  };
  const normal: Vector = { x: 0, y: 0, z: 0 };
  let closest = Infinity;
  for (const [axis, size] of [
    ["x", solid.w],
    ["y", solid.h],
    ["z", solid.d],
  ] as const) {
    const delta = point[axis] - solid[axis],
      edge = Math.abs(Math.abs(delta) - size / 2);
    if (edge < closest) {
      closest = edge;
      normal.x = 0;
      normal.y = 0;
      normal.z = 0;
      normal[axis] = delta >= 0 ? 1 : -1;
    }
  }
  return { distance, point, normal, surface: solid.surface, solidId: solid.id };
}
