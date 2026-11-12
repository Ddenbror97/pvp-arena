import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STRAIT, STRAIT_BRIDGES, bridgeSpans, deckHeight } from "@/lib/fps/br/bridges";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { turnBox, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The strait (owner, 2026-11-11: "audit the two bridges and each coast side … proper rocks …
 * a house/tower on each side of the bridges … add proper bridges"): cable-stayed bridges whose
 * A-pylons straddle the deck, a level deck between them, the bridgeheads dressed and rocky
 * shores. Walked with the real movement code on the island's own placement.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const bridges = meta.bridges.filter((b) => STRAIT_BRIDGES.has(b.id));

describe("the strait", () => {
  it("has two cable-stayed bridges with two A-pylons each", () => {
    expect(bridges).toHaveLength(2);
    for (const b of bridges) {
      const model = b.id === "west-bridge" ? "strait-pylon-w" : "strait-pylon-e";
      expect(
        island.layout.filter((p) => p.model === model),
        b.id,
      ).toHaveLength(2);
    }
  });

  it("runs its decks level between the pylons, at the bridges' height", () => {
    for (const b of bridges) {
      const ha = hf.heightAt(b.a[0], b.a[1]),
        hb = hf.heightAt(b.b[0], b.b[1]);
      for (let t = STRAIT.ramp; t <= 1 - STRAIT.ramp; t += 0.05)
        expect(deckHeight(b, ha, hb, t), `${b.id} ${t}`).toBeGreaterThan(b.deck - 0.6);
      // The climb off the beach stays under a step per collision segment.
      const span = bridgeSpans(meta, hf).find((s) => s.id === b.id)!;
      for (let k = 0; k + 1 < span.points.length; k++)
        expect(Math.abs(span.points[k + 1]![1] - span.points[k]![1])).toBeLessThan(0.35);
    }
  });

  it("keeps the pylons' legs clear of the deck and its rails", () => {
    for (const b of bridges) {
      const span = bridgeSpans(meta, hf).find((s) => s.id === b.id)!;
      const pylons = island.layout.filter((p) => p.model.startsWith("strait-pylon"));
      const boxes = pylons.flatMap((p) =>
        (collision.models[p.model] ?? []).map((bx) => {
          const [x0, y0, z0, x1, y1, z1] = turnBox(bx, p.turn);
          return [x0 + p.x, y0 + p.y, z0 + p.z, x1 + p.x, y1 + p.y, z1 + p.z];
        }),
      );
      let near = 0;
      for (const [x, y, z] of span.points) {
        if (!pylons.some((p) => Math.hypot(p.x - x, p.z - z) < 90)) continue;
        for (let off = -6; off <= 6; off += 0.5)
          for (const up of [0.2, 1.5, 3, 4.5]) {
            const px = x + span.side[0] * off,
              pz = z + span.side[1] * off,
              py = y + up;
            const hit = boxes.some(
              (q) =>
                px > q[0]! && px < q[3]! && py > q[1]! && py < q[4]! && pz > q[2]! && pz < q[5]!,
            );
            expect(hit, `${b.id} at ${x.toFixed(0)},${z.toFixed(0)} off ${off} up ${up}`).toBe(
              false,
            );
            near++;
          }
      }
      expect(near).toBeGreaterThan(100);
    }
  });

  it("can be walked end to end over both bridges", () => {
    for (const b of bridges) {
      const ha = hf.heightAt(b.a[0], b.a[1]);
      const body: BrBody = {
        x: b.a[0] - (b.b[0] - b.a[0]) * 0.02,
        z: b.a[1] - (b.b[1] - b.a[1]) * 0.02,
        y: ha,
        velocityY: 0,
        grounded: true,
        crouched: false,
      };
      body.y = island.solid.supportAt(body.x, body.z, 0.3, ha + 2);
      let high = -Infinity;
      for (let tick = 0; tick < 6000 && Math.hypot(body.x - b.b[0], body.z - b.b[1]) > 2; tick++) {
        stepBody(
          island.solid,
          body,
          // Down the middle (the jersey rows and cars stand towards the rails).
          { forward: 1, strafe: 0, yaw: Math.atan2(body.x - b.b[0], body.z - b.b[1]) },
          34,
        );
        high = Math.max(high, body.y);
      }
      expect(Math.hypot(body.x - b.b[0], body.z - b.b[1]), b.id).toBeLessThan(2.5);
      expect(high, b.id).toBeGreaterThan(b.deck - 0.6);
    }
  });

  it("dresses all four bridgeheads and both shores", () => {
    const count = (m: string) => island.layout.filter((p) => p.model === m).length;
    expect(count("bridge-booth")).toBe(4);
    expect(count("bridge-lookout")).toBe(4);
    expect(count("tetrapod")).toBeGreaterThan(30);
    expect(count("shore-breakwater")).toBeGreaterThanOrEqual(3);
    const shore = island.layout.filter((p) => p.poi === "strait");
    expect(shore.length).toBeGreaterThan(120);
    expect(shore.filter((p) => p.model.startsWith("shore-cliff")).length).toBeGreaterThan(5);
    expect(count("beach-wreck")).toBeGreaterThanOrEqual(1);
  });
});
