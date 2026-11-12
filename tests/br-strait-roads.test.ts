import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STRAIT_BRIDGES } from "@/lib/fps/br/bridges";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Asphalt all the way across the strait (owner, 2026-11-11, with a sketch: "is there any
 * continuous asphalt road from the bridges to the Superstore and the other way around"): the
 * world's roads, joined where they meet (within a few metres) and over the two strait
 * bridges, connect the Superstore to both bridges and both bridges to the mainland's roads
 * (Murder Cabins, Southern Military Base, the Riverwood channel's bridge to East Works).
 */
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const pts: Array<[number, number]> = [];
const adj: number[][] = [];
for (const r of meta.roads) {
  const base = pts.length;
  r.points.forEach((p, k) => {
    pts.push([p[0]!, p[1]!]);
    adj.push([]);
    if (k > 0) {
      adj[base + k]!.push(base + k - 1);
      adj[base + k - 1]!.push(base + k);
    }
  });
}
const G = 20;
const grid = new Map<string, number[]>();
pts.forEach(([x, z], n) => {
  const key = `${Math.floor(x / G)},${Math.floor(z / G)}`;
  (grid.get(key) ?? grid.set(key, []).get(key)!).push(n);
});
const near = (x: number, z: number, r: number) => {
  const out: number[] = [];
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      for (const n of grid.get(`${Math.floor(x / G) + i},${Math.floor(z / G) + j}`) ?? [])
        if (Math.hypot(pts[n]![0] - x, pts[n]![1] - z) <= r) out.push(n);
  return out;
};
// Roads meet where a point of one lies on (within 8 m of) a point of another.
pts.forEach(([x, z], n) => {
  for (const q of near(x, z, 8)) if (q !== n) adj[n]!.push(q);
});
const nearest = (x: number, z: number) => {
  let best = -1,
    d = Infinity;
  pts.forEach(([px, pz], n) => {
    const e = Math.hypot(px - x, pz - z);
    if (e < d) [best, d] = [n, e];
  });
  return { node: best, d };
};
// The river bridges and the dam's crest carry the road from one end to the other. The strait
// bridges are left out: each side must hold together on its own (the east bridge's mainland
// end ran 400 m into a field and stopped; only its island end was on the network).
const strait = meta.bridges.filter((b) => STRAIT_BRIDGES.has(b.id));
for (const b of meta.bridges.filter((q) => !STRAIT_BRIDGES.has(q.id))) {
  const a = nearest(b.a[0]!, b.a[1]!).node,
    c = nearest(b.b[0]!, b.b[1]!).node;
  adj[a]!.push(c);
  adj[c]!.push(a);
}
const reach = (from: number) => {
  const seen = new Set([from]);
  const stack = [from];
  while (stack.length)
    for (const q of adj[stack.pop()!]!)
      if (!seen.has(q)) {
        seen.add(q);
        stack.push(q);
      }
  return seen;
};
const poi = (id: string) => meta.pois.find((p) => p.id === id)!;

describe("the strait's roads", () => {
  it("meet every strait bridge end", () => {
    for (const b of strait)
      for (const end of [b.a, b.b])
        expect(nearest(end[0]!, end[1]!).d, `${b.id} ${end}`).toBeLessThan(15);
  });

  it("join both bridges' island ends to the Superstore", () => {
    const store = poi("island-superstore");
    const island = reach(nearest(store.x, store.z).node);
    for (const b of strait) expect(island.has(nearest(b.b[0]!, b.b[1]!).node), b.id).toBe(true);
    for (const id of ["island-airfield", "island-village"])
      expect(island.has(nearest(poi(id).x, poi(id).z).node), id).toBe(true);
  });

  it("join both bridges' mainland ends to each other and to the mainland's roads", () => {
    const [west, east] = strait.map((b) => reach(nearest(b.a[0]!, b.a[1]!).node));
    expect(west!.has(nearest(strait[1]!.a[0]!, strait[1]!.a[1]!).node), "coast road").toBe(true);
    for (const side of [west!, east!]) {
      for (const id of ["southern-military-base", "murder-cabins"]) {
        const n = nearest(poi(id).x, poi(id).z);
        expect(n.d, `${id} has a road`).toBeLessThan(400);
        expect(side.has(n.node), id).toBe(true);
      }
      // On over the Riverwood channel's bridge towards East Works.
      const rb = meta.bridges.find((b) => b.id === "river-bridge-4")!;
      expect(side.has(nearest(rb.b[0]!, rb.b[1]!).node), "river-bridge-4").toBe(true);
    }
  });
});
