import { test, expect } from "@playwright/test";
import { FPS_WAVE2_SLUGS } from "../../scripts/fps-wave2-plan";

test("all Wave 2 URLs appear in the sitemap and FPS topic hub", async ({ page, request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  await page.goto("/guides/topics/fps-and-aim");
  for (const slug of FPS_WAVE2_SLUGS) {
    expect(xml).toContain(`/guides/${slug}</loc>`);
    await expect(page.locator(`a[href="/guides/${slug}"]`).first()).toBeAttached();
  }
});

test("Wave 2 articles render their intent, contents and six FAQ schema entries", async ({
  page,
}) => {
  for (const slug of [
    "deadshot-io",
    "games-like-valorant",
    "earn-crypto-playing-games",
    "mouse-dpi",
    "ak-47-skins",
    "nuke-callouts",
  ]) {
    await page.goto(`/guides/${slug}`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).not.toBeEmpty();
    const structured = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = structured.flatMap((text) => {
      const data = JSON.parse(text);
      return data["@graph"] ?? [data];
    });
    const faq = nodes.find((node) => node["@type"] === "FAQPage");
    expect(faq?.mainEntity).toHaveLength(6);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/guides/${slug}$`),
    );
    await expect(page.locator('a[href="/guides/topics/fps-and-aim"]').first()).toBeAttached();
  }
});

test("the local accuracy drill counts misses, completes and resets without a rank claim", async ({
  page,
}) => {
  await page.goto("/guides/mouse-accuracy-test");
  const drill = page.locator("#calculator");
  await drill.getByRole("button", { name: "Start drill" }).click();
  const board = drill.locator(".relative.h-72");
  await board.click({ position: { x: 4, y: 4 } });
  await expect(drill.locator("output")).toContainText("1 misses");
  for (let i = 1; i <= 15; i++)
    await drill.getByRole("button", { name: `Target ${i} of 15`, exact: true }).click();
  await expect(drill.locator("output")).toContainText("15 / 15 targets");
  await expect(drill.locator("output")).toContainText("Accuracy 94%");
  await drill.getByRole("button", { name: "Start drill" }).click();
  await expect(drill.locator("output")).toContainText("0 / 15 targets · 0 misses");
});
