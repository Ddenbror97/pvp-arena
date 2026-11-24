import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Heightfield } from "@/lib/fps/br/heightfield";
import { BrSeatSync, BrSight, brViewFor, createBrMatch, seatHuman } from "@/lib/fps/br/match";
import { StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";

const meta = JSON.parse(readFileSync("public/fps/br/world.v5.json", "utf8")) as WorldMeta;
const hf = new Heightfield(2, 2, 10000, new Float32Array(4));
const flat = new StaticWorld(hf, [], { voxel: 0.2, models: {} }, null, []);

describe("spectating in first person (as in 5v5)", () => {
  it("sends the watched player's pitch, aim and reload to whoever watches them", () => {
    const state = createBrMatch(meta, 7, () => 0);
    seatHuman(state, "u1", "One");
    seatHuman(state, "u2", "Two");
    state.phase = "active";
    const me = state.seats[0]!,
      them = state.seats[1]!;
    for (const [s, x] of [
      [me, 0],
      [them, 10],
    ] as const) {
      s.body.x = x;
      s.body.z = 0;
      s.body.y = 0;
      s.body.phase = "ground";
      s.body.grounded = true;
    }
    me.dead = true;
    me.spectate = them.seat;
    them.pitch = 0.2345;
    const now = 60_000;
    them.hands.aimSince = now - 100;
    them.hands.reloadUntil = now + 900;
    const view = brViewFor(state, flat, new BrSight(), me.seat, now, new BrSeatSync()) as {
      watch?: { seat: number; pitch?: number; aim?: number; reload?: number };
    };
    expect(view.watch).toMatchObject({ seat: them.seat, pitch: 0.235, aim: 1, reload: now + 900 });

    // Not aiming yet (the scope still settling) and no reload: neither is sent.
    them.hands.aimSince = now + 50;
    them.hands.reloadUntil = 0;
    const later = brViewFor(state, flat, new BrSight(), me.seat, now, new BrSeatSync()) as {
      watch?: { aim?: number; reload?: number };
    };
    expect(later.watch?.aim).toBeUndefined();
    expect(later.watch?.reload).toBeUndefined();

    // A player who is alive gets no watch at all.
    const alive = brViewFor(state, flat, new BrSight(), them.seat, now, new BrSeatSync()) as {
      watch?: unknown;
    };
    expect(alive.watch).toBeUndefined();
  });
});
