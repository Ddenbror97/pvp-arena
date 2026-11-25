import { CollisionCoordinates } from "./collision-coordinates";
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

/** Population count for one unsigned 32-bit occupancy word. */
function bitCount(word: number) {
  word -= (word >>> 1) & 0x55555555;
  word = (word & 0x33333333) + ((word >>> 2) & 0x33333333);
  return (((word + (word >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

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

export type RayHit = {
  distance: number;
  kind: "ground" | "box" | "trunk";
  /** What stopped it, for checking the same blocker again cheaply (BrSight's witnesses). */
  box?: number;
  /** A trunk: x, z, radius, bottom, top. */
  trunk?: [number, number, number, number, number];
};

/**
 * A bridge deck as a surface (bridges.ts bridgeDecks): its centre line from (ax, az) along the
 * unit (ux, uz), `half` its half width, `ys` the deck's top every `step` metres.
 */
export type DeckSurface = {
  ax: number;
  az: number;
  ux: number;
  uz: number;
  length: number;
  half: number;
  step: number;
  ys: number[];
  x0: number;
  z0: number;
  x1: number;
  z1: number;
};

/** A deck's top under (x, z), within `radius` of its edge (NaN off it). */
export function deckTopAt(d: DeckSurface, x: number, z: number, radius: number): number {
  const rx = x - d.ax,
    rz = z - d.az;
  const along = rx * d.ux + rz * d.uz;
  if (along < 0 || along > d.length) return NaN;
  if (Math.abs(-rx * d.uz + rz * d.ux) > d.half + radius) return NaN;
  const f = along / d.step;
  const k = Math.min(Math.floor(f), d.ys.length - 2);
  const w = f - k;
  return d.ys[k]! * (1 - w) + d.ys[k + 1]! * w;
}

export class StaticWorld {
  readonly hf: Heightfield;
  /**
   * The bridges' decks as exact surfaces (bridges.ts bridgeDecks). Their slab boxes sit a little
   * below: an axis-aligned box per 1.5 m of a turned, sloping deck gave the wheels a staircase
   * (owner, 2026-11-15: "the 2 bridges … makes the car or bike lag/jitter while driving on").
   */
  decks: DeckSurface[] = [];
  /**
   * The roads' drawn surface at x/z (road-grade.ts, with its lift), or null off the carriageway:
   * a road is level across and floats over a side slope's downhill half, and a player stood on
   * the ground there, ankle-deep in the asphalt (owner, 2026-11-22: "asfalt road that can be
   * walk into/thro"). Set by island.ts.
   */
  roadTop: ((x: number, z: number) => number | null) | null = null;
  readonly vegetation: VegetationWorld | null;
  /** World boxes, 6 floats each: x0, y0, z0, x1, y1, z1. */
  readonly boxes: CollisionCoordinates;
  /** Each occupied cell has one dense slot in geographical order. The prefix per word
   * plus the count of occupied lower bits gives its slot without a per-cell Map entry. */
  private readonly occupied = new Uint32Array(Math.ceil((COLS * COLS) / 32));
  private readonly firstSlot = new Uint32Array(this.occupied.length);
  private readonly cellStart: Uint32Array;
  private readonly cellItems: Uint32Array;
  /**
   * Boxes from `solidCount` on stop shots and sight only (collision-fill.ts): walls, trunks and
   * objects drawn solid that had no box. Bodies, grenades and loot ignore them, so no walk,
   * door, ladder or loot spot changes. A cell's shot boxes are `shotItems[shotStart[slot] …]`.
   */
  readonly solidCount: number;
  private readonly shotStart: Uint32Array;
  private readonly shotItems: Uint32Array;
  /**
   * The query that last visited each box (a stamp; 16 bits: a box per entry is 1.7 million
   * entries, and the match room's memory is tight; `nextStamp` clears them when it wraps).
   * One for the world and every per-match view of it (withDoors, withVehicles, … inherit it):
   * the views each kept a 6.8 MB copy, two per match (2026-11-23). Queries never interleave
   * (each runs to its end), so one counter and one array serve them all.
   */
  private readonly scratch: { seen: Uint16Array; stamp: number };
  /** A stamp for a new query (the stamps cleared and restarted when they run out). */
  private nextStamp() {
    const s = this.scratch;
    if (s.stamp === 0xffff) {
      s.seen.fill(0);
      s.stamp = 0;
    }
    return ++s.stamp;
  }

  constructor(
    hf: Heightfield,
    placements: Placement[],
    collision: CollisionData,
    vegetation: VegetationWorld | null,
    /** World-space boxes that are not models (bridges): x0, y0, z0, x1, y1, z1. */
    extraBoxes: number[][] = [],
    /** Model-space boxes per model, flat (6 per box), that stop shots and sight only (collision-fill.ts). */
    shotModels: Record<string, ArrayLike<number>> = {},
    /** Model-space boxes per model, flat, that stop bodies too (the fill's trunks and logs). */
    bodyModels: Record<string, ArrayLike<number>> = {},
  ) {
    this.hf = hf;
    this.vegetation = vegetation;
    // Counted first and written straight into the typed array (no million-element list).
    let count = extraBoxes.length;
    for (const p of placements) {
      const local = collision.models[p.model];
      if (!local) throw new Error(`No collision for model ${p.model}`);
      count += local.length + (bodyModels[p.model]?.length ?? 0) / 6;
    }
    const solidCount = (this.solidCount = count);
    for (const p of placements) count += (shotModels[p.model]?.length ?? 0) / 6;
    const boxes = (this.boxes = new CollisionCoordinates(count * 6));
    const place = (p: Placement, list: number[][]) => {
      for (const b of list) {
        const [x0, y0, z0, x1, y1, z1] = turnBox(b, p.turn);
        boxes.append(x0 + p.x);
        boxes.append(y0 + p.y);
        boxes.append(z0 + p.z);
        boxes.append(x1 + p.x);
        boxes.append(y1 + p.y);
        boxes.append(z1 + p.z);
      }
    };
    const placeFlat = (p: Placement, flat: ArrayLike<number> | undefined) => {
      if (flat)
        for (let o = 0; o < flat.length; o += 6)
          place(p, [
            [flat[o]!, flat[o + 1]!, flat[o + 2]!, flat[o + 3]!, flat[o + 4]!, flat[o + 5]!],
          ]);
    };
    for (const p of placements) place(p, collision.models[p.model]!);
    for (const p of placements) placeFlat(p, bodyModels[p.model]);
    for (const b of extraBoxes) for (let k = 0; k < 6; k++) boxes.append(b[k]!);
    for (const p of placements) placeFlat(p, shotModels[p.model]);
    this.scratch = { seen: new Uint16Array(count), stamp: 0 };
    const eachCell = (visit: (key: number, box: number) => void) => {
      for (let i = 0; i < count; i++) {
        const o = i * 6;
        const c0 = this.cellIndex(boxes.get(o)),
          c1 = this.cellIndex(boxes.get(o + 3)),
          r0 = this.cellIndex(boxes.get(o + 2)),
          r1 = this.cellIndex(boxes.get(o + 5));
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) visit(r * COLS + c, i);
      }
    };
    eachCell((key) => {
      this.occupied[key >>> 5]! |= 1 << (key & 31);
    });
    let slots = 0;
    for (let word = 0; word < this.occupied.length; word++) {
      this.firstSlot[word] = slots;
      slots += bitCount(this.occupied[word]!);
    }
    const start = (this.cellStart = new Uint32Array(slots + 1));
    const shotStart = (this.shotStart = new Uint32Array(slots + 1));
    eachCell((key, box) => {
      const counts = box >= solidCount ? shotStart : start;
      counts[this.slotOf(key)! + 1]!++;
    });
    for (let s = 0; s < slots; s++) {
      start[s + 1]! += start[s]!;
      shotStart[s + 1]! += shotStart[s]!;
    }
    const items = (this.cellItems = new Uint32Array(start[slots]!));
    const shotItems = (this.shotItems = new Uint32Array(shotStart[slots]!));
    const cursor = start.slice(0, slots);
    const shotCursor = shotStart.slice(0, slots);
    eachCell((key, box) => {
      const s = this.slotOf(key)!;
      if (box >= solidCount) shotItems[shotCursor[s]!++] = box;
      else items[cursor[s]!++] = box;
    });
  }

  /** The packed index of a cell's boxes, or undefined for an empty cell. */
  private slotOf(key: number) {
    const index = key >>> 5;
    const word = this.occupied[index]!;
    const bit = 1 << (key & 31);
    return (word & bit) === 0 ? undefined : this.firstSlot[index]! + bitCount(word & (bit - 1));
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
      const s = this.slotOf(r0 * COLS + c0);
      if (s !== undefined)
        for (let k = this.cellStart[s]!, e = this.cellStart[s + 1]!; k < e; k++)
          visit(this.cellItems[k]!);
      return;
    }
    const stamp = this.nextStamp(),
      seen = this.scratch.seen;
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const s = this.slotOf(r * COLS + c);
        if (s === undefined) continue;
        for (let k = this.cellStart[s]!, e = this.cellStart[s + 1]!; k < e; k++) {
          const i = this.cellItems[k]!;
          if (seen[i] === stamp) continue;
          seen[i] = stamp;
          visit(i);
        }
      }
  }

  /**
   * Whether a box overlapping the square of half-width `radius` at x/z has its top between `y0`
   * and `y1`: a floor laid at the ground (the grass keeps off building floors flush with it or
   * buried under it).
   */
  topBetween(x: number, z: number, radius: number, y0: number, y1: number): boolean {
    let hit = false;
    const b = this.boxes;
    this.forEachBox(x - radius, z - radius, x + radius, z + radius, (i) => {
      if (hit) return;
      const o = i * 6;
      const t = b.get(o + 4);
      if (
        t >= y0 &&
        t <= y1 &&
        x + radius > b.get(o) &&
        x - radius < b.get(o + 3) &&
        z + radius > b.get(o + 2) &&
        z - radius < b.get(o + 5)
      )
        hit = true;
    });
    return hit;
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
        x + radius > b.get(o) + 1e-7 &&
        x - radius < b.get(o + 3) - 1e-7 &&
        z + radius > b.get(o + 2) + 1e-7 &&
        z - radius < b.get(o + 5) - 1e-7 &&
        y + height > b.get(o + 1) + 1e-7 &&
        y < b.get(o + 4) - 1e-7
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
      const t = b.get(o + 4);
      if (
        t > top &&
        t <= maxY + 1e-6 &&
        x + radius > b.get(o) &&
        x - radius < b.get(o + 3) &&
        z + radius > b.get(o + 2) &&
        z - radius < b.get(o + 5)
      )
        top = t;
    });
    for (const d of this.decks) {
      if (x + radius < d.x0 || x - radius > d.x1 || z + radius < d.z0 || z - radius > d.z1)
        continue;
      const t = deckTopAt(d, x, z, radius);
      if (t > top && t <= maxY + 1e-6) top = t;
    }
    if (this.roadTop) {
      const t = this.roadTop(x, z);
      if (t !== null && t > top && t <= maxY + 1e-6) top = t;
    }
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
    /** Bodies' boxes only, without the shot-only ones (reaching for loot, as before the fill). */
    solidOnly = false,
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
    let boxHit = false,
      boxIndex = -1;
    const stamp = this.nextStamp(),
      seen = this.scratch.seen;
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
          const cs = this.slotOf(r * COLS + c);
          if (cs === undefined) continue;
          // The cell's solid boxes, then its shot-only boxes (k past the first list's end).
          const e0 = this.cellStart[cs + 1]!,
            k1 = this.shotStart[cs]!,
            e = solidOnly ? e0 : e0 + this.shotStart[cs + 1]! - k1;
          for (let k = this.cellStart[cs]!; k < e; k++) {
            const i = k < e0 ? this.cellItems[k]! : this.shotItems[k1 + k - e0]!;
            if (seen[i] === stamp) continue;
            seen[i] = stamp;
            const o = i * 6;
            // A shot-only box the ray starts in doesn't stop it: a body (or a grenade) that
            // stands in one, which it can, still sees, shoots and blasts out of it.
            if (
              k >= e0 &&
              ox > b.get(o) &&
              ox < b.get(o + 3) &&
              oy > b.get(o + 1) &&
              oy < b.get(o + 4) &&
              oz > b.get(o + 2) &&
              oz < b.get(o + 5)
            )
              continue;
            const t = slab(
              ox,
              oy,
              oz,
              dx,
              dy,
              dz,
              b.get(o),
              b.get(o + 1),
              b.get(o + 2),
              b.get(o + 3),
              b.get(o + 4),
              b.get(o + 5),
            );
            if (t < nearest) {
              nearest = t;
              boxHit = true;
              boxIndex = i;
            }
          }
        }
    }
    if (boxHit) best = { distance: nearest, kind: "box", box: boxIndex };
    // Trunks: only near the ray's first stretch is common; test along the ray in 30 m chunks.
    if (this.vegetation) {
      const reach = best ? best.distance : maxDistance;
      for (let t = 0; t < reach; t += 30) {
        const cx = ox + dx * (t + 15),
          cz = oz + dz * (t + 15);
        let hit = Infinity;
        let trunk: [number, number, number, number, number] | undefined;
        forEachTrunkNear(this.vegetation, cx, cz, 17, (tx, tz, r, h, groundY) => {
          const d = rayCylinder(ox, oy, oz, dx, dy, dz, tx, tz, r, groundY, groundY + h);
          if (d < hit) {
            hit = d;
            trunk = [tx, tz, r, groundY, groundY + h];
          }
        });
        if (hit < (best ? best.distance : maxDistance)) {
          best = trunk ? { distance: hit, kind: "trunk", trunk } : { distance: hit, kind: "trunk" };
          break;
        }
      }
    }
    return best;
  }
}

