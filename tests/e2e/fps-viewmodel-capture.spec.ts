import { test } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

/**
 * Manual visual capture of the first-person AK (skipped unless CAPTURE_DIR is set):
 *
 *   CAPTURE_DIR=out CAPTURE_PHASES=0.1,0.2 CAPTURE_EMPTY=1 npx playwright test fps-viewmodel-capture
 *
 * Drives the real reload state (reloadUntil / ammo) through the real renderer, freezing the clock
 * at each phase. CAPTURE_EMPTY=1 empties the magazine first so the empty-reload clip plays.
 */
const out = process.env["CAPTURE_DIR"];
test.skip(!out, "visual capture only runs with CAPTURE_DIR");

test("capture first-person AK idle and reload phases", async ({ page }) => {
  await fixture(page, (process.env["CAPTURE_SEAT"] as "A" | "B") ?? "A");
  await page.evaluate(
    ({ empty }) => {
      const t = Reflect.get(window, "fpsPolishTest");
      // Software WebGL is slow; keep the live round open for the whole capture.
      t.state.phaseEndsAt = Date.now() + 3_600_000;
      if (empty) t.state.players[t.seat].ammo = 0;
    },
    {
      empty: process.env["CAPTURE_EMPTY"] === "1",
    },
  );
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/idle.png` });
  const reloadMs = await page.evaluate(async () => {
    const { WEAPONS } = await import("/src/lib/fps/simulation.ts" as string);
    return WEAPONS.rifle.reloadMs as number;
  });
  const phases = (process.env["CAPTURE_PHASES"] ?? "0.12,0.3,0.45,0.6,0.75,0.9")
    .split(",")
    .filter(Boolean)
    .map(Number);
  for (const phase of phases) {
    await page.evaluate(
      ({ phase, reloadMs }) => {
        // Freeze wall-clock time so the pose is exactly this phase while frames keep rendering.
        const real = Reflect.get(window, "fpsRealNow") ?? Date.now.bind(Date);
        Reflect.set(window, "fpsRealNow", real);
        const frozen = real();
        Date.now = () => frozen;
        const t = Reflect.get(window, "fpsPolishTest");
        t.state.players[t.seat].reloadUntil = frozen + reloadMs * (1 - phase);
      },
      { phase, reloadMs },
    );
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${out}/reload-${String(Math.round(phase * 1000)).padStart(4, "0")}.png`,
    });
  }
});
