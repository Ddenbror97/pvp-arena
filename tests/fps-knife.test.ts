import { describe, expect, it } from "vitest";
import { KNIFE, isBackstab, knifeDamage } from "../src/lib/fps/combat";
import { normalizeLegacyWeapons, validateInput } from "../src/lib/fps/protocol";
import {
  COUNTDOWN_MS,
  TICK_MS,
  createMatch,
  startMatch,
  stepMatch,
  type Input,
  type MatchState,
} from "../src/lib/fps/simulation";

/** Server-authoritative Karambit (the secondary slot that replaced the pistol). */
const input = (overrides: Partial<Input> = {}): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq: 0,
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: -0.25,
  fire: false,
  reload: false,
  weapon: "knife",
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
function tick(s: MatchState, a?: Partial<Input>, at = now(s) + TICK_MS) {
  stepMatch(s, a ? { A: input({ seq: s.players.A.lastSeq + 1, ...a }) } : {}, at, TICK_MS);
}
/** A faces -z toward B, `gap` metres apart in the open north courtyard (Dustfront). */
function face(s: MatchState, gap: number, victimYaw = Math.PI) {
  Object.assign(s.players.A, { x: 0, y: 0, z: -2.4, yaw: 0 });
  Object.assign(s.players.B, { x: 0, y: 0, z: -2.4 - gap, yaw: victimYaw });
}
/** Draw the knife and wait out the draw time. */
function drawn(s: MatchState) {
  tick(s, {});
  stepMatch(s, {}, now(s) + KNIFE.drawMs + TICK_MS, TICK_MS);
}

describe("Karambit: server-authoritative melee", () => {
  it("refuses a swing during the draw, then slashes through the vest", () => {
    const s = live();
    face(s, 1.1);
    tick(s, { fire: true });
    expect(s.players.A.weapon).toBe("knife");
    expect(s.players.B.hp).toBe(100);
    stepMatch(s, {}, now(s) + KNIFE.drawMs, TICK_MS);
    tick(s, { fire: true });
    // 40 slash, 15% stopped by the vest.
    expect(s.players.B.hp).toBe(100 - 34);
    expect(s.players.B.armor).toBe(97);
    const hit = s.events.find((e) => e.type === "hit")!;
    expect(hit.weapon).toBe("knife");
    expect(hit.attack).toBe("slash");
    expect(s.events.find((e) => e.type === "shot")?.audio?.kind).toBe("knife");
  });
  it("shares one cooldown between slash and stab, and holding repeats only at that pace", () => {
    const s = live();
    face(s, 1.1);
    drawn(s);
    tick(s, { fire: true });
    const after = s.players.B.hp;
    tick(s, { fire: true, alt: true });
    expect(s.players.B.hp).toBe(after);
    stepMatch(s, {}, now(s) + KNIFE.slash.cooldownMs, TICK_MS);
    tick(s, { fire: true, alt: true });
    expect(s.players.B.hp).toBeLessThan(after);
    expect(s.events.find((e) => e.type === "hit")?.attack).toBe("stab");
  });
  it("stab is the heavy hit with shorter reach; nothing lands beyond reach", () => {
    const near = live();
    face(near, 1.0);
    drawn(near);
    tick(near, { fire: true, alt: true });
    expect(near.players.B.hp).toBe(100 - Math.floor(65 - 65 * 0.15));
    const far = live();
    face(far, 2.4);
    drawn(far);
    tick(far, { fire: true });
    stepMatch(far, {}, now(far) + KNIFE.stab.cooldownMs, TICK_MS);
    tick(far, { fire: true, alt: true });
    expect(far.players.B.hp).toBe(100);
    expect(far.server!.roundStats!.A).toMatchObject({ shots: 2, hits: 0 });
  });
  it("backstabs: a stab from behind is lethal, a slash takes 90 before the vest", () => {
    const stab = live();
    face(stab, 1.0, 0);
    drawn(stab);
    tick(stab, { fire: true, alt: true });
    expect(stab.players.B.hp).toBe(0);
    expect(stab.events.find((e) => e.type === "hit")?.backstab).toBe(true);
    expect(stab.score.A).toBe(1);
    const slash = live();
    face(slash, 1.0, 0);
    drawn(slash);
    tick(slash, { fire: true });
    expect(slash.players.B.hp).toBe(100 - Math.floor(90 - 90 * 0.15));
  });
  it("cannot cut through cover", () => {
    const s = live();
    // Either side of Dustfront's 0.5 m "north-wall-inner-w" (z -10.5 → -10.0), 1.5 m apart:
    // within slash reach in the open, but the wall is in the way.
    Object.assign(s.players.A, { x: -4, y: 0, z: -9.5, yaw: 0 });
    Object.assign(s.players.B, { x: -4, y: 0, z: -11.0, yaw: Math.PI });
    drawn(s);
    tick(s, { fire: true });
    expect(s.players.B.hp).toBe(100);
    expect(s.events.find((e) => e.type === "impact")?.weapon).toBe("knife");
  });
  it("uses the lag-compensated target pose, like a shot", () => {
    const s = live();
    face(s, 6);
    drawn(s);
    stepMatch(
      s,
      { A: input({ seq: s.players.A.lastSeq + 1, fire: true }) },
      now(s) + TICK_MS,
      TICK_MS,
      { A: { x: 0, y: 0, z: -3.5 } },
    );
    expect(s.players.B.hp).toBeLessThan(100);
  });
  it("is presentation-free: the swing is resolved from validated input only", () => {
    expect(validateInput({ ...input(), alt: "yes" })).toBeNull();
    expect(validateInput({ ...input(), weapon: "flashbang" })).toBeNull();
    // Cached clients from before the Karambit still send "pistol" for slot 2.
    expect(validateInput({ ...input(), weapon: "pistol" })?.weapon).toBe("knife");
    expect(validateInput({ ...input(), alt: true })?.alt).toBe(true);
    expect(validateInput({ ...input(), alt: false })).not.toHaveProperty("alt");
  });
});

describe("Karambit rules", () => {
  it("judges backstabs from the victim's facing", () => {
    const victim = { x: 0, z: 0, yaw: 0 }; // facing -z
    expect(isBackstab({ x: 0, z: 1 }, victim)).toBe(true);
    expect(isBackstab({ x: 0, z: -1 }, victim)).toBe(false);
    expect(isBackstab({ x: 1, z: 0 }, victim)).toBe(false);
    expect(isBackstab({ x: 0.4, z: 1 }, victim)).toBe(true);
  });
  it("wears the vest like a bullet and ignores it once broken", () => {
    const target = { armor: 100 } as Parameters<typeof knifeDamage>[0];
    expect(knifeDamage(target, "slash", false)).toBe(34);
    expect(target.armor).toBe(97);
    target.armor = 0;
    expect(knifeDamage(target, "stab", true)).toBe(180);
  });
  it("maps states saved with the retired pistol to the knife", () => {
    const s = createMatch({ A: "a", B: "b" }, 5, 0);
    (s.players.A as { weapon: string }).weapon = "pistol";
    normalizeLegacyWeapons(s);
    expect(s.players.A.weapon).toBe("knife");
    expect(s.players.B.weapon).toBe("rifle");
  });
});
