import { test, expect } from "@playwright/test";
for (const mode of ["bomb", "br"]) {
  test(`${mode} route uses the viewport game shell`, async ({ page }) => {
    await page.goto(`/fps-${mode}`);
    const main = page.locator("main.duel-root");
    await expect(main).toBeVisible();
    const box = await main.boundingBox();
    const view = page.viewportSize()!;
    expect(box!.x).toBe(0);
    expect(box!.y).toBe(0);
    expect(box!.width).toBe(view.width);
    expect(box!.height).toBe(view.height);
    await page.screenshot({ path: `test-results/${mode}-fullscreen-shell.png` });
  });
}
