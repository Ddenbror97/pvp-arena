import { describe, expect, it } from "vitest";
import { createBombMatch, startBombMatch } from "../src/lib/fps/bomb/match";
import { BombReveal, bombViewFor } from "../src/lib/fps/bomb/snapshot";
import { SpectatorPlayback, spectatorGrenade } from "../src/lib/fps/bomb/spectator";

const room = () => {
  const s = createBombMatch(
    Array.from({ length: 10 }, (_, i) => ({
      id: `private-id-${i}`,
      name: `Player ${i}`,
      bot: i !== 0,
    })),
    0,
    3,
  );
  startBombMatch(s, 0);
  s.players[0]!.hp = 0;
  return s;
};
const snapshot = (s: ReturnType<typeof room>, at: number, target = 1) =>
  bombViewFor(s, 0, target, new BombReveal(), at);

describe("Spectator first-person presentation", () => {
  it("keeps the recipient's control state while sharing only the validated teammate's presentation", () => {
    const s = room();
    Object.assign(s.players[1]!, {
      primary: "awp",
      ammo: 4,
      reserve: 12,
      scoped: true,
      reloadUntil: 0,
      damageTo: { 5: 80 },
      nade: "smoke",
      nadeHold: { type: "smoke", since: 500, mask: 1 },
    });
    const v = snapshot(s, 1000);
    expect(v.self.slot).toBe(0);
    expect(v.self.hp).toBe(0);
    expect(v.pov).toMatchObject({ slot: 1, primary: "awp", ammo: 4, reserve: 12, scoped: true });
    expect(v.pov).not.toHaveProperty("id");
    expect(v.pov).not.toHaveProperty("damageTo");
    expect(JSON.stringify(v.pov)).not.toContain("private-id");
    s.players[1]!.ammo = 0;
    s.players[1]!.nadeHold!.since = 900;
    expect(v.pov!.ammo).toBe(4);
    expect(v.pov!.nadeHold!.since).toBe(500);
    expect(snapshot(s, 1000, 7).pov!.slot).toBe(1);
    s.players[0]!.hp = 100;
    expect(snapshot(s, 1000).pov).toBeUndefined();
    s.players.forEach((p) => {
      if (p.slot < 5) p.hp = 0;
    });
    expect(snapshot(s, 1000).pov).toBeUndefined();
  });

  it("plays weapon changes, objective state and shot events on the remote movement timeline exactly once", () => {
    const s = room(),
      playback = new SpectatorPlayback();
    playback.push(snapshot(s, 1000));
    Object.assign(s.players[1]!, { primary: "awp", weapon: "rifle", ammo: 4, lastShotAt: 1100 });
    s.bomb = {
      state: "planted",
      site: "A",
      x: -27,
      y: 0,
      z: -24,
      plantedAt: 1100,
      explodesAt: 41100,
    };
    s.events = [
      { id: 1, type: "shot", slot: 1, text: "shot", at: 1100, primary: "awp" },
      { id: 2, type: "shot", slot: 2, text: "other shot", at: 1100 },
    ];
    const next = snapshot(s, 1100);
    playback.push(next);
    playback.push(next);
    expect(playback.sample(1050)!.primary).not.toBe("awp");
    expect(playback.bomb(1050)!.state).toBe("carried");
    expect(playback.shots(1099)).toEqual([]);
    expect(playback.sample(1100)!.ammo).toBe(4);
    expect(playback.bomb(1100)!.state).toBe("planted");
    expect(playback.shots(1100)).toHaveLength(1);
    expect(playback.shots(1200)).toEqual([]);
    playback.push(snapshot(s, 1200, 2));
    expect(playback.sample(1200)!.slot).toBe(2);
    s.players[0]!.hp = 100;
    playback.push(snapshot(s, 1300));
    expect(playback.sample(1300)).toBeNull();
    expect(playback.shots(1400)).toEqual([]);
  });

  it("uses server grenade handling without predicting a throw for a dead viewer", () => {
    const s = room();
    Object.assign(s.players[1]!, {
      weapon: "grenade",
      nade: "smoke",
      nadeHold: { type: "smoke", since: 500, mask: 1 },
    });
    const pov = snapshot(s, 1000).pov!;
    expect(spectatorGrenade(pov, 1000)).toMatchObject({ kind: "hold", type: "smoke", t: 0.5 });
    expect(spectatorGrenade({ ...pov, weapon: "knife" }, 1000)).toEqual({ kind: "hidden" });
    expect(spectatorGrenade({ ...pov, hp: 0 }, 1000)).toEqual({ kind: "hidden" });
  });
});
