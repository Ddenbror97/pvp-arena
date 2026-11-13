import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { bridgeBoxes, bridgeSpans } from "@/lib/fps/br/bridges";
import { buildIsland } from "@/lib/fps/br/island";
import type { Placement } from "@/lib/fps/br/layout";
import { PRISON_WALL } from "@/lib/fps/br/walls";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, turnBox, type CollisionData } from "@/lib/fps/br/static-world";
import { forEachTrunkNear } from "@/lib/fps/br/vegetation";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { size: number[] }>;
};
let hf: Heightfield, world: StaticWorld, layout: Placement[];
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  ({ layout, solid: world } = buildIsland(hf, cover, meta, collision));
}, 60_000);

/** How far below the sea bed a piled pier's legs reach (m): its deck's height less 1.2 m. */
const SHORE_LEGS: Record<string, number> = { "old-pier": 5.4, wharf: 1.8 };
/** Footprint of a placement (model size rotated), x0, z0, x1, z1. */
function footprint(p: Placement) {
  const [w, h, d] = models.models[p.model]!.size as [number, number, number];
  const [x0, , z0, x1, , z1] = turnBox([-w / 2, 0, -d / 2, w / 2, h, d / 2], p.turn);
  return [p.x + x0, p.z + z0, p.x + x1, p.z + z1] as const;
}
const body = (x: number, z: number): BrBody => ({
  x,
  y: world.supportAt(x, z, 0.35, 1e4),
  z,
  velocityY: 0,
  crouched: false,
  grounded: true,
});
const walk = (
  b: BrBody,
  yaw: number,
  seconds: number,
  extra: Partial<{ jump: boolean; sprint: boolean }> = {},
) => {
  for (let t = 0; t < seconds * 30; t++)
    stepBody(world, b, { forward: 1, strafe: 0, yaw, ...extra }, TICK_MS);
};

