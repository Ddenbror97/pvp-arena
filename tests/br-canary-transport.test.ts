import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BrCanaries } from "../src/lib/fps/br/canary";
import { BrStrides } from "../src/lib/fps/br/footsteps";
import { Heightfield } from "../src/lib/fps/br/heightfield";
import { BR_OCCLUDED, brRowRenderable, brVisibleRows } from "../src/lib/fps/br/remote-visibility";
import { StaticWorld } from "../src/lib/fps/br/static-world";
import { BrSight, brViewFor, brViewFrame, createBrMatch } from "../src/lib/fps/br/match";
import type { WorldMeta } from "../src/lib/fps/br/world";

const world = () =>
  new StaticWorld(
    new Heightfield(2, 2, 10_000, new Float32Array(4)),
    [],
    { voxel: 0.1, models: {} },
    null,
    [[-2, 0, -10, 2, 5, -9]],
  );

describe("canary transport safety boundaries", () => {
  it("a crouched stationary row stays silent through jitter, packet gaps and reappearance", () => {
    const strides = new BrStrides();
    for (const now of [0, 16, 34, 130, 500, 1500, 1516, 5000, 10_000]) {
      expect(strides.advance(99, 0, 0, -20, true, true, now)).toBe(false);
      expect(strides.advance(99, 0.001, 0, -20.001, true, true, now + 1)).toBe(false);
    }
  });

  it("keeps delayed canary rows non-renderable after the predicted eye clears their cover", () => {
    const solid = world(),
      canaries = new BrCanaries(() => 0.5);
    const ghost = { x: 0, y: 0, z: -20 };
    expect(canaries.hidden(solid, { x: 0, y: 0, z: 0 }, ghost)).toBe(true);
    // After one second of sprinting around the end, the locally predicted eye sees the spot.
    const moved = { x: 7, y: 0, z: 0 };
    expect(canaries.hidden(solid, moved, ghost)).toBe(false);
    expect(solid.raycast(moved.x, 1.6, moved.z, -7, -0.7, -20, Math.hypot(7, 0.7, 20))).toBeNull();
    // Until the removal reaches the client, the production playback helper keeps the old row.
    const row = [99, 0, 0, -20, 4, 0, 0, 1 | BR_OCCLUDED, -1];
    const sent = { at: 0, rows: new Map([[99, row]]) };
    const presented = new Map<number, number[]>();
    brVisibleRows(sent, sent, 1000, presented);
    expect(presented.has(99)).toBe(true);
    expect(brRowRenderable(presented.get(99)!)).toBe(false);
    for (const delay of [100, 300, 600, 1000, 5000, 30_000]) {
      brVisibleRows(sent, sent, delay, presented);
      expect(brRowRenderable(presented.get(99)!)).toBe(false);
    }
    // A timely removal fixes it. Packet delay, rather than the static ray test, is the gap.
    const removed = { at: 100, rows: new Map<number, number[]>() };
    brVisibleRows(sent, removed, 1000, presented);
    expect(presented.has(99)).toBe(false);
  });

  it("uses the same mask for real hidden players, preserves their audio rows, and reveals them after a peek", () => {
    const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
    const state = createBrMatch(meta, 7, () => 0);
    state.phase = "active";
    for (const s of state.seats) {
      Object.assign(s.body, {
        x: 2000 + s.seat * 5,
        y: 0,
        z: 2000,
        phase: "ground",
        grounded: true,
      });
    }
    Object.assign(state.seats[0]!.body, { x: 0, z: 0 });
    Object.assign(state.seats[1]!.body, { x: 0, z: -20 });
    const solid = new StaticWorld(
      new Heightfield(2, 2, 10_000, new Float32Array(4)),
      [],
      { voxel: 0.1, models: {} },
      null,
      [[-8, 0, -10, 8, 8, -9]],
    );
    const sight = new BrSight(),
      frame = brViewFrame(state);
    const original = brViewFor(state, solid, sight, 0, 1000, undefined, frame).players.find(
      (r) => r[0] === 1,
    )!;
    expect(brRowRenderable(original)).toBe(true); // Canary flag off: original proximity path.
    const hidden = brViewFor(state, solid, sight, 0, 1000, undefined, frame, true).players.find(
      (r) => r[0] === 1,
    )!;
    expect(hidden).toBeDefined(); // Position remains on the wire for positional footsteps.
    expect(brRowRenderable(hidden)).toBe(false);
    expect(brRowRenderable(original)).toBe(true); // No shared frame mutation across viewers.
    const steps = new BrStrides();
    expect(steps.advance(1, hidden[1]!, 0, hidden[3]!, true, false, 0)).toBe(false);
    expect(steps.advance(1, hidden[1]! + 2, 0, hidden[3]!, true, false, 200)).toBe(true);
    Object.assign(state.seats[0]!.body, { x: 30 });
    const revealed = brViewFor(
      state,
      solid,
      sight,
      0,
      1200,
      undefined,
      brViewFrame(state),
      true,
    ).players.find((r) => r[0] === 1)!;
    expect(brRowRenderable(revealed)).toBe(true);
  });
});
