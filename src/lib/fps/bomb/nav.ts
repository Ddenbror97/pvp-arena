import { PLAYER_RADIUS, STEP_HEIGHT, type Solid } from "../map";
import type { GameMap } from "../maps/types";

/**
 * Bomb Defusal walk graph: a 0.5 m grid where every cell holds one node per standable level (the
 * ground, stair risers, platforms, the catwalk and the floor under it, an upper storey and the
 * room below, the tunnel and the street above). Built once per map (bounded, cached), shared by up
 * to ten bots per room and by the layout tests.
 *
 * A level is the top of a solid (or the engine floor at 0) under the cell centre's footprint, where a
 * standing body (with the bots' limb clearance, 0.18 m beyond the player radius) fits between the
 * solids no more than one riser above that floor. Moving to a neighbouring cell lands on its
 * highest level no more than one riser up (stairs and steps), which is also how a walker drops off a
 * ledge (onto whatever is below). Railings and walls stop both, as in predictMovement.
 */
export const NAV_CELL = 0.5;
const CLEAR = PLAYER_RADIUS + 0.18;
const BODY = 1.8;
/** Nothing above this is a level a player can reach (upper town 5.4 + one riser). */
const MAX_LEVEL = 7.5;
export type NavPoint = { x: number; z: number; y?: number | undefined };
export type BombNav = {
  readonly x: Float32Array;
  readonly z: Float32Array;
  readonly y: Float32Array;
  readonly edges: Int32Array[];
  /** Cell key → node ids (one per level, lowest first). */
  readonly at: Map<number, number[]>;
};
export const cellKey = (i: number, j: number) => i * 4096 + j;

/** Solids near a point, from a coarse bucket grid (build-time only). */
function buckets(solids: readonly Solid[], size: number) {
  const map = new Map<number, Solid[]>();
  const k = (a: number, b: number) => a * 1024 + b;
  for (const s of solids) {
    const pad = CLEAR + 0.01;
    for (
      let a = Math.floor((s.x - s.w / 2 - pad) / size);
      a <= Math.floor((s.x + s.w / 2 + pad) / size);
      a++
    )
      for (
        let b = Math.floor((s.z - s.d / 2 - pad) / size);
        b <= Math.floor((s.z + s.d / 2 + pad) / size);
        b++
      ) {
        const list = map.get(k(a, b));
        if (list) list.push(s);
        else map.set(k(a, b), [s]);
      }
  }
  return (x: number, z: number) => map.get(k(Math.floor(x / size), Math.floor(z / size))) ?? [];
}

const graphs = new WeakMap<GameMap, BombNav>();
export function bombNav(map: GameMap): BombNav {
  const cached = graphs.get(map);
  if (cached) return cached;
  const near = buckets(map.movementSolids, 4);
  const supports = buckets(map.boxes, 4);
  const xs: number[] = [],
    zs: number[] = [],
    ys: number[] = [];
  const at = new Map<number, number[]>();
  const hw = map.arena.width / 2 - 1,
    hd = map.arena.depth / 2 - 1;
  for (let i = Math.ceil(-hw / NAV_CELL); i <= Math.floor(hw / NAV_CELL); i++)
    for (let j = Math.ceil(-hd / NAV_CELL); j <= Math.floor(hd / NAV_CELL); j++) {
      const x = i * NAV_CELL,
        z = j * NAV_CELL;
      const levels = [0];
      for (const b of supports(x, z)) {
        const top = b.y + b.h / 2;
        if (
          top <= MAX_LEVEL &&
          Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS &&
          Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS
        )
          levels.push(top);
      }
      levels.sort((a, b) => a - b);
      const ids: number[] = [];
      let last = -1;
      for (const y of levels) {
        if (y - last < 0.05) continue;
        // Standable: nothing more than one riser above this floor intrudes into the body.
        // Limb clearance only from real obstacles: the next riser or two of a fine staircase (and
        // the landing it leads to) is climbed, not walked around.
        const clear = !near(x, z).some((b) => {
          const rise = b.y + b.h / 2 - y,
            r = rise > 2 * STEP_HEIGHT + 1e-6 ? CLEAR : PLAYER_RADIUS;
          return (
            rise > STEP_HEIGHT + 1e-6 &&
            y + BODY > b.y - b.h / 2 &&
            Math.abs(x - b.x) < b.w / 2 + r &&
            Math.abs(z - b.z) < b.d / 2 + r
          );
        });
        if (!clear) continue;
        // Only the highest of several levels within one riser of each other (a riser's top and
        // the floor beside it are one place).
        if (ids.length && y - ys[ids[ids.length - 1]!]! <= STEP_HEIGHT + 1e-6) {
          ys[ids[ids.length - 1]!] = y;
          last = y;
          continue;
        }
        ids.push(xs.length);
        xs.push(x);
        zs.push(z);
        ys.push(y);
        last = y;
      }
      if (ids.length) at.set(cellKey(i, j), ids);
    }
  /** Highest support top under a body centred at (x, z) no higher than `maxY` (engine floor 0). */
  const supportTop = (x: number, z: number, maxY: number) => {
    let top = 0;
    for (const b of supports(x, z)) {
      const t = b.y + b.h / 2;
      if (
        t > top &&
        t <= maxY + 1e-6 &&
        Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS &&
        Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS
      )
        top = t;
    }
    return top;
  };
  /**
   * The level a walker at height `y` in cell (i, j) reaches in cell (i + di, j + dj): followed in
   * four sub-steps, each stepping up at most one riser or dropping onto what is below (as
   * predictMovement does; fine stair risers are shallower than a cell).
   */
  const land = (i: number, j: number, di: number, dj: number, y: number) => {
    const ids = at.get(cellKey(i + di, j + dj));
    if (!ids) return -1;
    let h = y;
    for (let k = 1; k <= 4; k++) {
      const px = (i + (di * k) / 4) * NAV_CELL,
        pz = (j + (dj * k) / 4) * NAV_CELL;
      // As predictMovement's sweep: a solid more than one riser above the feet stops the walker
      // (stairs are climbed from their foot, not from the side).
      for (const b of near(px, pz))
        if (
          b.y + b.h / 2 - h > STEP_HEIGHT + 1e-6 &&
          h + BODY > b.y - b.h / 2 &&
          Math.abs(px - b.x) < b.w / 2 + PLAYER_RADIUS &&
          Math.abs(pz - b.z) < b.d / 2 + PLAYER_RADIUS
        )
          return -1;
      h = supportTop(px, pz, h + STEP_HEIGHT);
    }
    let best = -1;
    for (const n of ids) if (ys[n]! <= h + 0.06) best = n;
    return best;
  };
  const edges: Int32Array[] = xs.map((x, n) => {
    const i = Math.round(x / NAV_CELL),
      j = Math.round(zs[n]! / NAV_CELL),
      y = ys[n]!;
    const out: number[] = [];
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const v = land(i, j, di, dj, y);
      if (v < 0) continue;
      // Diagonals only where both orthogonal cells are walkable at about this height (no corner
      // cutting through walls, no diagonal drops off ledges).
      if (di && dj) {
        const a = land(i, j, di, 0, y),
          b = land(i, j, 0, dj, y);
        if (a < 0 || b < 0 || Math.abs(ys[a]! - y) > 0.75 || Math.abs(ys[b]! - y) > 0.75) continue;
      }
      out.push(v);
    }
    return Int32Array.from(out);
  });
  const graph = {
    x: Float32Array.from(xs),
    z: Float32Array.from(zs),
    y: Float32Array.from(ys),
    edges,
    at,
  };
  graphs.set(map, graph);
  return graph;
}