/**
 * The outward normal of what `raycast` hit at (x, y, z): the box's face the point lies on, the
 * ground's slope, a trunk's side (bullet impact marks, 2026-11-25).
 */
export function hitNormal(
  world: StaticWorld,
  hit: RayHit,
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  if (hit.kind === "box" && hit.box !== undefined && hit.box >= 0) {
    const b = world.boxes,
      o = hit.box * 6;
    const faces: Array<[number, [number, number, number]]> = [
      [Math.abs(x - b[o]!), [-1, 0, 0]],
      [Math.abs(x - b[o + 3]!), [1, 0, 0]],
      [Math.abs(y - b[o + 1]!), [0, -1, 0]],
      [Math.abs(y - b[o + 4]!), [0, 1, 0]],
      [Math.abs(z - b[o + 2]!), [0, 0, -1]],
      [Math.abs(z - b[o + 5]!), [0, 0, 1]],
    ];
    let best = faces[0]!;
    for (const f of faces) if (f[0] < best[0]) best = f;
    return best[1];
  }
  if (hit.kind === "trunk" && hit.trunk) {
    const nx = x - hit.trunk[0],
      nz = z - hit.trunk[1],
      l = Math.hypot(nx, nz) || 1;
    return [nx / l, 0, nz / l];
  }
  const n = world.hf.normalAt(x, z);
  return [n.x, n.y, n.z];
}

