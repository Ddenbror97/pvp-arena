import type { Placement } from "./layout";
import { modelSpots, turnPoint } from "./loot-spots";
import { StaticWorld, type CollisionData, type RayHit } from "./static-world";

/**
 * Doors you can open (owner, 2026-11-04: "should be possible to open building doors to enter
 * (not all but most)"). The building models carry no door objects, only their collision, so the
 * doorways are found in it: a gap 0.7–2.0 m wide in a ground-floor wall, walls on both sides,
 * open floor in front and behind (a throat). Wide openings (garage fronts, hangar bays) stay
 * open, and so do the buildings nobody can enter. Each doorway gets one panel:
 *
 * - closed it is a solid box (blocks players and bullets) across the opening;
 * - open it swings 90° about its hinge and blocks nothing (the panel is cosmetic then).
 *
 * The door list is a deterministic function of the layout and the collision (server, client
 * prediction and renderer agree); which doors are open is per match (state: a byte per door).
 * Shared gameplay module: no three.js.
 */
export type ModelDoor = {
  /** Centre of the opening at floor level, model space (m). */
  x: number;
  z: number;
  /** Floor and lintel heights (m above the model origin). */
  y0: number;
  y1: number;
  /** The axis the panel spans (its width runs along x or z). */
  along: "x" | "z";
  width: number;
};
export type Door = {
  id: number;
  x: number;
  z: number;
  y0: number;
  y1: number;
  along: "x" | "z";
  width: number;
  /** Closed collision box: x0, y0, z0, x1, y1, z1. */
  box: [number, number, number, number, number, number];
};
export type DoorSet = {
  doors: Door[];
  /** Vertical broadphase for airborne hulls and sight lines; absent on legacy fixtures. */
  minY?: number;
  maxY?: number;
  /** Door ids per 16 m cell (key: row · 4096 + column). */
  cells: Map<number, number[]>;
};

/** Door panel thickness (m). */
export const DOOR_THICKNESS = 0.08;
/** How far a player may reach to open or close a door (m, eye to the door's centre line). */
export const DOOR_REACH = 2.6;
/** Share of doors left open at the start of a match (looted-looking, some way in at once). */
const OPEN_AT_START = 0.2;

const G = 0.2; // detection grid (m)
const DOORLESS = new Set([
  "helipad",
  "tent",
  "tent-large",
  "guard-tower",
  "watchtower",
  "ind-silo",
  "ind-tank",
  "ind-watertower",
  "ind-portal-crane",
  "radar-truck",
  "radio-mast",
  "checkpoint",
  "atc-tower",
]);
const MIN_W = 0.7,
  MAX_W = 2.0;
const caches = new WeakMap<CollisionData, Map<string, ModelDoor[]>>();

/** Doorways of one model (memoised), from its collision boxes in model space. */
export function modelDoors(collision: CollisionData, model: string): ModelDoor[] {
  if (collision.entrances?.[model]) return collision.entrances[model];
  let cache = caches.get(collision);
  if (!cache) caches.set(collision, (cache = new Map()));
  const hit = cache.get(model);
  if (hit) return hit;
  const boxes = collision.models[model] ?? [];
  // Only buildings someone can walk into (indoor loot spots exist) get doors; tents, towers,
  // pads and tanks never (DOORLESS).
  const doors =
    boxes.length &&
    !DOORLESS.has(model) &&
    modelSpots(collision, model, "sheltered", 2.5, 60).length
      ? find(boxes)
      : [];
  cache.set(model, doors);
  return doors;
}

