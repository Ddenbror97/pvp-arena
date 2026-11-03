import { describe, expect, it } from "vitest";
import { validateInput } from "../src/lib/fps/protocol";
import {
  COUNTDOWN_MS,
  TICK_MS,
  createMatch,
  startMatch,
  stepMatch,
  type Input,
  type MatchState,
} from "../src/lib/fps/simulation";
import { snapshotForPlayer } from "../src/lib/fps/visibility";
import { GRENADES } from "../src/lib/fps/grenades/rules";
import { createBombMatch, startBombMatch, stepBombMatch, teamOf } from "../src/lib/fps/bomb/match";
import { BOMB_RULES, type BombMatchState } from "../src/lib/fps/bomb/rules";
import { bombViewFor, BombReveal } from "../src/lib/fps/bomb/snapshot";

/** Server-authoritative grenades in both modes: inventory, throws, damage, sight, snapshots. */
const input = (overrides: Partial<Input> = {}): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq: 0,
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: 0.2,
  fire: false,
  reload: false,
  weapon: "grenade",
  nade: "he",
  jump: false,
  sprint: false,
  ...overrides,
});
function live(): MatchState {
  const state = createMatch({ A: "alice", B: "bob" }, 5, 0);
  startMatch(state, 0);
  stepMatch(state, {}, COUNTDOWN_MS, TICK_MS);
  return state;
}
const now = (s: MatchState) => s.server!.lastStepAt;
function tick(s: MatchState, a?: Partial<Input>) {
  stepMatch(
    s,
    a ? { A: input({ seq: s.players.A.lastSeq + 1, ...a }) } : {},
    now(s) + TICK_MS,
    TICK_MS,
  );
}
/** Hold the button(s) for `holdMs`, release, and let the throw play out for `afterMs`. */
function throwFrom(s: MatchState, buttons: Partial<Input>, holdMs = 800, afterMs = 3000) {
  const aim = {
    ...(buttons.nade ? { nade: buttons.nade } : {}),
    ...(buttons.pitch !== undefined ? { pitch: buttons.pitch } : {}),
  };
  const t0 = now(s);
  while (now(s) - t0 < GRENADES.equipMs + 40) tick(s, aim);
  const t1 = now(s);
  while (now(s) - t1 < holdMs) tick(s, buttons);
  const t2 = now(s);
  while (now(s) - t2 < afterMs) tick(s, { ...aim, fire: false, alt: false });
}

describe("grenades in a 1v1", () => {
  it("validates the wire: weapon grenade with a known type only", () => {
    expect(validateInput(input())?.weapon).toBe("grenade");
    expect(validateInput(input({ nade: "fire" }))?.nade).toBe("fire");
    expect(validateInput({ ...input(), nade: "flash" })).toBeNull();
  });

  it("hands out one of each per round; an HE throw lands, explodes, hurts and is used up", () => {
    const s = live();
    expect(s.players.A.grenades).toEqual({ he: 1, smoke: 1, fire: 1 });
    // A throws toward B from Dustfront's north courtyard.
    Object.assign(s.players.A, { x: 0, y: 0, z: -2.4, yaw: 0 });
    Object.assign(s.players.B, { x: 0, y: 0, z: -9.5, yaw: Math.PI });
    const thrown: string[] = [],
      blasts: number[] = [];
    const t0 = now(s);
    while (now(s) - t0 < GRENADES.equipMs + 40) tick(s, { pitch: 0.05 });
    for (let i = 0; i < 25; i++) tick(s, { fire: true, pitch: 0.05 });
    for (let i = 0; i < 90; i++) {
      tick(s, { pitch: 0.05 });
      for (const e of s.events) {
        if (e.type === "nade-throw") thrown.push(e.nade!);
        if (e.type === "hit" && e.nade === "he") blasts.push(e.hit!.damage);
      }
    }
    expect(thrown).toEqual(["he"]);
    expect(s.players.A.grenades!.he).toBe(0);
    expect(s.players.A.weapon).toBe("rifle");
    expect(blasts.length).toBeGreaterThan(0);
    expect(s.players.B.hp).toBeLessThan(100);
  });

  it("cannot throw what it does not carry, and cannot duplicate a grenade", () => {
    const s = live();
    s.players.A.grenades = { he: 0, smoke: 1, fire: 0 };
    tick(s, { nade: "he", fire: true });
    expect(s.players.A.weapon).toBe("rifle");
    let throws = 0;
    for (let i = 0; i < 200; i++) {
      tick(s, { nade: "smoke", fire: i % 20 < 10 });
      throws += s.events.filter((e) => e.type === "nade-throw").length;
    }
    expect(throws).toBe(1);
    expect(s.players.A.grenades!.smoke).toBe(0);
  });

  it("smoke hides the opponent from the snapshot and the practice bot's sight", () => {
    const s = live();
    Object.assign(s.players.A, { x: 0, y: 0, z: -2.4, yaw: 0 });
    Object.assign(s.players.B, { x: 0, y: 0, z: -12, yaw: Math.PI });
    const frame = { state: s };
    expect(snapshotForPlayer(frame, "A").visibility.B).toBe(true);
    throwFrom(s, { nade: "smoke", alt: true, pitch: -0.1 }, 700, 4000);
    expect(s.grenades!.smokes).toHaveLength(1);
    const view = snapshotForPlayer({ state: s }, "A");
    expect(view.visibility.B).toBe(false);
    expect(view.state.players.B.x).toBe(0);
    // No server-only flight state leaks.
    expect(JSON.stringify(view.state.grenades)).not.toContain("sim");
  });

  it("clears last round's grenades and refills the inventory", () => {
    const s = live();
    throwFrom(s, { nade: "smoke", alt: true }, 700, 3000);
    expect(s.grenades!.smokes.length).toBe(1);
    s.players.B.hp = 0;
    tick(s, {});
    stepMatch(s, {}, now(s) + 6000, TICK_MS);
    expect(s.phase).toBe("live");
    expect(s.grenades!.smokes).toHaveLength(0);
    expect(s.players.A.grenades).toEqual({ he: 1, smoke: 1, fire: 1 });
  });

  it("a fire burns the player who stands in it, ramping, and stops when they step out", () => {
    const s = live();
    Object.assign(s.players.A, { x: 0, y: 0, z: -2.4, yaw: 0 });
    Object.assign(s.players.B, { x: 0, y: 0, z: -40, yaw: 0 });
    throwFrom(s, { nade: "fire", alt: true, pitch: -0.4 }, 700, 1500);
    expect(s.grenades!.fires).toHaveLength(1);
    const cells = s.grenades!.fires[0]!.cells;
    Object.assign(s.players.B, { x: cells[0]!, y: cells[1]!, z: cells[2]! });
    const start = s.players.B.hp;
    for (let i = 0; i < 30; i++) tick(s, {});
    const burnt = start - s.players.B.hp;
    expect(burnt).toBeGreaterThanOrEqual(6);
    Object.assign(s.players.B, { x: 0, y: 0, z: -40 });
    const out = s.players.B.hp;
    for (let i = 0; i < 30; i++) tick(s, {});
    expect(s.players.B.hp).toBe(out);
  });
});

