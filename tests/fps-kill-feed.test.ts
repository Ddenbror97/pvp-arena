import { describe, expect, it } from "vitest";
import { duelKills, feedWeapon, heldWeapon } from "../src/lib/fps/kill-feed";
import { characterSide } from "../src/lib/fps/sides";
import {
  createMatch,
  startMatch,
  stepMatch,
  TICK_MS,
  type Input,
  type MatchState,
} from "../src/lib/fps/simulation";
import { snapshotForPlayer } from "../src/lib/fps/visibility";

/**
 * The 1v1 and 5v5 kill feeds and equipped-weapon glyphs (owner, 2026-11-12: "fix the kill feed
 * for 5v5/1v1 to display correct weapon icon, same for what weapon is equiped"): the weapon each
 * kill shows, from the killing event, and the 1v1's kills found between snapshots.
 */
const input = (seq: number, extra: Partial<Input> = {}): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  fire: false,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: false,
  ...extra,
});
function live() {
  const s = createMatch({ A: "a", B: "b" }, 5, 0, 2);
  s.server!.spreadSeed = 12345;
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  // A 6 m lane, A facing B.
  Object.assign(s.players.A, { x: 0, z: -2.4, y: 0, yaw: 0 });
  Object.assign(s.players.B, { x: 0, z: -8.4, y: 0, yaw: Math.PI });
  return s;
}
const tick = (s: MatchState, seq: number, extra: Partial<Input> = {}) =>
  stepMatch(s, { A: input(seq, extra) }, s.server!.lastStepAt + 34, TICK_MS);

describe("kill feed weapons", () => {
  it("name the gun, the Karambit or the grenade of the killing event", () => {
    expect(feedWeapon({ weapon: "rifle" }, true)).toBe("m4");
    expect(feedWeapon({ weapon: "rifle" }, false)).toBe("ak");
    expect(feedWeapon({ weapon: "rifle", primary: "awp" }, true)).toBe("awp");
    expect(feedWeapon({ weapon: "rifle", primary: "mp5" }, false)).toBe("mp5");
    expect(feedWeapon({ weapon: "sidearm" }, true)).toBe("deagle");
    expect(feedWeapon({ weapon: "knife" }, false)).toBe("knife");
    expect(feedWeapon({ nade: "he" }, true)).toBe("he");
    expect(feedWeapon({ nade: "fire" }, true)).toBe("fire");
    expect(feedWeapon({}, true)).toBe("bomb");
  });

  it("show the weapon in hand, none while a grenade is out", () => {
    expect(heldWeapon({ weapon: "rifle" }, true)).toBe("m4");
    expect(heldWeapon({ weapon: "rifle" }, false)).toBe("ak");
    expect(heldWeapon({ weapon: "rifle", primary: "awp" }, false)).toBe("awp");
    expect(heldWeapon({ weapon: "sidearm" }, false)).toBe("deagle");
    expect(heldWeapon({ weapon: "knife" }, true)).toBe("knife");
    expect(heldWeapon({ weapon: "grenade" }, true)).toBeNull();
  });

  it("find a 1v1 kill between snapshots with the gun that made it", () => {
    const s = live();
    let before = structuredClone(s);
    let kills: ReturnType<typeof duelKills> = [];
    for (let n = 1; n <= 40 && !kills.length; n++) {
      before = structuredClone(s);
      tick(s, n, { fire: n % 12 === 1 });
      kills = duelKills(before, s);
    }
    expect(s.players.B.hp).toBe(0);
    // The hit names its gun (simulation.ts), as the shot does.
    const hit = s.events.find((e) => e.type === "headshot" || e.type === "hit");
    expect(hit?.weapon).toBe("rifle");
    const police = characterSide(s, "A") === "A";
    expect(kills).toEqual([
      { killer: "A", victim: "B", weapon: police ? "m4" : "ak", headshot: true },
    ]);
    // The same from each player's snapshot (the victim's and the killer's).
    for (const seat of ["A", "B"] as const) {
      const view = (st: MatchState) => {
        const { server: _, ...state } = st;
        return snapshotForPlayer({ state }, seat).state as MatchState;
      };
      expect(duelKills(view(before), view(s))).toEqual(kills);
    }
    // No second report on the next snapshot.
    const after = structuredClone(s);
    tick(s, 99);
    expect(duelKills(after, s)).toEqual([]);
  });

  it("follow the bought AWP and the Desert Eagle on 1v1 hits", () => {
    const s = live();
    s.players.A.primary = "awp";
    tick(s, 1, { fire: true });
    const awp = s.events.find((e) => e.type === "headshot" || e.type === "hit");
    expect(awp?.primary).toBe("awp");
    const d = live();
    tick(d, 1, { weapon: "sidearm" });
    for (let n = 2; n <= 20; n++) tick(d, n, { weapon: "sidearm", fire: n === 20 });
    const deagle = d.events.find((e) => e.type === "headshot" || e.type === "hit");
    expect(deagle?.weapon).toBe("sidearm");
    expect(feedWeapon(deagle!, true)).toBe("deagle");
  });
});
