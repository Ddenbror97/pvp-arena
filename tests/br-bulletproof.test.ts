import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import FILL from "@/lib/fps/br/collision-fill.json";
import {
  BODY_FILL,
  boxesFingerprint,
  collisionFill,
  decodeBoxes,
} from "@/lib/fps/br/collision-fill";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { StaticWorld, turnBox, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import {
  decodeBoxes as decodeText,
  encodeBoxes,
} from "../art/blender/br/collision-fingerprint.mjs";

/**
 * Walls, trees, rocks and objects stop shots (owner, 2026-11-23: "audit all objects in the
 * world, to make walls/threes/rocks/objects bulletproof so people cant hax thro").
 * art/blender/br/fill_collision.mjs filled what was drawn solid with no box under it.
 */
const fill = FILL as Record<string, Record<string, string>>;
const boxesOf = (text: string) => {
  const flat = decodeBoxes(text);
  return Array.from({ length: flat.length / 6 }, (_, i) => [...flat.subarray(i * 6, i * 6 + 6)]);
};
const load = () =>
  JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8")) as CollisionData;
describe("collision fill", () => {
  it("fits this revision's boxes for every model it fills (rebuild it with a model's collision)", () => {
    const c = load();
    const stale = Object.keys(fill).filter(
      (id) => !(boxesFingerprint(c.models[id] ?? []) in fill[id]!),
    );
    // A model whose collision was rebuilt needs fill_collision.mjs run again for it.
    expect(stale).toEqual([]);
    expect(Object.keys(fill).length).toBeGreaterThan(100);
  });

  it("is for shots and sight only: a body walks where it walked before", () => {
    const c = load();
    const { shot, body } = collisionFill(c);
    expect(Object.keys(shot).length + Object.keys(body).length).toBe(Object.keys(fill).length);
    expect(Object.keys(body).sort()).toEqual([...BODY_FILL].filter((id) => id in fill).sort());
    expect(Object.values(c.models).flat().length).toBe(Object.values(load().models).flat().length);
  });

  it("reads what fill_collision.mjs writes", () => {
    const boxes = [
      [-12.5, 0, 3.25, -12.25, 2.75, 3.5],
      [77.75, -0.05, -40, 78, 0.2, -39.75],
    ];
    const text = encodeBoxes(boxes);
    expect([...decodeBoxes(text)].map((v) => +v.toFixed(3))).toEqual(boxes.flat());
    expect(decodeText(text)).toEqual(boxes);
  });

  it("stops a ray, not a body", () => {
    const hf = { raycast: () => null, heightAt: () => 0 } as unknown as ConstructorParameters<
      typeof StaticWorld
    >[0];
    const w = new StaticWorld(
      hf,
      [{ model: "m", x: 10, y: 0, z: 0, turn: 0, poi: "" }],
      { models: { m: [] } } as unknown as CollisionData,
      null,
      [],
      { m: [-0.2, 0, -0.2, 0.2, 3, 0.2] },
    );
    expect(w.raycast(0, 1, 0, 1, 0, 0, 20)?.distance).toBeCloseTo(9.8, 5);
    expect(w.raycast(0, 1, 0, 1, 0, 0, 20, true)).toBeNull();
    expect(w.blocked(10, 0, 0, 1.8, 0.3)).toBe(false);
    expect(w.supportAt(10, 0, 0.3, 5)).toBe(0);
    // Started inside it (a body or a grenade can be there): it sees and shoots out.
    expect(w.raycast(10, 1, 0, 1, 0, 0, 20)).toBeNull();
  });

  it("has real boxes, none in a doorway", () => {
    const c = load();
    for (const [id, variants] of Object.entries(fill)) {
      for (const text of Object.values(variants))
        for (const b of boxesOf(text)) {
          expect(b[3]! - b[0]!).toBeGreaterThan(0);
          expect(b[4]! - b[1]!).toBeGreaterThan(0);
          expect(b[5]! - b[2]!).toBeGreaterThan(0);
          for (const e of c.entrances?.[id] ?? []) {
            // The opening itself, 0.4 m either side of the threshold, from knee to 2.1 m (headroom).
            const [ax, az] = e.along === "x" ? [e.width / 2, 0.4] : [0.4, e.width / 2];
            const inDoor =
              b[0]! < e.x + ax &&
              b[3]! > e.x - ax &&
              b[2]! < e.z + az &&
              b[5]! > e.z - az &&
              b[1]! < Math.min(e.y1 - 0.1, e.y0 + 2.1) &&
              b[4]! > e.y0 + 0.3;
            expect(inDoor, `${id} door ${e.x},${e.z}`).toBe(false);
          }
        }
    }
  });
});

describe("in the world", async () => {
  const buffer = (path: string) => {
    const b = readFileSync(path);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  };
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
  const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  const island = buildIsland(hf, cover, meta, load());

  it("stops a level shot and a body at the palms' and orchard trees' trunks (they had no collision)", () => {
    for (const model of ["bay-palm", "bay-coconut-palm", "orchard-tree"]) {
      const trees = island.layout.filter((p) => p.model === model).slice(0, 20);
      expect(trees.length, model).toBeGreaterThan(5);
      // The fill's lowest box is the trunk's foot; aim at it from 6 m off along x and z.
      const foot = boxesOf(Object.values(fill[model]!)[0]!).reduce((a, b) =>
        b[1]! < a[1]! ? b : a,
      );
      let stopped = 0,
        bodyStopped = 0;
      for (const p of trees) {
        const b = turnBox(foot, p.turn);
        const cx = p.x + (b[0] + b[3]) / 2,
          cy = p.y + (b[1] + b[4]) / 2,
          cz = p.z + (b[2] + b[5]) / 2;
        const ax = island.solid.raycast(cx - 6, cy, cz, 1, 0, 0, 12);
        const az = island.solid.raycast(cx, cy, cz + 6, 0, 0, -1, 12);
        if (ax && ax.distance < 6 && az && az.distance < 6) stopped++;
        // Trunks stop bodies too (BODY_FILL): nobody stands inside one, out of reach.
        if (island.solid.blocked(cx, p.y + 0.3, cz, 1.5, 0.35)) bodyStopped++;
      }
      expect(stopped / trees.length, model).toBeGreaterThan(0.9);
      expect(bodyStopped / trees.length, model).toBeGreaterThan(0.9);
    }
  });
});