/**
 * Where the ray from (ox, oy, oz) along (dx, dy, dz) (unit) meets the blocker a ray met before
 * (`raycast`'s `box`, or `trunk`), or Infinity: the same test `raycast` makes for that blocker,
 * alone. A hit short of the ray's end is a hit for the whole ray (it is stopped there or
 * earlier, whatever else lies along it); a miss says nothing.
 */
export function blockerDistance(
  world: StaticWorld,
  box: number,
  trunk: ArrayLike<number> | undefined,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
): number {
  if (box >= 0) {
    const b = world.boxes,
      o = box * 6;
    return slab(
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      b.get(o),
      b.get(o + 1),
      b.get(o + 2),
      b.get(o + 3),
      b.get(o + 4),
      b.get(o + 5),
    );
  }
  if (trunk)
    return rayCylinder(
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      trunk[0]!,
      trunk[1]!,
      trunk[2]!,
      trunk[3]!,
      trunk[4]!,
    );
  return Infinity;
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
  // (Unrolled, no arrays: this runs for every box in every cell a ray crosses, and the tuples
  // it used to build were most of the garbage a full room made; performance pass 2026-11-14.)
  let near = 0,
    far = Infinity;
  if (Math.abs(dx) < 1e-12) {
    if (ox < x0 || ox > x1) return Infinity;
  } else {
    const a = (x0 - ox) / dx,
      c = (x1 - ox) / dx;
    near = Math.max(near, Math.min(a, c));
    far = Math.min(far, Math.max(a, c));
    if (near > far) return Infinity;
  }
  if (Math.abs(dy) < 1e-12) {
    if (oy < y0 || oy > y1) return Infinity;
  } else {
    const a = (y0 - oy) / dy,
      c = (y1 - oy) / dy;
    near = Math.max(near, Math.min(a, c));
    far = Math.min(far, Math.max(a, c));
    if (near > far) return Infinity;
  }
  if (Math.abs(dz) < 1e-12) {
    if (oz < z0 || oz > z1) return Infinity;
  } else {
    const a = (z0 - oz) / dz,
      c = (z1 - oz) / dz;
    near = Math.max(near, Math.min(a, c));
    far = Math.min(far, Math.max(a, c));
    if (near > far) return Infinity;
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
  const t0 = (-b - sq) / (2 * a),
    t1 = (-b + sq) / (2 * a);
  if (t0 >= 0) {
    const y = oy + dy * t0;
    if (y >= y0 && y <= y1) return t0;
  }
  if (t1 >= 0) {
    const y = oy + dy * t1;
    if (y >= y0 && y <= y1) return t1;
  }
  return Infinity;
}