describe("grenades in Bomb Defusal", () => {
  function bombLive(): BombMatchState {
    const slots = Array.from({ length: BOMB_RULES.teamSize * 2 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      bot: false,
    }));
    const s = createBombMatch(slots, 0, 7);
    startBombMatch(s, 0);
    stepBombMatch(s, {}, BOMB_RULES.freezeMs + 1);
    return s;
  }
  const bInput = (s: BombMatchState, slot: number, o: Partial<Input> = {}) =>
    input({ seq: s.players[slot]!.lastSeq + 1, ...o });

  it("never hurts teammates; hurts enemies and the thrower", () => {
    const s = bombLive();
    expect(s.phase).toBe("live");
    const thrower = s.players[0]!;
    const mate = s.players.find((p) => p !== thrower && teamOf(s, p) === teamOf(s, thrower))!;
    const enemy = s.players.find((p) => teamOf(s, p) !== teamOf(s, thrower))!;
    // Everyone else far away; mate and enemy next to the thrower.
    for (const p of s.players) Object.assign(p, { x: 200, z: 200 });
    Object.assign(thrower, { x: 0, y: 0, z: 0, yaw: 0 });
    Object.assign(mate, { x: 0.8, y: 0, z: -1.2 });
    Object.assign(enemy, { x: -0.8, y: 0, z: -1.2 });
    let t = s.server!.lastStepAt;
    const step = (o: Partial<Input>) => {
      t += TICK_MS;
      stepBombMatch(s, { [thrower.slot]: bInput(s, thrower.slot, o) }, t);
    };
    for (let i = 0; i < 16; i++) step({ pitch: -1.2 });
    for (let i = 0; i < 22; i++) step({ pitch: -1.2, alt: true });
    for (let i = 0; i < 80; i++) step({ pitch: -1.2 });
    expect(mate.hp).toBe(100);
    expect(enemy.hp).toBeLessThan(100);
    expect(thrower.hp).toBeLessThan(100);
  });

  it("puts the public grenade world in every view, without server-only state", () => {
    const s = bombLive();
    const p = s.players[0]!;
    let t = s.server!.lastStepAt;
    for (let i = 0; i < 16; i++)
      stepBombMatch(s, { [p.slot]: bInput(s, p.slot, { nade: "smoke" }) }, (t += TICK_MS));
    for (let i = 0; i < 22; i++)
      stepBombMatch(
        s,
        { [p.slot]: bInput(s, p.slot, { nade: "smoke", fire: true }) },
        (t += TICK_MS),
      );
    let throwSeen = false;
    for (let i = 0; i < 10; i++) {
      stepBombMatch(s, { [p.slot]: bInput(s, p.slot, { nade: "smoke" }) }, (t += TICK_MS));
      const enemy = s.players.find((q) => teamOf(s, q) !== teamOf(s, p))!;
      const view = bombViewFor(s, enemy.slot, null, new BombReveal(), t);
      if (view.events.some((e) => e.type === "nade-throw")) throwSeen = true;
      expect(JSON.stringify(view.grenades ?? {})).not.toContain("sim");
    }
    expect(throwSeen).toBe(true);
  });
});
