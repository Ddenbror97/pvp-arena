import { test, expect, type Page } from "@playwright/test";
test.use({ baseURL: process.env.FPS_APP_BASE_URL ?? "http://127.0.0.1:4180" });
async function observe(page: Page) {
  await page.addInitScript(() => {
    const shifts: { value: number; recent: boolean }[] = [];
    Object.assign(window, { strikeShifts: shifts });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        shifts.push({ value: e.value, recent: e.hadRecentInput });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}
const shifts = (page: Page) =>
  page.evaluate(() => {
    const values = (window as unknown as { strikeShifts: { value: number; recent: boolean }[] })
      .strikeShifts;
    return {
      total: values.reduce((n, e) => n + e.value, 0),
      withoutInput: values.filter((e) => !e.recent).reduce((n, e) => n + e.value, 0),
    };
  });
test("cold lobby holds its full-screen plate and controls while image and data arrive", async ({
  page,
}, info) => {
  await observe(page);
  await page.goto("/fps-duel");
  await expect(page.getByRole("tab", { name: "Create game", exact: true })).toBeEnabled();
  await expect(page.locator(".strike-stage-room img")).toHaveJSProperty("naturalWidth", 1672);
  await page.waitForTimeout(2500);
  const geometry = await page.evaluate(() => {
    const image = document.querySelector(".strike-stage-room")!.getBoundingClientRect(),
      hero = document.querySelector(".strike-stage")!.getBoundingClientRect();
    return {
      left: image.left,
      width: image.width,
      viewport: document.body.clientWidth,
      height: hero.height,
      available: innerHeight - document.querySelector("header")!.getBoundingClientRect().height,
    };
  });
  expect(geometry.left).toBe(0);
  expect(geometry.width).toBe(geometry.viewport);
  expect(geometry.height).toBeGreaterThanOrEqual(geometry.available - 1);
  expect((await shifts(page)).withoutInput).toBeLessThan(0.01);
  await info.attach("cold-lobby-layout", {
    body: JSON.stringify({ geometry, shifts: await shifts(page) }),
    contentType: "application/json",
  });
});
test("navigation intent warms one shared image and lobby chunks without the 3D engine", async ({
  page,
}, info) => {
  const requested: string[] = [];
  const images: string[] = [];
  page.on("request", (r) => {
    requested.push(r.url());
    if (r.resourceType() === "image") images.push(r.url());
  });
  await page.goto("/fairness");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  const before = requested.length;
  const nav = page.locator("header nav").getByRole("link", { name: "PvPStrike", exact: true });
  await nav.hover();
  await expect
    .poll(() => images.filter((url) => /arena-showcase.*\.webp/.test(url)).length)
    .toBe(1);
  await page.waitForTimeout(700);
  const hover = requested.slice(before);
  expect(hover.some((url) => /\/renderer(?!-loader)[-.]|\/fps\/models\//.test(url))).toBe(false);
  const started = Date.now();
  await nav.click();
  await expect(page.getByRole("heading", { name: "PvPStrike", exact: true })).toBeVisible();
  await expect(page.locator(".strike-stage-room img")).toHaveJSProperty("complete", true);
  expect(await page.locator("canvas").count()).toBe(0);
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => e.name.includes("arena-showcase") && !e.name.includes("?import"))
      .map((e) => ({ url: e.name, bytes: (e as PerformanceResourceTiming).transferSize })),
  );
  expect(resources.length).toBe(1);
  await info.attach("hover-navigation", {
    body: JSON.stringify({ visibleAfterClickMs: Date.now() - started, hover, resources }),
    contentType: "application/json",
  });
});
test("cold arena reserves its viewport through chunk and authored-model loading", async ({
  page,
}, info) => {
  await observe(page);
  await page.goto("/fps/00000000-0000-4000-8000-000000000001");
  await expect(page.locator(".duel-game")).toHaveAttribute("data-arena-ready", "true", {
    timeout: 60000,
  });
  await expect(page.locator(".duel-render-host canvas")).toBeVisible();
  await expect(page.locator(".duel-render-host canvas")).toHaveAttribute(
    "data-authored-models",
    "ready",
  );
  const size = await page.evaluate(() => {
    const root = document.querySelector(".duel-root")!.getBoundingClientRect(),
      canvas = document.querySelector("canvas")!.getBoundingClientRect();
    return {
      root: [root.width, root.height],
      canvas: [canvas.width, canvas.height],
      viewport: [innerWidth, innerHeight],
    };
  });
  expect(size.root).toEqual(size.viewport);
  expect(size.canvas).toEqual(size.viewport);
  await page.waitForTimeout(1000);
  expect((await shifts(page)).withoutInput).toBeLessThan(0.01);
  await info.attach("cold-arena-layout", {
    body: JSON.stringify({ size, shifts: await shifts(page) }),
    contentType: "application/json",
  });
  await page.screenshot({ path: "test-results/showcase-arena-ready.png" });
});
