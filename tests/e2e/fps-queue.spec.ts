import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { assertStaging, connect, seedSyntheticUser } from "../../scripts/fps/staging-lib.mjs";

const baseURL = process.env.FPS_STAGING_APP_URL ?? "http://127.0.0.1:4180";
test.use({ baseURL, trace: "off", video: "off" });
test.skip(process.env.FPS_STAGING_E2E !== "1", "Isolated staging opt-in required");

test("a hosting human can warm up against a free bot and accept the human join inside the menu", async ({
  page,
  browser,
}) => {
  assertStaging();
  if (!/^https:\/\/pvpspinarena-staging\.[a-z0-9-]+\.workers\.dev$/.test(baseURL))
    throw Error("Hosted staging target required");
  const users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(16, 18);
  const sql = connect(2),
    ids = users.map((u: { id: string }) => u.id);
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
  const other = await context.newPage();
  const errors: string[] = [];
  for (const p of [page, other]) p.on("pageerror", (e) => errors.push(e.message));
  async function cleanup() {
    for (const row of await sql`select id from fps_matches where status in ('WAITING','FUNDED') and creator_id=any(${ids}::uuid[])`)
      await sql`select _fps_refund(${row.id}::uuid,'NO_SHOW')`;
    await sql`update fps_private.practice_matches set status='CANCELLED',reason='TEST_CLEANUP' where owner_id=any(${ids}::uuid[]) and status='FUNDED'`;
  }
  async function login(p: Page, user: { email: string; password: string }) {
    await p.goto("/auth");
    await p.locator("#email").fill(user.email);
    await p.locator("#password").fill(user.password);
    await p.locator("button[type=submit]").click();
    await expect.poll(() => p.url()).not.toContain("/auth");
    await p.goto("/fps-duel");
  }
  try {
    await cleanup();
    for (const user of users) await seedSyntheticUser(sql, user.id);
    await login(page, users[0]);
    await login(other, users[1]);
    await page.getByRole("tab", { name: "Create game", exact: true }).click();
    await page.getByLabel("I accept this entry", { exact: false }).check();
    await page.getByRole("button", { name: "Create game", exact: true }).click();
    await expect(page.getByText("Your human-only cash room is open.")).toBeVisible();
    await expect(page).toHaveURL(/\/fps-duel$/);
    const cash = (
      await sql`select id from fps_matches where creator_id=${users[0].id} and status='WAITING'`
    )[0].id;
    await page.getByRole("button", { name: "Practice vs bot", exact: false }).click();
    await expect(page).toHaveURL(/\/fps\/[a-f0-9-]{36}$/);
    const practice = new URL(page.url()).pathname.split("/").at(-1)!;
    expect(practice).not.toBe(cash);
    await page.bringToFront();
    await page.getByRole("button", { name: "Ready & enter arena", exact: true }).click();
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    const username = (await sql`select username from profiles where id=${users[0].id}`)[0].username;
    const room = other.locator(".strike-room-list li").filter({ hasText: username });
    await room.getByRole("button", { name: "Join", exact: true }).click();
    const review = other.getByRole("dialog");
    await review.getByLabel("I accept this room’s entry", { exact: false }).check();
    await review.getByRole("button", { name: "Join for $1.00" }).click();
    await expect(other).toHaveURL(new RegExp("/fps/" + cash));
    await page.bringToFront();
    const menu = page.getByRole("dialog");
    await expect(menu.getByText("Your human opponent joined.")).toBeVisible();
    await menu.getByRole("button", { name: "Join now", exact: true }).click();
    await expect(page).toHaveURL(new RegExp("/fps/" + cash));
    expect(
      (await sql`select status from fps_private.practice_matches where id=${practice}`)[0].status,
    ).toBe("CANCELLED");
    expect((await sql`select status from fps_matches where id=${cash}`)[0].status).toBe("FUNDED");
    expect(errors).toEqual([]);
    await page.screenshot({ path: "test-results/fps-queue-accepted.png" });
  } finally {
    await context.close();
    await cleanup();
    await sql.end();
  }
});