describe("Project Island static world", () => {
  it("places every layout model, each with collision data, on the flat building pads", () => {
    expect(layout.length).toBeGreaterThan(400);
    // Stacked on another placement (containers on the quay, wrecks at the salvage yard).
    const lowest = new Map<string, number>();
    for (const p of layout) {
      const k = `${p.x},${p.z}`;
      lowest.set(k, Math.min(lowest.get(k) ?? Infinity, p.y));
    }
    for (const p of layout) {
      expect(models.models[p.model], p.model).toBeDefined();
      expect(collision.models[p.model], p.model).toBeDefined();
      // Countryside sites (poi "countryside") sit on the terrain like the forest cabins.
      if (p.y > lowest.get(`${p.x},${p.z}`)! + 0.5) continue;
      // The strait bridges' pylons stand in the channel at the deck's height less their own
      // (br-strait.test.ts checks them against the deck).
      if (p.poi === "strait-bridge") continue;
      const poi = meta.pois.find((q) => q.id === p.poi) ?? { padHeight: undefined };
      const [x0, z0, x1, z1] = footprint(p);
      for (const [x, z] of [
        [x0, z0],
        [x1, z0],
        [x0, z1],
        [x1, z1],
      ])
        if (p.poi === "bridges")
          // Bridge cover stands on the deck (its corners may hang over the arch a little).
          expect(
            Math.abs(world.supportAt(p.x, p.z, 0.3, p.y + 0.6) - p.y),
            `${p.model} on bridge`,
          ).toBeLessThan(0.6);
        else if (p.poi === "shore")
          // Piers and moored boats stand in the water: never buried under the bank.
          // (Less the legs of a pier whose deck stands on piles: the 2026-11-11 harbour's.)
          expect(
            hf.heightAt(x!, z!) - p.y - (SHORE_LEGS[p.model] ?? 0),
            `${p.model} on the shore`,
          ).toBeLessThan(4);
        else if (poi.padHeight !== undefined)
          // On a pad: level with the pad.
          expect(
            Math.abs(hf.heightAt(x!, z!) - poi.padHeight),
            `${p.model} @${p.poi}`,
          ).toBeLessThan(1.6);
        else if (p.poi === "strait") {
          // The strait's shores (rocks, tetrapods, revetments, bridgeheads): the beach ends in a
          // drop to the channel floor, so a corner may hang over it; the middle sits on the
          // ground, sunk at most a few metres.
          const h = hf.heightAt(p.x, p.z) - p.y;
          expect(h, `${p.model} @strait floats`).toBeGreaterThan(-0.6);
          expect(h, `${p.model} @strait buried`).toBeLessThan(4);
        } else if (p.poi === "rail") {
          // Track, wagons and the yard on the railway bed: wagons ride the rails 0.3 m up and a
          // section can bridge a dip, so the ground under a corner may be a metre lower.
          const h = hf.heightAt(x!, z!) - p.y;
          expect(h, `${p.model} @rail floats`).toBeGreaterThan(-1.3);
          expect(h, `${p.model} @rail buried`).toBeLessThan(4);
        } else if (p.poi === "relief") {
          // Rock faces sit sunk into the slope they rise from (rock-ground.ts lowers them further
          // where they hung over it: a 20 m quarry face at the foot of a bench wall up to 7 m, so
          // the bench's ground at a corner can stand up to 17–18 m over its base; never over all
          // of it).
          const h = hf.heightAt(x!, z!) - p.y;
          expect(h, `${p.model} relief floats`).toBeGreaterThan(-0.6);
          expect(h, `${p.model} relief buried`).toBeLessThan(20);
        } else {
          // On the terrain (cabins, farms, summits): never floating, buried at most a few metres
          // on the uphill side.
          const h = hf.heightAt(x!, z!) - p.y;
          expect(h, `${p.model} @${p.poi} floats`).toBeGreaterThan(-0.6);
          expect(h, `${p.model} @${p.poi} buried`).toBeLessThan(4);
        }
    }
  });

  it("keeps runways clear", () => {
    const blocked: string[] = [];
    for (const p of layout) {
      const [x0, z0, x1, z1] = footprint(p);
      for (const r of meta.runways) {
        const ax = r.b[0] - r.a[0],
          az = r.b[1] - r.a[1],
          len = Math.hypot(ax, az);
        for (const [x, z] of [
          [x0, z0],
          [x1, z0],
          [x0, z1],
          [x1, z1],
          [(x0 + x1) / 2, (z0 + z1) / 2],
        ]) {
          const u = ((x! - r.a[0]) * ax + (z! - r.a[1]) * az) / (len * len);
          const across = Math.abs((x! - r.a[0]) * az - (z! - r.a[1]) * ax) / len;
          if (u > -0.02 && u < 1.02 && across < r.width / 2 + 5)
            blocked.push(`${p.model}@${p.x},${p.z}`);
        }
      }
    }
    expect(blocked).toEqual([]);
  });

  it("never overlaps two buildings or large structures", () => {
    const big = layout.filter((p) => {
      const s = models.models[p.model]!.size;
      return (
        Math.max(s[0]!, s[2]!) > 6 &&
        p.model !== "chinook" &&
        // The Superstore's fit-out stands inside its shell by design.
        p.model !== "superstore-interior" &&
        p.model !== "superstore-stairs" &&
        // The strait bridges' pylons: their stays reach 200 m along the deck, towards each other.
        !p.model.startsWith("strait-pylon") &&
        // And its furniture (the `ss-*` downloads: racking, the racking ramp).
        !p.model.startsWith("ss-") &&
        p.model !== "yc130" &&
        // The helidecks: a Chinook and the hospital's helicopters parked on their decks.
        p.model !== "helideck" &&
        // Open-sided vehicle sheds: the motor pool's trucks park under them by design.
        p.model !== "field-hangar" &&
        // The hospital fire station's engine stands in its bay.
        p.model !== "fire-truck" &&
        // Skyline Residences' flats: the kitchen runs along their walls, inside the storey.
        p.model !== "kitchen-run"
      );
    });
    // The placement data is immutable: calculate its footprint once, rather than
    // repeating the same rotation/allocation for every pair in the exhaustive audit.
    const footprints = big.map(footprint);
    const heights = big.map((p) => models.models[p.model]!.size[1]!);
    const overlaps: string[] = [];
    for (let i = 0; i < big.length; i++)
      for (let j = i + 1; j < big.length; j++) {
        const a = footprints[i]!,
          b = footprints[j]!;
        // Stacked (containers two high) is not overlapping: their heights do not meet.
        const ha = heights[i]!,
          hb = heights[j]!;
        const apart = big[i]!.y + ha <= big[j]!.y + 0.05 || big[j]!.y + hb <= big[i]!.y + 0.05;
        // The super yacht lies stern-to its pier: its boarding steps run under the pier's end.
        const moored =
          (big[i]!.model === "lux-yacht" && big[j]!.model === "pier") ||
          (big[i]!.model === "pier" && big[j]!.model === "lux-yacht") ||
          // The air ambulance stands on Skyline Residences' roof helipad.
          (big[i]!.model === "condo-roof-a" && big[j]!.model === "heli-ambulance") ||
          (big[i]!.model === "heli-ambulance" && big[j]!.model === "condo-roof-a");
        if (
          !apart &&
          !moored &&
          a[0] < b[2] - 0.5 &&
          b[0] < a[2] - 0.5 &&
          a[1] < b[3] - 0.5 &&
          b[1] < a[3] - 0.5
        )
          overlaps.push(
            `${big[i]!.model}@${big[i]!.x},${big[i]!.z} × ${big[j]!.model}@${big[j]!.x},${big[j]!.z}`,
          );
      }
    expect(overlaps).toEqual([]);
  });

  it("keeps walkers on the terrain and stops them at walls, props and trunks", () => {
    const store = meta.pois.find((p) => p.id === "island-superstore")!;
    // From the car park, walk north into the store's south wall.
    const b = body(store.x - 20, store.z + 45);
    walk(b, 0, 8);
    expect(b.z).toBeGreaterThan(store.z + 20);
    expect(b.z).toBeLessThan(store.z + 45);
    // A hesco wall of the military base blocks the way out (west wall, away from gates).
    const base = meta.pois.find((p) => p.id === "southern-military-base")!;
    const w = body(base.x - 150, base.z + 80);
    walk(w, Math.PI / 2, 6); // yaw π/2 = facing -x (west)
    expect(w.x).toBeGreaterThan(base.x - 166);
    // Open country: 20 s of walking stays glued to the terrain (no floating, no sinking).
    const c = body(-1500, -800);
    for (let t = 0; t < 600; t++) {
      stepBody(world, c, { forward: 1, strafe: 0, yaw: t / 200 }, TICK_MS);
      const ground = world.supportAt(c.x, c.z, 0.35, c.y + 0.4);
      expect(Math.abs(c.y - ground)).toBeLessThan(0.36);
    }
  });

  it("walks a player out of a tree trunk they landed on (never stuck in geometry)", () => {
    // Find a trunk in open forest and put a body exactly on it.
    let spot: [number, number] | null = null;
    for (let x = -2900; x < -2500 && !spot; x += 7)
      forEachTrunkNear(world.vegetation!, x, 1700, 6, (tx, tz) => {
        spot ??= [tx, tz];
      });
    expect(spot).not.toBeNull();
    const [tx, tz] = spot!;
    const b = body(tx, tz);
    b.y = hf.heightAt(tx, tz);
    expect(world.blocked(b.x, b.y + 1e-4, b.z, 1.8, 0.35)).toBe(true);
    walk(b, 0, 1);
    expect(Math.hypot(b.x - tx, b.z - tz)).toBeGreaterThan(2);
    expect(world.blocked(b.x, b.y + 1e-4, b.z, 1.8, 0.35)).toBe(false);
  });

  it("crosses both strait bridges on foot, above the water all the way", () => {
    for (const bridge of meta.bridges.filter(
      (b) => b.id === "west-bridge" || b.id === "east-bridge",
    )) {
      const [ax, az] = bridge.a,
        [bx, bz] = bridge.b;
      const yaw = Math.atan2(-(bx - ax), -(bz - az)); // forward = (-sin yaw, -cos yaw)
      // Start 20 m back on land, walk to 20 m past the far end.
      const len = Math.hypot(bx - ax, bz - az);
      const ux = (bx - ax) / len,
        uz = (bz - az) / len;
      const b = body(ax - ux * 20, az - uz * 20);
      let lowest = Infinity;
      for (let t = 0; t < ((len + 40) / 5) * 30 && Math.hypot(b.x - ax, b.z - az) < len + 20; t++) {
        stepBody(world, b, { forward: 1, strafe: 0, yaw }, TICK_MS);
        if (Math.hypot(b.x - ax, b.z - az) > 30 && Math.hypot(b.x - bx, b.z - bz) > 30)
          lowest = Math.min(lowest, b.y);
      }
      expect(Math.hypot(b.x - bx, b.z - bz), bridge.id).toBeLessThan(25);
      expect(lowest, bridge.id).toBeGreaterThan(2);
    }
  });

  it("crosses every river bridge on foot both ways, on the deck over the channel", () => {
    for (const br of meta.bridges.filter((b) => b.id.startsWith("river-bridge"))) {
      const len = Math.hypot(br.b[0] - br.a[0], br.b[1] - br.a[1]);
      for (const [from, to] of [
        [br.a, br.b],
        [br.b, br.a],
      ] as const) {
        const b = body(from[0], from[1]);
        let highest = -Infinity;
        for (
          let t = 0;
          t < ((len + 20) / 5) * 30 && Math.hypot(b.x - to[0], b.z - to[1]) > 3;
          t++
        ) {
          // Steer along the axis towards the far end.
          stepBody(
            world,
            b,
            { forward: 1, strafe: 0, yaw: Math.atan2(-(to[0] - b.x), -(to[1] - b.z)) },
            TICK_MS,
          );
          highest = Math.max(highest, b.y);
        }
        expect(Math.hypot(b.x - to[0], b.z - to[1]), br.id).toBeLessThan(4);
        expect(highest, br.id).toBeGreaterThan(br.deck - 1);
      }
    }
  });

  it("builds the Old Dam as a solid wall: crest above the ground, a face that blocks", () => {
    const dam = bridgeSpans(meta, hf).find((s) => s.id === "old-dam")!;
    expect(dam.solid).toBe(true);
    // Away from the abutments (where the crest meets the ground) the crest clears the ground.
    const n = dam.points.length;
    for (const [x, y, z] of dam.points.slice(Math.ceil(n * 0.06), Math.floor(n * 0.94)))
      expect(y - hf.heightAt(x, z), `${x},${z}`).toBeGreaterThan(0.5);
    // Walking south into the dam from the lower (north) lake shore stops at its face.
    const [mx, , mz] = dam.points[Math.floor(dam.points.length / 2)]!;
    const [sx, sz] = dam.side;
    const north = sz < 0 ? 1 : -1; // side normal pointing north (−z)
    const start: [number, number] = [mx + sx * north * 30, mz + sz * north * 30];
    const b = body(start[0], start[1]);
    const yaw = Math.atan2(sx * north, sz * north); // walk back towards the centreline
    walk(b, yaw, 12);
    expect(Math.hypot(b.x - mx, b.z - mz)).toBeGreaterThan(dam.width / 2);
  });

  it("walls Blackwater Prison: the wall blocks, the north and south gates let you in", () => {
    const prison = meta.pois.find((p) => p.id === "blackwater-prison")!;
    const yawSouth = Math.PI; // forward = (-sin yaw, -cos yaw) = +z
    // Through the gate: start 40 m north of it, walk south, end up inside.
    const inGate = body(prison.x, prison.z - PRISON_WALL.side - 40);
    walk(inGate, yawSouth, 16);
    expect(inGate.z).toBeGreaterThan(prison.z - PRISON_WALL.side + 20);
    // Beside the gate (30 m east, the same side), the wall stops you outside.
    const blocked = body(prison.x + 30, prison.z - PRISON_WALL.side - 40);
    walk(blocked, yawSouth, 16);
    expect(blocked.z).toBeLessThan(prison.z - PRISON_WALL.side + 5);
    // The south gate too: start 40 m south of it, walk north, end up inside.
    const south = body(prison.x, prison.z + PRISON_WALL.side + 40);
    walk(south, 0, 16);
    expect(south.z).toBeLessThan(prison.z + PRISON_WALL.side - 20);
    // And a shot through the wall hits it.
    const y = prison.padHeight! + 1.5;
    const hit = world.raycast(prison.x + 30, y, prison.z - PRISON_WALL.side - 40, 0, 0, 1, 60);
    expect(hit?.kind).toBe("box");
  });

  it("grows no tree through a building (every footprint is a clearing)", () => {
    const through: string[] = [];
    for (const p of layout) {
      for (const b of collision.models[p.model] ?? []) {
        const [x0, y0, z0, x1, , z1] = turnBox(b, p.turn);
        if (y0 > 1.5) continue; // roofs and overhangs
        const r = Math.hypot(x1 - x0, z1 - z0) / 2;
        if (r < 2) continue; // small props may stand among trees
        forEachTrunkNear(
          world.vegetation!,
          p.x + (x0 + x1) / 2,
          p.z + (z0 + z1) / 2,
          r + 1,
          (tx, tz, tr) => {
            if (
              tx + tr > p.x + x0 &&
              tx - tr < p.x + x1 &&
              tz + tr > p.z + z0 &&
              tz - tr < p.z + z1
            )
              through.push(`${p.model}@${p.poi} ${p.x},${p.z}`);
          },
        );
      }
    }
    expect(through.slice(0, 5)).toEqual([]);
  });

  it("lands on top of a container and climbs nothing taller than a step", () => {
    const container = layout.find(
      (p) => p.model === "container-40" && p.poi === "island-superstore",
    )!;
    const top = world.supportAt(container.x, container.z, 0.35, 1e4);
    expect(top - container.y).toBeGreaterThan(2);
    const b: BrBody = {
      x: container.x,
      y: top + 3,
      z: container.z,
      velocityY: 0,
      crouched: false,
      grounded: false,
    };
    for (let t = 0; t < 60; t++) stepBody(world, b, null, TICK_MS);
    expect(b.y).toBeCloseTo(top, 3);
    expect(b.grounded).toBe(true);
  });

  it("stops bullets and sight lines at buildings and terrain", () => {
    const store = meta.pois.find((p) => p.id === "island-superstore")!;
    const y = store.padHeight! + 1.5;
    const hit = world.raycast(store.x, y, store.z + 90, 0, 0, -1, 200)!;
    expect(hit.kind).toBe("box");
    expect(hit.distance).toBeLessThan(80);
    // Straight down from the sky onto open terrain.
    const g = world.raycast(-1500, 500, -800, 0, -1, 0, 1000)!;
    expect(g.kind === "ground" || g.kind === "trunk").toBe(true);
  });

  it("is deterministic and cheap enough for 100 players per tick", () => {
    const run = () => {
      const bodies = Array.from({ length: 100 }, (_, i) =>
        body(-2000 + (i % 10) * 37, -1500 + Math.floor(i / 10) * 41),
      );
      const t0 = performance.now();
      for (let t = 0; t < 150; t++)
        for (const [i, b] of bodies.entries())
          stepBody(
            world,
            b,
            {
              forward: 1,
              strafe: (i % 3) - 1,
              yaw: i + t / 50,
              sprint: i % 2 === 0,
              jump: t % 40 === i % 40,
            },
            TICK_MS,
          );
      return { ms: (performance.now() - t0) / 150, state: bodies.map((b) => [b.x, b.y, b.z]) };
    };
    const a = run(),
      b = run();
    expect(b.state).toEqual(a.state);
    expect(Math.min(a.ms, b.ms)).toBeLessThan(4);
  });
});
