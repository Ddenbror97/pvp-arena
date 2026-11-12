import type { Heightfield } from "./heightfield";
import type { WorldMeta } from "./world";

/**
 * The two strait bridges (concept map: west bridge E8, east bridge H8), the river bridges and the
 * Old Dam (C5),
 * shared by the server (collision boxes) and the client (one merged mesh): a deck rising from the
 * ground at each abutment to at least the clearance height mid-span, railings on both edges and
 * piers (a dam is solid from its deck down to the ground instead).
 */

/** Bottom of a dam segment: the lowest ground under its four corners, a little below. */
export function damBase(hf: Heightfield, corners: Array<[number, number]>) {
  return Math.min(...corners.map(([x, z]) => hf.heightAt(x, z))) - 1;
}
export const BRIDGE = {
  /**
   * Sample spacing along the deck (m); also the collision segment length. Short enough that the
   * rise from one slab to the next (and from the ground onto the first) stays under a step on
   * the steepest river bridge.
   */
  step: 1.5,
  thickness: 1.2,
  railHeight: 1.1,
  railWidth: 0.35,
  pierEvery: 45,
  pierSize: 3,
} as const;

/**
 * The two strait bridges are cable-stayed (owner, 2026-11-11: "add proper bridges"): an A-pylon
 * either side of the middle (layout.ts straitBridges, the `strait-pylon-*` models) whose stays
 * land on a steel edge girder outside each rail. A stayed deck runs level, so these decks climb
 * off the beach over their first and last RAMP of the length and run level between (the other
 * bridges keep their arch).
 */
export const STRAIT_BRIDGES = new Set(["west-bridge", "east-bridge"]);
export const STRAIT = {
  /** Share of the length at each end over which the deck climbs. */
  ramp: 0.15,
  /** Where the pylons stand (share of the length from end a; the second faces back). */
  pylons: [0.26, 0.74],
  /** The edge girders: from the deck's edge out to this far from the centre line. */
  girder: 7.4,
  girderDepth: 1.4,
} as const;
/** The deck's rise at t (0 at the abutments, 1 at full height). */
export function deckRise(id: string, t: number) {
  if (!STRAIT_BRIDGES.has(id)) return Math.sin(Math.PI * t);
  const e = Math.min(t, 1 - t) / STRAIT.ramp;
  return e >= 1 ? 1 : e * e * (3 - 2 * e);
}
/** The deck's top at t along bridge `b` whose ends stand on ground ha and hb. */
export function deckHeight(b: WorldMeta["bridges"][number], ha: number, hb: number, t: number) {
  const lift = Math.max(0, b.deck - (ha + hb) / 2);
  return ha + (hb - ha) * t + lift * deckRise(b.id, t);
}

export type BridgeSpan = {
  id: string;
  width: number;
  /** Dam: solid down to the ground, no piers. */
  solid: boolean;
  /** Deck top centre line, every BRIDGE.step metres: x, y, z. */
  points: Array<[number, number, number]>;
  /** Unit direction a → b on the ground plane, and its left normal. */
  dir: [number, number];
  side: [number, number];
};

export function bridgeSpans(meta: WorldMeta, hf: Heightfield): BridgeSpan[] {
  return meta.bridges.map((b) => {
    const [ax, az] = b.a,
      [bx, bz] = b.b;
    const length = Math.hypot(bx - ax, bz - az);
    const dir: [number, number] = [(bx - ax) / length, (bz - az) / length];
    const side: [number, number] = [-dir[1], dir[0]];
    const ha = hf.heightAt(ax, az),
      hb = hf.heightAt(bx, bz);
    const n = Math.max(2, Math.round(length / BRIDGE.step));
    const points: Array<[number, number, number]> = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      // Smooth arch (zero slope change at the abutments, full clearance mid-span), or on the
      // strait bridges a level deck between two ramps (deckRise).
      const y = deckHeight(b, ha, hb, t);
      points.push([ax + (bx - ax) * t, +y.toFixed(3), az + (bz - az) * t]);
    }
    return { id: b.id, width: b.width, solid: !!b.solid, points, dir, side };
  });
}

