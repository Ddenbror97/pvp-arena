import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("both rigs keep their combat head at the shared standing, crouched and jumping height", async ({
  page,
}) => {
  await fixture(page);
  const poses = await page.evaluate(async () => {
    const characterPath = "/src/lib/fps/character.ts",
      weaponPath = "/src/lib/fps/weapon.ts",
      volumePath = "/src/lib/fps/player-volumes.ts";
    const { createCharacter } = await import(characterPath),
      { createWeaponKit } = await import(weaponPath),
      { playerVolumes } = await import(volumePath);
    const kit = createWeaponKit(),
      results = [];
    for (const seat of ["A", "B"]) {
      const actor = createCharacter(seat, null, kit);
      await actor.ready;
      if (!actor.loaded) throw new Error("The authored character did not load");
      const head = actor.root.getObjectByName("combat-head");
      for (const crouched of [false, true])
        for (const y of [0, 0.5]) {
          actor.root.position.set(1, y, 2);
          actor.update(16, 100, 0, true, crouched, { airborne: y > 0 });
          actor.root.updateMatrixWorld(true);
          let finite = true;
          actor.root.traverse((object: { matrixWorld: { elements: number[] } }) => {
            finite &&= object.matrixWorld.elements.every(Number.isFinite);
          });
          results.push({
            seat,
            crouched,
            y,
            actual: head.matrixWorld.elements[13],
            rendered: actor.root.getObjectByName("head-center").matrixWorld.elements[13],
            expected: playerVolumes({ x: 1, y, z: 2, crouched }).head.center.y,
            finite,
          });
        }
      actor.dispose();
    }
    kit.dispose();
    return results;
  });
  for (const pose of poses) {
    expect(pose.actual).toBeCloseTo(pose.expected, 6);
    expect(pose.rendered).toBeCloseTo(pose.expected, 5);
    expect(pose.finite).toBe(true);
  }
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("shooting the rendered opponent registers body hits and headshots", async ({ page }) => {
  for (const headshot of [false, true]) {
    await fixture(page);
    await page.evaluate((headshot) => {
      const f = Reflect.get(window, "fpsPolishTest");
      Object.assign(f.state.players.A, {
        x: 9,
        z: 3,
        yaw: 0,
        pitch: headshot ? 0 : Math.atan2(1 - 1.6, 6),
      });
      Object.assign(f.state.players.B, { x: 9, z: -3, yaw: Math.PI, pitch: 0 });
      f.state.round++;
      f.resetView();
    }, headshot);
    await page.locator("canvas").click();
    await page.mouse.down();
    await expect
      .poll(() =>
        page.evaluate(
          (type) =>
            Reflect.get(window, "fpsPolishTest").eventLog.some(
              (event: { type: string; seat: string }) => event.type === type && event.seat === "A",
            ),
          headshot ? "headshot" : "hit",
        ),
      )
      .toBe(true);
    await page.mouse.up();
    expect(
      await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.B.hp),
    ).toBeLessThan(100);
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
  }
});
