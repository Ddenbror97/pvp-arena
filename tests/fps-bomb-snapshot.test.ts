import { describe, expect, it } from "vitest";
import { createBombMatch, startBombMatch, stepBombMatch } from "../src/lib/fps/bomb/match";
import { BOMB_RULES } from "../src/lib/fps/bomb/rules";
import { BombReveal, bombViewFor } from "../src/lib/fps/bomb/snapshot";
import { TICK_MS } from "../src/lib/fps/simulation";

const slots = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true }));
function live() {
  const s = createBombMatch(slots, 0, 3);
  startBombMatch(s, 0);
  let t = 0;
  while (s.phase !== "live") stepBombMatch(s, {}, (t += TICK_MS));
  return { s, t };
}
const park = (s: ReturnType<typeof live>["s"], slot: number, x: number, z: number) =>
  Object.assign(s.players[slot]!, { x, z, y: 0, velocityY: 0 });

describe("Bomb Defusal per-recipient snapshots", () => {
  it("teammates are sent in full; enemies only while visible, never their health or ammunition", () => {
    const { s, t } = live();
    park(s, 0, 0, -5); // Police in mid
    park(s, 5, 0, 8); // Terrorist behind the mid doors frame? choose a hidden spot below
    park(s, 6, -34, 20); // Terrorist on A long: not visible from mid
    const view = bombViewFor(s, 0, null, new BombReveal(), t);
    const mate = view.players[1]!;
    expect(mate.pose).toBeDefined();
    expect(mate.hp).toBe(100);
    expect(view.players[6]!.pose).toBeUndefined();
    for (const p of view.players.filter((q) => q.team !== "police")) {
      expect(p.hp).toBeUndefined();
      expect(p.ammo).toBeUndefined();
      expect(p.carrier).toBeUndefined();
    }
    // Put the enemy in plain sight: now revealed.
    park(s, 6, 0, -12);
    expect(bombViewFor(s, 0, null, new BombReveal(), t).players[6]!.pose).toBeDefined();
  });

  it("enemy sounds arrive as a bearing and gain, never a position or a shooter id", () => {
    const { s, t } = live();
    park(s, 0, 0, -5);
    s.events = [
      {
        type: "shot",
        slot: 6,
        text: "rifle fired",
        audio: { kind: "shot", position: { x: -34, y: 1.6, z: 20 } },
      },
    ];
    park(s, 6, -34, 20);
    const view = bombViewFor(s, 0, null, new BombReveal(), t);
    expect(view.events).toHaveLength(1);
    const e = view.events[0] as Record<string, unknown>;
    expect(e["type"]).toBe("sound");
    expect(e["slot"]).toBeUndefined();
    expect(JSON.stringify(e)).not.toContain("-34");
  });

  it("Police do not learn where a planted bomb is until they see it; Terrorists always know", () => {
    const { s, t } = live();
    s.bomb = {
      state: "planted",
      x: -27,
      y: 0,
      z: -24,
      site: "A",
      plantedAt: t,
      explodesAt: t + BOMB_RULES.bombMs,
    };
    park(s, 0, 30, -28); // Police on B
    const police = bombViewFor(s, 0, null, new BombReveal(), t);
    expect(police.bomb).toMatchObject({ state: "planted", site: "A" });
    expect((police.bomb as { x?: number }).x).toBeUndefined();
    const t5 = bombViewFor(s, 5, null, new BombReveal(), t);
    expect((t5.bomb as { x?: number }).x).toBe(-27);
    park(s, 0, -27, -30); // standing over it
    expect((bombViewFor(s, 0, null, new BombReveal(), t).bomb as { x?: number }).x).toBe(-27);
  });

  it("a dead player sees through a living teammate only, and can never pick an enemy", () => {
    const { s, t } = live();
    Object.assign(s.players[0]!, { hp: 0, dead: true });
    const v1 = bombViewFor(s, 0, 7, new BombReveal(), t); // asks for an enemy
    expect(v1.spectating).toBe(1);
    expect(v1.spectateTargets).toEqual([1, 2, 3, 4]);
    const v2 = bombViewFor(s, 0, 3, new BombReveal(), t);
    expect(v2.spectating).toBe(3);
    for (const k of [1, 2, 3, 4]) Object.assign(s.players[k]!, { hp: 0, dead: true });
    const v3 = bombViewFor(s, 0, 3, new BombReveal(), t);
    expect(v3.spectating).toBeNull();
    expect(v3.spectateTargets).toEqual([]);
  });

  it("the bomb carrier is shown to Terrorists only", () => {
    const { s, t } = live();
    const carrier = (s.bomb as { carrier: number }).carrier;
    expect(bombViewFor(s, 5, null, new BombReveal(), t).players[carrier]!.carrier).toBe(true);
    const police = bombViewFor(s, 0, null, new BombReveal(), t);
    expect(police.players[carrier]!.carrier).toBeUndefined();
    expect((police.bomb as { carrier?: number }).carrier).toBeUndefined();
  });
});
