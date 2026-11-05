import { describe, expect, it } from "vitest";
import { BrInputQueue } from "../workers/fps/br-input";
import { newDropBody, planeRoute, stepDrop } from "@/lib/fps/br/drop";
import { Heightfield } from "@/lib/fps/br/heightfield";
import { StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { MOVE_SPEED, TICK_MS } from "@/lib/fps/simulation";
import type { BrInput } from "@/lib/fps/br/match";

const move = (seq: number): BrInput => ({ seq, forward: 1, strafe: 0, yaw: 0 });
const world = new StaticWorld(
  new Heightfield(2, 2, 10000, new Float32Array(4)),
  [],
  { models: {} },
  null,
);
const meta = { waterBodies: [] } as unknown as WorldMeta;

describe("BR movement continuity after landing", () => {
  it("immediately walks at normal speed after landing despite alternate missing input ticks", () => {
    const queue = new BrInputQueue();
    const route = planeRoute(7);
    const body = {
      ...newDropBody(),
      phase: "parachute" as const,
      x: 0,
      z: 0,
      y: 0.01,
      velocityY: -5,
    };
    expect(stepDrop(world, meta, route, body, move(0), 10_000, TICK_MS)).toBe("ground");
    const z = body.z;
    const withoutContinuity = { ...body };
    for (let tick = 0; tick < 60; tick++) {
      const now = tick * TICK_MS;
      if (tick % 2 === 0) queue.push(move(tick), now);
      stepDrop(
        world,
        meta,
        route,
        withoutContinuity,
        tick % 2 === 0 ? move(tick) : null,
        10_000 + now,
        TICK_MS,
      );
      stepDrop(world, meta, route, body, queue.take(now, now) ?? null, 10_000 + now, TICK_MS);
    }
    expect(z - body.z).toBeCloseTo((MOVE_SPEED * 60 * TICK_MS) / 1000, 5);
    expect(z - withoutContinuity.z).toBeCloseTo((z - body.z) / 2, 5);
    expect(body.crouched).toBe(false);
    expect(body.grounded).toBe(true);
    expect(body.vx).toBe(0);
    expect(body.vz).toBe(0);
    // A deliberate stop replaces the held movement on its very next tick.
    queue.push({ ...move(61), forward: 0 }, 2_000);
    const stopped = body.z;
    stepDrop(world, meta, route, body, queue.take(2_000, 2_000)!, 12_000, TICK_MS);
    expect(body.z).toBe(stopped);
  });

  it("never repeats discrete combat or insertion actions during a packet gap", () => {
    const queue = new BrInputQueue();
    queue.push(
      {
        ...move(1),
        fire: true,
        jump: true,
        jumpOut: true,
        deploy: true,
        reload: true,
        slot: 1,
        sprint: true,
      },
      0,
    );
    expect(queue.take(0, 0)?.fire).toBe(true);
    const held = queue.take(TICK_MS, TICK_MS)!;
    expect(held).toMatchObject({
      seq: 1,
      forward: 1,
      sprint: true,
      fire: false,
      jump: false,
      jumpOut: false,
      deploy: false,
      reload: false,
    });
    expect(held.slot).toBeUndefined();
    expect(queue.take(101, 101)).toBeUndefined();
  });

  it("expires stale packets on wall time even if the simulation was suspended", () => {
    const queue = new BrInputQueue();
    queue.push(move(1), 0);
    expect(queue.take(0, 201)).toBeUndefined();
    queue.push(move(2), 202);
    expect(queue.take(0, 202)?.seq).toBe(2);
    expect(queue.take(TICK_MS, 403)).toBeUndefined();
  });

  it("bounds packet bursts without granting extra simulation steps", () => {
    const queue = new BrInputQueue();
    for (let seq = 0; seq < 20; seq++) queue.push(move(seq), 0);
    expect(queue.take(0, 0)?.seq).toBe(12);
    expect(queue.take(TICK_MS, TICK_MS)?.seq).toBe(13);
  });
});
