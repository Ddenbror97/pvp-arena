import { describe, expect, it } from "vitest";
import {
  assignSlot,
  createBombMatch,
  spectateTargets,
  startBombMatch,
  stepBombMatch,
  teamOf,
  validateBombInput,
} from "../src/lib/fps/bomb/match";
import { BOMB_RULES, type BombMatchState } from "../src/lib/fps/bomb/rules";
import { SANDGATE_SITES } from "../src/lib/fps/bomb/sandgate";
import { TICK_MS } from "../src/lib/fps/simulation";

const slots = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true }));
let seq = 0;
const input = (extra: Record<string, unknown> = {}) => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq: ++seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  weapon: "rifle",
  fire: false,
  reload: false,
  jump: false,
  sprint: false,
  ...extra,
});
function match(seed = 7) {
  const s = createBombMatch(slots, 0, seed);
  startBombMatch(s, 0);
  return s;
}
/** Step until `until` (ms) with per-tick inputs from `make`. */
function run(
  s: BombMatchState,
  from: number,
  until: number,
  make: () => Record<number, unknown> = () => ({}),
) {
  let t = from;
  while (t < until) {
    t += TICK_MS;
    stepBombMatch(s, make(), t);
  }
  return t;
}
const team = (s: BombMatchState, name: "police" | "terrorist") =>
  s.players.filter((p) => teamOf(s, p) === name);
const live = (s: BombMatchState) => run(s, 0, BOMB_RULES.freezeMs + TICK_MS);
const siteCentre = (k: "A" | "B") => {
  const r = SANDGATE_SITES[k];
  return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 };
};
function park(s: BombMatchState, slot: number, x: number, z: number) {
  Object.assign(s.players[slot]!, { x, z, y: 0, velocityY: 0 });
}
/** Kill everyone on `which` (hp 0, dead) without events. */
function wipe(s: BombMatchState, which: "police" | "terrorist") {
  for (const p of team(s, which)) Object.assign(p, { hp: 0, dead: true });
}

