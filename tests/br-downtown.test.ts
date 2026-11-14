import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { lifts } from "@/lib/fps/br/lifts";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { withPanes } from "@/lib/fps/br/panes";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Downtown and the Arena District (owner, 2026-11-13/14: the map audit's two biggest empty spots,
 * "more buildings, sky skrapers", "downtown needs to be expanded", "re build it to a big arena
 * with floors/levels", "ensure, enterble buildings/levels/stairs"). On the island's own
 * placements: Downtown's sixteen towers of three designs stand on its pad with an express lift
 * each; the arena's bowl, escalators and corner towers are walked with the real movement code,
 * from the pitch to the roof catwalk; nothing overlaps.
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
const open = withDoors(
  withPanes(island.solid, island.panes, new Uint8Array(island.panes.panes.length)),
  island.doors,
  new Uint8Array(island.doors.doors.length).fill(1),
);
const downtown = meta.pois.find((p) => p.id === "downtown")!;
const stadium = meta.pois.find((p) => p.id === "stadium")!;

describe("Downtown", () => {
  const mine = island.layout.filter((p) => p.poi === "downtown");
  // Condo, office and brick towers (2026-11-14: "diffrent designs and heights").
  const lobbies = mine.filter((p) => /^(condo|office|brick)-lobby$/.test(p.model));

  it("is a city core: sixteen towers of three designs, hundreds of buildings, on its grid", () => {
    expect(downtown.town).toBeTruthy();
    expect(downtown.town!.xs.length).toBe(10);
    expect(lobbies.length).toBe(16);
    for (const style of ["condo", "office", "brick"])
      expect(lobbies.filter((p) => p.model.startsWith(style)).length).toBeGreaterThanOrEqual(4);
    const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
      models: Record<string, { class?: string }>;
    };
    const buildings = mine.filter((p) => manifest.models[p.model]?.class === "building");
    expect(buildings.length).toBeGreaterThan(300);
    for (const p of mine)
      if (/^(condo|office|brick)-/.test(p.model))
        expect(p.y).toBeGreaterThanOrEqual(downtown.padHeight! - 0.01);
  });

  it("gives every tower an express lift, the tallest the island's highest roof", () => {
    const own = lifts(hf).filter((l) => lobbies.some((p) => Math.hypot(p.x - l.x, p.z - l.z) < 12));
    expect(own.length).toBe(16);
    for (const l of own) expect(l.stops.length).toBe(2);
    const roofs = mine.filter((p) => /-roof-[ab]$/.test(p.model));
    const skyline = island.layout.filter(
      (p) => p.poi === "skyline" && p.model.startsWith("condo-roof"),
    );
    const skyPad = meta.pois.find((p) => p.id === "skyline")!.padHeight!;
    // Over their own pads (Skyline stands 37 m higher on its hill).
    expect(Math.max(...roofs.map((p) => p.y)) - downtown.padHeight!).toBeGreaterThan(
      Math.max(...skyline.map((p) => p.y)) - skyPad,
    );
  });
});

describe("the Arena District", () => {
  const mine = island.layout.filter((p) => p.poi === "stadium");
  const arena = mine.find((p) => p.model === "arena")!;
  const count = (m: string) => mine.filter((p) => p.model === m).length;
  /** Walk `body` through model-space waypoints (the arena stands at turn 0). */
  const walk = (body: BrBody, points: Array<[number, number]>) => {
    for (const [mx, mz] of points) {
      const tx = arena.x + mx,
        tz = arena.z + mz;
      for (let tick = 0; tick < 3000 && Math.hypot(body.x - tx, body.z - tz) > 0.25; tick++)
        stepBody(
          open,
          body,
          { forward: 1, strafe: 0, yaw: Math.atan2(body.x - tx, body.z - tz) },
          34,
        );
      expect(Math.hypot(body.x - tx, body.z - tz), `stuck short of ${mx}, ${mz}`).toBeLessThan(
        0.25,
      );
    }
  };
  const start = (mx: number, mz: number, y: number): BrBody => {
    const x = arena.x + mx,
      z = arena.z + mz;
    return {
      x,
      z,
      y: open.supportAt(x, z, 0.3, arena.y + y + 0.5),
      velocityY: 0,
      grounded: true,
      crouched: false,
    };
  };

  it("stands the arena on its block: pitch, goals, escalators, furnished rooms; the station", () => {
    expect(arena).toBeTruthy();
    expect(arena.y).toBeCloseTo(stadium.padHeight!, 1);
    expect(count("pitch-lines")).toBe(1);
    expect(count("goal")).toBe(2);
    expect(count("escalator")).toBe(4);
    expect(count("locker-bank")).toBeGreaterThanOrEqual(10);
    expect(count("toilet-stall")).toBeGreaterThanOrEqual(20);
    expect(count("gym-rig")).toBeGreaterThanOrEqual(3);
    const all = (m: string) => island.layout.filter((p) => p.model === m).length;
    expect(all("rail-station")).toBe(1);
    expect(all("passenger-car")).toBe(4);
    expect(mine.filter((p) => /^(condo|office|brick)-lobby$/.test(p.model)).length).toBe(2);
  });

  it("climbs the lower bowl tier by tier from the pitch wall to the upper concourse", () => {
    const body = start(10, 42.75, 0.33);
    walk(body, [
      [10, 57.2],
      [10, 60],
    ]);
    expect(body.y - arena.y).toBeCloseTo(6.27, 1);
  });

  it("rides an escalator's steps from the ground concourse to the upper one", () => {
    // The +z side's west escalator rises toward +x from x −43 to −30 (arena-plan.json).
    const body = start(-45, 61.8, 0);
    walk(body, [
      [-29, 61.8],
      [-27, 61.8],
    ]);
    expect(body.y - arena.y).toBeCloseTo(6.27, 1);
  });

  it("climbs a corner tower from the ground to the roof catwalk and walks onto it", () => {
    const body = start(82, 62.5, 0);
    // Each storey: up flight A (u 80–82, +v), across the half landing, down flight B's line.
    const storey = (vMid: number): Array<[number, number]> => [
      [81, 63.6],
      [81, vMid + 1],
      [83.6, vMid + 1],
      [83.6, 63.6],
      [82.3, 63],
    ];
    walk(body, [...storey(67), ...storey(68.2), ...storey(66.4)]);
    expect(body.y - arena.y).toBeCloseTo(20, 1);
    // Off the deck onto the platform and the catwalk's corner, then along the long side.
    walk(body, [
      [77.5, 59],
      [77, 55.5],
      [72, 53.8],
      [40, 53.8],
    ]);
    expect(body.y - arena.y).toBeCloseTo(20, 1);
  });
});

describe("the new places", () => {
  it("keep their buildings apart (no two building footprints share their middles)", () => {
    const ids = new Set(["downtown", "stadium"]);
    const big = island.layout.filter(
      (p) =>
        ids.has(p.poi) &&
        /^(apartment|bauhaus-block|brick-shop|townhouse|strip-mall|police-station|(condo|office|brick)-lobby|condo-club|arena|rail-station|parking-deck|rural-diner)$/.test(
          p.model,
        ),
    );
    for (let i = 0; i < big.length; i++)
      for (let j = i + 1; j < big.length; j++)
        expect(
          Math.hypot(big[i]!.x - big[j]!.x, big[i]!.z - big[j]!.z),
          `${big[i]!.model} / ${big[j]!.model}`,
        ).toBeGreaterThan(3);
  });
});
