import { test, expect } from "@playwright/test";
test("minimap is readable at top left without overlapping equipment", async ({ page }) => {
  await page.route("**/__bomb_map__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<html><head><link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/components/fps/duel.css"><link rel="stylesheet" href="/src/components/fps/bomb.css"><script type="module">import R from '/@react-refresh';R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><main></main></body></html>`,
    }),
  );
  await page.goto("/__bomb_map__");
  await page.evaluate(async () => {
    const { mountMinimap } = await import("/tests/e2e/helpers/bomb-minimap-harness.tsx" as string);
    mountMinimap(document.querySelector("main")!);
  });
  for (const height of [800, 600]) {
    await page.setViewportSize({ width: 1280, height });
    await expect(page.getByLabel("Sandgate minimap")).toBeVisible();
    const m = await page.getByLabel("Sandgate minimap").boundingBox(),
      e = await page.locator(".bomb-equipment").boundingBox();
    expect(m!.x).toBeLessThan(30);
    expect(m!.y + m!.height).toBeLessThan(e!.y);
    await page.screenshot({ path: `test-results/bomb-minimap-${height}.png` });
  }
});
