import type { Heightfield } from "./heightfield";
import type { WorldMeta } from "./world";

/**
 * The two strait bridges (concept map: west bridge E8, east bridge H8), shared by the server
 * (collision boxes) and the client (one merged mesh): a deck rising from the ground at each
 * abutment to at least the clearance height mid-span, railings on both edges and piers.
 */
export const BRIDGE = {
  /** Sample spacing along the deck (m); also the collision segment length. */
  step: 3,
  thickness: 1.2,
  railHeight: 1.1,
  railWidth: 0.35,
  pierEvery: 45,
  pierSize: 3,
} as const;

export type BridgeSpan = {
  id: string;
  width: number;
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
    const mid = (ha + hb) / 2;
    const lift = Math.max(0, b.deck - mid);
    const points: Array<[number, number, number]> = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      // Smooth arch: zero slope change at the abutments, full clearance mid-span.
      const arch = Math.sin(Math.PI * t);
      const y = ha + (hb - ha) * t + lift * arch;
      points.push([ax + (bx - ax) * t, +y.toFixed(3), az + (bz - az) * t]);
    }
    return { id: b.id, width: b.width, points, dir, side };
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
      // Deck slab: walkable top.
      aabb(
        [at(x0, z0, half), at(x0, z0, -half), at(x1, z1, half), at(x1, z1, -half)],
        top - BRIDGE.thickness,
        top,
      );
      // Railings on both edges.
      for (const edge of [half, -half]) {
        const inner = edge - Math.sign(edge) * BRIDGE.railWidth;
        aabb(
          [at(x0, z0, edge), at(x0, z0, inner), at(x1, z1, edge), at(x1, z1, inner)],
          top,
          top + BRIDGE.railHeight,
        );
      }
    }
    // Piers down to the sea floor every pierEvery metres (not under the abutments).
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
