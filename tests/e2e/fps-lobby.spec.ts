import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.FPS_APP_BASE_URL ?? process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173",
});

test("FPS lobby preserves identity, terms and truthful unavailable state", async ({ page }) => {
  await page.goto("/fps-duel");
  await expect(page.getByRole("heading", { name: "ONE ARENA. ONE WINNER." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to play" })).toBeVisible();
  await expect(page.getByText("Platform fee · 5%")).toBeVisible();
  await page.getByRole("button", { name: "Best of 9" }).click();
  await expect(page.getByText("First to 5", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".duel-hero-art")).toHaveJSProperty("naturalWidth", 1672);
  await page.screenshot({ path: "test-results/fps-lobby-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Make your stand." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/fps-lobby-mobile.png", fullPage: true });
});

test("FPS match renders a WebGL arena and requires existing sign-in", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/fps/00000000-0000-4000-8000-000000000001");
  await expect(page.locator(".duel-render-host canvas")).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/fps-arena-desktop.png" });
  expect(errors).toEqual([]);
});
