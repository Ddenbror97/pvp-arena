import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The hit effect is one implementation (flesh-mist.ts, drawn by impacts.ts) that 1v1, 5v5 and
 * the battle royale all call, and it is cosmetic: fed by the server's hit records, deciding
 * nothing. These read the three renderers' sources: none of them can be constructed without
 * a GPU, and what must not regress is that each still routes its hits through the shared
 * effect (the battle royale drew nothing on a hit until 2026-11-27; 1v1 and 5v5 had a pool
 * of eight 2.5 cm points of their own).
 */
const read = (file: string) => readFileSync(file, "utf8");
const duel = read("src/lib/fps/renderer.ts"),
  bomb = read("src/lib/fps/bomb/bomb-renderer.ts"),
  royale = read("src/lib/fps/br/br-arena.ts"),
  blood = read("src/lib/fps/blood-effects.ts"),
  impacts = read("src/lib/fps/impacts.ts"),
  mist = read("src/lib/fps/flesh-mist.ts"),
  feedback = read("src/lib/fps/damage-feedback.ts");

describe("the blood mist in all three games", () => {
  it("1v1 and 5v5 give their blood effect the shared particle pool", () => {
    for (const source of [duel, bomb]) {
      expect(source).toContain("createBloodEffects(scene, map, impacts)");
      expect(source).toMatch(/blood\.emit\(/);
      // On the body as drawn, and never in the lens of the body the camera is in.
      expect(source).toMatch(/mist: (other|!inLens)/);
      expect(source).toContain("anchorHit(");
      // (The old pool's per-frame update is gone with the pool.)
      expect(source).not.toContain("blood.update(");
      expect(source).toContain("blood.reset()");
      expect(source).toContain("blood.dispose()");
    }
  });
  it("the battle royale draws the same effect from its hit events", () => {
    expect(royale).toContain("impacts.flesh(woundHit");
    expect(royale).toContain("anchorHit(woundAt, seen?.pos, woundAt)");
    // Not on yourself, nor on the player you are watching through.
    expect(royale).toMatch(/else if \(e\.victim !== povSeat\)/);
    // A shotgun's pellets: one cloud, the rest light.
    expect(royale).toContain("woundHit.light = mistGiven.has(e.victim)");
  });
  it("there is one effect: the blood module has no particles of its own", () => {
    expect(blood).not.toContain("THREE.Points");
    expect(blood).toContain("particles.flesh(");
    expect(impacts).toContain("fleshBurst(hit, Math.random, burst)");
    // One draw call for debris and mist together, no second particle object.
    expect(impacts.match(/new THREE\.Points\(/g)).toHaveLength(1);
  });
  it("the pool and its textures are released with the renderer", () => {
    for (const what of ["geometry.dispose()", "pointsMaterial.dispose()", "mistMap.dispose()"])
      expect(impacts).toContain(what);
    for (const what of ["scene.remove(marks)", "material.dispose()", "texture.dispose()"])
      expect(blood).toContain(what);
  });
});

describe("incoming damage feedback in the battle royale", () => {
  it("is fed by the server's events and turned to the camera every frame", () => {
    expect(royale).toContain("createDamageFeedback(host");
    expect(royale).toMatch(/damageFx\.hit\(src \? damageFrom : null, e\.damage, armoured, now\)/);
    expect(royale).toContain("camera.getWorldDirection(lookDir)");
    expect(royale).toMatch(/kit && !kit\.dead \? kit\.hp \/ 100 : null/);
  });
  it("is cleared for a new seat, on coming back from the dead, and removed on leaving", () => {
    expect(royale).toContain("if (view.you.seat !== mySeat) damageFx.reset()");
    expect(royale).toContain("if (before?.dead && !kit.dead) damageFx.reset()");
    expect(royale).toContain("damageFx.dispose()");
  });
  it("replaced the old single arc", () => {
    expect(royale).not.toContain('kind: "hurt"');
    expect(read("src/components/fps/BrHud.tsx")).not.toContain("br-hurt");
    expect(read("src/components/fps/br.css")).not.toContain(".br-hurt");
    expect(read("src/components/fps/duel.css")).toContain(".fps-dmg-arc");
  });
});

describe("the effects decide nothing (server-authoritative hits and damage)", () => {
  it("none of the effect modules computes a hit or changes health", () => {
    for (const source of [mist, feedback, blood]) {
      expect(source).not.toMatch(/from "\.\/(combat|simulation)"|from "\.\/br\/(combat|match)"/);
      expect(source).not.toMatch(/\bhp\s*[-+]?=[^=]/);
      expect(source).not.toMatch(/raycast|applyDamage|applyBrDamage/);
    }
  });
  it("the server's files are not part of this change's effect code", () => {
    // (The mist and the overlay are in the client's renderers only.)
    for (const server of [
      "src/lib/fps/br/combat.ts",
      "src/lib/fps/br/match.ts",
      "src/lib/fps/combat.ts",
      "src/lib/fps/simulation.ts",
    ]) {
      const source = read(server);
      expect(source).not.toContain("flesh-mist");
      expect(source).not.toContain("damage-feedback");
    }
  });
});
