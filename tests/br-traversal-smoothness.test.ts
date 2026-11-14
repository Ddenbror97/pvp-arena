import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { islandDoors, modelDoors, withDoors } from "@/lib/fps/br/doors";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import type { Placement } from "@/lib/fps/br/layout";
import { turnPoint } from "@/lib/fps/br/loot-spots";
import { BrSeatSync, brViewFor, createBrMatch, type BrSight } from "@/lib/fps/br/match";
import { stepBody, type BrBody, type BrMoveInput } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Walking through doorways and up and down stairs is smooth (owner, 2026-11-12: "stairs in a
 * tight space make it laggy to walk, a building with a staircase or a tower; small houses with a
 * tight entrance are laggy to enter ... case closed"). Three causes were found and fixed
 : the client replayed its inputs from its own position rounded to millimetres, which drifted
 * from the room's on every stair tread and against every wall (the rounded hull half a
 * millimetre inside, "unstuck" 25 cm sideways, corrected back each snapshot: match.ts now sends
 * your own body exactly); a blocked move was dropped whole (movement.ts), leaving the body short
 * of the doorway and stalling at every jamb and newel post; and the guard tower's deck edge
 * carried a player down its flight's line off the deck's end (access-v20; rails on every raised tower edge in access-v21). Every route and doorway below is walked
 * with the real movement code at all four turns, walking and sprinting.
 */
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const routes: Array<[string, number[][]]> = [
  ...(JSON.parse(readFileSync("art/br/building-access-routes.json", "utf8")) as Array<
    [string, number[][]]
  >),
  ...(
    JSON.parse(readFileSync("art/br/tower-routes.json", "utf8")) as Array<{
      model: string;
      route: number[][];
    }>
  ).map((t) => [t.model, t.route] as [string, number[][]]),
];
const hf = { heightAt: () => 0 } as unknown as Heightfield;
/** What reaches the client: the snapshot's JSON (its own body is sent exactly). */
const wire = (v: number) => JSON.parse(JSON.stringify(v)) as number;

function placed(model: string, turn: 0 | 1 | 2 | 3) {
  const placement: Placement = { model, turn, x: 0.123, y: 0, z: -0.456, poi: "test" };
  const solid = new StaticWorld(hf, [placement], collision, null);
  const set = islandDoors([placement], collision);
  return { placement, set, world: withDoors(solid, set, new Uint8Array(set.doors.length).fill(1)) };
}

type Walk = { stalls: number; ticks: number; longest: number; fall: number; drift: number };
/** Steer at each point in turn (as a player does), measuring stalls, falls and replay drift. */
function walk(world: StaticWorld, body: BrBody, points: number[][], sprint: boolean): Walk {
  const nominal = 5 * (sprint ? 1.5 : 1) * (1 / 30);
  const w: Walk = { stalls: 0, ticks: 0, longest: 0, fall: 0, drift: 0 };
  let run = 0,
    airTop = -Infinity;
  for (const [x, z] of points) {
    for (
      let t = 0;
      t < 240 && Math.hypot(body.x - x!, body.z - z!) > Math.max(0.2, nominal * 0.75);
      t++
    ) {
      const input: BrMoveInput = {
        forward: 1,
        strafe: 0,
        yaw: Math.atan2(body.x - x!, body.z - z!),
        sprint,
      };
      // The client's copy, rebuilt from what the wire carries, must step to the same place.
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
      w.drift = Math.max(
        w.drift,
        Math.hypot(client.x - body.x, client.y - body.y, client.z - body.z),
      );
      w.ticks++;
      const left = Math.hypot(before.x - x!, before.z - z!);
      if (Math.hypot(body.x - before.x, body.z - before.z) < Math.min(nominal, left) * 0.5) {
        w.stalls++;
        w.longest = Math.max(w.longest, ++run);
      } else run = 0;
      if (!body.grounded) airTop = Math.max(airTop, before.y);
      else if (airTop > -Infinity) {
        w.fall = Math.max(w.fall, airTop - body.y);
        airTop = -Infinity;
      }
    }
    expect(Math.hypot(body.x - x!, body.z - z!), `reached ${x},${z}`).toBeLessThan(0.3);
  }
  return w;
}

