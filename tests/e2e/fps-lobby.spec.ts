import { test, expect } from "@playwright/test";

test.use({ baseURL: process.env.FPS_APP_BASE_URL ?? "http://127.0.0.1:4180" });
test("PvPStrike shows the supplied full-screen arena with separate creation and clear terms", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/fps-duel");
  await expect(page.getByRole("heading", { name: "PvPStrike", exact: true })).toBeVisible();
  const hero = page.locator(".strike-stage");
  await expect(hero.getByText("Server-validated hits", { exact: true })).toBeVisible();
  await expect(hero).not.toContainText("No download");
  await expect(hero).not.toContainText("M4A1-S / AK-47");
  await expect(hero).not.toContainText("Best of 13");
  await expect(page.getByRole("tab", { name: "Open games" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".strike-stage-room img")).toHaveJSProperty("naturalWidth", 1672);
  expect(await page.locator("canvas").count()).toBe(0);
  const nav = page.locator("header nav");
  const links = await nav.getByRole("link").allTextContents();
  expect(links[links.findIndex((t) => t.trim() === "8 Pool") + 1]?.trim()).toBe("PvPStrike");
  await page.getByRole("tab", { name: "Create game", exact: true }).click();
  await expect(page.getByText("Have a private invitation?", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Private room — invitation only", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in to play" })).toBeVisible();
  await expect(page.getByText("Platform fee · 5%", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Best of 13 · First to seven wins. Switch sides after round six."),
  ).toBeVisible();
  await expect(page.locator(".strike-mode-card")).toHaveCount(3);
  await expect(page.locator(".strike-mode-soon")).toHaveCount(2);
  const artwork = await page
    .locator(".strike-mode-card img")
    .evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src));
  expect(new Set(artwork).size).toBe(3);
  for (const image of await page.locator(".strike-mode-card img").all())
    await expect
      .poll(() => image.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBe(768);
  await page.getByRole("button", { name: /Battle Royale/ }).click();
  await expect(page.getByRole("link", { name: "Play Battle Royale" })).toHaveAttribute(
    "href",
    "/fps-br",
  );
  await expect(
    page.getByRole("link", { name: "Practice Battle Royale", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Defuse the Bomb/ }).click();
  await expect(page.locator(".strike-play-now")).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Practice Defuse the Bomb", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /1v1 Duel/ }).click();
  await page.getByRole("button", { name: "Play Now", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Open games" })).toBeFocused();
  await page.getByRole("tab", { name: "Create game", exact: true }).click();
  // The creation panel deliberately scrolls on laptop-height screens. Verify
  // the action is reachable inside it.
  await page.locator(".strike-panel .strike-primary").scrollIntoViewIfNeeded();
  const actionVisible = await page.locator(".strike-panel .strike-primary").evaluate((element) => {
    const button = element.getBoundingClientRect(),
      panel = element.closest(".strike-panel")!.getBoundingClientRect();
    // Scroll offsets round to device pixels; layout bounds may remain fractional.
    return button.top >= panel.top - 1 && button.bottom <= panel.bottom + 1;
  });
  expect(actionVisible).toBe(true);
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
