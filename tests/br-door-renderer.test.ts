import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { createDoorRenderer, DOOR_DRAW_M } from "@/lib/fps/br/door-renderer";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The doors drawn round the camera (door-renderer.ts). Performance audit 2026-11-15 (owner:
 * "Audit Downtown, i feel some kind of lag-spike sometimes in there"): every door of the island
 * was measured, the nearest sorted, and all of them written and uploaded again twice a second,
 * standing still or not.
 */
const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
let island: Island;
beforeAll(async () => {
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
  const collision = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
  ) as CollisionData;
  island = buildIsland(
    await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`)),
    await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`)),
    meta,
    collision,
  );
}, 120_000);

/** Each drawn door's panel matrix, by door id. */
function panelsOf(doors: ReturnType<typeof createDoorRenderer>) {
  const { drawn, panels } = doors.stats();
  const m = new THREE.Matrix4();
  const out = new Map<number, string>();
  drawn.forEach((id, i) => {
    panels.getMatrixAt(i, m);
    out.set(id, m.elements.map((v) => v.toFixed(4)).join(","));
  });
  expect(panels.count).toBe(drawn.length);
  return out;
}

describe("the doors drawn round the camera", () => {
  it("draws every door within reach, the same after a walk as put down there", () => {
    const walked = createDoorRenderer(new THREE.Scene(), island.doors);
    const cam = new THREE.Vector3();
    // Through Downtown along a street, then out of it to the west: 900 m at a run, 60 a second.
    let now = 0,
      most = 0;
    for (let x = 1600; x > 700; x -= 7 / 60) {
      cam.set(x, 15, 455.1);
      walked.update(1000 / 60, (now += 1000 / 60), cam);
      if (Math.round((x * 60) / 7) % 600) continue;
      // Put down right here: the same doors, each in the same place in the world.
      const fresh = createDoorRenderer(new THREE.Scene(), island.doors);
      fresh.update(0, 0, cam);
      const a = panelsOf(walked),
        b = panelsOf(fresh);
      // (The walk's set was worked out up to 10 m back: compare what both must hold.)
      const sure = island.doors.doors.filter(
        (d) => Math.hypot(d.x - x, d.z - 455.1) < DOOR_DRAW_M - 12,
      );
      most = Math.max(most, sure.length);
      for (const d of sure) {
        expect(a.has(d.id), `door ${d.id} at x ${x.toFixed(0)}`).toBe(true);
        expect(a.get(d.id)).toBe(b.get(d.id));
      }
      // Nothing far away is kept.
      for (const id of a.keys()) {
        const d = island.doors.doors[id]!;
        expect(Math.hypot(d.x - x, d.z - 455.1)).toBeLessThan(DOOR_DRAW_M + 12);
      }
      fresh.dispose();
    }
    // Downtown's doors were in reach on the way.
    expect(most).toBeGreaterThan(300);
    walked.dispose();
  });

  it("works nothing out and uploads nothing while the camera stands still", () => {
    const doors = createDoorRenderer(new THREE.Scene(), island.doors);
    const cam = new THREE.Vector3(1300, 15, 455.1);
    doors.update(16, 0, cam);
    const { panels, linings, picks } = doors.stats();
    const versions = [panels.instanceMatrix.version, linings.instanceMatrix.version];
    // Ten seconds, looking about (a step or two either way).
    for (let f = 1; f <= 600; f++) {
      cam.x = 1300 + Math.sin(f / 30) * 3;
      doors.update(16, f * 16, cam);
    }
    expect(doors.stats().picks).toBe(picks);
    expect([panels.instanceMatrix.version, linings.instanceMatrix.version]).toEqual(versions);
    // A step further and it is worked out again, but the doors already drawn are not rewritten:
    // only the buffers' version changes if a door came or went.
    cam.x = 1312;
    doors.update(16, 10_000, cam);
    expect(doors.stats().picks).toBe(picks + 1);
    doors.dispose();
  });
});
