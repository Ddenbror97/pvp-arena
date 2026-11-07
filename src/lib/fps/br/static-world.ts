import type { Heightfield } from "./heightfield";
import type { Placement } from "./layout";
import { forEachTrunkNear, type VegetationWorld } from "./vegetation";
import { WORLD_HALF } from "./world";

/**
 * The solid world of Project Island for movement, bullets and sight lines, shared by the server
 * room and the client prediction: the heightfield, every placed building/prop as axis-aligned
 * collision boxes (from public/fps/br/models/collision.json, rotated by quarter turns), and tree
 * trunks (vertical cylinders, from the shared vegetation placement).
 *
 * Boxes are indexed in a 4 m grid, so hull queries don't scan a whole detailed building.
 */
export type CollisionData = {
  worldRevision?: string;
  voxel: number;
  models: Record<string, number[][]>;
  /** Authored, rendered entrances override inference from porch/window gaps. */
  entrances?: Record<
    string,
    Array<{ x: number; z: number; y0: number; y1: number; along: "x" | "z"; width: number }>
  >;
};

const CELL = 4;
const COLS = Math.ceil((2 * WORLD_HALF) / CELL);

/** Model-space box rotated by `turn` quarter turns about +y (three.js rotation.y = turn·π/2). */
export function turnBox(
  b: number[],
  turn: number,
): [number, number, number, number, number, number] {
  const [x0, y0, z0, x1, y1, z1] = b as [number, number, number, number, number, number];
  switch (turn & 3) {
    case 1:
      return [z0, y0, -x1, z1, y1, -x0];
    case 2:
      return [-x1, y0, -z1, -x0, y1, -z0];
    case 3:
      return [-z1, y0, x0, -z0, y1, x1];
    default:
      return [x0, y0, z0, x1, y1, z1];
  }
}

export type RayHit = { distance: number; kind: "ground" | "box" | "trunk" };

export class StaticWorld {
  readonly hf: Heightfield;
  readonly vegetation: VegetationWorld | null;
  /** World boxes, 6 floats each: x0, y0, z0, x1, y1, z1. */
  readonly boxes: Float32Array;
  private readonly cells = new Map<number, number[]>();
  private stamp = 0;
  private readonly seen: Uint32Array;

