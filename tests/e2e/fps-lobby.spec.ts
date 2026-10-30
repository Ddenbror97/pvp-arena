import { test, expect } from "@playwright/test";

test.use({ baseURL: process.env.FPS_APP_BASE_URL ?? "http://127.0.0.1:4180" });
test("PvPStrike showcases the actual game with separate creation and clear terms", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/fps-duel");
  await expect(page.getByRole("heading", { name: "PvPStrike", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Open games" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".strike-preview img")).toHaveJSProperty("naturalWidth", 1440);
  expect(await page.locator("canvas").count()).toBe(0);
  const nav = page.locator("header nav");
  const links = await nav.getByRole("link").allTextContents();
  expect(links[links.findIndex((t) => t.trim() === "8 Pool") + 1]?.trim()).toBe("PvPStrike");
  await page.getByRole("tab", { name: "Create game", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign in to play" })).toBeVisible();
  await expect(page.getByText("Platform fee · 5%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Best of 9" }).click();
  await expect(page.getByText("First to 5", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/strike-lobby-desktop.png", fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "PvPStrike" }),
    ).toBeVisible();
  }
  await page.screenshot({ path: "test-results/strike-lobby-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
