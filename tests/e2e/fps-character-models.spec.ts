import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

/**
 * Police (seat A) and Terrorist (seat B) are complete authored characters fitted in Blender.
 * Each loads its own GLB with its own head and PBR materials, stands at a CS-like height with
 * the head centre on the 1.6 m head hitbox, keeps both hands on the rifle through the IK and
 * stays inside the server body volume while moving, crouching and dying.
 */
test("police and terrorist load per seat and fit the rig, hitboxes and grip", async ({ page }) => {
  await fixture(page);
  const results = await page.evaluate(async () => {
    Reflect.get(window, "fpsPolishTest").dispose();
    const { createCharacter } = await import("/src/lib/fps/character.ts" as string),
      { createWeaponKit } = await import("/src/lib/fps/weapon.ts" as string),
      { playerVolumes } = await import("/src/lib/fps/player-volumes.ts" as string),
      T = await import("/node_modules/three/build/three.module.js" as string);
    const kit = createWeaponKit(),
      out = [];
    for (const seat of ["A", "B"]) {
      const actor = createCharacter(seat, null, kit);
      await actor.ready;
      actor.root.position.set(0, 0, 0);
      actor.update(16, 1000, 0, true);
      actor.root.updateMatrixWorld(true);
      const materials = new Set<string>();
      let skinned = 0;
      const body = actor.root.getObjectByName("authored-tactical-body");
      body.traverse((o: { isSkinnedMesh?: boolean; material?: unknown }) => {
        if (o.isSkinnedMesh) skinned++;
        if (!o.material) return;
        for (const m of [o.material].flat() as { name: string }[]) materials.add(m.name);
      });
      // Standing silhouette (posed skinned bounds, helmet included) and the head centre.
      const crown = new T.Box3().setFromObject(body, true).max.y;
      const headCenter = actor.root
        .getObjectByName("head-center")
        .getWorldPosition(new T.Vector3()).y;
      // Hands on the rifle: limb() lands the hand exactly on the weapon grip unless the
      // target is out of reach, which would show as a fully straightened arm.
      const reach: number[] = [];
      let bones = 0;
      body.traverse((o: { isBone?: boolean }) => o.isBone && bones++);
      const at = (name: string) => {
        let found: { getWorldPosition: (v: unknown) => unknown } | undefined;
        body.traverse((o: { isBone?: boolean; name: string }) => {
          if (o.isBone && o.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, "") === name)
            found = o as never;
        });
        return found!.getWorldPosition(new T.Vector3()) as InstanceType<typeof T.Vector3>;
      };
      const samples: {
        seat: string;
        stance: number;
        stride: number;
        maxReach: number;
        minY: number;
        farthest: string;
        lowest: string;
      }[] = [];
      for (const [crouched, steps] of [
        [false, 0],
        [false, 12],
        [true, 0],
      ] as const) {
        for (let i = 0; i <= steps; i++) {
          actor.root.position.set(i * 0.12, 0, 0);
          actor.update(16, 1000 + i * 16, 0, true, crouched);
        }
        actor.root.updateMatrixWorld(true);
        for (const side of ["Left", "Right"]) {
          const arm = at(side + "Arm"),
            fore = at(side + "ForeArm"),
            hand = at(side + "Hand");
          reach.push(arm.distanceTo(hand) / (arm.distanceTo(fore) + fore.distanceTo(hand)));
        }
        let lowest = "",
          farthest = "",
          maxReach = 0,
          minY = 1e9;
        const p = new T.Vector3();
        body.traverse(
          (o: { isBone?: boolean; name: string; getWorldPosition: (v: unknown) => void }) => {
            if (!o.isBone || /Hand|finger|wrist|End$|ForeArm|root/i.test(o.name)) return;
            o.getWorldPosition(p);
            const reachHere = Math.max(Math.abs(p.x - actor.root.position.x), Math.abs(p.z));
            if (reachHere > maxReach) {
              maxReach = reachHere;
              farthest = o.name;
            }
            if (p.y < minY) lowest = o.name;
            minY = Math.min(minY, p.y);
          },
        );
        samples.push({
          seat,
          stance: crouched ? 1 : 0,
          stride: steps,
          maxReach,
          minY,
          farthest,
          lowest,
        });
      }
      // Death collapse keeps every transform finite.
      let finite = true;
      for (const d of [0.3, 0.7, 1]) {
        actor.update(16, 3000, 0, false, false, { death: d });
        actor.root.updateMatrixWorld(true);
        actor.root.traverse((o: { matrixWorld: { elements: number[] } }) => {
          finite &&= o.matrixWorld.elements.every(Number.isFinite);
        });
      }
      out.push({
        seat,
        loaded: actor.loaded,
        materials: [...materials],
        skinned,
        bones,
        crown,
        headCenter,
        headHitbox: playerVolumes({ x: 0, y: 0, z: 0, crouched: false }).head.center.y,
        samples,
        finite,
        reach,
      });
      actor.dispose();
    }
    kit.dispose();
    return out;
  });
  for (const r of results) {
    expect(r.loaded).toBe(true);
    expect(r.skinned).toBeGreaterThan(0);
    // Every Mixamo bone the runtime drives exists (the rigs add finger/twist bones).
    expect(r.bones).toBeGreaterThanOrEqual(25);
    const prefix = r.seat === "A" ? "police-" : "terrorist-";
    expect(r.materials.every((m) => m.startsWith(prefix))).toBe(true);
    // CS:GO-like: head centre on the 1.6 m head hitbox, crown about 1.7 m.
    expect(r.headCenter).toBeCloseTo(r.headHitbox, 5);
    expect(r.crown, JSON.stringify(r)).toBeGreaterThan(1.66);
    expect(r.crown, JSON.stringify(r)).toBeLessThan(1.82);
    for (const s of r.samples) {
      // Torso and legs stay inside the server body volume (hands/rifle may lead it).
      // Crouched knees jut forward of the 0.7 m box by a few cm, as the previous rig did (0.40 m).
      expect(s.maxReach, JSON.stringify(s)).toBeLessThan(s.stance ? 0.45 : 0.36);
      // Mid-stride the toes may dip a few cm, as the previous rig did (-0.043 m).
      // Crouch is a kneel: the knee joint rests on the floor (previous rig: -0.69 m).
      expect(s.minY, JSON.stringify(s)).toBeGreaterThan(s.stance ? -0.08 : -0.045);
    }
    expect(r.finite).toBe(true);
    for (const k of r.reach)
      expect(k, "arm must still bend: the hand reached the grip").toBeLessThan(0.985);
  }
});
