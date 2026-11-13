import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { modelDoors, withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import hospitalPlan from "@/lib/fps/br/hospital-plan.json";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { HOSPITAL_CAMPUS, HOSPITAL_RING } from "@/lib/fps/br/layout";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import { panesOnRay, shatterAlong, withPanes } from "@/lib/fps/br/panes";
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
      ["hosp-west", -33, 0, "hosp-main", -40, 8, 4],
      ["hosp-east", -33, 0, "hosp-main", 40, 8, 8],
      ["hosp-west", 33, 0, "hosp-er", -40, -8, 4],
      ["hosp-east", 33, 0, "hosp-er", 40, -7, 8],
      ["hosp-west", 3.5, 8, "hosp-east", 3.5, -8, 8],
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
  it("fits out the outer ring, every way in kept clear", () => {
    // Building-frame (x, z) at the building's turn to world (turnBox's quarter turns).
    const toWorld = ([bx, bz, bt]: [number, number, number], x: number, z: number) => {
      const [wx, wz] = [
        [x, z],
        [z, -x],
        [-x, -z],
        [-z, x],
      ][bt]!;
      return [poi.x + bx + wx!, poi.z + bz + wz!] as [number, number];
    };
    const shells: Record<string, [string, number]> = {
      depot: ["ind-building-1", 40],
      energy: ["ind-building-1", 30],
      laundry: ["ind-building-1", 45],
      pharmacy: ["warehouse", 40],
      fireStation: ["fire-station", 6],
      canteen: ["brick-shop", 5],
    };
    for (const [name, [model, least]] of Object.entries(shells)) {
      const at = (HOSPITAL_RING as Record<string, [number, number, number]>)[name]!;
      const [cx, cz] = toWorld(at, 0, 0);
      const shell = island.layout.find(
        (p) => p.model === model && Math.hypot(p.x - cx, p.z - cz) < 0.5,
      );
      expect(shell, name).toBeTruthy();
      // Its fit-out: the props standing inside its walls.
      const boxes = collision.models[model]!;
      const half = [0, 2].map((i) =>
        Math.max(...boxes.flatMap((b) => [Math.abs(b[i]!), Math.abs(b[i + 3]!)])),
      );
      const inside = island.layout.filter((p) => {
        if (p === shell || p.poi !== poi.id) return false;
        const dx = p.x - cx,
          dz = p.z - cz;
        const [lx, lz] = [
          [dx, dz],
          [-dz, dx],
          [-dx, -dz],
          [dz, -dx],
        ][at[2]]!;
        return Math.abs(lx!) < half[0]! - 0.5 && Math.abs(lz!) < half[1]! - 0.5;
      });
      expect(inside.length, name).toBeGreaterThanOrEqual(least);
      // From 1.5 m outside each ground-floor door to 5 m inside it.
      for (const d of modelDoors(collision, model).filter((d) => d.y0 < 1)) {
        const n = d.along === "z" ? [-Math.sign(d.x), 0] : [0, -Math.sign(d.z)];
        const from = toWorld(at, d.x - n[0]! * 1.5, d.z - n[1]! * 1.5);
        const to = toWorld(at, d.x + n[0]! * 5, d.z + n[1]! * 5);
        const body = walk([from, to], pad);
        expect(body, `${name} door at ${d.x}, ${d.z}`).not.toBeNull();
      }
    }
    // The helicopters on the pads' decks.
    for (const m of ["heli-ambulance", "uh1-medevac"])
      expect(island.layout.find((p) => p.model === m && p.poi === poi.id)?.y, m).toBeCloseTo(
        pad + 2.7,
        1,
      );
  });
  it("climbs each helideck's stairs onto the deck the helicopters stand on", () => {
    // (Owner, 2026-11-13: "the helicopter platforms flicker": the download is replaced by
    // build_helideck.mjs's deck, 2.7 m up, with a stair on its south and north edges.)
    const decks = island.layout.filter((p) => p.model === "helideck" && p.poi === poi.id);
    expect(decks.length).toBe(2);
    for (const d of decks) {
      // South stair: up along +x beside the deck's south edge to the landing at x −4.4.
      const up = walk(
        [
          [d.x - 10.4, d.z + 10.7],
          [d.x - 4.4, d.z + 10.7],
          [d.x - 4.4, d.z + 7],
        ],
        pad,
      );
      expect(up, `${d.x}, ${d.z} south`).not.toBeNull();
      expect(up!.y).toBeCloseTo(pad + 2.7, 1);
      // North stair: down along +x from its landing at x 4.4.
      const down = walk(
        [
          [d.x + 4.4, d.z - 7],
          [d.x + 4.4, d.z - 10.7],
          [d.x + 10.4, d.z - 10.7],
        ],
        pad + 2.7,
      );
      expect(down, `${d.x}, ${d.z} north`).not.toBeNull();
      expect(down!.y).toBeCloseTo(pad, 1);
    }
  });
  it("glazes the sky bridges with panes a shot breaks, one bay at a time", () => {
    // (Owner, 2026-11-13: "the hospital bridge windows should also be breakble by shooting it".)
    const near = island.panes.panes.filter(
      (p) => Math.hypot((p.box[0] + p.box[3]) / 2 - poi.x, (p.box[2] + p.box[5]) / 2 - poi.z) < 120,
    );
    // The bridges' bays, and (2026-11-13: "the windows on the bridge can be broken with weapons
    // but not the rest of the windows on the hospital") every window of the four blocks.
    const blocks = hospitalPlan.panes as Record<string, number[][]>;
    const windows = ["hosp-main", "hosp-west", "hosp-east", "hosp-er"].reduce(
      (n, id) => n + blocks[id]!.length,
      0,
    );
    expect(windows).toBeGreaterThan(250);
    expect(near.length).toBe(4 * 2 * 6 + 2 * 24 + windows);
    const broken = new Uint8Array(island.panes.panes.length);
    const glazed = withPanes(island.solid, island.panes, broken);
    // The courtyard bridge (along x, its walkway 8 m up at z −11.5): a shot from beside its
    // middle post out through the south side.
    const [bx, bz] = [poi.x, poi.z - 11.5];
    const y = pad + 8 + 1.6;
    expect(panesOnRay(island.panes, broken, bx + 1.2, y, bz, 0, 0, 1, 5).length).toBe(1);
    shatterAlong(glazed, bx + 1.2, y, bz, 0, 0, 1, 5);
    expect(broken.reduce((n, v) => n + v, 0)).toBe(1);
    // Whole glass holds a body; the broken bay does not.
    expect(glazed.blocked(bx + 3.7, pad + 8 + 1.0, bz + 1.6, 1.4, 0.3)).toBe(true);
    expect(glazed.blocked(bx + 1.2, pad + 8 + 1.0, bz + 1.6, 1.4, 0.3)).toBe(false);
  });
  it("glazes every block's windows with panes a shot breaks", () => {
    // The west wing's first-floor windows on its courtyard (+x) side: a shot out of a room.
    const broken = new Uint8Array(island.panes.panes.length);
    const glazed = withPanes(island.solid, island.panes, broken);
    const wing = island.layout.find((p) => p.model === "hosp-west" && p.poi === poi.id)!;
    const ids = island.panes.panes.filter(
      (p) =>
        p.box[0] > wing.x + 9 &&
        p.box[3] < wing.x + 10.5 &&
        p.box[1] > wing.y + 4 &&
        p.box[4] < wing.y + 8,
    );
    expect(ids.length).toBeGreaterThan(5);
    const pane = ids[0]!;
    const [cx, cy, cz] = [
      (pane.box[0] + pane.box[3]) / 2,
      (pane.box[1] + pane.box[4]) / 2,
      (pane.box[2] + pane.box[5]) / 2,
    ];
    expect(panesOnRay(island.panes, broken, cx - 3, cy, cz, 1, 0, 0, 6).length).toBe(1);
    shatterAlong(glazed, cx - 3, cy, cz, 1, 0, 0, 6);
    expect(broken[pane.id]).toBe(1);
  });
});
