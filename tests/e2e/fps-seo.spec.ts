import { test, expect } from "@playwright/test";
import { FPS_GUIDE_SLUGS, FPS_GROUPS } from "../../src/content/guides/fps-topics";
const base = process.env.FPS_SEO_URL ?? "https://pvpspinarena-staging.pvpspinarena.workers.dev";
if (
  !["https://pvpspinarena-staging.pvpspinarena.workers.dev", "https://pvpspinarena.com"].includes(
    base,
  )
)
  throw Error("Unknown SEO test host");
test.use({ baseURL: base, trace: "off", video: "off" });
test.skip(process.env.FPS_SEO_E2E !== "1", "Explicit hosted SEO opt-in");

test("all FPS guides are server-rendered, unique, indexable and discoverable", async ({
  request,
}, info) => {
  test.setTimeout(240000);
  const paths = [
    "/fps-1v1",
    "/guides/topics/fps-and-aim",
    ...FPS_GUIDE_SLUGS.map((s) => "/guides/" + s),
  ];
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  const titles = new Set<string>(),
    records: object[] = [];
  for (let start = 0; start < paths.length; start += 4) {
    for (const { path, html, status } of await Promise.all(
      paths.slice(start, start + 4).map(async (path) => {
        const r = await request.get(path);
        return { path, html: await r.text(), status: r.status() };
      }),
    )) {
      expect(status, path).toBe(200);
      expect(html.match(/<h1\b/g)?.length, path + " h1").toBe(1);
      expect(html, path + " robots").not.toMatch(/name="robots"[^>]*content="[^"]*noindex/);
      const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0] ?? "";
      expect(canonical, path + " canonical").toContain(`https://pvpspinarena.com${path}`);
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
      expect(title, path + " title").not.toBe("");
      expect(titles.has(title), path + " duplicate title").toBe(false);
      titles.add(title);
      expect(xml, path + " sitemap").toContain(`https://pvpspinarena.com${path}</loc>`);
      expect(html, path + " error boundary").not.toContain("This page didn&#x27;t load");
      if (path.startsWith("/guides/") && !path.includes("/topics/")) {
        expect(html, path + " product link").toContain('href="/fps-1v1"');
        expect(html, path + " topic link").toContain('href="/guides/topics/fps-and-aim"');
        expect(html, path + " article schema").toMatch(/"@type":"Article"/);
      }
      if (path === "/fps-1v1") {
        expect(html).toContain("Recent settled PvPStrike matches");
        expect(html).toContain("Data as of");
        expect(html).not.toContain("Match data is temporarily unavailable");
        expect(html).toMatch(/"@type":"VideoGame"/);
      }
      records.push({ path, status, title, canonical: true, inSitemap: true });
    }
  }
  const hub = await (await request.get("/guides")).text();
  expect(hub).toContain("/guides/topics/fps-and-aim");
  const topic = await (await request.get("/guides/topics/fps-and-aim")).text();
  for (const group of FPS_GROUPS)
    for (const slug of group.slugs) expect(topic, slug + " grouped").toContain(`/guides/${slug}`);
  const legacy = [
    "wager-app",
    "checkmate-gaming-review",
    "gamersaloon-review",
    "wagr-review",
    "fortnite-gambling",
    "skill-based-gambling",
    "cs2-betting",
    "valorant-betting",
    "cod-wagers",
    "games-that-pay-real-money",
    "gamefi",
    "play-to-earn-games",
    "provably-fair-games",
  ];
  for (let i = 0; i < legacy.length; i += 4) {
    for (const { slug, html, status } of await Promise.all(
      legacy.slice(i, i + 4).map(async (slug) => {
        const r = await request.get("/guides/" + slug);
        return { slug, html: await r.text(), status: r.status() };
      }),
    )) {
      expect(status, slug + " legacy page").toBe(200);
      expect(
        FPS_GUIDE_SLUGS.some((target) => html.includes(`href="/guides/${target}"`)),
        slug + " rendered new-guide link",
      ).toBe(true);
    }
  }
  await info.attach("seo-crawl", {
    body: JSON.stringify({ records, guideHub: true, groups: FPS_GROUPS.length }),
    contentType: "application/json",
  });
});

test("calculators, mobile layout and contextual navigation work", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/guides/edpi-calculator");
  await page.getByLabel("Mouse DPI", { exact: true }).fill("400");
  await page.getByLabel("In-game sensitivity", { exact: true }).fill("2");
  await expect(page.locator("output")).toContainText("800 eDPI");
  await page.goto("/guides/k-d-ratio");
  await page.getByLabel("Deaths", { exact: true }).fill("0");
  await expect(page.locator("output")).toContainText("Undefined ratio");
  await page.goto("/fps-1v1");
  expect(await page.locator("#fps-activity tbody tr").count()).toBeLessThanOrEqual(8);
  await page.screenshot({ path: info.outputPath("fps-landing-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: info.outputPath("fps-landing-mobile.png"), fullPage: true });
  await page.goto("/guides/topics/fps-and-aim");
  await page.screenshot({ path: info.outputPath("fps-topic-mobile.png"), fullPage: true });
  await page.locator('a[href="/guides/fps-for-money-hub"]').first().click();
  await expect(page).toHaveURL(/\/guides\/fps-for-money-hub$/);
  expect(errors).toEqual([]);
});
