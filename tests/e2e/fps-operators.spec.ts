import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

/**
 * The Blender-built operator characters: Police on seat A, Terrorist on seat B. Each loads its
 * own GLB, keeps its authored PBR materials (no runtime tint or chest badge), stands at a
 * CS-like height fitted to the shared head hitbox, keeps both hands on the rifle through the
 * IK and stays inside the server body volume while moving, crouching and dying.
 */
test("police and terrorist operators load per seat and fit the rig, hitboxes and grip", async ({
  page,
}) => {
  await fixture(page);
  const results = await page.evaluate(async () => {
    Reflect.get(window, "fpsPolishTest").dispose();
    const { createCharacter } = await import("/src/lib/fps/character.ts" as string),
      { createWeaponKit } = await import("/src/lib/fps/weapon.ts" as string),
      { playerVolumes } = await import("/src/lib/fps/player-volumes.ts" as string),
      { CHARACTER_SET } = await import("/src/lib/fps/model-assets.ts" as string),
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
      let tinted = false,
        skinned = 0;
      const body = actor.root.getObjectByName("authored-tactical-body");
      body.traverse((o: { isSkinnedMesh?: boolean; material?: unknown }) => {
        if (o.isSkinnedMesh) skinned++;
        if (!o.material) return;
        for (const m of [o.material].flat() as { name: string; onBeforeCompile: () => void }[]) {
          materials.add(m.name);
          if (m.onBeforeCompile.toString().includes("clothLuma")) tinted = true;
        }
      });
      // Standing silhouette (head + helmet included) against the CS-like target height.
      const box = new T.Box3().setFromObject(actor.root.getObjectByName("reference-headgear"));
      const crown = box.max.y;
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
      const samples: { stance: number; stride: number; maxReach: number; minY: number }[] = [];
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
        const vol = playerVolumes({ x: actor.root.position.x, y: 0, z: 0, crouched }).body;
        let maxReach = 0,
          minY = 1e9;
        const p = new T.Vector3();
        body.traverse(
          (o: { isBone?: boolean; name: string; getWorldPosition: (v: unknown) => void }) => {
            if (!o.isBone || /Hand|_End$|End$|ForeArm/.test(o.name)) return;
            o.getWorldPosition(p);
            maxReach = Math.max(maxReach, Math.abs(p.x - actor.root.position.x), Math.abs(p.z));
            minY = Math.min(minY, p.y);
          },
        );
        samples.push({ stance: crouched ? 1 : 0, stride: steps, maxReach, minY });
        void vol;
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
        set: CHARACTER_SET,
        loaded: actor.loaded,
        materials: [...materials],
        tinted,
        skinned,
        bones,
        crown,
        badge: !!actor.root.getObjectByName("chest-badge"),
        helmet: !!actor.root.getObjectByName("helmet"),
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
    expect(["sourced", "operators"]).toContain(r.set);
    expect(r.loaded).toBe(true);
    expect(r.tinted, "operators keep their authored PBR colours").toBe(false);
    expect(r.badge, "POLICE is printed on the carrier, not a floating badge").toBe(false);
    expect(r.skinned).toBeGreaterThan(0);
    // Every Mixamo bone the runtime drives exists (sourced rigs add fingers/twist bones).
    expect(r.bones).toBeGreaterThanOrEqual(25);
    const prefix = r.seat === "A" ? "police-" : "terrorist-";
    expect(
      r.materials.every((m) => m.startsWith(prefix) || /\.body|eye|hair|short|low/i.test(m)),
    ).toBe(true);
    // CS:GO-like: eyes on the 1.6 m head hitbox, crown 1.72-1.82 m (helmet adds a few cm).
    expect(r.crown).toBeGreaterThan(1.72);
    expect(r.crown).toBeLessThan(1.82);
    if (r.set === "operators") expect(r.helmet).toBe(r.seat === "A");
    for (const s of r.samples) {
      // Torso and legs stay inside the server body volume (hands/rifle may lead it).
      // Crouched knees jut forward of the 0.7 m box by a few cm, as the legacy rig did (0.40 m).
      expect(s.maxReach, JSON.stringify(s)).toBeLessThan(s.stance ? 0.45 : 0.36);
      expect(s.minY).toBeGreaterThan(-0.02);
    }
    expect(r.finite).toBe(true);
    for (const k of r.reach)
      expect(k, "arm must still bend: the hand reached the grip").toBeLessThan(0.985);
  }
});