describe("Bomb Defusal rules (5v5 practice)", () => {
  it("alpha starts as Police, bravo as Terrorists; each round one random Terrorist carries the bomb", () => {
    const s = match();
    expect(team(s, "police").map((p) => p.slot)).toEqual([0, 1, 2, 3, 4]);
    expect(team(s, "terrorist").map((p) => p.slot)).toEqual([5, 6, 7, 8, 9]);
    const carriers = new Set<number>();
    let t = 0;
    for (let r = 0; r < 12; r++) {
      expect(s.bomb.state).toBe("carried");
      const c = (s.bomb as { carrier: number }).carrier;
      expect(teamOf(s, s.players[c]!)).toBe("terrorist");
      carriers.add(c);
      t = run(s, t, t + BOMB_RULES.freezeMs + TICK_MS);
      wipe(s, "terrorist");
      t = run(s, t, t + BOMB_RULES.roundEndMs + 2 * TICK_MS);
    }
    expect(carriers.size).toBeGreaterThan(2);
  });

  it("freeze time holds everyone in place; the round goes live after 15 s", () => {
    const s = match();
    const start = { x: s.players[0]!.x, z: s.players[0]!.z };
    run(s, 0, BOMB_RULES.freezeMs - 100, () => ({ 0: input({ forward: 1 }) }));
    expect(s.phase).toBe("freeze");
    expect({ x: s.players[0]!.x, z: s.players[0]!.z }).toEqual(start);
    run(s, BOMB_RULES.freezeMs - 100, BOMB_RULES.freezeMs + 500, () => ({
      0: input({ forward: 1 }),
    }));
    expect(s.phase).toBe("live");
    expect(s.players[0]!.z).not.toBe(start.z);
  });

  it("round timer expiry without a plant: Police win", () => {
    const s = match();
    run(s, 0, BOMB_RULES.freezeMs + BOMB_RULES.roundMs + TICK_MS);
    expect(s.lastRound).toMatchObject({ winner: "police", reason: "time", group: "alpha" });
    expect(s.score).toEqual({ alpha: 1, bravo: 0 });
  });

  it("the carrier plants only inside a bombsite, after 3.2 s holding use; releasing interrupts", () => {
    const s = match();
    let t = live(s);
    const c = (s.bomb as { carrier: number }).carrier;
    park(s, c, 0, 0); // mid: not a site
    t = run(s, t, t + 4000, () => ({ [c]: input({ use: true }) }));
    expect(s.bomb.state).toBe("carried");
    const a = siteCentre("A");
    park(s, c, a.x, a.z);
    t = run(s, t, t + 2000, () => ({ [c]: input({ use: true }) }));
    expect(s.bomb.state).toBe("planting");
    t = run(s, t, t + 100, () => ({ [c]: input() }));
    expect(s.bomb.state).toBe("carried");
    t = run(s, t, t + BOMB_RULES.plantMs + 200, () => ({ [c]: input({ use: true }) }));
    expect(s.bomb).toMatchObject({ state: "planted", site: "A" });
  });

  it("a planted bomb explodes after 40 s: Terrorists win, and the blast kills nearby players", () => {
    const s = match();
    let t = live(s);
    const c = (s.bomb as { carrier: number }).carrier;
    const a = siteCentre("A");
    park(s, c, a.x, a.z);
    t = run(s, t, t + BOMB_RULES.plantMs + 200, () => ({ [c]: input({ use: true }) }));
    expect(s.bomb.state).toBe("planted");
    park(s, 0, a.x + 3, a.z); // a Police player standing next to it
    t = run(s, t, t + BOMB_RULES.bombMs + 200);
    expect(s.bomb.state).toBe("exploded");
    expect(s.players[0]!.hp).toBe(0);
    expect(s.lastRound).toMatchObject({ winner: "terrorist", reason: "bomb" });
  });

  it("the round timer does not end a round once the bomb is planted", () => {
    const s = match();
    let t = live(s);
    const c = (s.bomb as { carrier: number }).carrier;
    const b = siteCentre("B");
    park(s, c, b.x, b.z);
    // Plant with 5 s left on the round clock.
    t = run(s, t, s.roundEndsAt - 5000);
    t = run(s, t, t + BOMB_RULES.plantMs + 200, () => ({ [c]: input({ use: true }) }));
    expect(s.bomb.state).toBe("planted");
    t = run(s, t, s.roundEndsAt + 3000);
    expect(s.phase).toBe("live");
  });

  it("Police defuse in 10 s (one defuser at a time); interrupting resets it", () => {
    const s = match();
    let t = live(s);
    const c = (s.bomb as { carrier: number }).carrier;
    const b = siteCentre("B");
    park(s, c, b.x, b.z);
    t = run(s, t, t + BOMB_RULES.plantMs + 200, () => ({ [c]: input({ use: true }) }));
    const bomb = s.bomb as { x: number; z: number };
    park(s, 1, bomb.x + 0.5, bomb.z);
    park(s, 2, bomb.x - 0.5, bomb.z);
    t = run(s, t, t + 4000, () => ({ 1: input({ use: true }), 2: input({ use: true }) }));
    expect(s.bomb).toMatchObject({ state: "planted", defuser: 1 });
    t = run(s, t, t + 200, () => ({ 2: input({ use: true }) })); // 1 lets go, 2 takes over afresh
    expect(s.bomb).toMatchObject({ defuser: 2 });
    t = run(s, t, t + BOMB_RULES.defuseMs - 500, () => ({ 2: input({ use: true }) }));
    expect(s.bomb.state).toBe("planted");
    t = run(s, t, t + 800, () => ({ 2: input({ use: true }) }));
    expect(s.bomb.state).toBe("defused");
    expect(s.lastRound).toMatchObject({ winner: "police", reason: "defuse" });
  });

  it("a defuse kit halves the defuse to 5 s, and the defuser kneels while defusing", () => {
    const s = match();
    let t = live(s);
    const c = (s.bomb as { carrier: number }).carrier;
    const b = siteCentre("B");
    park(s, c, b.x, b.z);
    t = run(s, t, t + BOMB_RULES.plantMs + 200, () => ({ [c]: input({ use: true }) }));
    const bomb = s.bomb as { x: number; z: number };
    park(s, 1, bomb.x + 0.5, bomb.z);
    s.players[1]!.defuseKit = true;
    t = run(s, t, t + 300, () => ({ 1: input({ use: true }) }));
    expect(s.bomb).toMatchObject({
      state: "planted",
      defuser: 1,
      defuseMs: BOMB_RULES.defuseKitMs,
    });
    expect(s.players[1]!.crouched).toBe(true);
    t = run(s, t, t + BOMB_RULES.defuseKitMs - 600, () => ({ 1: input({ use: true }) }));
    expect(s.bomb.state).toBe("planted");
    t = run(s, t, t + 600, () => ({ 1: input({ use: true }) }));
    expect(s.bomb.state).toBe("defused");
  });

  it("Terrorists cannot be the defuser and Police can never pick up the bomb", () => {
    const s = match();
    const t = live(s);
    const c = (s.bomb as { carrier: number }).carrier;
    park(s, c, 0, -5); // open ground in mid
    const where = { x: 0, z: -5 };
    Object.assign(s.players[c]!, { hp: 1 });
    // Kill the carrier with a direct hit from a Police player placed in front of them.
    park(s, 0, where.x, where.z - 6);
    let tt = t;
    for (let i = 0; i < 20 && s.players[c]!.hp > 0; i++)
      tt = run(s, tt, tt + TICK_MS, () => ({
        0: input({ fire: true, yaw: Math.PI, pitch: -0.02 }),
      }));
    expect(s.players[c]!.hp).toBe(0);
    expect(s.bomb.state).toBe("dropped");
    const d = s.bomb as { x: number; z: number };
    park(s, 0, d.x, d.z);
    tt = run(s, tt, tt + 300);
    expect(s.bomb.state).toBe("dropped");
    const other = team(s, "terrorist").find((p) => p.slot !== c)!;
    park(s, other.slot, d.x + 0.4, d.z);
    run(s, tt, tt + 300);
    expect(s.bomb).toMatchObject({ state: "carried", carrier: other.slot });
  });

  it("elimination: all Terrorists dead before a plant → Police; all Police dead → Terrorists", () => {
    const a = match();
    let t = live(a);
    wipe(a, "terrorist");
    run(a, t, t + TICK_MS * 2);
    expect(a.lastRound).toMatchObject({ winner: "police", reason: "elimination" });
    const b = match();
    t = live(b);
    wipe(b, "police");
    run(b, t, t + TICK_MS * 2);
    expect(b.lastRound).toMatchObject({ winner: "terrorist", reason: "elimination" });
  });

  it("after a plant, losing every Terrorist does not end the round: the bomb must still resolve", () => {
    const s = match();
    let t = live(s);
    const c = (s.bomb as { carrier: number }).carrier;
    const a = siteCentre("A");
    park(s, c, a.x, a.z);
    t = run(s, t, t + BOMB_RULES.plantMs + 200, () => ({ [c]: input({ use: true }) }));
    wipe(s, "terrorist");
    t = run(s, t, t + 2000);
    expect(s.phase).toBe("live");
    run(s, t, t + BOMB_RULES.bombMs);
    expect(s.lastRound).toMatchObject({ winner: "terrorist", reason: "bomb" });
  });

  it("no friendly fire", () => {
    const s = match();
    const t = live(s);
    park(s, 0, 0, -5);
    park(s, 1, 0, -11); // teammate straight ahead
    run(s, t, t + 1000, () => ({ 0: input({ fire: true, yaw: 0, pitch: -0.02 }) }));
    expect(s.players[1]!.hp).toBe(100);
  });

  it("MR15: halftime after 15 rounds swaps sides and keeps the score; 16 wins; 15–15 is a draw", () => {
    const s = match();
    let t = 0;
    const policeWins = (n: number) => {
      for (let r = 0; r < n; r++) {
        t = run(s, t, t + BOMB_RULES.freezeMs + TICK_MS);
        wipe(s, "terrorist");
        t = run(s, t, t + TICK_MS * 2);
        if (s.phase === "round-end") t = run(s, t, s.phaseEndsAt + TICK_MS);
      }
    };
    policeWins(15);
    expect(s.phase).toBe("halftime");
    expect(s.score).toEqual({ alpha: 15, bravo: 0 });
    t = run(s, t, s.phaseEndsAt + TICK_MS);
    expect(s.half).toBe(2);
    expect(s.round).toBe(16);
    expect(team(s, "police").map((p) => p.group)).toEqual([
      "bravo",
      "bravo",
      "bravo",
      "bravo",
      "bravo",
    ]);
    expect(s.players.every((p) => p.hp === 100 && p.ammo === 30)).toBe(true);
    policeWins(15);
    expect(s.phase).toBe("completed");
    expect(s.winner).toBe("draw");
    const w = match();
    t = 0;
    const s2 = w;
    for (let r = 0; r < 16; r++) {
      t = run(s2, t, t + BOMB_RULES.freezeMs + TICK_MS);
      wipe(s2, teamOf(s2, s2.players[0]!) === "police" ? "terrorist" : "police");
      t = run(s2, t, t + TICK_MS * 2);
      if (s2.phase === "round-end" || s2.phase === "halftime")
        t = run(s2, t, s2.phaseEndsAt + TICK_MS);
    }
    expect(s2.winner).toBe("alpha");
    expect(s2.score.alpha).toBe(16);
  });

  it("a human replacing a bot keeps the slot's life, team, bomb and score", () => {
    const s = match();
    const t = live(s);
    const c = (s.bomb as { carrier: number }).carrier;
    const before = { ...s.players[c]! };
    assignSlot(s, c, { id: "human-1", name: "Jesper", bot: false });
    run(s, t, t + 500);
    expect(s.players[c]).toMatchObject({
      id: "human-1",
      bot: false,
      hp: before.hp,
      group: before.group,
    });
    expect(s.bomb).toMatchObject({ carrier: c });
  });

  it("dead players may only spectate living teammates", () => {
    const s = match();
    live(s);
    Object.assign(s.players[0]!, { hp: 0, dead: true });
    Object.assign(s.players[1]!, { hp: 0, dead: true });
    expect(spectateTargets(s, 0)).toEqual([2, 3, 4]);
    wipe(s, "police");
    expect(spectateTargets(s, 0)).toEqual([]);
  });

  it("input validation: the shared FPS input plus a boolean use key, nothing else", () => {
    expect(validateBombInput(input({ use: true }))).toMatchObject({ use: true });
    expect(validateBombInput(input({ use: "yes" }))).toBeNull();
    expect(validateBombInput(input({ cheat: 1 }))).toBeNull();
    expect(validateBombInput(input({ weapon: "knife" }))!.weapon).toBe("rifle");
  });
});
