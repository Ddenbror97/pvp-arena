import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("Police M4A1 loads, its suppressed bore converges at ten metres, and inspect is cosmetic", async ({
  page,
}, info) => {
  test.setTimeout(600_000);
  await fixture(page, "A");
  await expect
    .poll(() => page.locator("canvas").getAttribute("data-authored-models"), { timeout: 300_000 })
    .toBe("ready");
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js" as string);
    const { createAuthoredViewmodel, M4_VIEWMODEL } = await import(
      "/src/lib/fps/authored-viewmodel.ts" as string
    );
    const { M4_VIEWMODEL_REST: r } = await import("/src/lib/fps/renderer.ts" as string);
    const parent = new T.Group();
    parent.position.set(r.x, r.y, r.z);
    parent.rotation.set(r.pitch, r.yaw, r.roll);
    const model = createAuthoredViewmodel(parent, true, M4_VIEWMODEL);
    await model.ready;
    model.update(true, 0, 0);
    parent.updateWorldMatrix(true, true);
    const origin = parent.localToWorld(model.muzzle().clone());
    const direction = new T.Vector3(0, 0, -1).transformDirection(parent.matrixWorld);
    const convergence = origin.clone().addScaledVector(direction, (-10 - origin.z) / direction.z);
    const camera = new T.PerspectiveCamera(60, 1280 / 800, 0.03, 20);
    const projected = convergence.clone().project(camera);
    // Every reload pose resolves (no missing grips or markers) and returns to rest.
    for (const kind of ["tactical", "empty"] as const)
      for (let p = 0.02; p < 1; p += 0.04) model.update(true, p, 0, kind);
    model.update(true, 0, 0);
    const port = model.ejectionPort(new T.Vector3());
    const names: string[] = [];
    model.root.traverse((o: { name: string; isMesh?: boolean }) => {
      if (o.isMesh) names.push(o.name);
    });
    const out = {
      variant: model.variant,
      convergence: convergence.toArray(),
      pixels: [projected.x * 640, projected.y * 400],
      ejectionPort: port?.toArray() ?? null,
      muzzle: origin.toArray(),
      names,
    };
    model.dispose();
    return out;
  });
  await info.attach("m4-bore", { body: JSON.stringify(result), contentType: "application/json" });
  expect(result.variant).toBe("m4");
  // Police arms: bare forearm with the olive sleeve and the field watch.
  expect(result.names).toContain("continuous-rifle-forearms-L");
  expect(result.names).toContain("rifle-arm-L-sleeve");
  expect(result.names.some((n: string) => n.startsWith("rifle-arm-L-watch"))).toBe(true);
  expect(Math.abs(result.pixels[0]!)).toBeLessThan(1);
  expect(Math.abs(result.pixels[1]!)).toBeLessThan(1);
  // The ejection port is on the right of the receiver, behind the muzzle.
  expect(result.ejectionPort).not.toBeNull();
  expect(result.ejectionPort![2]!).toBeGreaterThan(result.muzzle[2]!);
  // Inspection never changes ammunition, reload state or the weapon.
  await page.locator(".duel-render-host").click();
  const before = await page.evaluate(() => {
    const t = Reflect.get(window, "fpsPolishTest");
    const p = t.state.players[t.seat];
    return { ammo: p.ammo, reserve: p.reserve, reloadUntil: p.reloadUntil, weapon: p.weapon };
  });
  await page.keyboard.press("KeyF");
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => {
    const t = Reflect.get(window, "fpsPolishTest");
    const p = t.state.players[t.seat];
    return { ammo: p.ammo, reserve: p.reserve, reloadUntil: p.reloadUntil, weapon: p.weapon };
  });
  expect(after).toEqual(before);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