function find(boxes: number[][]): ModelDoor[] {
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b[0]!);
    z0 = Math.min(z0, b[2]!);
    x1 = Math.max(x1, b[3]!);
    z1 = Math.max(z1, b[5]!);
  }
  x0 -= 2;
  z0 -= 2;
  x1 += 2;
  z1 += 2;
  const nx = Math.ceil((x1 - x0) / G),
    nz = Math.ceil((z1 - z0) / G);
  const cx = (i: number) => x0 + (i + 0.5) * G,
    cz = (k: number) => z0 + (k + 0.5) * G;
  // Per column: the floor (highest box top a step or two up, else the ground) and whether a
  // wall stands there (a box between ankle and head height above that floor).
  const floor = new Float32Array(nx * nz),
    wall = new Uint8Array(nx * nz),
    /** A wall reaching head height (not a counter, a shelf or a sill). */
    tall = new Uint8Array(nx * nz),
    lintel = new Float32Array(nx * nz).fill(Infinity);
  // Boxes bucketed by the columns whose centre they cover (only the ground storey matters).
  const cols: number[][][] = Array.from({ length: nx * nz }, () => []);
  for (const b of boxes) {
    if (b[1]! > 6) continue;
    const i0 = Math.max(0, Math.ceil((b[0]! - x0) / G - 0.5)),
      i1 = Math.min(nx - 1, Math.floor((b[3]! - x0) / G - 0.5)),
      k0 = Math.max(0, Math.ceil((b[2]! - z0) / G - 0.5)),
      k1 = Math.min(nz - 1, Math.floor((b[5]! - z0) / G - 0.5));
    for (let k = k0; k <= k1; k++)
      for (let i = i0; i <= i1; i++) {
        const px = cx(i),
          pz = cz(k);
        if (px > b[0]! && px < b[3]! && pz > b[2]! && pz < b[5]!) cols[k * nx + i]!.push(b);
      }
  }
  for (let c = 0; c < nx * nz; c++) {
    const here = cols[c]!;
    let f = 0;
    // The floor: a step or two up at most (stacked wall voxels above that are wall).
    for (const b of here) if (b[4]! <= 0.65 && b[4]! > f) f = b[4]!;
    floor[c] = f;
    for (const b of here) {
      if (b[1]! < f + 1.85 && b[4]! > f + 0.05) wall[c] = 1;
      if (b[1]! < f + 1.85 && b[4]! >= f + 2.0) tall[c] = 1;
      if (b[1]! >= f + 1.85 && b[1]! < lintel[c]!) lintel[c] = b[1]!;
    }
  }
  const free = (i: number, k: number) => i >= 0 && k >= 0 && i < nx && k < nz && !wall[k * nx + i];
  /** Free cells from (i,k) along the axis before a wall, up to `max`; -1 when no wall found. */
  const run = (i: number, k: number, di: number, dk: number, max: number) => {
    for (let s = 1; s <= max; s++) if (!free(i + di * s, k + dk * s)) return s - 1;
    return -1;
  };
  const maxCells = Math.ceil(MAX_W / G) + 1,
    probe = Math.round(0.6 / G),
    wide = Math.ceil((MAX_W + 1.2) / G);
  type Throat = { i: number; k: number; lo: number; hi: number };
  const throats: Record<"x" | "z", Map<number, Throat>> = { x: new Map(), z: new Map() };
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++) {
      if (!free(i, k)) continue;
      for (const along of ["x", "z"] as const) {
        const [di, dk] = along === "x" ? [1, 0] : [0, 1];
        const l = run(i, k, -di, -dk, maxCells),
          r = run(i, k, di, dk, maxCells);
        if (l < 0 || r < 0) continue;
        const w = (l + r + 1) * G;
        if (w < MIN_W || w > MAX_W) continue;
        // In front and behind (across the wall): open floor at the same level, much wider.
        let ok = true;
        for (const side of [-1, 1]) {
          const fi = i + dk * side * probe,
            fk = k + di * side * probe;
          if (!free(fi, fk)) {
            ok = false;
            break;
          }
          if (Math.abs(floor[fk * nx + fi]! - floor[k * nx + i]!) > 0.4) {
            ok = false;
            break;
          }
          const fl = run(fi, fk, -di, -dk, wide),
            fr = run(fi, fk, di, dk, wide);
          if (fl >= 0 && fr >= 0 && (fl + fr + 1) * G < w + 0.8) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const pos = along === "x" ? i : k;
        throats[along].set(k * nx + i, { i, k, lo: pos - l, hi: pos + r });
      }
    }
  // Group throat cells (4-connected, same axis) into doorway candidates.
  const out: ModelDoor[] = [];
  const cands: Array<{
    along: "x" | "z";
    lo: number;
    hi: number;
    a0: number;
    a1: number;
    ci: number;
    ck: number;
    y0: number;
    top: number;
    width: number;
    c0: number;
    seal: number[];
  }> = [];
  for (const along of ["x", "z"] as const) {
    const cells = throats[along];
    const seen = new Set<number>();
    for (const [key, t0] of cells) {
      if (seen.has(key)) continue;
      const group: Throat[] = [];
      const stack = [key];
      seen.add(key);
      while (stack.length) {
        const c = stack.pop()!;
        const t = cells.get(c)!;
        group.push(t);
        for (const n of [c + 1, c - 1, c + nx, c - nx])
          if (cells.has(n) && !seen.has(n)) {
            seen.add(n);
            stack.push(n);
          }
      }
      void t0;
      // The opening: the widest gap the group spans; the wall line: the middle of its depth.
      // The clear opening: what every row of the throat leaves free (the narrowest row, at the
      // wall line; the widest row would put the panel half into the wall).
      const lo = Math.max(...group.map((t) => t.lo)),
        hi = Math.min(...group.map((t) => t.hi));
      if (hi < lo) continue;
      const width = (hi - lo + 1) * G;
      if (width < MIN_W || width > MAX_W + 0.2) continue;
      const across = group.map((t) => (along === "x" ? t.k : t.i));
      const mid = (Math.min(...across) + Math.max(...across)) / 2;
      const c0 = (lo + hi) / 2;
      const ci = Math.round(along === "x" ? c0 : mid),
        ck = Math.round(along === "x" ? mid : c0);
      const y0 = floor[ck * nx + ci]!;
      // Lintel: the lowest overhead box across the opening's middle, else a standard door.
      let top = Infinity;
      for (let s = lo; s <= hi; s++) {
        const c = along === "x" ? ck * nx + s : s * nx + ci;
        top = Math.min(top, lintel[c]!);
      }
      // A doorway has a lintel (wall over it, up to a shopfront's 5.5 m: the door fills the
      // lower part, a transom the rest).
      if (!(top >= y0 + 1.85 && top <= y0 + 5.6)) continue;
      // Both jambs are real walls (furniture gaps under a ceiling are no doorway).
      const jamb = (q: number) =>
        q >= 0 &&
        q < (along === "x" ? nx : nz) &&
        !!tall[along === "x" ? ck * nx + q : q * nx + ci];
      if (!jamb(lo - 1) || !jamb(hi + 1)) continue;
      const a0 = Math.min(...across),
        a1 = Math.max(...across);
      const seal: number[] = [];
      for (let q = lo; q <= hi; q++)
        for (let r = a0; r <= a1; r++) seal.push(along === "x" ? r * nx + q : q * nx + r);
      cands.push({ along, lo, hi, a0, a1, ci, ck, y0, top, width, c0, seal });
    }
  }
  // A doorway is a door only if sealing it (with every other candidate) separates two spaces:
  // outside from a room, or two rooms. Gaps beside porch posts or stairs have open ground on
  // both sides and stay open.
  const sealed = new Uint8Array(nx * nz);
  for (const c of cands) for (const q of c.seal) sealed[q] = 1;
  // Walls grown by one cell for this test: a player (0.35 m) cannot slip through voxel cracks.
  const thick = new Uint8Array(nx * nz);
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++)
      if (wall[k * nx + i])
        for (let dk = -1; dk <= 1; dk++)
          for (let di = -1; di <= 1; di++) {
            const ii = i + di,
              kk = k + dk;
            if (ii >= 0 && kk >= 0 && ii < nx && kk < nz) thick[kk * nx + ii] = 1;
          }
  const region = new Int32Array(nx * nz).fill(-1);
  const fill = (start: number, label: number) => {
    const stack = [start];
    region[start] = label;
    while (stack.length) {
      const c = stack.pop()!;
      const i = c % nx,
        k = (c - i) / nx;
      for (const [di, dk] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const ni = i + di,
          nk = k + dk;
        if (ni < 0 || nk < 0 || ni >= nx || nk >= nz) continue;
        const n = nk * nx + ni;
        if (region[n]! >= 0 || thick[n] || sealed[n]) continue;
        if (Math.abs(floor[n]! - floor[c]!) > 0.45) continue;
        region[n] = label;
        stack.push(n);
      }
    }
  };
  for (let i = 0; i < nx; i++)
    for (const k of [0, nz - 1])
      if (region[k * nx + i]! < 0 && !thick[k * nx + i]) fill(k * nx + i, 0);
  for (let k = 0; k < nz; k++)
    for (const i of [0, nx - 1])
      if (region[k * nx + i]! < 0 && !thick[k * nx + i]) fill(k * nx + i, 0);
  let next = 1;
  for (let c = 0; c < nx * nz; c++) if (region[c]! < 0 && !thick[c] && !sealed[c]) fill(c, next++);
  /** The region a few cells out from the doorway on one side (−1: none found). */
  const sideRegion = (c: (typeof cands)[number], side: -1 | 1) => {
    const mid = Math.round((c.lo + c.hi) / 2);
    for (let s = 1; s <= 6; s++) {
      const r = side < 0 ? c.a0 - s : c.a1 + s;
      const q = c.along === "x" ? r * nx + mid : mid * nx + r;
      if (r < 0 || r >= (c.along === "x" ? nz : nx)) return -1;
      if (region[q]! >= 0) return region[q]!;
    }
    return -1;
  };
  for (const c of cands) {
    const a = sideRegion(c, -1),
      b = sideRegion(c, 1);
    if (a < 0 || b < 0 || a === b) continue;
    out.push({
      x: +(c.along === "x" ? x0 + (c.c0 + 0.5) * G : cx(c.ci)).toFixed(3),
      z: +(c.along === "x" ? cz(c.ck) : z0 + (c.c0 + 0.5) * G).toFixed(3),
      y0: +c.y0.toFixed(3),
      y1: +c.top.toFixed(3),
      along: c.along,
      width: +c.width.toFixed(2),
    });
  }
  // A player must fit through the middle of every doorway (a step up allowed); a "doorway"
  // straddling a post or a stair is dropped.
  const passable = (d: ModelDoor) =>
    !boxes.some(
      (b) =>
        d.x + 0.2 > b[0]! &&
        d.x - 0.2 < b[3]! &&
        d.z + 0.2 > b[2]! &&
        d.z - 0.2 < b[5]! &&
        d.y0 + 1.8 > b[1]! &&
        d.y0 + 0.36 < b[4]!,
    );
  for (let i = out.length - 1; i >= 0; i--) if (!passable(out[i]!)) out.splice(i, 1);
  // One panel per opening: drop a doorway overlapping a wider (or earlier) one.
  const kept: ModelDoor[] = [];
  for (const d of out.sort((a, b) => b.width - a.width))
    if (!kept.some((k) => Math.hypot(k.x - d.x, k.z - d.z) < (k.width + d.width) / 2 + 0.3))
      kept.push(d);
  return kept;
}