  constructor(
    hf: Heightfield,
    placements: Placement[],
    collision: CollisionData,
    vegetation: VegetationWorld | null,
    /** World-space boxes that are not models (bridges): x0, y0, z0, x1, y1, z1. */
    extraBoxes: number[][] = [],
  ) {
    this.hf = hf;
    this.vegetation = vegetation;
    const list: number[] = [];
    for (const p of placements) {
      const local = collision.models[p.model];
      if (!local) throw new Error(`No collision for model ${p.model}`);
      for (const b of local) {
        const [x0, y0, z0, x1, y1, z1] = turnBox(b, p.turn);
        list.push(x0 + p.x, y0 + p.y, z0 + p.z, x1 + p.x, y1 + p.y, z1 + p.z);
      }
    }
    for (const b of extraBoxes) list.push(...b);
    this.boxes = Float32Array.from(list);
    this.seen = new Uint32Array(this.boxes.length / 6);
    for (let i = 0; i < this.boxes.length / 6; i++) {
      const o = i * 6;
      const c0 = this.cellIndex(this.boxes[o]!),
        c1 = this.cellIndex(this.boxes[o + 3]!),
        r0 = this.cellIndex(this.boxes[o + 2]!),
        r1 = this.cellIndex(this.boxes[o + 5]!);
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++) {
          const key = r * COLS + c;
          let cell = this.cells.get(key);
          if (!cell) this.cells.set(key, (cell = []));
          cell.push(i);
        }
    }
  }

  private cellIndex(v: number) {
    return Math.min(COLS - 1, Math.max(0, Math.floor((v + WORLD_HALF) / CELL)));
  }

  get boxCount() {
    return this.boxes.length / 6;
  }

  /** Calls `visit(index)` once for every box whose cells overlap the x/z rectangle. */
  forEachBox(minX: number, minZ: number, maxX: number, maxZ: number, visit: (i: number) => void) {
    const c0 = this.cellIndex(minX),
      c1 = this.cellIndex(maxX),
      r0 = this.cellIndex(minZ),
      r1 = this.cellIndex(maxZ);
    // Most player hulls and support probes fit in one cell. A box occurs only once
    // in that cell, so deduplication stamps and typed-array writes do no useful work.
    if (c0 === c1 && r0 === r1) {
      const cell = this.cells.get(r0 * COLS + c0);
      if (cell) for (const i of cell) visit(i);
      return;
    }
    const stamp = ++this.stamp;
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const cell = this.cells.get(r * COLS + c);
        if (!cell) continue;
        for (const i of cell) {
          if (this.seen[i] === stamp) continue;
          this.seen[i] = stamp;
          visit(i);
        }
      }
  }

  /**
   * Whether a standing (or crouched) player hull — a square of half-width `radius` from `y` to
   * `y + height` — overlaps a box or a trunk.
   */
  blocked(x: number, y: number, z: number, height: number, radius: number): boolean {
    let hit = false;
    const b = this.boxes;
    this.forEachBox(x - radius, z - radius, x + radius, z + radius, (i) => {
      if (hit) return;
      const o = i * 6;
      if (
        x + radius > b[o]! + 1e-7 &&
        x - radius < b[o + 3]! - 1e-7 &&
        z + radius > b[o + 2]! + 1e-7 &&
        z - radius < b[o + 5]! - 1e-7 &&
        y + height > b[o + 1]! + 1e-7 &&
        y < b[o + 4]! - 1e-7
      )
        hit = true;
    });
    if (hit || !this.vegetation) return hit;
    forEachTrunkNear(this.vegetation, x, z, radius + 1, (tx, tz, r, h, ground) => {
      if (hit) return;
      if (y > ground + h || y + height < ground - 0.5) return;
      if (Math.hypot(tx - x, tz - z) < r + radius) hit = true;
    });
    return hit;
  }

  /**
   * Highest support under a hull at x/z that is not above `maxY`: the terrain, or the top of a
   * box overlapping the footprint. Used for landing and for stepping up (maxY = feet + step).
   */
  supportAt(x: number, z: number, radius: number, maxY: number): number {
    let top = this.hf.heightAt(x, z);
    const b = this.boxes;
    this.forEachBox(x - radius, z - radius, x + radius, z + radius, (i) => {
      const o = i * 6;
      const t = b[o + 4]!;
      if (
        t > top &&
        t <= maxY + 1e-6 &&
        x + radius > b[o]! &&
        x - radius < b[o + 3]! &&
        z + radius > b[o + 2]! &&
        z - radius < b[o + 5]!
      )
        top = t;
    });
    return top;
  }

  /**
   * First hit of a ray with the ground, a box or a trunk within `maxDistance` (direction need
   * not be normalised). Boxes are tested cell by cell along the ray's x/z path.
   */
  raycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDistance: number,
  ): RayHit | null {
    const len = Math.hypot(dx, dy, dz);
    if (!(len > 0)) return null;
    dx /= len;
    dy /= len;
    dz /= len;
    let best: RayHit | null = null;
    const ground = this.hf.raycast(ox, oy, oz, dx, dy, dz, maxDistance);
    if (ground) best = { distance: ground.distance, kind: "ground" };
    const limit = best ? best.distance : maxDistance;
    // Walk the ray in steps of one cell and test the boxes of the cells it crosses.
    const b = this.boxes;
    const steps = Math.ceil(limit / CELL) + 1;
    let nearest = limit;
    let boxHit = false;
    const stamp = ++this.stamp;
    for (let s = 0; s < steps; s++) {
      const t0 = s * CELL,
        t1 = Math.min(limit, (s + 1) * CELL);
      if (t0 > nearest) break;
      const ax = ox + dx * t0,
        az = oz + dz * t0,
        bx = ox + dx * t1,
        bz = oz + dz * t1;
      const c0 = this.cellIndex(Math.min(ax, bx)),
        c1 = this.cellIndex(Math.max(ax, bx)),
        r0 = this.cellIndex(Math.min(az, bz)),
        r1 = this.cellIndex(Math.max(az, bz));
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++) {
          const cell = this.cells.get(r * COLS + c);
          if (!cell) continue;
          for (const i of cell) {
            if (this.seen[i] === stamp) continue;
            this.seen[i] = stamp;
            const o = i * 6;
            const t = slab(
              ox,
              oy,
              oz,
              dx,
              dy,
              dz,
              b[o]!,
              b[o + 1]!,
              b[o + 2]!,
              b[o + 3]!,
              b[o + 4]!,
              b[o + 5]!,
            );
            if (t < nearest) {
              nearest = t;
              boxHit = true;
            }
          }
        }
    }
    if (boxHit) best = { distance: nearest, kind: "box" };
    // Trunks: only near the ray's first stretch is common; test along the ray in 30 m chunks.
    if (this.vegetation) {
      const reach = best ? best.distance : maxDistance;
      for (let t = 0; t < reach; t += 30) {
        const cx = ox + dx * (t + 15),
          cz = oz + dz * (t + 15);
        let hit = Infinity;
        forEachTrunkNear(this.vegetation, cx, cz, 17, (tx, tz, r, h, groundY) => {
          const d = rayCylinder(ox, oy, oz, dx, dy, dz, tx, tz, r, groundY, groundY + h);
          if (d < hit) hit = d;
        });
        if (hit < (best ? best.distance : maxDistance)) {
          best = { distance: hit, kind: "trunk" };
          break;
        }
      }
    }
    return best;
  }
}

function slab(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): number {
  let near = 0,
    far = Infinity;
  const axes: Array<[number, number, number, number]> = [
    [ox, dx, x0, x1],
    [oy, dy, y0, y1],
    [oz, dz, z0, z1],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-12) {
      if (o < lo || o > hi) return Infinity;
    } else {
      const a = (lo - o) / d,
        c = (hi - o) / d;
      near = Math.max(near, Math.min(a, c));
      far = Math.min(far, Math.max(a, c));
      if (near > far) return Infinity;
    }
  }
  return far < 0 ? Infinity : near;
}

/** Ray against a vertical cylinder (axis x/z, radius r, from y0 to y1); Infinity if missed. */
function rayCylinder(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cz: number,
  r: number,
  y0: number,
  y1: number,
): number {
  const px = ox - cx,
    pz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-12) return Math.hypot(px, pz) <= r && oy >= y0 && oy <= y1 ? 0 : Infinity;
  const b = 2 * (px * dx + pz * dz),
    c = px * px + pz * pz - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const sq = Math.sqrt(disc);
  for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
    if (t < 0) continue;
    const y = oy + dy * t;
    if (y >= y0 && y <= y1) return t;
  }
  return Infinity;
}