/** Axis-aligned collision boxes (x0, y0, z0, x1, y1, z1) for every bridge: deck, rails, piers. */
export function bridgeBoxes(meta: WorldMeta, hf: Heightfield): number[][] {
  const boxes: number[][] = [];
  const aabb = (corners: Array<[number, number]>, y0: number, y1: number) => {
    const xs = corners.map((c) => c[0]),
      zs = corners.map((c) => c[1]);
    boxes.push(
      [Math.min(...xs), y0, Math.min(...zs), Math.max(...xs), y1, Math.max(...zs)].map(
        (v) => +v.toFixed(3),
      ),
    );
  };
  for (const span of bridgeSpans(meta, hf)) {
    const [sx, sz] = span.side;
    const half = span.width / 2;
    for (let k = 0; k + 1 < span.points.length; k++) {
      const [x0, y0, z0] = span.points[k]!,
        [x1, y1, z1] = span.points[k + 1]!;
      const top = Math.max(y0, y1);
      const at = (x: number, z: number, off: number): [number, number] => [
        x + sx * off,
        z + sz * off,
      ];
      // Deck slab: walkable top (a dam: the whole wall under it).
      const deck: Array<[number, number]> = [
        at(x0, z0, half),
        at(x0, z0, -half),
        at(x1, z1, half),
        at(x1, z1, -half),
      ];
      aabb(deck, span.solid ? damBase(hf, deck) : top - BRIDGE.thickness, top);
      // Railings on both edges.
      for (const edge of [half, -half]) {
        const inner = edge - Math.sign(edge) * BRIDGE.railWidth;
        aabb(
          [at(x0, z0, edge), at(x0, z0, inner), at(x1, z1, edge), at(x1, z1, inner)],
          top,
          top + BRIDGE.railHeight,
        );
      }
      // The strait bridges' edge girders, where the stays land (a ledge outside each rail).
      if (STRAIT_BRIDGES.has(span.id))
        for (const sign of [1, -1]) {
          const a = sign * half,
            b = sign * STRAIT.girder;
          aabb(
            [at(x0, z0, a), at(x0, z0, b), at(x1, z1, a), at(x1, z1, b)],
            top - 0.25 - STRAIT.girderDepth,
            top - 0.25,
          );
        }
    }
    // Piers down to the sea floor every pierEvery metres (not under the abutments).
    if (span.solid) continue;
    const every = Math.round(BRIDGE.pierEvery / BRIDGE.step);
    for (let k = every; k < span.points.length - every / 2; k += every) {
      const [x, y, z] = span.points[k]!;
      const floor = Math.min(hf.heightAt(x, z), -1);
      const h = BRIDGE.pierSize / 2;
      boxes.push(
        [x - h, floor, z - h, x + h, y - BRIDGE.thickness, z + h].map((v) => +v.toFixed(3)),
      );
    }
  }
  return boxes;
}

/**
 * Road onto each bridge (owner, 2026-11-11: "fix broken bridges, look bad the connecting"): the
 * deck is wider than the road (10–12 m against 7 m), its axis is not always the road's, and two
 * river bridges and the dam ended in a field. At each end an apron as wide as the deck runs on
 * along the bridge's axis, then (when the road network does not already pass through it) a road
 * joins it to the nearest road within `JOIN` m. Drawn as roads (structures-renderer.ts); the
 * ground under them is the terrain's, as for every road.
 */
export const APPROACH = { apron: 12, join: 70, overlap: 0.6 } as const;
export function bridgeApproaches(
  meta: WorldMeta,
): Array<{ width: number; points: Array<[number, number]> }> {
  const out: Array<{ width: number; points: Array<[number, number]> }> = [];
  for (const b of meta.bridges) {
    const [ax, az] = b.a,
      [bx, bz] = b.b;
    const length = Math.hypot(bx - ax, bz - az);
    const dir: [number, number] = [(bx - ax) / length, (bz - az) / length];
    for (const [ex, ez, sign] of [
      [ax, az, -1],
      [bx, bz, 1],
    ] as const) {
      const ox = dir[0] * sign,
        oz = dir[1] * sign;
      const start: [number, number] = [ex - ox * APPROACH.overlap, ez - oz * APPROACH.overlap];
      const end: [number, number] = [ex + ox * APPROACH.apron, ez + oz * APPROACH.apron];
      out.push({ width: b.width, points: [start, end] });
      // The nearest road to the apron's end (not counting a road along the deck itself).
      let best = { d: Infinity, x: 0, z: 0, w: 7 };
      for (const r of meta.roads)
        for (let i = 1; i < r.points.length; i++) {
          const [px, pz] = r.points[i - 1]!,
            [qx, qz] = r.points[i]!;
          const dx = qx - px,
            dz = qz - pz;
          const l2 = dx * dx + dz * dz;
          const t = l2
            ? Math.max(0, Math.min(1, ((end[0] - px) * dx + (end[1] - pz) * dz) / l2))
            : 0;
          const x = px + dx * t,
            z = pz + dz * t;
          // Points behind the apron's end (on the bridge) do not count.
          if ((x - ex) * ox + (z - ez) * oz < APPROACH.apron * 0.5) continue;
          const d = Math.hypot(x - end[0], z - end[1]);
          if (d < best.d) best = { d, x, z, w: r.width };
        }
      if (best.d > 1 && best.d <= APPROACH.join)
        out.push({ width: best.w, points: [end, [best.x, best.z]] });
    }
  }
  return out;
}
