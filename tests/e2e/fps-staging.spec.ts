import { delayRoomSocket } from "./helpers/fps-network-delay";
import type { NetworkReport } from "../../src/lib/fps/network";
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import type { MatchState } from "../../src/lib/fps/protocol";
import { ROUND_END_MS } from "../../src/lib/fps/simulation";
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
  const addedRtt = Number(process.env["FPS_ADDED_RTT_MS"] ?? 0);
  const stopDelay = await delayRoomSocket(page, addedRtt, addedRtt ? 15 : 0);
  const networks: NetworkReport[] = [];
  const commandTimes = new Map<number, number>();
  const shotAcknowledgements: number[] = [];
  const acknowledgedShots = new Set<number>();
  const contextB = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } }),
    other = await contextB.newPage();
  const commands = new Map<Page, { yaw: number; pitch: number; seq: number }>();
  const latest = new Map<Page, MatchState>(),
    seats = new Map<Page, string>(),
    errors: string[] = [];
  const dialogs: string[] = [];
  const timings: Record<string, number> = {};
  const requests: Array<{ path: string; ms: number }> = [];
  const breaks = new Map<number, number>();
  for (const p of [page, other]) {
    p.on("requestfinished", (r) => {
      if (r.method() === "POST" && r.url().startsWith(baseURL))
        requests.push({ path: new URL(r.url()).pathname, ms: Math.round(r.timing().responseEnd) });
    });
    p.on("dialog", (d) => {
      dialogs.push(d.type());
      void d.dismiss();
    });
    await p.addInitScript(() => {
      const resume = AudioContext.prototype.resume;
      AudioContext.prototype.resume = function () {
        return resume
          .call(this)
          .then(() => new Promise<void>((resolve) => setTimeout(resolve, 1500)));
      };
    });
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("websocket", (ws) => {
      ws.on("framesent", ({ payload }) => {
        try {
          const c = JSON.parse(payload.toString());
          if (c.type === "input") {
            commands.set(p, c);
            if (p === page) commandTimes.set(c.seq, performance.now());
          }
        } catch {
          /* non-input */
        }
      });
      ws.on("framereceived", ({ payload }) => {
        try {
          const data = JSON.parse(payload.toString());
          if (p === page && data.type === "network") networks.push(data.report);
          if (data.type === "snapshot") {
            if (p === page)
              for (const e of data.state.events)
                if (
                  e.type === "shot" &&
                  e.seat === "A" &&
                  commandTimes.has(e.shotSeq) &&
                  !acknowledgedShots.has(e.shotSeq)
                ) {
                  acknowledgedShots.add(e.shotSeq);
                  shotAcknowledgements.push(performance.now() - commandTimes.get(e.shotSeq)!);
                }
            latest.set(p, data.state);
            if (p === page && data.state.phase === "round-end" && !breaks.has(data.state.round))
              breaks.set(data.state.round, data.state.phaseEndsAt - data.serverNow);
          }
          if (data.type === "welcome") seats.set(p, data.seat);
        } catch {
          /* not a JSON state frame */
        }
      });
    });
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
    const createAt = Date.now();
    await page.getByRole("button", { name: "Create game", exact: true }).click();
    await expect(page.getByText("Your human-only cash room is open.")).toBeVisible();
    await expect(page).toHaveURL(/\/fps-duel$/);
    matchId = (
      await sql`select id from fps_matches where creator_id=${users[0].id} and status='WAITING'`
    )[0].id;
    timings.createToRoomMs = Date.now() - createAt;
    await page.goto("/guides");
    const room = other.locator(".strike-room-list li").filter({
      hasText: (await sql`select username from profiles where id=${users[0].id}`)[0].username,
    });
    await room.getByRole("button", { name: "Join", exact: true }).click();
    const review = other.getByRole("dialog");
    await expect(review.getByText("$1.90", { exact: true })).toBeVisible();
    await expect(review.getByRole("button", { name: "Join for $1.00" })).toBeDisabled();
    await review.getByLabel("I accept this room’s entry", { exact: false }).check();
    const joinAt = Date.now();
    await review.getByRole("button", { name: "Join for $1.00" }).click();
    await expect(other).toHaveURL(new RegExp("/fps/" + matchId));
    await page.getByRole("button", { name: "Join now", exact: true }).click();
    await expect(page).toHaveURL(new RegExp("/fps/" + matchId));
    timings.joinToRoomMs = Date.now() - joinAt;
    for (const p of [other, page]) {
      await expect(p.locator(".duel-game")).toHaveAttribute("data-arena-ready", "true", {
        timeout: 60000,
      });
      await expect(p.locator(".duel-loading-screen")).toHaveCount(0);
      await expect
        .poll(() => p.evaluate(() => !!document.pointerLockElement), {
          timeout: 1000,
          intervals: [10],
        })
        .toBe(true);
      await expect(p.getByRole("button", { name: "Ready & enter arena", exact: true })).toHaveCount(
        0,
      );
    }
    await expect.poll(() => latest.get(page)?.phase).toBe("live");
    expect(seats.get(page)).toBe("A");
    expect(seats.get(other)).toBe("B");
    await expect.poll(() => networks.length, { timeout: 15000 }).toBeGreaterThanOrEqual(3);
    await expect(page.locator(".duel-network-status small")).toContainText("ms");
    await page.bringToFront();
    const resume = page.getByRole("button", { name: "Resume game", exact: true });
    if (await resume.isVisible()) await resume.click();
    const own = () => latest.get(page)!.players.A;
    const aim = async () => {
      const s = latest.get(page)!,
        a = s.players.A,
        b = s.players.B,
        dx = b.x - a.x,
        dz = b.z - a.z,
        yaw = Math.atan2(-dx, -dz) - (a.recoilYaw ?? 0),
        pitch = Math.atan2(b.y + 0.9 - a.y - 1.6, Math.hypot(dx, dz)) - (a.recoilPitch ?? 0);
      const current = commands.get(page) ?? a;
      await page.evaluate(
        ({ x, y }) =>
          document.dispatchEvent(new MouseEvent("mousemove", { movementX: x, movementY: y })),
        {
          x: -Math.atan2(Math.sin(yaw - current.yaw), Math.cos(yaw - current.yaw)) / 0.002,
          y: -(pitch - current.pitch) / 0.002,
        },
      );
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
      const spawnYaw = round % 2 ? 0 : Math.PI;
      const initialSeq = own().lastSeq;
      await expect.poll(() => own().lastSeq).toBeGreaterThan(initialSeq + 3);
      await expect
        .poll(
          async () => {
            const current = commands.get(page)?.yaw ?? own().yaw;
            const turn = Math.atan2(Math.sin(spawnYaw - current), Math.cos(spawnYaw - current));
            if (Math.abs(turn) > 0.001)
              await page.evaluate(
                (x) =>
                  document.dispatchEvent(
                    new MouseEvent("mousemove", { movementX: x, movementY: 0 }),
                  ),
                -turn / 0.002,
              );
            return Math.abs(
              Math.atan2(Math.sin(spawnYaw - own().yaw), Math.cos(spawnYaw - own().yaw)),
            );
          },
          { timeout: 8000, intervals: [150] },
        )
        .toBeLessThan(0.02);
      const yaw = spawnYaw,
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
      if (round < 3) {
        const card = page.locator(".duel-round-card");
        await expect(card).toBeVisible();
        await expect(card.locator("article")).toHaveCount(1);
        await expect(card.locator(".duel-round-avatar")).toHaveCount(1);
        const recap = latest.get(page)!.lastRound!;
        expect(recap.round).toBe(round);
        expect(recap.players.A.shots).toBeGreaterThan(0);
        expect(recap.players.A.damage).toBe(100);
        await expect(
          card
            .locator("article")
            .first()
            .getByText(`${Math.round((recap.players.A.hits / recap.players.A.shots) * 100)}%`, {
              exact: true,
            }),
        ).toBeVisible();
        await expect(card.locator("article").first().locator("strong")).toHaveText(
          (await sql`select username from profiles where id=${users[0].id}`)[0].username,
        );
        await expect(card.getByRole("button")).toHaveCount(0);
        expect(await page.evaluate(() => !!document.pointerLockElement)).toBe(true);
        expect(breaks.get(round)).toBeGreaterThan(ROUND_END_MS - 400);
        expect(breaks.get(round)).toBeLessThanOrEqual(ROUND_END_MS);
        await expect(card.locator(".duel-victory-halo")).toHaveCount(1);
        await page.screenshot({ path: `test-results/flow-round-recap-${round}.png` });
        await expect
          .poll(() => `${latest.get(page)?.round}:${latest.get(page)?.phase}`, { timeout: 5000 })
          .toBe(`${round + 1}:live`);
        await expect(card).not.toBeVisible();
      }
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
    expect(dialogs).toEqual([]);
    await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
    await page.getByRole("button", { name: "Accept fresh rematch", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Confirm new entry", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keep result", exact: true }).click();
    const pct = (values: number[], q: number) =>
      values.length
        ? [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * q) - 1)]!
        : null;
    const networkSummary = {
      addedRttMs: addedRtt,
      measuredRttP50: pct(
        networks.map((n) => n.rttMs),
        0.5,
      ),
      measuredRttP95: pct(
        networks.map((n) => n.rttP95Ms),
        0.95,
      ),
      authMsP95: pct(
        networks.map((n) => n.authMs),
        0.95,
      ),
      tickHzP50: pct(
        networks.map((n) => n.tickHz),
        0.5,
      ),
      commandToShotAckP50: pct(shotAcknowledgements, 0.5),
      commandToShotAckP95: pct(shotAcknowledgements, 0.95),
    };
    fs.writeFileSync(
      info.outputPath("network-measurements.json"),
      JSON.stringify({ networkSummary, networks, shotAcknowledgements }, null, 2),
    );
    console.log(JSON.stringify(networkSummary));
    await info.attach("game-socket-network", {
      body: JSON.stringify({ networkSummary, networks, shotAcknowledgements }),
      contentType: "application/json",
    });
    await info.attach("room-entry-timings", {
      body: JSON.stringify({ ...timings, requests }),
      contentType: "application/json",
    });
  } finally {
    stopDelay();
    await contextB.close();
    await sql.end({ timeout: 2 });
  }
});
