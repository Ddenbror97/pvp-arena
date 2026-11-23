import type { Placement } from "./layout";
import arenaPlan from "./arena-plan.json";
import hospitalPlan from "./hospital-plan.json";
import skylinePlan from "./skyline-plan.json";
import stationPlan from "./station-plan.json";
import windowPanes from "./window-panes.json";
import { turnBox, type StaticWorld } from "./static-world";

/**
 * Panorama glass you can shoot out (owner, 2026-11-13: "should we add panorama glas windows?
 * that can be break from bullets and people can sit in those top floors and snipe etc?").
 *
 * Skyline Residences' windows (build_condo.mjs: the sill-to-ceiling glass on every side) and the
 * mega hospital's sky bridges' side glass (build_hospital.mjs; owner: "the hospital bridge
 * windows should also be breakble by shooting it") are panes, not part of the building: whole, a pane is a thin solid box (nobody walks through it or
 * falls out); sight lines and shots pass it as glass does. The first bullet through a pane
 * breaks it, for everyone (a byte per pane per match, like the doors), and from then on it is an
 * opening: a sniper's window, and a fall from the floor it is on.
 *
 * The pane list is a deterministic function of the layout (server, client prediction and the
 * renderer agree); which panes are broken is per match. Shared gameplay module: no three.js.
 */
export type Pane = {
  id: number;
  /** World box: x0, y0, z0, x1, y1, z1. */
  box: [number, number, number, number, number, number];
  /**
   * A building's window (WINDOW_PANES): the layout index of its building. It is drawn only while
   * that building is drawn at its near LOD (its middle and far LODs keep their own glass).
   */
  placement?: number;
};
/**
 * The island's panes, packed: since every building's windows became panes (2026-11-23) there
 * are tens of thousands, and the match room holds them for the whole match next to the rest of
 * the island under the Durable Object's memory limit, so they are typed arrays, not objects
 * (an object and its box array per pane took about 11 MB; this takes about 2).
 */
