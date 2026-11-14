import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import blackwaterPlan from "@/lib/fps/br/blackwater-plan.json";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { islandWalls, prisonWallCorners } from "@/lib/fps/br/walls";
import { climbPoint, ladders, startClimb, stepLadder } from "@/lib/fps/br/ladders";
import { TICK_MS } from "@/lib/fps/simulation";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Blackwater Prison, the flagship (owner, 2026-11-14: "the prison should be enterable,
 * different floors/levels/rooms … this should be the flagship of the map"; "a nice prison
 * tower? enterable, high"). Walked with the real movement code on the island's placements:
 * over the moat's bridges into the keep's courtyard, up every stair tower to every floor and
 * the battlements, into the watchtower and up its seven floors to the cab, down the quay's
 * steps to the water; the yard level inside its wall, the mountains round it.
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
const poi = meta.pois.find((p) => p.id === "blackwater-prison")!;
const pad = poi.padHeight!;
const layout = island.layout;
const keep = layout.find((p) => p.model === "bw-keep")!;
const tower = layout.find((p) => p.model === "bw-tower")!;
const floors = blackwaterPlan.keep.floors;

/** Walks waypoints (local to `o`) from the first at height `y`; the body, or null if it stalls. */
function walk(o: { x: number; z: number }, points: Array<[number, number]>, y: number) {
  const [sx, sz] = points[0]!;
  const body: BrBody = {
    x: o.x + sx,
    z: o.z + sz,
    y: open.supportAt(o.x + sx, o.z + sz, 0.3, y + 0.5),
    velocityY: 0,
    grounded: true,
    crouched: false,
  };
  for (const [lx, lz] of points.slice(1)) {
    const x = o.x + lx,
      z = o.z + lz;
    for (let tick = 0; tick < 1500 && Math.hypot(body.x - x, body.z - z) > 0.18; tick++) {
      const before = { ...body };
      stepBody(open, body, { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x, body.z - z) }, 34);
      if (Math.hypot(body.x - before.x, body.z - before.z) < 1e-4 && tick > 30) return null;
    }
    if (Math.hypot(body.x - x, body.z - z) > 0.3) return null;
  }
  return body;
}

