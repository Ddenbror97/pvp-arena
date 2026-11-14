import type { Placement } from "./layout";
import arenaPlan from "./arena-plan.json";
import hospitalPlan from "./hospital-plan.json";
import skylinePlan from "./skyline-plan.json";
import stationPlan from "./station-plan.json";
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
};
export type PaneSet = {
  panes: Pane[];
  /** Pane ids per 16 m cell (key: row · 4096 + column). */
  cells: Map<number, number[]>;
  /** The panes' extent (the cheap test that skips almost every query on the island). */
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

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

const CELL = 16;
const cellOf = (v: number) => Math.floor(v / CELL);
const cellKey = (c: number, r: number) => (r + 2048) * 4096 + c + 2048;

/** The island's panes (the same layout → the same panes, the same ids). */
export function islandPanes(layout: readonly Placement[]): PaneSet {
  const panes: Pane[] = [];
  const cells = new Map<number, number[]>();
  let minY = Infinity,
    maxY = -Infinity,
    minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const p of layout) {
    const list = MODEL_PANES[p.model];
    if (!list?.length) continue;
    for (const [x0, x1, z0, z1, y0, y1] of list) {
      const [a, b, c, d, e, f] = turnBox([x0!, y0!, z0!, x1!, y1!, z1!], p.turn);
      const box: Pane["box"] = [p.x + a, p.y + b, p.z + c, p.x + d, p.y + e, p.z + f];
      const id = panes.length;
      panes.push({ id, box });
      minY = Math.min(minY, box[1]);
      maxY = Math.max(maxY, box[4]);
      minX = Math.min(minX, box[0]);
      maxX = Math.max(maxX, box[3]);
      minZ = Math.min(minZ, box[2]);
      maxZ = Math.max(maxZ, box[5]);
      for (let r = cellOf(box[2]); r <= cellOf(box[5]); r++)
        for (let c2 = cellOf(box[0]); c2 <= cellOf(box[3]); c2++) {
          const key = cellKey(c2, r);
          (cells.get(key) ?? cells.set(key, []).get(key)!).push(id);
        }
    }
  }
  return { panes, cells, minY, maxY, minX, maxX, minZ, maxZ };
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
    for (let c = cellOf(x0); c <= cellOf(x1); c++)
      for (const id of set.cells.get(cellKey(c, r)) ?? []) visit(id);
}

/** Whether an upright hull (feet at y, `height` tall, `radius`) overlaps the pane. */
function hullOnPane(p: Pane, x: number, y: number, z: number, height: number, radius: number) {
  const [x0, y0, z0, x1, y1, z1] = p.box;
  if (y + height <= y0 || y >= y1) return false;
  const cx = Math.max(x0, Math.min(x1, x)),
    cz = Math.max(z0, Math.min(z1, z));
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
  b: Pane["box"],
) {
  let t0 = 0,
    t1 = Infinity;
  const o = [ox, oy, oz],
    d = [dx, dy, dz];
  for (let k = 0; k < 3; k++) {
    const lo = b[k]!,
      hi = b[k + 3]!;
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
  if (!set.panes.length) return out;
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
        if (rayBox(ox, oy, oz, dx, dy, dz, set.panes[id]!.box) <= length) out.push(id);
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
      if (!hit && !broken[id] && hullOnPane(set.panes[id]!, x, y, z, height, radius)) hit = true;
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
  return w;
}

type PaneWorld = {
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

/** Whether a StaticWorld carries the island's panes (set by buildIsland). */
export const panesOf = (world: StaticWorld): PaneSet | undefined =>
  (world as StaticWorld & { panes?: PaneSet }).panes;
