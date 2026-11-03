import { test, expect } from "@playwright/test";
test("Bomb artwork preloads independently from the 1v1 rotation", async ({ page }) => {
  await page.goto("/fps-duel");
  await expect(page.getByRole("link", { name: "Practice defuse the bomb" })).toBeVisible();
  await page.getByRole("link", { name: "Practice defuse the bomb" }).hover();
  const art = await page.evaluate(async () => {
    const { BOMB_LOADING_IMAGE, warmBombLoadingImage } = await import(
      "/src/lib/fps/bomb/loading.ts" as string
    );
    const { ROTATION_MAP_IDS } = await import("/src/lib/fps/maps/registry.ts" as string);
    warmBombLoadingImage();
    warmBombLoadingImage();
    const img = new Image();
    img.src = BOMB_LOADING_IMAGE;
    await img.decode();
    return {
      src: img.src,
      width: img.naturalWidth,
      height: img.naturalHeight,
      preloads: document.querySelectorAll("link[data-bomb-loading]").length,
      rotation: ROTATION_MAP_IDS,
    };
  });
  expect(art.width).toBe(1672);
  expect(art.height).toBe(941);
  expect(art.preloads).toBe(1);
  expect(art.rotation).toHaveLength(5);
  expect(art.rotation).not.toContain("sandgate");
  expect(art.src).toContain("sandgate-loading");
});