describe("Blackwater Prison (the flagship)", () => {
  it("stands the keep in its moat in a level yard, walled, inside a ring of mountains", () => {
    // The yard: level round the keep (the moat's water below it, the mountains above).
    for (const [dx, dz] of [
      [100, 60],
      [-200, -40],
      [60, -120],
      [-80, 120],
    ])
      expect(Math.abs(hf.heightAt(poi.x + dx!, poi.z + dz!) - pad), `${dx},${dz}`).toBeLessThan(
        0.2,
      );
    const moat = meta.waterBodies.find((w) => w.id === "blackwater-moat")!;
    expect(moat.level).toBeLessThan(pad);
    expect(hf.heightAt(keep.x, keep.z + 36)).toBeLessThan(moat.level - 2);
    // The mountains: on all but a few bearings (the gorges the roads keep, the south gate's
    // among them) the ground rises 40 m over the yard within 520 m.
    let high = 0;
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      let top = -Infinity;
      for (let r = 150; r < 520; r += 6)
        top = Math.max(top, hf.heightAt(poi.x + Math.cos(a) * r, poi.z + Math.sin(a) * r));
      if (top - pad > 40) high++;
    }
    expect(high).toBeGreaterThanOrEqual(28);
    // The wall stands on the level yard all round (never buried in a bank or over a drop).
    for (const w of islandWalls(meta)) {
      const n = Math.ceil(Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) / 4);
      for (let i = 0; i <= n; i++) {
        const x = w.a[0] + ((w.b[0] - w.a[0]) * i) / n,
          z = w.a[1] + ((w.b[1] - w.a[1]) * i) / n;
        expect(Math.abs(hf.heightAt(x, z) - pad), `wall at ${x},${z}`).toBeLessThan(0.5);
      }
    }
  });

  it("crosses both bridges into the courtyard through the gate halls", () => {
    const RO = 27.5;
    for (const s of [1, -1]) {
      const end = walk(
        keep,
        [
          [0, s * (RO + 22)],
          [0, s * (RO + 4)],
          [0, s * (RO - 6)],
          [0, s * 8],
        ],
        pad,
      );
      expect(end, `side ${s}`).not.toBeNull();
      expect(Math.abs(end!.y - pad)).toBeLessThan(0.3);
    }
  });

  it("climbs every stair tower from the courtyard to every floor and the battlements", () => {
    const HL = 27.5,
      RW = 26.1,
      BW = (2 * HL) / 9;
    for (const s of [1, -1])
      for (const bay of [0, 8]) {
        const x0 = -HL + bay * BW,
          x1 = x0 + BW;
        const dir = bay === 0 ? 1 : -1;
        const strip = dir > 0 ? x0 + 0.6 : x1 - 0.6;
        const head = dir > 0 ? x1 - 0.7 : x0 + 0.7; // the landing at the turn
        const bandA = s * (RW - 0.85),
          bandB = s * (RW - 2.55);
        const c = (x0 + x1) / 2;
        // From the courtyard through the gallery into the stair hall, to the first flight's foot.
        const route: Array<[number, number]> = [
          [c, s * 12],
          [c, s * 17.5],
          [c, s * 20.6],
          [strip, s * 20.6],
          [strip, bandA],
        ];
        for (let f = 0; f < floors.length - 1; f++)
          route.push([head, bandA], [head, bandB], [strip, bandB], [strip, bandA]);
        const end = walk(keep, route, pad);
        expect(end, `stair ${s > 0 ? "south" : "north"} ${bay}`).not.toBeNull();
        expect(end!.y - pad, `stair ${s} ${bay} reaches the roof`).toBeCloseTo(floors[4]!, 0);
      }
  });

  it("goes into the watchtower and up its seven floors to the cab", () => {
    const route: Array<[number, number]> = [
      [2.5, 8],
      [2.5, 2],
      [1.5, -3.7],
      [-1.2, -3.7],
    ];
    for (let f = 0; f < 7; f++) route.push([-3.4, -3.7], [-3.4, 1.6], [-1.2, 1.6], [-1.2, -3.7]);
    route.push([2.5, -3.7], [3, 3]);
    const end = walk(tower, route, pad);
    expect(end).not.toBeNull();
    expect(end!.y - pad).toBeCloseTo(blackwaterPlan.tower.cab.y, 0);
  });

  it("goes down the quay's steps to the water and back up", () => {
    const RQ = 43.5;
    for (const [sx, s] of [
      [1, 1],
      [-1, -1],
    ] as const) {
      const z = s * (RQ - 0.75);
      const end = walk(
        keep,
        [
          [sx * 10.6, s * (RQ + 4)],
          [sx * 10.6, s * (RQ + 0.5)],
          [sx * 10.4, z],
          [sx * 13.9, z],
          [sx * 10.4, z],
          [sx * 10.6, s * (RQ + 4)],
        ],
        pad,
      );
      expect(end, `steps ${sx},${s}`).not.toBeNull();
      expect(Math.abs(end!.y - pad)).toBeLessThan(0.3);
    }
  });

  it("walks into every guard post through its door and climbs its ladder into the cab", () => {
    const posts = layout.filter((p) => p.model === "bw-post");
    expect(posts.length).toBeGreaterThanOrEqual(10);
    const turned = (x: number, z: number, t: number): [number, number] =>
      [
        [x, z],
        [z, -x],
        [-x, -z],
        [-z, x],
      ][t & 3] as [number, number];
    for (const p of posts) {
      expect(
        island.doors.doors.some(
          (d) => d.model === "bw-post" && Math.hypot(d.x - p.x, d.z - p.z) < 4,
        ),
        `door ${p.x},${p.z}`,
      ).toBe(true);
      const l = ladders(hf).find((q) => Math.hypot(q.x - p.x, q.z - p.z) < 3)!;
      expect(l, `ladder ${p.x},${p.z}`).toBeDefined();
      // From 4 m outside the door, in to the ladder's foot.
      const foot = climbPoint(l, 0);
      const [ox, oz] = turned(0, 4.5, p.turn);
      const [dx, dz] = turned(0, 1.2, p.turn);
      const end = walk(
        { x: 0, z: 0 },
        [
          [p.x + ox, p.z + oz],
          [p.x + dx, p.z + dz],
          [foot.x, foot.z],
        ],
        p.y,
      );
      expect(end, `into post ${p.x},${p.z}`).not.toBeNull();
      const body = {
        x: foot.x,
        y: l.bottom,
        z: foot.z,
        velocityY: 0,
        vx: 0,
        vz: 0,
        grounded: true,
      };
      startClimb(body, l, "bottom");
      let done = null as string | null;
      for (let t = 0; t < 900 && !done; t++) done = stepLadder(hf, body, 1, false, TICK_MS);
      expect(done).toBe("ground");
      expect(body.y).toBeCloseTo(p.y + 6.6, 2);
      // The cab's floor holds the climber where they step off.
      expect(open.supportAt(body.x, body.z, 0.35, body.y + 0.3)).toBeCloseTo(body.y, 1);
    }
  });

  it("keeps the compound inside its wall and fills the yard", () => {
    const corners = prisonWallCorners(meta);
    const inside = (x: number, z: number) => {
      let c = false;
      for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const [xi, zi] = corners[i]!,
          [xj, zj] = corners[j]!;
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
      }
      return c;
    };
    const yard = layout.filter((p) => p.poi === "blackwater-prison");
    const outside = yard.filter((p) => !inside(p.x, p.z));
    expect(outside.map((p) => `${p.model}@${p.x},${p.z}`)).toEqual([]);
    // No dead space: every 40 m square of the yard clear of the keep holds something.
    const empty: string[] = [];
    for (let x = -240; x <= 140; x += 40)
      for (let z = -140; z <= 140; z += 40) {
        const cx = poi.x + x,
          cz = poi.z + z;
        if (!inside(cx - 20, cz - 20) || !inside(cx + 20, cz + 20)) continue;
        if (Math.hypot(cx - keep.x, (cz - keep.z) * 1.6) < 90) continue;
        if (!yard.some((p) => Math.abs(p.x - cx) < 20 && Math.abs(p.z - cz) < 20))
          empty.push(`${x},${z}`);
      }
    expect(empty).toEqual([]);
  });

  it("furnishes the keep's cells and halls and the tower's floors", () => {
    const placed = (model: string) => layout.filter((p) => p.model === model).length;
    const cells = blackwaterPlan.keep.rooms.filter((r) => r.kind === "cell").length;
    expect(cells).toBeGreaterThanOrEqual(50);
    expect(placed("bw-bunk")).toBeGreaterThanOrEqual(cells);
    expect(placed("bw-toilet")).toBeGreaterThanOrEqual(cells);
    for (const m of [
      "bw-table-round",
      "bw-pew",
      "bw-vault",
      "laundry-machine",
      "hosp-bed",
      "bw-cannon",
      "bw-searchlight",
    ])
      expect(placed(m), m).toBeGreaterThan(0);
  });
});
