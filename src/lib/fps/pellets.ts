import type { Vector } from "./collision";

/** A deterministic 32-bit mix of three integers (spread and pellet patterns). */
export const hash32 = (a: number, b: number, c: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ c;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
};

/**
 * A shell's pellets round the shot's direction: one down the middle and the rest on a ring at
 * about two thirds of the cone, each nudged by the shot's hash, so a pattern is even (no
 * shell throws them all into one corner) and still never the same twice. Deterministic.
 * Shared by the battle royale and 1v1/5v5 shotguns.
 */
export function pelletDirections(
  dir: Vector,
  p: { count: number; spreadDeg: number },
  hash: number,
): Vector[] {
  const cone = (p.spreadDeg * Math.PI) / 180;
  // Two axes across the shot.
  const up = Math.abs(dir.y) > 0.95 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  let rx = up.y * dir.z - up.z * dir.y,
    ry = up.z * dir.x - up.x * dir.z,
    rz = up.x * dir.y - up.y * dir.x;
  const rl = Math.hypot(rx, ry, rz);
  rx /= rl;
  ry /= rl;
  rz /= rl;
  const ux = dir.y * rz - dir.z * ry,
    uy = dir.z * rx - dir.x * rz,
    uz = dir.x * ry - dir.y * rx;
  const out: Vector[] = [];
  const turn = ((hash % 360) * Math.PI) / 180;
  for (let i = 0; i < p.count; i++) {
    const h = hash32(hash, i, 7);
    const ring = i === 0 ? 0.12 : 0.45 + ((h % 1000) / 1000) * 0.55;
    const angle = turn + (i * Math.PI * 2) / Math.max(1, p.count - 1) + ((h >>> 10) % 100) / 160;
    const a = Math.tan(cone * ring);
    const cx = Math.cos(angle) * a,
      cy = Math.sin(angle) * a;
    const x = dir.x + rx * cx + ux * cy,
      y = dir.y + ry * cx + uy * cy,
      z = dir.z + rz * cx + uz * cy;
    const l = Math.hypot(x, y, z);
    out.push({ x: x / l, y: y / l, z: z / l });
  }
  return out;
}