/** Every door on the island, in layout order (ids are indices). */
export function islandDoors(layout: readonly Placement[], collision: CollisionData): DoorSet {
  const doors: Door[] = [];
  let minY = Infinity,
    maxY = -Infinity;
  const cells = new Map<number, number[]>();
  for (const p of layout) {
    for (const d of modelDoors(collision, p.model)) {
      const [dx, dz] = turnPoint(d.x, d.z, p.turn);
      const along = (p.turn & 1 ? (d.along === "x" ? "z" : "x") : d.along) as "x" | "z";
      const x = p.x + dx,
        z = p.z + dz,
        y0 = p.y + d.y0,
        y1 = p.y + d.y1;
      const hw = d.width / 2 + 0.02,
        ht = DOOR_THICKNESS / 2;
      const box: Door["box"] =
        along === "x"
          ? [x - hw, y0 + 0.02, z - ht, x + hw, y1, z + ht]
          : [x - ht, y0 + 0.02, z - hw, x + ht, y1, z + hw];
      const id = doors.length;
      doors.push({ id, x, z, y0, y1, along, width: d.width, box });
      minY = Math.min(minY, y0);
      maxY = Math.max(maxY, y1);
      // Indexed in every 16 m cell its panel overlaps (queries read only their own cells).
      for (let r = cellOf(box[2]); r <= cellOf(box[5]); r++)
        for (let c = cellOf(box[0]); c <= cellOf(box[3]); c++) {
          const key = cellKey(c, r);
          (cells.get(key) ?? cells.set(key, []).get(key)!).push(id);
        }
    }
  }
  return { doors, cells, minY, maxY };
}

