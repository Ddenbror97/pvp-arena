import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

type SlotWindow = Window & {
  startSlotSpin: (pending?: boolean) => number[];
  resolveSlotSpin: () => void;
};
let server: http.Server, origin: string;
test.beforeAll(async () => {
  const root = process.cwd();
  const styles = fs
    .readdirSync(path.join(root, ".output/public/assets"))
    .find((n) => /^styles-.*\.css$/.test(n));
  if (!styles) throw Error("Run npm run build before this browser regression.");
  const bundle = await build({
    entryPoints: ["tests/e2e/helpers/slott-reveal-harness.tsx"],
    bundle: true,
    write: false,
    outdir: ".wrangler/slott-reveal",
    format: "esm",
    jsx: "automatic",
    alias: { "@": path.resolve("src") },
    loader: { ".webp": "dataurl" },
    logLevel: "silent",
  });
  server = http.createServer((req, res) => {
    const url = new URL(req.url!, "http://localhost").pathname;
    if (url === "/")
      return res.end(
        `<!doctype html><html class="dark"><head><link rel="stylesheet" href="/assets/${styles}"><link rel="stylesheet" href="/harness.css"></head><body><div id="root"></div><script type="module" src="/harness.js"></script></body></html>`,
      );
    if (url === "/harness.js" || url === "/harness.css") {
      const output = bundle.outputFiles.find((f) =>
        f.path.endsWith(url.endsWith(".js") ? ".js" : ".css"),
      )!;
      return res
        .writeHead(200, { "content-type": url.endsWith(".js") ? "text/javascript" : "text/css" })
        .end(output.contents);
    }
    const file = path.join(root, ".output/public", url);
    if (!file.startsWith(path.join(root, ".output/public")) || !fs.existsSync(file))
      return res.writeHead(404).end();
    fs.createReadStream(file).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

test("stopped reels restore symbol effects and preserve the final landing flash", async ({
  page,
}) => {
  await page.goto(origin);
  await page.waitForFunction(() => typeof (window as SlotWindow).startSlotSpin === "function");
  await page.evaluate(() => (window as SlotWindow).startSlotSpin());
  await expect(page.locator(".slott-reel-live")).toHaveCount(5);
  const first = page.locator(".slott-reel-seam").first();
  await first.locator(".slott-strip").evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
  });
  await expect(first).not.toHaveClass(/slott-reel-live/);
  expect(
    await first
      .locator(".slott-cell")
      .last()
      .evaluate((el) => getComputedStyle(el, "::before").content),
  ).not.toBe("none");
  await page.locator(".slott-strip").evaluateAll(async (strips) => {
    await Promise.all(strips.flatMap((el) => el.getAnimations().map((a) => a.finished)));
  });
  await expect(page.locator(".slott-reel-live")).toHaveCount(0);
  const lastFlash = page.locator(".slott-stop-flash").last();
  await expect(lastFlash).toHaveCount(1);
  await lastFlash.evaluate((el) => {
    const a = el.getAnimations()[0]!;
    a.pause();
    a.currentTime = Number(a.effect!.getTiming().delay) + 140;
  });
  expect(
    await lastFlash.evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
  ).toBeGreaterThan(0);
  await page.screenshot({ path: test.info().outputPath("landed-reveal.png") });
  await lastFlash.evaluate((el) => {
    const a = el.getAnimations()[0]!;
    a.currentTime = Number(a.effect!.getTiming().delay) + 400;
  });
  expect(await lastFlash.evaluate((el) => parseFloat(getComputedStyle(el).opacity))).toBe(0);
  await page.evaluate(() => (window as SlotWindow).startSlotSpin(true));
  await expect(page.locator(".slott-reel-live")).toHaveCount(5);
  await page.waitForTimeout(500);
  await expect(page.locator(".slott-reel-live")).toHaveCount(5);
  await page.evaluate(() => (window as SlotWindow).resolveSlotSpin());
  await expect(page.locator(".slott-reel-live")).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator(".slott-hit")).not.toHaveCount(0);
});

test("reduced motion shows the resolved symbols without moving reels", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin);
  await page.waitForFunction(() => typeof (window as SlotWindow).startSlotSpin === "function");
  await page.evaluate(() => (window as SlotWindow).startSlotSpin());
  await expect(page.locator(".slott-reel-live")).toHaveCount(0);
  await expect(page.locator(".slott-stop-flash")).toHaveCount(0);
});
