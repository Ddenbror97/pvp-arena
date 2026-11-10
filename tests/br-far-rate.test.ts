import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BR_RULES, BrSeatSync, brViewFor, createBrMatch, type BrSight } from "@/lib/fps/br/match";
import { HeldRows } from "@/lib/fps/br/remote-visibility";
import type { StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";

/**
 * Half rate for far players (the room's BR_FAR_HALF_RATE, off by default): beyond the
 * always-send range a player goes out in every other view; the client carries them forward.
 */
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const sight = { visible: () => true } as unknown as BrSight;
const world = {} as StaticWorld;

function match() {
  const state = createBrMatch(meta, 7, () => 0);
  // Seat 0 watches; seat 1 is near; seat 2 is far and in sight; the rest stay in the plane.
  const place = (seat: number, x: number) =>
    Object.assign(state.seats[seat]!.body, { phase: "ground", x, y: 0, z: 0 });
  place(0, 0);
  place(1, 100);
  place(2, BR_RULES.alwaysSendM + 200);
  return state;
}
const seats = (view: { players: number[][] }) => view.players.map((r) => r[0]);

describe("battle royale far players at half rate", () => {
  it("is off by default: every view carries every player in sight", () => {
    const state = match(),
      sync = new BrSeatSync();
    for (let i = 0; i < 6; i++) {
      const view = brViewFor(state, world, sight, 0, 1000 + i * 67, sync);
      expect(seats(view)).toEqual([1, 2]);
      expect("held" in view).toBe(false);
    }
  });

  it("sends a far player every other view and names them in between", () => {
    const state = match(),
      sync = new BrSeatSync();
    sync.farHalf = true;
    const sent: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      state.seats[2]!.body.x += 0.4;
      const view = brViewFor(state, world, sight, 0, 1000 + i * 67, sync);
      // The near player is in every view.
      expect(seats(view)).toContain(1);
      const has = seats(view).includes(2);
      expect((view as { held?: number[] }).held ?? []).toEqual(has ? [] : [2]);
      sent.push(has);
    }
    // First sight at once, then every other view.
    expect(sent[0]).toBe(true);
    expect(sent.filter(Boolean).length).toBeGreaterThanOrEqual(4);
    expect(sent.filter(Boolean).length).toBeLessThanOrEqual(5);
    for (let i = 2; i < sent.length; i++) expect(sent[i]).toBe(!sent[i - 1]);
  });

  it("never holds back a change of stance, and starts over after leaving the far range", () => {
    const state = match(),
      sync = new BrSeatSync();
    sync.farHalf = true;
    const view = (i: number) => brViewFor(state, world, sight, 0, 1000 + i * 67, sync);
    let i = 0;
    // Find a view that holds seat 2, then crouch in the next held slot.
    while (seats(view(i++)).includes(2));
    expect(seats(view(i++))).toContain(2);
    state.seats[2]!.body.crouched = true;
    const crouched = view(i++);
    expect(seats(crouched)).toContain(2);
    expect(crouched.players.find((r) => r[0] === 2)![7]).toBe(1);
    // Near again: every view. Far again: the first far view carries them.
    state.seats[2]!.body.x = 150;
    for (let n = 0; n < 4; n++) expect(seats(view(i++))).toContain(2);
    state.seats[2]!.body.x = BR_RULES.alwaysSendM + 200;
    expect(seats(view(i++))).toContain(2);
  });

  it("the client carries a held player along their last step", () => {
    const rows = new HeldRows();
    expect(rows.held(2, 0)).toBeNull();
    rows.sent(2, [2, 500, 10, 0, 0, 1.5], 1000);
    // One row only: held in place.
    expect(rows.held(2, 1067)!.slice(1, 4)).toEqual([500, 10, 0]);
    rows.sent(2, [2, 501, 10, 2, 0, 1.6], 1134);
    const held = rows.held(2, 1201)!;
    expect(held[1]).toBeCloseTo(501.5, 5);
    expect(held[3]).toBeCloseTo(3, 5);
    // Facing and state are the last sent ones.
    expect(held[5]).toBe(1.6);
    // Not across a teleport or a long gap in sight.
    rows.sent(2, [2, 900, 10, 2, 0, 1.6], 1268);
    expect(rows.held(2, 1335)![1]).toBe(900);
    rows.sent(2, [2, 901, 10, 2, 0, 1.6], 3000);
    expect(rows.held(2, 3067)![1]).toBe(901);
    rows.keep(new Set([1]));
    expect(rows.held(2, 3100)).toBeNull();
  });
});