const CELL = 16;
const cellOf = (v: number) => Math.floor(v / CELL);
const cellKey = (c: number, r: number) => (r + 2048) * 4096 + c + 2048;
const stamps = new WeakMap<DoorSet, Uint32Array>();
let stampNow = 0;
/** Calls `visit` once per door indexed in the cells overlapping the rectangle. */
function forEachDoor(
  set: DoorSet,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  visit: (id: number) => void,
) {
  const c0 = cellOf(x0),
    c1 = cellOf(x1),
    r0 = cellOf(z0),
    r1 = cellOf(z1);
  if (c0 === c1 && r0 === r1) {
    for (const id of set.cells.get(cellKey(c0, r0)) ?? []) visit(id);
    return;
  }
  // Dedupe with a stamp per door (no allocation per query).
  const seen = (stamps.get(set) ?? stamps.set(set, new Uint32Array(set.doors.length)).get(set))!;
  const stamp = (stampNow = (stampNow + 1) >>> 0 || 1);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      for (const id of set.cells.get(cellKey(c, r)) ?? [])
        if (seen[id] !== stamp) {
          seen[id] = stamp;
          visit(id);
        }
}

/** Door ids whose centre lies within `r` of (x, z). */
export function doorsNear(set: DoorSet, x: number, z: number, r: number, out: number[] = []) {
  out.length = 0;
  forEachDoor(set, x - r, z - r, x + r, z + r, (id) => {
    const d = set.doors[id]!;
    if (Math.hypot(d.x - x, d.z - z) <= r) out.push(id);
  });
  return out;
}

