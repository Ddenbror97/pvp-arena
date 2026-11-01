import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

for (const seat of ["A", "B"] as const)
  test(`halftime swaps the actual opponent model once for seat ${seat}`, async ({ page }) => {
    await fixture(page, seat);
    for (const round of [1, 2, 3, 4]) {
      await page.evaluate(
        async ({ round }) => {
          const f = Reflect.get(window, "fpsPolishTest");
          const { spawnSide } = await import("/src/lib/fps/sides.ts");
          const { SPAWNS } = await import("/src/lib/fps/map.ts");
          f.state.round = round;
          for (const s of ["A", "B"] as const)
            Object.assign(f.state.players[s], SPAWNS[spawnSide(f.state, s)], { hp: 100, y: 0 });
          f.resetView();
        },
        { round },
      );
      const police = round <= 2 ? seat === "B" : seat === "A";
      await expect
        .poll(() =>
          page.evaluate(
            () => Reflect.get(window, "fpsPolishTest").controls.diagnostics().opponentModel,
          ),
        )
        .toBe(police ? "officer" : "masked-fighter");
      expect(
        await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.id),
      ).toBe("local-test-officer");
    }
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
  });