/** Nearest node (by plan distance plus height difference when `p.y` is known). */
export function nearestNode(g: BombNav, p: NavPoint) {
  let best = -1,
    d = Infinity;
  const i0 = Math.round(p.x / NAV_CELL),
    j0 = Math.round(p.z / NAV_CELL);
  for (let r = 0; r <= 6 && best < 0; r++)
    for (let di = -r; di <= r; di++)
      for (let dj = -r; dj <= r; dj++) {
        const ids = g.at.get(cellKey(i0 + di, j0 + dj));
        if (!ids) continue;
        for (const n of ids) {
          const e =
            Math.hypot(g.x[n]! - p.x, g.z[n]! - p.z) +
            (p.y === undefined ? 0 : Math.abs(g.y[n]! - p.y) * 2);
          if (e < d) {
            d = e;
            best = n;
          }
        }
      }
  return best;
}

/** Breadth-first route over the walk graph (cell centres, in order). */
export function navPath(map: GameMap, from: NavPoint, to: NavPoint): NavPoint[] {
  const g = bombNav(map);
  const start = nearestNode(g, from),
    end = nearestNode(g, to);
  if (start < 0 || end < 0) return [];
  const prev = new Int32Array(g.x.length).fill(-2);
  prev[start] = -1;
  const queue = [start];
  for (let k = 0; k < queue.length && prev[end] === -2; k++)
    for (const v of g.edges[queue[k]!]!)
      if (prev[v] === -2) {
        prev[v] = queue[k]!;
        queue.push(v);
      }
  if (prev[end] === -2) return [];
  const out: NavPoint[] = [];
  for (let c = end; c !== start; c = prev[c]!) out.push({ x: g.x[c]!, z: g.z[c]!, y: g.y[c]! });
  return out.reverse();
}

/**
 * Walking distance (metres) from `start` to every node: Dijkstra over the same edges, a diagonal
 * costing √2 cells (layout timings; a drop costs its plan distance).
 */
export function navDistances(map: GameMap, start: NavPoint) {
  const g = bombNav(map);
  const dist = new Float64Array(g.x.length).fill(Infinity);
  const prev = new Int32Array(g.x.length).fill(-1);
  const s = nearestNode(g, start);
  if (s < 0) return { dist, prev };
  dist[s] = 0;
  const heap: number[] = [s];
  const less = (a: number, b: number) => dist[a]! < dist[b]!;
  const push = (v: number) => {
    heap.push(v);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (!less(heap[k]!, heap[p]!)) break;
      [heap[p], heap[k]] = [heap[k]!, heap[p]!];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0]!,
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1,
          r = l + 1;
        let m = k;
        if (l < heap.length && less(heap[l]!, heap[m]!)) m = l;
        if (r < heap.length && less(heap[r]!, heap[m]!)) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k]!, heap[m]!];
        k = m;
      }
    }
    return top;
  };
  const done = new Uint8Array(g.x.length);
  while (heap.length) {
    const u = pop();
    if (done[u]) continue;
    done[u] = 1;
    for (const v of g.edges[u]!) {
      const w = dist[u]! + Math.hypot(g.x[v]! - g.x[u]!, g.z[v]! - g.z[u]!);
      if (w < dist[v]!) {
        dist[v] = w;
        prev[v] = u;
        push(v);
      }
    }
  }
  return { dist, prev };
}