/** The match's starting door states: 1 = open (deterministic from the seed). */
export function initialDoors(seed: number, count: number): Uint8Array {
  const open = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    let h = Math.imul(i ^ seed, 0x9e3779b1) ^ 0x7f4a7c15;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
    open[i] = (h >>> 0) / 4294967296 < OPEN_AT_START ? 1 : 0;
  }
  return open;
}

/** Whether a standing hull overlaps door `d`'s closed panel. */
export function hullOnDoor(d: Door, x: number, y: number, z: number, height: number, r: number) {
  const b = d.box;
  return (
    x + r > b[0] && x - r < b[3] && z + r > b[2] && z - r < b[5] && y + height > b[1] && y < b[4]
  );
}

function slab(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  b: readonly number[],
): number {
  let t0 = 0,
    t1 = Infinity;
  const o = [ox, oy, oz],
    d = [dx, dy, dz];
  for (let a = 0; a < 3; a++) {
    const lo = b[a]!,
      hi = b[a + 3]!;
    if (Math.abs(d[a]!) < 1e-12) {
      if (o[a]! < lo || o[a]! > hi) return Infinity;
      continue;
    }
    let ta = (lo - o[a]!) / d[a]!,
      tb = (hi - o[a]!) / d[a]!;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

/** The first closed door a ray hits within `max` (distance and id), or null. */
export function rayDoor(
  set: DoorSet,
  open: Uint8Array,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  max: number,
  includeOpen = false,
): { distance: number; id: number } | null {
  const len = Math.hypot(dx, dy, dz);
  if (!(len > 0)) return null;
  dx /= len;
  dy /= len;
  dz /= len;
  const endY = oy + dy * max;
  if (Math.min(oy, endY) > (set.maxY ?? Infinity) || Math.max(oy, endY) < (set.minY ?? -Infinity))
    return null;
  let best = null as { distance: number; id: number } | null;
  // Walk the ray one cell length at a time and test the doors in the cells it crosses.
  for (let t = 0; t < max; t += CELL) {
    const t1 = Math.min(max, t + CELL);
    const ax = ox + dx * t,
      az = oz + dz * t,
      bx = ox + dx * t1,
      bz = oz + dz * t1;
    forEachDoor(
      set,
      Math.min(ax, bx),
      Math.min(az, bz),
      Math.max(ax, bx),
      Math.max(az, bz),
      (id) => {
        if (open[id] && !includeOpen) return;
        const hit = slab(ox, oy, oz, dx, dy, dz, set.doors[id]!.box);
        if (hit <= max && (!best || hit < best.distance)) best = { distance: hit, id };
      },
    );
    const found = best as { distance: number } | null;
    if (found && found.distance <= t1) break;
  }
  return best;
}

/**
 * The island plus this match's closed doors (a per-match view of the shared world, like
 * withVehicles): hulls cannot pass a closed door, shots and sight lines stop at it, and a closed
 * door is not a floor (doors are thin; nobody stands on one).
 */
export function withDoors(world: StaticWorld, set: DoorSet, open: Uint8Array): StaticWorld {
  const w = Object.create(world) as StaticWorld;
  Object.assign(w, { seen: new Uint32Array(world.boxes.length / 6), stamp: 0 });
  // The base's own methods (it may itself be a view), called on this view's scratch state.
  const base = { blocked: world.blocked, raycast: world.raycast };
  w.blocked = function (x, y, z, height, radius) {
    if (base.blocked.call(this, x, y, z, height, radius)) return true;
    if (y > (set.maxY ?? Infinity) || y + height < (set.minY ?? -Infinity)) return false;
    let hit = false;
    forEachDoor(set, x - radius, z - radius, x + radius, z + radius, (id) => {
      if (!hit && !open[id] && hullOnDoor(set.doors[id]!, x, y, z, height, radius)) hit = true;
    });
    return hit;
  };
  w.raycast = function (ox, oy, oz, dx, dy, dz, maxDistance): RayHit | null {
    const hit = base.raycast.call(this, ox, oy, oz, dx, dy, dz, maxDistance);
    const d = rayDoor(set, open, ox, oy, oz, dx, dy, dz, hit ? hit.distance : maxDistance);
    return d ? { distance: d.distance, kind: "box" } : hit;
  };
  return w;
}

/** Whether a StaticWorld carries the island's doors (set by buildIsland). */
export const doorsOf = (world: StaticWorld): DoorSet | undefined =>
  (world as StaticWorld & { doors?: DoorSet }).doors;