export type PaneSet = {
  count: number;
  /** Six per pane: the world box x0, y0, z0, x1, y1, z1. */
  boxes: Float32Array;
  /** Per pane: its building's layout index for a building's window (Pane.placement), else −1. */
  placement: Int32Array;
  /** The CELL (8 m) cells holding panes, ascending (key: (row + 2048) · 4096 + column + 2048). */
  cellKeys: Int32Array;
  /** Cell k's pane ids are cellIds[cellStart[k] … cellStart[k + 1]), ascending. */
  cellStart: Int32Array;
  cellIds: Int32Array;
  /** The panes' extent (the cheap test that skips almost every query on the island). */
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** One pane as an object (tools and tests). */
export function paneAt(set: PaneSet, id: number): Pane {
  const b = set.boxes,
    o = id * 6;
  const box: Pane["box"] = [b[o]!, b[o + 1]!, b[o + 2]!, b[o + 3]!, b[o + 4]!, b[o + 5]!];
  const at = set.placement[id]!;
  return at >= 0 ? { id, box, placement: at } : { id, box };
}
/** Every pane as an object (tools and tests: allocates the lot). */
export const listPanes = (set: PaneSet): Pane[] =>
  Array.from({ length: set.count }, (_, id) => paneAt(set, id));

/** Panes per model (model space: x0, x1, z0, z1, y0, y1): Skyline Residences' storeys and the
 * mega hospital's sky bridges. */
const MODEL_PANES: Record<string, number[][]> = {
  ...Object.fromEntries(
    Object.entries(
      (skylinePlan as unknown as { models: Record<string, { panes: number[][] }> }).models,
    ).map(([id, m]) => [id, m.panes]),
  ),
  ...(hospitalPlan as unknown as { panes?: Record<string, number[][]> }).panes,
  // The Arena District (2026-11-14): the arena's glass band and lounge fronts, the station's
  // windows (build_arena.mjs, build_station.mjs).
  ...(arenaPlan as unknown as { panes?: Record<string, number[][]> }).panes,
  ...(stationPlan as unknown as { panes?: Record<string, number[][]> }).panes,
};

/**
 * Every building's window glass (owner, 2026-11-23: "Add glass windows to apartments/buildings
 * … they should have the breaking window ones with the sound. also fix buildings with a window
 * but no glass, it looks like glass but there is nothing there"): the glass the buildings' near
 * LODs drew themselves, taken out of them and listed here by art/blender/br/glass_panes.mjs
 * (the procedural houses' opaque dark slabs no shot or player was stopped by, the textured
 * kit's see-through glass no shot could break). Model space, as MODEL_PANES.
 */
const WINDOW_PANES: Record<string, number[][]> = (
  windowPanes as unknown as { models: Record<string, number[][]> }
).models;

/** (8 m: a block of flats holds a hundred panes in a 16 m square, tested on every step.) */
const CELL = 8;
const cellOf = (v: number) => Math.floor(v / CELL);
const cellKey = (c: number, r: number) => (r + 2048) * 4096 + c + 2048;

/** The island's panes (the same layout → the same panes, the same ids). */
export function islandPanes(layout: readonly Placement[]): PaneSet {
  let count = 0;
  for (const p of layout)
    count += (MODEL_PANES[p.model]?.length ?? 0) + (WINDOW_PANES[p.model]?.length ?? 0);
  const boxes = new Float32Array(count * 6),
    placement = new Int32Array(count).fill(-1);
  // (cell key, id) pairs as one number each (key · 2^20 + id: exact in a double), sorted.
  let pairs = new Float64Array(count * 2),
    used = 0;
  let minY = Infinity,
    maxY = -Infinity,
    minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  let id = 0;
  for (let at = 0; at < layout.length; at++) {
    const p = layout[at]!;
    const planned = MODEL_PANES[p.model] ?? [],
      windows = WINDOW_PANES[p.model] ?? [];
    if (!planned.length && !windows.length) continue;
    for (let k = 0; k < planned.length + windows.length; k++, id++) {
      const window = k >= planned.length;
      const [x0, x1, z0, z1, y0, y1] = window ? windows[k - planned.length]! : planned[k]!;
      const [a, b, c, d, e, f] = turnBox([x0!, y0!, z0!, x1!, y1!, z1!], p.turn);
      const o = id * 6;
      boxes[o] = p.x + a;
      boxes[o + 1] = p.y + b;
      boxes[o + 2] = p.z + c;
      boxes[o + 3] = p.x + d;
      boxes[o + 4] = p.y + e;
      boxes[o + 5] = p.z + f;
      if (window) placement[id] = at;
      minX = Math.min(minX, boxes[o]!);
      minY = Math.min(minY, boxes[o + 1]!);
      minZ = Math.min(minZ, boxes[o + 2]!);
      maxX = Math.max(maxX, boxes[o + 3]!);
      maxY = Math.max(maxY, boxes[o + 4]!);
      maxZ = Math.max(maxZ, boxes[o + 5]!);
      for (let r = cellOf(boxes[o + 2]!); r <= cellOf(boxes[o + 5]!); r++)
        for (let c2 = cellOf(boxes[o]!); c2 <= cellOf(boxes[o + 3]!); c2++) {
          if (used === pairs.length) {
            const grown = new Float64Array(pairs.length * 2 + 16);
            grown.set(pairs);
            pairs = grown;
          }
          pairs[used++] = cellKey(c2, r) * PAIR + id;
        }
    }
  }
  const sorted = pairs.subarray(0, used).sort();
  let cells = 0;
  for (let i = 0; i < used; i++)
    if (i === 0 || Math.floor(sorted[i]! / PAIR) !== Math.floor(sorted[i - 1]! / PAIR)) cells++;
  const cellKeys = new Int32Array(cells),
    cellStart = new Int32Array(cells + 1),
    cellIds = new Int32Array(used);
  for (let i = 0, k = -1; i < used; i++) {
    const key = Math.floor(sorted[i]! / PAIR);
    if (k < 0 || cellKeys[k] !== key) {
      cellKeys[++k] = key;
      cellStart[k] = i;
    }
    cellIds[i] = sorted[i]! - key * PAIR;
  }
  cellStart[cells] = used;
  return {
    count,
    boxes,
    placement,
    cellKeys,
    cellStart,
    cellIds,
    minY,
    maxY,
    minX,
    maxX,
    minZ,
    maxZ,
  };
}
const PAIR = 2 ** 20;

/** The index of a cell in set.cellKeys, or −1. */
function cellIndex(set: PaneSet, key: number) {
  const keys = set.cellKeys;
  let lo = 0,
    hi = keys.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1,
      v = keys[mid]!;
    if (v === key) return mid;
    if (v < key) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/** Calls `visit` for every pane in the cells over the rectangle (a pane may come twice). */
function forEachPane(
  set: PaneSet,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  visit: (id: number) => void,
) {
  for (let r = cellOf(z0); r <= cellOf(z1); r++)
    for (let c = cellOf(x0); c <= cellOf(x1); c++) {
      const k = cellIndex(set, cellKey(c, r));
      if (k < 0) continue;
      for (let i = set.cellStart[k]!; i < set.cellStart[k + 1]!; i++) visit(set.cellIds[i]!);
    }
}

/** Whether an upright hull (feet at y, `height` tall, `radius`) overlaps the pane. */
function hullOnPane(
  b: Float32Array,
  id: number,
  x: number,
  y: number,
  z: number,
  height: number,
  radius: number,
) {
  const o = id * 6;
  if (y + height <= b[o + 1]! || y >= b[o + 4]!) return false;
  const cx = Math.max(b[o]!, Math.min(b[o + 3]!, x)),
    cz = Math.max(b[o + 2]!, Math.min(b[o + 5]!, z));
  return (cx - x) ** 2 + (cz - z) ** 2 < radius * radius;
}

/** Ray (origin, unit dir) against a box: the entry distance, or Infinity. */
function rayBox(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  b: Float32Array,
  id: number,
) {
  let t0 = 0,
    t1 = Infinity;
  const o = [ox, oy, oz],
    d = [dx, dy, dz];
  for (let k = 0; k < 3; k++) {
    const lo = b[id * 6 + k]!,
      hi = b[id * 6 + k + 3]!;
    if (Math.abs(d[k]!) < 1e-9) {
      if (o[k]! < lo || o[k]! > hi) return Infinity;
      continue;
    }
    let a = (lo - o[k]!) / d[k]!,
      c = (hi - o[k]!) / d[k]!;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

/** The whole panes a ray (origin, unit dir) crosses within `length`. */
export function panesOnRay(
  set: PaneSet,
  broken: Uint8Array,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  length: number,
  out: number[] = [],
) {
  out.length = 0;
  if (!set.count) return out;
  const ex = ox + dx * length,
    ey = oy + dy * length,
    ez = oz + dz * length;
  if (Math.max(oy, ey) < set.minY || Math.min(oy, ey) > set.maxY) return out;
  if (
    Math.max(ox, ex) < set.minX ||
    Math.min(ox, ex) > set.maxX ||
    Math.max(oz, ez) < set.minZ ||
    Math.min(oz, ez) > set.maxZ
  )
    return out;
  // Long shots: walk the cells along the ray, not the whole rectangle.
  const steps = Math.max(1, Math.ceil(length / CELL));
  for (let i = 0; i < steps; i++) {
    const a = i / steps,
      b = (i + 1) / steps;
    const x0 = ox + dx * length * a,
      x1 = ox + dx * length * b,
      z0 = oz + dz * length * a,
      z1 = oz + dz * length * b;
    forEachPane(
      set,
      Math.min(x0, x1),
      Math.min(z0, z1),
      Math.max(x0, x1),
      Math.max(z0, z1),
      (id) => {
        if (broken[id] || out.includes(id)) return;
        if (rayBox(ox, oy, oz, dx, dy, dz, set.boxes, id) <= length) out.push(id);
      },
    );
  }
  return out;
}

/**
 * The island plus this match's whole panes: hulls cannot pass one (nobody walks through glass
 * or falls out of a whole window); rays pass them (it is glass: sight lines, the loot in reach),
 * and `shatter` breaks every whole pane a shot crosses (combat.ts calls it with each bullet's
 * path up to what it hits).
 */
export function withPanes(
  world: StaticWorld,
  set: PaneSet,
  broken: Uint8Array,
  onBreak: (id: number) => void = () => {},
): StaticWorld {
  const w = Object.create(world) as StaticWorld & PaneWorld;
  const base = { blocked: world.blocked };
  w.blocked = function (x, y, z, height, radius) {
    if (base.blocked.call(this, x, y, z, height, radius)) return true;
    if (y > set.maxY || y + height < set.minY) return false;
    if (
      x + radius < set.minX ||
      x - radius > set.maxX ||
      z + radius < set.minZ ||
      z - radius > set.maxZ
    )
      return false;
    let hit = false;
    forEachPane(set, x - radius, z - radius, x + radius, z + radius, (id) => {
      if (!hit && !broken[id] && hullOnPane(set.boxes, id, x, y, z, height, radius)) hit = true;
    });
    return hit;
  };
  const scratch: number[] = [];
  w.shatter = (ox, oy, oz, dx, dy, dz, length) => {
    for (const id of panesOnRay(set, broken, ox, oy, oz, dx, dy, dz, length, scratch)) {
      broken[id] = 1;
      onBreak(id);
    }
  };
  w.blast = function (x, y, z, radius) {
    if (!set.count || y - radius > set.maxY || y + radius < set.minY) return;
    const hits: number[] = [];
    forEachPane(set, x - radius, z - radius, x + radius, z + radius, (id) => {
      if (broken[id] || hits.includes(id)) return;
      // The pane's nearest point, within the blast's reach…
      const b = set.boxes,
        o = id * 6;
      const px = Math.max(b[o]!, Math.min(b[o + 3]!, x)),
        py = Math.max(b[o + 1]!, Math.min(b[o + 4]!, y)),
        pz = Math.max(b[o + 2]!, Math.min(b[o + 5]!, z));
      if (Math.hypot(px - x, py - y, pz - z) > radius) return;
      // …and in its line: a clear ray to its middle, or to its nearest point drawn a third of
      // the way in (an edge sits in the wall's reveal). A wall or a shut door between shields
      // the glass (`this`, the world it was called on; rays pass whole panes). Bodies' boxes
      // only: the bullet fill (collision-fill.ts) fills a frame's voxels round the glass.
      const cx = (b[o]! + b[o + 3]!) / 2,
        cy = (b[o + 1]! + b[o + 4]!) / 2,
        cz = (b[o + 2]! + b[o + 5]!) / 2;
      const clear = (tx: number, ty: number, tz: number) => {
        const lx = tx - x,
          ly = ty - y,
          lz = tz - z;
        const l = Math.hypot(lx, ly, lz);
        if (l < 0.05) return true;
        const ray = this.raycast(x, y, z, lx / l, ly / l, lz / l, l, true);
        return !ray || ray.distance >= l - 0.1;
      };
      if (!clear(cx, cy, cz) && !clear(px + (cx - px) / 3, py + (cy - py) / 3, pz + (cz - pz) / 3))
        return;
      hits.push(id);
    });
    for (const id of hits) {
      broken[id] = 1;
      onBreak(id);
    }
  };
  return w;
}

type PaneWorld = {
  /** Breaks the whole panes a blast (centre, radius) reaches in a clear line. */
  blast?: (this: StaticWorld, x: number, y: number, z: number, radius: number) => void;
  shatter?: (
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    length: number,
  ) => void;
};
/** Breaks the panes along a shot's path when the world carries panes (withPanes). */
export function shatterAlong(
  world: StaticWorld,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  length: number,
) {
  (world as StaticWorld & PaneWorld).shatter?.(ox, oy, oz, dx, dy, dz, length);
}

/**
 * Breaks the panes a blast reaches (owner, 2026-11-23: "make the windows breakble with a knife
 * hit and granades"): an HE grenade's, from its centre, in a clear line.
 */
export function shatterAround(world: StaticWorld, x: number, y: number, z: number, radius: number) {
  (world as StaticWorld & PaneWorld).blast?.call(world, x, y, z, radius);
}

/** Whether a StaticWorld carries the island's panes (set by buildIsland). */
export const panesOf = (world: StaticWorld): PaneSet | undefined =>
  (world as StaticWorld & { panes?: PaneSet }).panes;
