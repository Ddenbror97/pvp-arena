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
 * Downtown and the Stadium (owner, 2026-11-13: the map audit's two biggest empty spots, "more
 * buildings, sky skrapers"; "ensure buildings can be entered, doors, stairs"). On the island's own
 * placements: Downtown's six towers stand on its pad with an express lift each and are the
 * island's tallest; nothing overlaps; the Stadium's terraces are climbed tier by tier with the
 * real movement code, from the pitch to the top row.
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
/** A model-space point turned like the placement (layout.ts turnXZ). */
const turnXZ = (x: number, z: number, turn: number): [number, number] =>
  [
    [x, z],
    [z, -x],
    [-x, -z],
    [-z, x],
  ][turn & 3] as [number, number];
const downtown = meta.pois.find((p) => p.id === "downtown")!;
const stadium = meta.pois.find((p) => p.id === "stadium")!;

describe("Downtown", () => {
  const mine = island.layout.filter((p) => p.poi === "downtown");
  const lobbies = mine.filter((p) => p.model === "condo-lobby");

  it("is a city core: six towers, dozens of buildings, on its paved grid", () => {
    expect(downtown.town).toBeTruthy();
    expect(lobbies.length).toBe(6);
    const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
      models: Record<string, { class?: string }>;
    };
    const buildings = mine.filter((p) => manifest.models[p.model]?.class === "building");
    expect(buildings.length).toBeGreaterThan(100);
    for (const p of mine)
      if (p.model.startsWith("condo-"))
        expect(p.y).toBeGreaterThanOrEqual(downtown.padHeight! - 0.01);
  });

  it("gives every tower an express lift, the tallest the island's highest roof", () => {
    const own = lifts(hf).filter((l) => lobbies.some((p) => Math.hypot(p.x - l.x, p.z - l.z) < 12));
    expect(own.length).toBe(6);
    for (const l of own) expect(l.stops.length).toBe(2);
    const roofs = mine.filter((p) => p.model.startsWith("condo-roof"));
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

describe("Stadium", () => {
  const mine = island.layout.filter((p) => p.poi === "stadium");

  it("stands its pitch, six terraces, masts, goals and gates on its pad", () => {
    const count = (m: string) => mine.filter((p) => p.model === m).length;
    expect(count("stadium-stand")).toBe(6);
    expect(count("stadium-mast")).toBe(4);
    expect(count("goal")).toBe(2);
    expect(count("pitch-lines")).toBe(1);
    expect(count("condo-club")).toBe(1);
    expect(count("turnstile")).toBe(8);
  });

  it("climbs a terrace tier by tier from the pitch to the top row", () => {
    const stand = mine.find((p) => p.model === "stadium-stand" && p.turn === 0)!;
    // In the model: the front wall at z 6.2..6.5 (1.15 m), the tiers behind it; walk from the
    // first tier (z 5.8) back to the top one (z -4.9), along x 3 m off the middle.
    const at = (lx: number, lz: number) => {
      const [dx, dz] = turnXZ(lx, lz, stand.turn);
      return [stand.x + dx, stand.z + dz] as [number, number];
    };
    const [sx, sz] = at(3, 5.8);
    const body: BrBody = {
      x: sx,
      z: sz,
      y: open.supportAt(sx, sz, 0.3, stand.y + 1),
      velocityY: 0,
      grounded: true,
      crouched: false,
    };
    const [tx, tz] = at(3, -4.9);
    for (let tick = 0; tick < 2000 && Math.hypot(body.x - tx, body.z - tz) > 0.2; tick++)
      stepBody(
        open,
        body,
        { forward: 1, strafe: 0, yaw: Math.atan2(body.x - tx, body.z - tz) },
        34,
      );
    expect(Math.hypot(body.x - tx, body.z - tz)).toBeLessThan(0.2);
    // The top tier is 14 × 0.33 m over the pad.
    expect(body.y - stadium.padHeight!).toBeGreaterThan(4.4);
  });
});

describe("the new places", () => {
  it("keep their buildings apart (no two building footprints share their middles)", () => {
    const ids = new Set(["downtown", "stadium"]);
    const big = island.layout.filter(
      (p) =>
        ids.has(p.poi) &&
        /^(apartment|bauhaus-block|brick-shop|townhouse|strip-mall|police-station|condo-lobby|condo-club|stadium-stand|rural-diner)$/.test(
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
