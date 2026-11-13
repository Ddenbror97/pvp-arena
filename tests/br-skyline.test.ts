import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { modelDoors, withDoors } from "@/lib/fps/br/doors";
import { planeRoute, stepDrop, type DropBody } from "@/lib/fps/br/drop";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { buttonAt, liftAt, lifts, PANEL, startRide } from "@/lib/fps/br/lifts";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { shatterAlong, withPanes } from "@/lib/fps/br/panes";
import skylinePlan from "@/lib/fps/br/skyline-plan.json";
import { SKYLINE } from "@/lib/fps/br/skyline";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Skyline Residences (owner, 2026-11-13: "high sky skrepers … should be highest building in the
 * map so far. enterble, floors,rooms,elevator working"; "panorama glas windows that can be
 * break from bullets"). Walked with the real movement code on the island's own placements: in
 * at the lobby doors, up every storey's stair, the lifts from the lobby to the roof and back,
 * the glass whole (solid) and broken (open) by a shot.
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
const broken = new Uint8Array(island.panes.panes.length);
const glazed = withPanes(island.solid, island.panes, broken);
const open = withDoors(glazed, island.doors, new Uint8Array(island.doors.doors.length).fill(1));
const poi = meta.pois.find((p) => p.id === "skyline")!;
const pad = poi.padHeight!;
const plan = skylinePlan as unknown as {
  storey: number;
  floor: number;
  stair: { A: number[]; B: number[]; zStart: number; zEnd: number; zLand: number };
};
const FL = plan.floor;
const route = planeRoute(1);

/** Walks world waypoints from the first (feet near `y`); the body, or null when it stalls. */
function walk(points: Array<[number, number]>, y: number) {
  const [sx, sz] = points[0]!;
  const body: BrBody = {
    x: sx,
    z: sz,
    y: open.supportAt(sx, sz, 0.3, y + 0.5),
    velocityY: 0,
    grounded: true,
    crouched: false,
  };
  for (const [x, z] of points.slice(1)) {
    for (let tick = 0; tick < 1500 && Math.hypot(body.x - x, body.z - z) > 0.18; tick++) {
      const before = { ...body };
      stepBody(open, body, { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x, body.z - z) }, 34);
      if (Math.hypot(body.x - before.x, body.z - before.z) >= 0.18) return null;
    }
    if (Math.hypot(body.x - x, body.z - z) > 0.19) return null;
  }
  return body;
}

