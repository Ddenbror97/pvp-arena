import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { assertStaging, connect, asUser } from "../../scripts/fps/staging-lib.mjs";
import { defaultCueSpot, legalPlacement, type TableState } from "../../src/lib/pool/rules";

const baseURL = "https://pvpspinarena-staging.pvpspinarena.workers.dev";
test.use({ baseURL, trace: "off", video: "off" });
test.skip(process.env.POOL_TURN_E2E !== "1", "Explicit isolated staging opt-in");

function cuePoint(
  box: { x: number; y: number; width: number; height: number },
  cue: { x: number; y: number },
) {
  const short = Math.min((box.height - 2) / 1.256, (box.width - 2) / 2.256);
  const rail = short * 0.128,
    slack = box.height - short - 2 * rail;
  const padY = (slack > (short + 2 * rail) * 0.45 ? slack * 0.2 : slack / 2) + rail;
  return {
    x: box.x + (box.width - short * 2) / 2 + (cue.x / 2540000) * short * 2,
    y: box.y + padY + (1 - cue.y / 1270000) * short,
  };
}

test("confirmed opponent shots finish and hand control back on both laptops", async ({
  browser,
  page,
}, info) => {
  assertStaging();
  test.setTimeout(180000);
  const sql = connect(2),
    users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(22, 24);
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } }),
    other = await context.newPage();
  const errors: string[] = [];
  for (const p of [page, other]) p.on("pageerror", (e) => errors.push(e.message));
  let matchId: number | undefined,
    clock: ReturnType<typeof setInterval> | undefined,
    clockBusy = false;
  const read = async () =>
    (await sql`select status,state from pool_matches where id=${matchId}`)[0] as {
      status: string;
      state: TableState;
    };
  const shots = async () =>
    Number(
      (await sql`select count(*) n from pool_events where match_id=${matchId} and kind='shot'`)[0]
        .n,
    );
  async function login(p: Page, u: { email: string; password: string }) {
    await p.addInitScript(() => localStorage.setItem("pvp-pool-tutorial", "1"));
    await p.goto("/auth");
    await p.locator("#email").fill(u.email);
    await p.locator("#password").fill(u.password);
    await p.locator("button[type=submit]").click();
    await expect.poll(() => p.url()).not.toContain("/auth");
    return p.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
      );
      if (!key) throw Error("Synthetic browser session missing");
      const token = JSON.parse(localStorage.getItem(key)!).access_token as string;
      return JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
    });
  }
  async function drag(p: Page) {
    await p.bringToFront();
    const state = (await read()).state;
    const existingCue = state.balls.find((b) => b.id === 0 && !b.pocketed);
    const cue = state.ballInHand
      ? existingCue && legalPlacement(state, existingCue.x, existingCue.y)
        ? existingCue
        : defaultCueSpot(state)
      : existingCue;
    if (!cue) throw Error("No legal cue placement");
    const box = await p.locator("canvas.pool-canvas").boundingBox();
    if (!box) throw Error("No table");
    const point = cuePoint(box, cue);
    await p.mouse.move(point.x - 36, point.y);
    await p.mouse.down();
    await p.mouse.move(point.x - 220, point.y, { steps: 16 });
    await p.mouse.up();
  }
  try {
    users[0].claims = await login(page, users[0]);
    users[1].claims = await login(other, users[1]);
    expect(users[0].claims.sub).toBe(users[0].id);
    expect(users[1].claims.sub).toBe(users[1].id);
    const made = await asUser(
      sql,
      users[0],
      async (tx) => (await tx`select pool_matchmake(100,${randomUUID()}) r`)[0].r,
    );
    matchId = Number(made.match_id);
    await asUser(sql, users[1], async (tx) => tx`select pool_join(${matchId},${randomUUID()})`);
    clock = setInterval(async () => {
      if (clockBusy) return;
      clockBusy = true;
      try {
        await sql`select _pool_tick_one(${matchId})`;
      } catch (e) {
        errors.push(String(e));
      } finally {
        clockBusy = false;
      }
    }, 1000);
    for (const p of [page, other]) {
      await p.goto(`/pool/${matchId}`);
      await expect(p.locator("canvas.pool-canvas")).toBeVisible();
      const skip = p.getByRole("button", { name: "Skip", exact: true });
      if (await skip.isVisible()) await skip.click();
    }
    await expect.poll(async () => (await read()).status, { timeout: 45000 }).toBe("PLAYING");
    await drag(page);
    await expect.poll(shots, { timeout: 15000 }).toBe(1);
    expect((await read()).state.turn).toBe("B");
    // Polling the same confirmed hash must not keep the remote replay locked.
    await expect(other.getByText("Balls moving", { exact: true })).toBeVisible();
    await expect(other.getByText("Balls moving", { exact: true })).not.toBeVisible({
      timeout: 18000,
    });
    await drag(other);
    await expect.poll(shots, { timeout: 12000 }).toBe(2);
    await expect(page.getByText("Balls moving", { exact: true })).toBeVisible();
    await expect(page.getByText("Balls moving", { exact: true })).not.toBeVisible({
      timeout: 18000,
    });
    await expect(other.getByText("Balls moving", { exact: true })).not.toBeVisible({
      timeout: 18000,
    });
    expect(errors).toEqual([]);
    fs.writeFileSync(
      info.outputPath("handoff.json"),
      JSON.stringify(
        { matchId, shots: await shots(), state: (await read()).state, errors },
        null,
        2,
      ),
    );
    await other.screenshot({ path: info.outputPath("second-player-after-shot.png") });
  } finally {
    if (clock) clearInterval(clock);
    while (clockBusy) await new Promise((r) => setTimeout(r, 20));
    if (matchId) {
      const row = await read();
      if (["STARTING", "PLAYING"].includes(row.status))
        await asUser(sql, users[1], async (tx) => tx`select pool_forfeit(${matchId})`);
    }
    await context.close();
    await sql.end({ timeout: 2 });
  }
});
