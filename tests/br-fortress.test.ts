import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORTRESS } from "@/lib/fps/br/fortress-plan";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { stepBody, type BrBody, type BrMoveInput } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The Old Fortress (owner, 2026-11-17: "Build this complex fortress, large one. mutlible
 * floors,tunnels,secret paths"; "ensure all the building/stairs lagg optimizations as the rest
 * of the world"): every level is reached on foot, smoothly, with its dressing in place. Each
 * route in art/br/fortress-routes.json (the gate, the keep from the ground to the roof and down
 * to the dungeon and out the sally port, the vault and the west postern, the culvert, the
 * cellars, the towers, the wall-walks, the breach, the scaffold, the gatehouse, the bell tower)
 * is walked both ways, walking and sprinting, with the real movement code on the island's own
 * collision: no stall longer than 4 ticks, no fall of a metre, and the client's replay from the
 * snapshot's JSON never drifts (as tests/br-traversal-smoothness.test.ts holds every building).
 */
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { size: number[] }>;
};
const poi = meta.pois.find((p) => p.id === "old-fortress")!;
const routes = Object.entries(
  JSON.parse(readFileSync("art/br/fortress-routes.json", "utf8")) as Record<string, unknown>,
).filter(([k]) => !k.startsWith("_")) as Array<[string, number[][]]>;
const wire = (v: number) => JSON.parse(JSON.stringify(v)) as number;

const setup = (async () => {
  const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
  const island = buildIsland(hf, cover, meta, collision);
  const near = island.layout.filter(
    (p) => Math.abs(p.x - poi.x) < 260 && Math.abs(p.z - poi.z) < 260,
  );
  return { hf, island, near, world: new StaticWorld(hf, near, collision, null) };
})();

type Walk = { stalls: number; ticks: number; longest: number; fall: number; drift: number; at: string; fellAt: string };
function walk(world: StaticWorld, body: BrBody, points: number[][], sprint: boolean, where: string) {
  const nominal = 5 * (sprint ? 1.5 : 1) * (1 / 30);
  const w: Walk = { stalls: 0, ticks: 0, longest: 0, fall: 0, drift: 0, at: "", fellAt: "" };
  const here = (b: BrBody) =>
    `${(b.x - poi.x).toFixed(1)}, ${(b.y - poi.padHeight!).toFixed(1)}, ${(b.z - poi.z).toFixed(1)}`;
  let run = 0,
    airTop = -Infinity;
  for (const [x, z] of points) {
    for (
      let t = 0;
      t < 400 && Math.hypot(body.x - x!, body.z - z!) > Math.max(0.2, nominal * 0.75);
      t++
    ) {
      const input: BrMoveInput = {
        forward: 1,
        strafe: 0,
        yaw: Math.atan2(body.x - x!, body.z - z!),
        sprint,
      };
      const client: BrBody = {
        ...body,
        x: wire(body.x),
        y: wire(body.y),
        z: wire(body.z),
        velocityY: wire(body.velocityY),
      };
      const before = { ...body };
      stepBody(world, body, input, 34);
      stepBody(world, client, input, 34);
      w.drift = Math.max(w.drift, Math.hypot(client.x - body.x, client.y - body.y, client.z - body.z));
      w.ticks++;
      const left = Math.hypot(before.x - x!, before.z - z!);
      if (Math.hypot(body.x - before.x, body.z - before.z) < Math.min(nominal, left) * 0.5) {
        w.stalls++;
        if (++run > w.longest) {
          w.longest = run;
          w.at = here(body);
        }
      } else run = 0;
      if (!body.grounded) airTop = Math.max(airTop, before.y);
      else if (airTop > -Infinity) {
        if (airTop - body.y > w.fall) {
          w.fall = airTop - body.y;
          w.fellAt = here(body);
        }
        airTop = -Infinity;
      }
    }
    expect(
      Math.hypot(body.x - x!, body.z - z!),
      `${where}: reached ${(x! - poi.x).toFixed(1)}, ${(z! - poi.z).toFixed(1)} (at ${(body.x - poi.x).toFixed(1)}, ${(body.y - poi.padHeight!).toFixed(1)}, ${(body.z - poi.z).toFixed(1)})`,
    ).toBeLessThan(0.3);
  }
  return w;
}

describe("Old Fortress", () => {
  it("stands where fortress-plan.ts puts it, on the ledge at the POI's pad height", async () => {
    const { island } = await setup;
    for (const [model, x, y, z, turn] of FORTRESS)
      expect(
        island.layout.some(
          (p) =>
            p.model === model &&
            p.turn === turn &&
            Math.abs(p.x - poi.x - x) < 0.01 &&
            Math.abs(p.z - poi.z - z) < 0.01 &&
            Math.abs(p.y - poi.padHeight! - y) < 0.01,
        ),
        `${model} at ${x}, ${z}`,
      ).toBe(true);
  });

  it("its dressing stands clear of its walls (a box a little inside each model's outline)", async () => {
    const { hf, island } = await setup;
    const here = island.layout.filter((p) => p.poi === poi.id);
    const walls = new StaticWorld(
      hf,
      here.filter((p) => p.model.startsWith("fort-")),
      collision,
      null,
    );
    let checked = 0;
    for (const p of here) {
      if (p.model.startsWith("fort-") || p.model.startsWith("torch-")) continue;
      const s = manifest.models[p.model]!.size;
      const [w, d] = p.turn % 2 ? [s[2]!, s[0]!] : [s[0]!, s[2]!];
      for (const a of [-w / 2 + 0.1, 0, w / 2 - 0.1])
        for (const b of [-d / 2 + 0.1, 0, d / 2 - 0.1])
          expect(
            walls.blocked(p.x + a, p.y + 0.12, p.z + b, Math.max(0.05, s[1]! - 0.24), 0.04),
            `${p.model} at ${(p.x - poi.x).toFixed(2)}, ${(p.y - poi.padHeight!).toFixed(2)}, ${(p.z - poi.z).toFixed(2)}`,
          ).toBe(false);
      checked++;
    }
    expect(checked).toBeGreaterThan(150);
  });

  for (const [name, route] of routes)
    it(`${name}: walked both ways, walking and sprinting, without stalls, falls or replay drift`, async () => {
      const { world } = await setup;
      const pts = route.map(([x, z]) => [poi.x + x!, poi.z + z!]);
      const y0 = poi.padHeight! + (route[0]![2] ?? 0.5);
      for (const sprint of [false, true]) {
        const body: BrBody = {
          x: pts[0]![0]!,
          y: world.supportAt(pts[0]![0]!, pts[0]![1]!, 0.3, y0),
          z: pts[0]![1]!,
          grounded: true,
          crouched: false,
          velocityY: 0,
        };
        for (const [i, leg] of [pts.slice(1), [...pts].reverse().slice(1)].entries()) {
          const where = `${name}${sprint ? " sprinting" : ""}${i ? " back" : ""}`;
          const w = walk(world, body, leg, sprint, where);
          expect(w.drift, `${where}: replay drift`).toBe(0);
          expect(w.fall, `${where}: fell at ${w.fellAt}`).toBeLessThan(1);
          expect(w.longest, `${where}: longest stall at ${w.at}`).toBeLessThanOrEqual(4);
          expect(w.stalls / w.ticks, `${where}: stalled ticks`).toBeLessThan(0.12);
        }
      }
    }, 60_000);
});
