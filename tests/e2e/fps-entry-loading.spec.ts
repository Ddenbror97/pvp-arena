import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { assertStaging, connect, seedSyntheticUser } from "../../scripts/fps/staging-lib.mjs";
import type { MatchState } from "../../src/lib/fps/protocol";

const baseURL = "https://pvpspinarena-staging.pvpspinarena.workers.dev";
test.use({ baseURL, trace: "off", video: "off" });
test.skip(process.env.FPS_STAGING_E2E !== "1", "Isolated staging opt-in required");

test("Practice and both human seats load the supplied WebP and enter without the old ready card", async ({
  page,
  browser,
}) => {
  assertStaging();
  const users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(16, 18);
  const sql = connect(2),
    ids = users.map((u: { id: string }) => u.id);
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
  const other = await context.newPage();
  const errors: string[] = [];
  let snapshotCount = 0,
    immediateTriggers = 0;
  let state: MatchState | undefined,
    walking = false,
    walkingSteps = 0;
  page.on("websocket", (ws) =>
    ws.on("framereceived", ({ payload }) => {
      try {
        const frame = JSON.parse(payload.toString());
        if (frame.type === "snapshot") {
          snapshotCount++;
          state = frame.state;
          if (walking)
            walkingSteps += (state?.events ?? []).filter(
              (e) => e.type === "step" && e.seat === "A",
            ).length;
        }
      } catch {
        /* Non-snapshot message. */
      }
    }),
  );
  page.on("websocket", (ws) =>
    ws.on("framesent", ({ payload }) => {
      try {
        if (JSON.parse(payload.toString()).combatOnly) immediateTriggers++;
      } catch {
        /* Envelope only. */
      }
    }),
  );
  for (const p of [page, other]) p.on("pageerror", (e) => errors.push(e.message));
  for (const p of [page, other])
    await p.route("**/fps/models/police-swat.glb", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });
  const balances = () =>
    sql`select owner_id,balance::text from wallet_accounts where owner_id=any(${ids}::uuid[]) and kind='user_available' order by owner_id`;
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
  async function expectReady(p: Page) {
    const screen = p.getByRole("region", { name: "Preparing PvPStrike match" });
    await expect(screen).toBeVisible();
    await expect(screen.locator("img")).toHaveJSProperty("naturalWidth", 1672);
    await expect(screen.locator("img")).toHaveAttribute("src", /arena-loading.*\.webp/);
    await expect(screen.getByRole("heading", { name: "Dustfront" })).toBeVisible();
    await expect(screen.getByRole("button")).toHaveCount(0);
    expect(await p.locator(".duel-game-overlay .duel-match-card").count()).toBe(0);
    const source = await screen.locator("img").getAttribute("src");
    expect(
      await p.locator(`link[rel=preload][as=image][href="${source}"]`).count(),
    ).toBeGreaterThan(0);
    return screen;
  }
  try {
    await cleanup();
    for (const user of users) await seedSyntheticUser(sql, user.id);
    const before = await balances();
    await login(page, users[0]);
    await page.getByRole("button", { name: "Practice vs bot", exact: false }).click();
    await expectReady(page);
    await page.screenshot({ path: "test-results/fps-loading-practice-ready.png" });
    await expect(page.locator(".duel-loading-screen")).toHaveCount(0, { timeout: 60000 });
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement instanceof HTMLCanvasElement))
      .toBe(true);
    await expect.poll(() => state?.phase).toBe("live");
    const start = { x: state!.players.A.x, z: state!.players.A.z };
    walking = true;
    await page.keyboard.down("ShiftLeft");
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(1000);
    await page.keyboard.up("KeyW");
    await page.keyboard.up("ShiftLeft");
    await page.waitForTimeout(250);
    walking = false;
    const travelled = Math.hypot(state!.players.A.x - start.x, state!.players.A.z - start.z);
    expect(travelled).toBeGreaterThan(0.5);
    expect(travelled).toBeLessThan(3.5);
    expect(walkingSteps).toBe(0);
    const framesBefore = snapshotCount;
    const ammoBefore = state!.players.A.ammo;
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(() => immediateTriggers).toBeGreaterThan(0);
    await expect.poll(() => state!.players.A.ammo).toBeLessThan(ammoBefore);
    await page.waitForTimeout(1000);
    expect(snapshotCount - framesBefore).toBeGreaterThanOrEqual(25);
    await cleanup();
    await page.goto("/fps-duel");
    await login(other, users[1]);
    await page.getByRole("tab", { name: "Create game", exact: true }).click();
    await page.getByLabel("I accept this entry", { exact: false }).check();
    await page.getByRole("button", { name: "Create game", exact: true }).click();
    await expect(page.getByText("Your human-only cash room is open.")).toBeVisible();
    const username = (await sql`select username from profiles where id=${users[0].id}`)[0].username;
    await other
      .locator(".strike-room-list li")
      .filter({ hasText: username })
      .getByRole("button", { name: "Join", exact: true })
      .click();
    const review = other.getByRole("dialog");
    await review.getByLabel("I accept this room’s entry", { exact: false }).check();
    await review.getByRole("button", { name: "Join for $1.00" }).click();
    await expectReady(other);
    await expect(other.locator(".duel-loading-screen")).toHaveCount(0, { timeout: 60000 });
    await expect
      .poll(() => other.evaluate(() => document.pointerLockElement instanceof HTMLCanvasElement))
      .toBe(true);
    await expect(other.locator(".duel-game-overlay .duel-match-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Join now", exact: true }).click();
    await expectReady(page);
    await page.screenshot({ path: "test-results/fps-loading-pvp-ready.png" });
    await expect(page.locator(".duel-loading-screen")).toHaveCount(0, { timeout: 60000 });
    await expect(other.locator(".duel-loading-screen")).toHaveCount(0);
    expect(errors).toEqual([]);
    await cleanup();
    expect(await balances()).toEqual(before);
  } finally {
    await context.close();
    await cleanup();
    await sql.end();
  }
});
