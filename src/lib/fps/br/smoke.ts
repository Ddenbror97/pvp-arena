/**
 * Battle royale smoke clouds without three.js: the client draws them (nade-renderer.ts) and the
 * server's fog of war treats them as cover (BrSight.near), from the same puffs.
 */
import { GRENADES } from "../grenades/rules";
import type { Smoke } from "../grenades/effects";
import type { StaticWorld } from "./static-world";

/**
 * The puff grid of a smoke that popped at (x, y, z), in growth order: breadth-first from the can
 * over GRENADES.smoke.spacing, inside the cloud's ellipsoid, above the ground and out of walls
 * (as effects.ts smokePuffs does on the 1v1/5v5 maps).
 */
export function brSmokePuffs(x: number, y: number, z: number, world: StaticWorld): number[] {
  const S = GRENADES.smoke;
  const s = S.spacing;
  const ground = y - GRENADES.physics.radius;
  const halfH = S.height / 2,
    midY = ground + halfH;
  const seed = [x, ground + s * 0.55, z] as const;
  const seen = new Set<number>([0]);
  const key = (i: number, j: number, k: number) => ((i + 64) * 128 + (j + 64)) * 128 + (k + 64);
  const queue: Array<[number, number, number]> = [[0, 0, 0]];
  const out: number[] = [];
  const round = (v: number) => Math.round(v * 100) / 100;
  const at = (i: number, j: number, k: number) =>
    [seed[0] + i * s, seed[1] + j * s, seed[2] + k * s] as const;
  for (let head = 0; head < queue.length && out.length / 3 < S.maxPuffs; head++) {
    const [i, j, k] = queue[head]!;
    const [px, py, pz] = at(i, j, k);
    out.push(round(px), round(py), round(pz));
    for (const [di, dj, dk] of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
      [0, 1, 0],
      [0, -1, 0],
    ] as const) {
      const id = key(i + di, j + dj, k + dk);
      if (seen.has(id)) continue;
      seen.add(id);
      const [qx, qy, qz] = at(i + di, j + dj, k + dk);
      const rx = (qx - x) / S.radius,
        rz = (qz - z) / S.radius,
        ry = (qy - midY) / halfH;
      if (rx * rx + rz * rz + ry * ry > 1) continue;
      if (qy < world.hf.heightAt(qx, qz) + 0.1) continue;
      // A puff never sits in a wall, nor floods through one from its neighbour.
      if (world.blocked(qx - 0.05, qy - 0.05, qz - 0.05, 0.1, 0.05)) continue;
      if (world.blocked((px + qx) / 2, (py + qy) / 2 - 0.05, (pz + qz) / 2, 0.1, 0.05)) continue;
      queue.push([i + di, j + dj, k + dk]);
    }
  }
  return out;
}

/** A smoke area as the room keeps it (state.nades) → the cloud the clients draw. */
export function brSmoke(
  id: number,
  area: { x: number; y: number; z: number; until: number },
  world: StaticWorld,
  cache: Map<number, number[]>,
): Smoke {
  let puffs = cache.get(id);
  if (!puffs) cache.set(id, (puffs = brSmokePuffs(area.x, area.y, area.z, world)));
  // (The clients start the cloud this long before it ends: br-arena.ts.)
  return { id, at: area.until - GRENADES.smoke.durationMs, puffs };
}
