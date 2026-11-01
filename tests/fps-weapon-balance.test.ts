import { describe, expect, it } from "vitest";
import { createMatch, startMatch, stepMatch, TICK_MS } from "../src/lib/fps/simulation";
import { HIT_DAMAGE, SEAT_RIFLE, type HitZone } from "../src/lib/fps/combat";
import type { Input, Seat } from "../src/lib/fps/protocol";

/**
 * Police M4A1-S vs Terrorist AK-47 balance. Both seats fire the same server `rifle`; these
 * tests pin that down and record why CS2's per-bullet M4A1-S numbers were not ported.
 */
const fire = (seq: number, yaw: number, pitch: number): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq,
  forward: 0,
  strafe: 0,
  yaw,
  pitch,
  fire: true,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: false,
});

/** One aimed rifle shot from `shooter` at the other seat's `height` on an open lane. */
function shot(shooter: Seat, height: number, armor: number) {
  const s = createMatch({ A: "a", B: "b" }, 5, 0);
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  const target: Seat = shooter === "A" ? "B" : "A";
  Object.assign(s.players[shooter], { x: 0, z: -2.4, y: 0 });
  Object.assign(s.players[target], { x: 0, z: -8.4, y: 0, armor });
  s.server!.spreadSeed = 4242;
  const dz = s.players[target].z - s.players[shooter].z;
  stepMatch(
    s,
    { [shooter]: fire(1, Math.atan2(0, -dz), Math.atan2(height - 1.6, Math.abs(dz))) },
    3034,
    TICK_MS,
  );
  return 100 - s.players[target].hp;
}

describe("Police M4A1-S and Terrorist AK-47 are balanced", () => {
  it("names the seat rifles", () => {
    expect(SEAT_RIFLE).toEqual({ A: "M4A1-S", B: "AK-47" });
  });

  it("deals identical damage per hit zone from either seat, with and without a vest", () => {
    for (const [zone, height] of [
      ["head", 1.62],
      ["chest", 1.2],
      ["stomach", 0.78],
      ["legs", 0.3],
    ] as const)
      for (const armor of [0, 100]) {
        const police = shot("A", height, armor),
          terrorist = shot("B", height, armor);
        expect(police, `${zone} armor ${armor}`).toBeGreaterThan(0);
        expect(police, `${zone} armor ${armor}`).toBe(terrorist);
      }
  });

  it("CS2's per-bullet M4A1-S ratios would break parity in this damage model", () => {
    // Same vest rule as applyVestDamage, parameterised by armour penetration.
    const vest = (t: Record<HitZone, number>, ap: number, armor: number, zone: HitZone) => {
      const base = t[zone];
      if (zone === "head" || zone === "legs" || armor <= 0) return [base, armor] as const;
      const blocked = Math.min(base * (1 - ap), armor * 2);
      return [Math.floor(base - blocked), Math.max(0, armor - blocked / 2)] as const;
    };
    const kills = (t: Record<HitZone, number>, ap: number, seq: HitZone[], armor0: number) => {
      let hp = 100,
        armor = armor0;
      for (let i = 0; i < seq.length; i++) {
        const [d, a] = vest(t, ap, armor, seq[i]!);
        hp -= d;
        armor = a;
        if (hp <= 0) return i + 1;
      }
      return null;
    };
    const ak = HIT_DAMAGE.rifle;
    // 38 / 36 damage at 70% penetration, as in CS2.
    const ported = { head: 36, chest: 36, stomach: 32, legs: 21 };
    const zones: HitZone[] = ["head", "chest", "stomach", "legs"];
    let sequences = 0,
      differ = 0,
      m4Faster = 0;
    const walk = (seq: HitZone[]) => {
      for (const armor of [0, 100]) {
        const a = kills(ak, 0.775, seq, armor),
          m = kills(ported, 0.7, seq, armor);
        if (seq.length > 1 && kills(ak, 0.775, seq.slice(0, -1), armor) !== null) continue;
        sequences++;
        if (a !== m) {
          differ++;
          if (m !== null && (a === null || m < a)) m4Faster++;
        }
      }
      if (seq.length < 7) for (const z of zones) walk([...seq, z]);
    };
    for (const z of zones) walk([z]);
    expect(sequences).toBe(1064);
    expect(differ).toBe(154);
    expect(m4Faster).toBeGreaterThan(differ / 2);
  });
});
