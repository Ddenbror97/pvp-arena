import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import type { MatchState } from "../../src/lib/fps/protocol";
import { connect, assertStaging } from "../../scripts/fps/staging-lib.mjs";

const baseURL = process.env["FPS_STAGING_APP_URL"] ?? "http://127.0.0.1:4180";
if (
  baseURL !== "http://127.0.0.1:4180" &&
  !/^https:\/\/pvpspinarena-staging\.[a-z0-9-]+\.workers\.dev$/.test(baseURL)
)
  throw new Error("Refusing a non-staging browser target");
test.use({ baseURL, trace: "off", video: "off" });
test.skip(process.env["FPS_STAGING_E2E"] !== "1", "Explicit isolated staging opt-in required");

test("two authenticated browsers play a paid BO5 and reconcile the actual ledger", async ({
  browser,
  page,
}, info) => {
  assertStaging();
  test.setTimeout(360000);
  const users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(12, 14),
    sql = connect(2);
  const contextB = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } }),
    other = await contextB.newPage();
  const latest = new Map<Page, MatchState>(),
    seats = new Map<Page, string>(),
    errors: string[] = [];
  for (const p of [page, other]) {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("websocket", (ws) =>
      ws.on("framereceived", ({ payload }) => {
        try {
          const data = JSON.parse(payload.toString());
          if (data.type === "snapshot") latest.set(p, data.state);
          if (data.type === "welcome") seats.set(p, data.seat);
        } catch {
          /* not a JSON state frame */
        }
      }),
    );
  }
  async function login(p: Page, user: { email: string; password: string }) {
    await p.goto("/auth");
    await p.locator("#email").fill(user.email);
    await p.locator("#password").fill(user.password);
    await p.locator("button[type=submit]").click();
    try {
      await expect.poll(() => p.url(), { timeout: 45000 }).not.toContain("/auth");
    } catch (e) {
      console.log(
        JSON.stringify({
          url: p.url(),
          alerts: await p.locator("[role=alert],[data-sonner-toast]").allTextContents(),
          pageErrors: errors,
        }),
      );
      await p.screenshot({ path: "test-results/staging-signin-failure.png" });
      throw e;
    }
    await p.goto("/fps-duel");
    await expect(p.getByRole("tab", { name: "Create game", exact: true })).toBeVisible();
  }
  const amount = async (id: string) =>
    Number(
      (
        await sql`select balance from public.wallet_accounts where owner_id=${id} and kind='user_available' and asset='USD' and account_type='real'`
      )[0].balance,
    );
  let matchId: string | undefined;
  try {
    const before = [await amount(users[0].id), await amount(users[1].id)];
    await login(page, users[0]);
    await login(other, users[1]);
    await page.getByRole("tab", { name: "Create game", exact: true }).click();
    await page.getByRole("button", { name: "$1.00", exact: true }).click();
    await page.getByLabel("I accept this entry", { exact: false }).check();
    await page.getByRole("button", { name: "Create game", exact: true }).click();
    await expect(page).toHaveURL(/\/fps\/[a-f0-9-]{36}/);
    matchId = new URL(page.url()).pathname.split("/").at(-1)!;
    await expect(page.getByRole("heading", { name: /Room created/ })).toBeVisible();
    const room = other
      .locator(".strike-room-list li")
      .filter({
        hasText: (await sql`select username from profiles where id=${users[0].id}`)[0].username,
      });
    await room.getByRole("button", { name: "Join", exact: true }).click();
    const review = other.getByRole("dialog");
    await expect(review.getByText("$1.90", { exact: true })).toBeVisible();
    await expect(review.getByRole("button", { name: "Join for $1.00" })).toBeDisabled();
    await review.getByLabel("I accept this room’s entry", { exact: false }).check();
    await review.getByRole("button", { name: "Join for $1.00" }).click();
    await expect(other).toHaveURL(new RegExp("/fps/" + matchId));
    for (const p of [other, page]) {
      const ready = p.getByRole("button", { name: "Ready & enter arena", exact: true });
      await expect(ready).toBeEnabled({ timeout: 45000 });
      await ready.click();
    }
    await expect.poll(() => latest.get(page)?.phase).toBe("live");
    expect(seats.get(page)).toBe("A");
    expect(seats.get(other)).toBe("B");
    await page.bringToFront();
    const resume = page.getByRole("button", { name: "Resume aiming", exact: true });
    if (await resume.isVisible()) await resume.click();
    let mouseX = 640,
      mouseY = 400;
    const own = () => latest.get(page)!.players.A;
    const aim = async () => {
      const s = latest.get(page)!,
        a = s.players.A,
        b = s.players.B,
        dx = b.x - a.x,
        dz = b.z - a.z,
        yaw = Math.atan2(-dx, -dz),
        pitch = Math.atan2(b.y + 0.9 - a.y - 1.6, Math.hypot(dx, dz));
      mouseX -= Math.atan2(Math.sin(yaw - a.yaw), Math.cos(yaw - a.yaw)) / 0.002;
      mouseY -= (pitch - a.pitch) / 0.002;
      await page.mouse.move(mouseX, mouseY);
    };
    for (let round = 1; round <= 3; round++) {
      await expect
        .poll(() => `${latest.get(page)?.round}:${latest.get(page)?.phase}`, { timeout: 20000 })
        .toBe(`${round}:live`);
      if (round === 2) {
        await other.reload();
        await expect(other.locator(".duel-connected")).toBeVisible({ timeout: 20000 });
        await page.bringToFront();
      }
      const yaw = own().yaw,
        lateral = Math.cos(yaw) > 0 ? "KeyD" : "KeyA";
      await page.keyboard.down(lateral);
      await expect.poll(() => own().x, { timeout: 9000, intervals: [50] }).toBeGreaterThan(9.2);
      await page.keyboard.up(lateral);
      const z = round % 2 ? -13 : 13;
      await page.keyboard.down("KeyW");
      await expect
        .poll(() => Math.abs(own().z - z), { timeout: 12000, intervals: [50] })
        .toBeLessThan(0.35);
      await page.keyboard.up("KeyW");
      const inward = Math.cos(yaw) > 0 ? "KeyA" : "KeyD";
      await page.keyboard.down(inward);
      await expect.poll(() => own().x, { timeout: 8000, intervals: [50] }).toBeLessThan(3.3);
      await page.keyboard.up(inward);
      await page.waitForTimeout(300);
      await aim();
      await page.waitForTimeout(350);
      await page.screenshot({ path: `test-results/staging-paid-round-${round}.png` });
      const deadline = Date.now() + 12000;
      while (Date.now() < deadline && latest.get(page)?.phase === "live") {
        await aim();
        await page.waitForTimeout(150);
        await page.mouse.down();
        await page.waitForTimeout(300);
        await page.mouse.up();
        await page.waitForTimeout(250);
      }
      expect(latest.get(page)!.players.B.hp).toBe(0);
      console.log(`Paid browser round ${round} completed`);
    }
    await expect(
      page.getByText("Result recorded. Your wallet reflects the server's settlement.", {
        exact: false,
      }),
    ).toBeVisible({ timeout: 30000 });
    const g = (
      await sql`select status,winner_id,payout_amount,fee_amount,score_a,score_b from public.fps_matches where id=${matchId}`
    )[0];
    expect(g.status).toBe("COMPLETED");
    expect(g.winner_id).toBe(users[0].id);
    expect(Number(g.payout_amount)).toBe(190);
    expect(Number(g.fee_amount)).toBe(10);
    expect([g.score_a, g.score_b]).toEqual([3, 0]);
    expect(await amount(users[0].id)).toBe(before[0] + 90);
    expect(await amount(users[1].id)).toBe(before[1] - 100);
    expect(
      Number(
        (
          await sql`select count(*) n from public.ledger_transactions where idempotency_key=${"fps:" + matchId + ":settlement"}`
        )[0].n,
      ),
    ).toBe(1);
    await page.screenshot({ path: "test-results/staging-paid-settlement.png" });
    await info.attach("paid-ledger-result", {
      body: JSON.stringify({ matchId, ...g }),
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
  } finally {
    await contextB.close();
    await sql.end({ timeout: 2 });
  }
});