describe("Skyline Residences", () => {
  const towers = SKYLINE.towers.map((t) => ({ ...t, x: poi.x + t.dx, z: poi.z + t.dz }));

  it("stands on its own pad as the island's tallest buildings", () => {
    for (const t of towers) {
      const storeys = island.layout
        .filter((p) => Math.abs(p.x - t.x) < 0.01 && Math.abs(p.z - t.z) < 0.01)
        .filter((p) => p.model.startsWith("condo-"));
      expect(storeys.length, t.id).toBe(t.floors + 2);
      expect(Math.min(...storeys.map((p) => p.y)), t.id).toBeCloseTo(pad, 2);
    }
    // The tall tower's roof, against every other building on the island (the airfield's 32 m
    // control tower was the tallest anyone could enter; the strait bridges' pylons and the
    // masts are not buildings).
    const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
      models: Record<string, { class?: string; size: number[] }>;
    };
    const tallA = (towers[0]!.floors + 1) * plan.storey + FL + 5.5;
    expect(tallA).toBeGreaterThan(50);
    for (const p of island.layout) {
      const m = manifest.models[p.model];
      if (!m || m.class !== "building" || p.model.startsWith("condo-")) continue;
      if (p.model.startsWith("strait-pylon")) continue;
      expect(m.size[1]!, p.model).toBeLessThan(tallA - 10);
    }
  });

  it("fits doors where the plan says, and the lobby doors lead in", () => {
    for (const m of ["condo-lobby", "condo-floor", "condo-club", "condo-roof-a", "condo-roof-b"])
      expect(modelDoors(collision, m).length, m).toBeGreaterThan(0);
    for (const t of towers) {
      // From 2 m out of the front door (on the entrance steps) to 4 m inside the hall.
      const body = walk(
        [
          [t.x, t.z + 11 + 4.6],
          [t.x, t.z + 11 - 4],
        ],
        pad + 0.3,
      );
      expect(body, t.id).not.toBeNull();
      expect(body!.y - pad, t.id).toBeCloseTo(FL, 1);
    }
  });

  it("climbs the stair from the lobby to the roof, storey by storey", () => {
    const S = plan.stair;
    const a = (S.A[0]! + S.A[1]!) / 2,
      b = (S.B[0]! + S.B[1]!) / 2;
    for (const t of towers)
      for (let k = 0; k <= t.floors; k++) {
        const y = pad + k * plan.storey + FL;
        const body = walk(
          [
            [t.x + a, t.z + S.zStart + 0.6],
            [t.x + a, t.z + S.zEnd - 0.7],
            [t.x + b, t.z + S.zEnd - 0.7],
            [t.x + b, t.z + S.zStart + 0.6],
          ],
          y,
        );
        expect(body, `${t.id} storey ${k}`).not.toBeNull();
        expect(body!.y - y, `${t.id} storey ${k}`).toBeCloseTo(plan.storey, 1);
      }
  });

  it("rides each lift from the lobby to the roof and back down", () => {
    const all = lifts(hf);
    expect(all.length).toBe(2);
    for (const l of all) {
      const tower = towers.find((t) => Math.hypot(t.x - l.x, t.z - l.z) < 12)!;
      // The express: the lobby and the roof (owner: "should go up to the top floor, not stop at
      // all floors").
      expect(l.stops.length, tower.id).toBe(2);
      expect(l.stops[1]! - l.stops[0]!, tower.id).toBeCloseTo((tower.floors + 1) * plan.storey, 2);
      // Walk into the cab from the lobby hall, then press the roof's button.
      const inCab = walk(
        [
          [l.x, l.z + 4],
          [l.x, l.z],
        ],
        l.stops[0]!,
      );
      expect(inCab, tower.id).not.toBeNull();
      const at = liftAt(all, inCab!.x, inCab!.y, inCab!.z);
      expect(at?.stop).toBe(0);
      // The roof's button on the panel, looked at from the cab's middle.
      const p = l.panel,
        eye = { x: l.x, y: l.stops[0]! + 1.6, z: l.z };
      const top = l.stops.length - 1;
      const cols = PANEL.cols,
        rows = Math.ceil(l.stops.length / cols);
      const u = -PANEL.w / 2 + ((top % cols) + 0.5) * (PANEL.w / cols),
        v = -PANEL.h / 2 + (Math.floor(top / cols) + 0.5) * (PANEL.h / rows);
      const tx = p.x + p.rx * u,
        ty = l.stops[0]! + PANEL.y + v,
        tz = p.z + p.rz * u;
      const d = Math.hypot(tx - eye.x, ty - eye.y, tz - eye.z);
      expect(
        buttonAt(l, 0, eye.x, eye.y, eye.z, (tx - eye.x) / d, (ty - eye.y) / d, (tz - eye.z) / d),
      ).toBe(top);
      const body: DropBody = {
        ...inCab!,
        phase: "lift",
        vx: 0,
        vz: 0,
      };
      startRide(body, l, 0, top);
      let ms = 0;
      while (body.phase === "lift" && ms < 60_000) {
        stepDrop(open, meta, route, body, null, 0, 34);
        ms += 34;
      }
      expect(body.phase, tower.id).toBe("ground");
      expect(body.y, tower.id).toBeCloseTo(l.stops[top]!, 2);
      // Out of the cab onto the roof house's floor, and the walk to the roof.
      const out = walk(
        [
          [body.x, body.z],
          [l.x, l.z + 3.5],
        ],
        body.y,
      );
      expect(out, tower.id).not.toBeNull();
      expect(out!.y, tower.id).toBeCloseTo(l.stops[top]!, 1);
      // And back down.
      const down: DropBody = { ...body, phase: "lift" };
      startRide(down, l, top, 0);
      for (let t = 0; t < 2000 && down.phase === "lift"; t++)
        stepDrop(open, meta, route, down, null, 0, 34);
      expect(down.y).toBeCloseTo(l.stops[0]!, 2);
    }
  });

  it("keeps you in behind whole glass; a shot breaks the pane and opens it", () => {
    const t = towers[0]!;
    // A west window of the fifth floor: walk at it from inside.
    const y = pad + 5 * plan.storey + FL;
    const from: [number, number] = [t.x - 9, t.z + 6];
    const to: [number, number] = [t.x - 14.5, t.z + 6];
    const stopped = walk([from, to], y);
    expect(stopped).toBeNull();
    // Shoot it out (the ray from inside across the pane).
    const before = broken.reduce((n, v) => n + v, 0);
    shatterAlong(glazed, t.x - 9, y + 1.5, t.z + 6, -1, 0, 0, 10);
    expect(broken.reduce((n, v) => n + v, 0)).toBe(before + 1);
    // Now the window is an opening: the body walks out of it (and falls).
    const body: BrBody = {
      x: from[0],
      z: from[1],
      y,
      velocityY: 0,
      grounded: true,
      crouched: false,
    };
    for (let tick = 0; tick < 200; tick++)
      stepBody(
        open,
        body,
        { forward: 1, strafe: 0, yaw: Math.atan2(body.x - to[0], 0), jump: tick % 20 === 0 },
        34,
      );
    expect(body.x).toBeLessThan(t.x - 13.2);
  });

  it("furnishes the storeys and has loot spots on every one", () => {
    const furniture = island.layout.filter(
      (p) => p.poi === "skyline" && /^(bed-set|sofa|kitchen-run|dining-set|bath-set)/.test(p.model),
    );
    expect(furniture.length).toBeGreaterThan(5 * (13 + 10));
    for (const m of ["condo-floor", "condo-lobby", "condo-club"])
      expect(modelSpots(collision, m, "indoor", 2.5, 2000).length, m).toBeGreaterThan(10);
  });
});