describe("BR traversal smoothness", () => {
  it("sends your own body exactly, so the client replays from the room's own state", () => {
    const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
    const state = createBrMatch(meta, 7, () => 0);
    Object.assign(state.seats[0]!.body, {
      phase: "ground",
      x: 12.3456789,
      y: 4.0623456,
      z: -7.6543219,
      velocityY: -1.2345678,
    });
    const sight = { visible: () => true, smoke: () => {} } as unknown as BrSight;
    const view = JSON.parse(
      JSON.stringify(brViewFor(state, {} as StaticWorld, sight, 0, 1000, new BrSeatSync())),
    ) as { you: { x: number; y: number; z: number; vy: number } };
    expect([view.you.x, view.you.y, view.you.z, view.you.vy]).toEqual([
      12.3456789, 4.0623456, -7.6543219, -1.2345678,
    ]);
  });

  for (const [model, local] of routes)
    it(`${model}: in and back out at every turn, walking and sprinting, without stalls, falls or replay drift`, () => {
      for (const turn of [0, 1, 2, 3] as const) {
        const { placement, world } = placed(model, turn);
        const pts = local.map(([x, z]) => {
          const q = turnPoint(x!, z!, turn);
          return [q[0] + placement.x, q[1] + placement.z];
        });
        for (const sprint of [false, true]) {
          const body: BrBody = {
            x: pts[0]![0]!,
            y: 0,
            z: pts[0]![1]!,
            grounded: true,
            crouched: false,
            velocityY: 0,
          };
          for (const leg of [pts.slice(1), [...pts].reverse().slice(1)]) {
            const w = walk(world, body, leg, sprint);
            const where = `${model} turn ${turn}${sprint ? " sprinting" : ""}`;
            expect(w.drift, `${where}: replay drift`).toBe(0);
            expect(w.fall, `${where}: fell`).toBeLessThan(1);
            expect(w.longest, `${where}: longest stall`).toBeLessThanOrEqual(4);
            expect(w.stalls / w.ticks, `${where}: stalled ticks`).toBeLessThan(0.12);
          }
        }
      }
    });

  // A sideways step off a tower's flight, landing or deck no longer drops you to the ground (owner,
  // 2026-11-12): every raised edge the climb reaches has a collision rail (access-v21). What is left
  // is the stair opening, where you drop onto the flight below, as the climb itself goes.
  for (const t of JSON.parse(readFileSync("art/br/tower-routes.json", "utf8")) as Array<{
    model: string;
    route: number[][];
  }>)
    it(`${t.model}: strafing off the climb at any height never lands on the ground`, () => {
      for (const turn of [0, 1] as const) {
        const { placement, world } = placed(t.model, turn);
        const pts = t.route.map(([x, z]) => {
          const q = turnPoint(x!, z!, turn);
          return [q[0] + placement.x, q[1] + placement.z];
        });
        const body: BrBody = {
          x: pts[0]![0]!,
          y: 0,
          z: pts[0]![1]!,
          grounded: true,
          crouched: false,
          velocityY: 0,
        };
        let probes = 0,
          n = 0;
        for (const [x, z] of [...pts.slice(1), ...[...pts].reverse().slice(1)])
          for (let k = 0; k < 240 && Math.hypot(body.x - x!, body.z - z!) > 0.2; k++) {
            const yaw = Math.atan2(body.x - x!, body.z - z!);
            stepBody(world, body, { forward: 1, strafe: 0, yaw }, 34);
            if (++n % 4 || !body.grounded || body.y < 1.2) continue;
            for (const strafe of [1, -1]) {
              const p: BrBody = { ...body };
              for (let s = 0; s < 20; s++) stepBody(world, p, { forward: 0, strafe, yaw }, 34);
              for (let s = 0; s < 40 && !p.grounded; s++)
                stepBody(world, p, { forward: 0, strafe: 0, yaw }, 34);
              expect(
                p.y,
                `${t.model} turn ${turn}: from ${body.x.toFixed(2)},${body.y.toFixed(2)},${body.z.toFixed(2)} strafing ${strafe}`,
              ).toBeGreaterThan(0.05);
              probes++;
            }
          }
        expect(probes).toBeGreaterThan(4);
      }
    });

  it("every doorway is walked through, straight and off-centre, without catching on its frame", () => {
    let checked = 0;
    const models = Object.keys(collision.models).filter((m) => modelDoors(collision, m).length);
    expect(models.length).toBeGreaterThan(40);
    for (const model of models) {
      const { set, world } = placed(model, 0);
      for (const d of set.doors) {
        const nx = d.along === "x" ? 0 : 1,
          nz = d.along === "x" ? 1 : 0;
        // Off-centre by up to a third of the slack between the hull and the frame.
        const slack = Math.max(0, (d.width - 0.7) / 2);
        for (const side of [1, -1])
          for (const off of [-slack / 3, 0, slack / 3]) {
            const sx = d.x + nx * 1.4 * side + nz * off,
              sz = d.z + nz * 1.4 * side + nx * off;
            const y = world.supportAt(sx, sz, 0.35, d.y0 + 0.36);
            // Only from a side a player stands on (not inside a wall, not off a porch's edge).
            if (Math.abs(y - d.y0) > 0.36 || world.blocked(sx, y + 0.002, sz, 1.8, 0.35)) continue;
            const body: BrBody = {
              x: sx,
              y,
              z: sz,
              grounded: true,
              crouched: false,
              velocityY: 0,
            };
            const w = walk(world, body, [[d.x - nx * 0.5 * side, d.z - nz * 0.5 * side]], false);
            expect(
              w.longest,
              `${model} door at ${d.x.toFixed(2)},${d.z.toFixed(2)}`,
            ).toBeLessThanOrEqual(2);
            expect(w.drift).toBe(0);
            checked++;
          }
      }
    }
    expect(checked).toBeGreaterThan(150);
  });
});
