import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { modelDoors, withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import hospitalPlan from "@/lib/fps/br/hospital-plan.json";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { HOSPITAL_CAMPUS } from "@/lib/fps/br/layout";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The mega hospital (owner, 2026-11-13: "re design the hospital … make each have 2-3 floors and a
 * bridge over to other buildings, so its a mega hospital"; "full interior so its fun to be in
 * this area"). Walked with the real movement code on the island's own placements: in through
 * every ground-floor door, up every stair core to every floor (and onto the roofs it reaches),
 * across every sky bridge; furnished rooms, loot on every floor, no well to fall into.
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
  island.solid,
  island.doors,
  new Uint8Array(island.doors.doors.length).fill(1),
);
const poi = meta.pois.find((p) => p.id === "central-hospital")!;
const pad = poi.padHeight!;
type Plan = {
  long: string;
  L: number;
  D: number;
  floors: number;
  corridor: number;
  aprons: number[][];
  cores: Array<{ bay: number; side: number }>;
  rooms: Array<{ floor: number; side: number; bay: number; kind: string }>;
};
const plans = hospitalPlan.blocks as unknown as Record<string, Plan>;
const STOREY = hospitalPlan.storey;

/** Block-local (u along, v across) to world x, z. */
function world(id: string, u: number, v: number): [number, number] {
  const b = plans[id]!;
  const [bx, bz] = HOSPITAL_CAMPUS.blocks[id]!;
  return b.long === "x" ? [poi.x + bx + u, poi.z + bz + v] : [poi.x + bx + v, poi.z + bz + u];
}

/** Walks world waypoints from the first at height `y`; the body, or null when it stalls. */
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

/** The two flights of a core (u at their middles), and v from the hall strip outwards. */
function coreGeometry(id: string, c: { bay: number; side: number }) {
  const b = plans[id]!;
  const n = Math.round(b.L / 7),
    bay = b.L / n;
  const b0 = -b.L / 2 + c.bay * bay;
  const a = b0 + 0.075 + 0.05 + 0.75;
  const bf = a + 0.75 + 0.2 + 0.75;
  const vIn = b.corridor + 0.15;
  const vStart = vIn + 1.2,
    vEnd = vStart + 12 * 0.28;
  return { a, bf, vIn, vStart, vEnd, s: c.side };
}

describe("Central Hospital: the mega hospital", () => {
  it("stands as four blocks round the courtyard, joined by five sky bridges", () => {
    for (const [id, [dx, dz]] of Object.entries(HOSPITAL_CAMPUS.blocks)) {
      const p = island.layout.find((q) => q.model === id);
      expect(p, id).toBeTruthy();
      expect([p!.x, p!.y, p!.z, p!.turn]).toEqual([
        +(poi.x + dx).toFixed(2),
        pad,
        +(poi.z + dz).toFixed(2),
        0,
      ]);
    }
    expect(island.layout.filter((p) => p.model.startsWith("hosp-bridge")).length).toBe(5);
    // The old industrial wings, the north block and the old single block are gone.
    for (const old of ["ind-building-10", "ind-terminal", "hospital"])
      expect(
        island.layout.some((p) => p.model === old && Math.hypot(p.x - poi.x, p.z - poi.z) < 120),
        old,
      ).toBe(false);
    // Two and three floors.
    expect(Object.values(plans).map((b) => b.floors)).toEqual([3, 3, 3, 2]);
  });

  it("fits a door to every ground-floor entrance, and every entrance leads in", () => {
    for (const [id, b] of Object.entries(plans)) {
      expect(modelDoors(collision, id).length, id).toBe(b.aprons.length);
      const [bx, bz] = HOSPITAL_CAMPUS.blocks[id]!;
      for (const [ax, az] of b.aprons) {
        // From 1.5 m outside the door to 3 m inside, straight through it.
        const ox = poi.x + bx + ax!,
          oz = poi.z + bz + az!;
        const inward =
          Math.abs(ax!) / (b.long === "x" ? b.L / 2 : b.D / 2) >
          Math.abs(az!) / (b.long === "x" ? b.D / 2 : b.L / 2)
            ? [-Math.sign(ax!), 0]
            : [0, -Math.sign(az!)];
        const body = walk(
          [
            [ox, oz],
            [ox + inward[0]! * 4.5, oz + inward[1]! * 4.5],
          ],
          pad,
        );
        expect(body, `${id} door at ${ax}, ${az}`).not.toBeNull();
        expect(Math.abs(body!.y - pad), `${id} door at ${ax}, ${az}`).toBeLessThan(0.1);
      }
    }
  });

  it("climbs every stair core to every floor (and the roof stairs onto the roof)", () => {
    for (const [id, b] of Object.entries(plans))
      b.cores.forEach((c, ci) => {
        const g = coreGeometry(id, c);
        const roof = (id === "hosp-main" || id === "hosp-er") && ci === 1;
        const top = roof ? b.floors : b.floors - 1;
        for (let f = 0; f < top; f++) {
          const pts: Array<[number, number]> = [
            world(id, g.a, 0),
            world(id, g.a, g.s * (g.vIn + 0.6)),
            world(id, g.a, g.s * (g.vEnd + 0.7)),
            world(id, g.bf, g.s * (g.vEnd + 0.7)),
            world(id, g.bf, g.s * (g.vStart - 0.5)),
          ];
          const body = walk(pts, pad + f * STOREY);
          expect(body, `${id} core ${ci} floor ${f}`).not.toBeNull();
          expect(body!.y - pad, `${id} core ${ci} floor ${f}`).toBeCloseTo((f + 1) * STOREY, 1);
        }
      });
  });

  it("crosses every sky bridge, block to block", () => {
    // [from block, u, v, to block, u, v, floor height]: just inside each end's opening.
    const crossings: Array<[string, number, number, string, number, number, number]> = [
      ["hosp-west", -33, 0, "hosp-main", -40, 10, 4],
      ["hosp-east", -33, 0, "hosp-main", 40, 10, 8],
      ["hosp-west", 33, 0, "hosp-er", -40, -9, 4],
      ["hosp-east", 33, 0, "hosp-er", 40, -8, 8],
      ["hosp-west", 3.5, 11, "hosp-east", 3.5, -11, 8],
    ];
    for (const [a, ua, va, bId, ub, vb, h] of crossings) {
      const from = world(a, ua, va),
        to = world(bId, ub, vb);
      const body = walk([from, to], pad + h);
      expect(body, `${a} → ${bId}`).not.toBeNull();
      expect(body!.y - pad, `${a} → ${bId}`).toBeCloseTo(h, 1);
      const back = walk([to, from], pad + h);
      expect(back, `${bId} → ${a}`).not.toBeNull();
    }
  });

  it("holds a player at every stair well's edge (no fall from an upper floor)", () => {
    for (const [id, b] of Object.entries(plans))
      b.cores.forEach((c, ci) => {
        const g = coreGeometry(id, c);
        for (let f = 1; f < b.floors; f++) {
          // From the core's free half, push into the well across B's outer edge.
          const [sx, sz] = world(id, g.bf + 1.6, g.s * (g.vStart + 1.5));
          const [tx, tz] = world(id, g.bf - 3, g.s * (g.vStart + 1.5));
          const y = open.supportAt(sx, sz, 0.3, pad + f * STOREY + 0.5);
          const body: BrBody = { x: sx, y, z: sz, velocityY: 0, grounded: true, crouched: false };
          for (let t = 0; t < 90; t++)
            stepBody(
              open,
              body,
              { forward: 1, strafe: 0, yaw: Math.atan2(body.x - tx, body.z - tz) },
              34,
            );
          expect(body.y - pad, `${id} core ${ci} floor ${f}`).toBeGreaterThan(f * STOREY - 0.2);
        }
      });
  });

  it("furnishes every room and has loot spots on every floor", () => {
    const furniture = island.layout.filter(
      (p) =>
        p.poi === poi.id &&
        /^(hosp-bed|hosp-stretcher|or-table|morgue-fridge|reception-desk|lab-cabinet|med-cabinet|bed-curtain)/.test(
          p.model,
        ),
    );
    expect(furniture.length).toBeGreaterThan(250);
    for (const kind of ["ward", "icu", "surgery", "morgue", "lab", "trauma", "lobby", "waiting"])
      expect(
        Object.values(plans).some((b) => b.rooms.some((r) => r.kind === kind)),
        kind,
      ).toBe(true);
    for (const [id, b] of Object.entries(plans)) {
      const spots = modelSpots(collision, id, "indoor", 2.5, 2000);
      for (let f = 0; f < b.floors; f++)
        expect(
          spots.filter((s) => s.y > f * STOREY - 0.5 && s.y < f * STOREY + 1).length,
          `${id} floor ${f}`,
        ).toBeGreaterThan(10);
    }
  });
});
