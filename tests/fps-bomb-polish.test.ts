import { describe, expect, it } from "vitest";
import { cycleEquipment } from "../src/lib/fps/equipment-cycle";
import { compileMap } from "../src/lib/fps/maps/registry";
import { SANDGATE_DEFINITION } from "../src/lib/fps/bomb/sandgate";
import { canSee } from "../src/lib/fps/bomb/visibility";
import { revealsBody } from "../src/lib/fps/visibility";
import { objective } from "../src/lib/fps/bomb/hud";
import { createBombMatch, startBombMatch } from "../src/lib/fps/bomb/match";
import { BombReveal, bombViewFor } from "../src/lib/fps/bomb/snapshot";

describe("Shared equipment wheel", () => {
  it("cycles both directions through rifle, knife and all carried grenades", () => {
    const stock = { he: 1, smoke: 1, fire: 1 };
    expect(cycleEquipment("rifle", undefined, stock, 1)).toEqual({ weapon: "knife" });
    expect(cycleEquipment("knife", undefined, stock, 1)).toEqual({ weapon: "grenade", nade: "he" });
    expect(cycleEquipment("grenade", "he", stock, 1)).toEqual({ weapon: "grenade", nade: "smoke" });
    expect(cycleEquipment("grenade", "fire", stock, 1)).toEqual({ weapon: "rifle" });
    expect(cycleEquipment("rifle", undefined, stock, -1)).toEqual({
      weapon: "grenade",
      nade: "fire",
    });
    expect(cycleEquipment("grenade", "smoke", stock, -1)).toEqual({
      weapon: "grenade",
      nade: "he",
    });
  });
  it("skips used grenades and works without grenade inventory", () => {
    expect(cycleEquipment("knife", undefined, { he: 0, smoke: 1, fire: 0 }, 1)).toEqual({
      weapon: "grenade",
      nade: "smoke",
    });
    expect(cycleEquipment("knife", undefined, undefined, 1)).toEqual({ weapon: "rifle" });
  });
});
describe("Bomb rendered silhouette visibility", () => {
  it("keeps a crouched enemy visible when boots are exposed below an overhang", () => {
    const map = compileMap({
      ...SANDGATE_DEFINITION,
      boxes: [{ id: "beam", x: 0, y: 1.5, z: -2, w: 4, h: 1.1, d: 0.2 }],
      walls: [],
    });
    const viewer = { x: 0, y: 0, z: 0 },
      target = { x: 0, y: 0, z: -4, crouched: true, yaw: 0 };
    expect(canSee(map, viewer, target)).toBe(false);
    expect(revealsBody(map, { ...viewer, yaw: 0 }, target)).toBe(true);
    const wall = compileMap({
      ...SANDGATE_DEFINITION,
      boxes: [{ id: "wall", x: 0, y: 1, z: -2, w: 4, h: 2, d: 0.2 }],
      walls: [],
    });
    expect(revealsBody(wall, { ...viewer, yaw: 0 }, target)).toBe(false);
  });
});
describe("Spectator objective progress", () => {
  it("shows the watched teammate's plant/defuse without prompts or authority for the dead recipient", () => {
    const s = createBombMatch(
      Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true })),
      0,
      7,
    );
    startBombMatch(s, 0);
    s.phase = "live";
    s.players[5]!.hp = 0;
    s.bomb = { state: "planting", carrier: 6, site: "A", startedAt: 1000 };
    let v = bombViewFor(s, 5, 6, new BombReveal(), 2600);
    expect(objective(v, 2600)).toMatchObject({ text: "P6 · Planting…", progress: 0.5 });
    s.players[0]!.hp = 0;
    s.bomb = {
      state: "planted",
      x: 0,
      y: 0,
      z: -37,
      site: "A",
      plantedAt: 0,
      explodesAt: 40000,
      defuser: 1,
      defuseStartedAt: 1000,
      defuseMs: 5000,
    };
    v = bombViewFor(s, 0, 1, new BombReveal(), 3500);
    expect(objective(v, 3500)).toMatchObject({ text: "P1 · Defusing…", progress: 0.5 });
    expect(v.self.hp).toBe(0);
  });
});
