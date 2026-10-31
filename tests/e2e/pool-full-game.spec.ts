import { test, expect, firefox, type Page } from "@playwright/test";
import fs from "node:fs";
import { assertStaging, connect, asUser } from "../../scripts/fps/staging-lib.mjs";
import { playShot } from "../../src/lib/pool/play";
import { planStandInShot } from "../../src/lib/pool/stand-in";
import {
  defaultCueSpot,
  groupOf,
  seatGroup,
  stateHash,
  type TableState,
} from "../../src/lib/pool/rules";
import { POCKETS, type ShotInput } from "../../src/lib/pool/physics";
import { viewOf } from "../../src/lib/pool/view";
import { bytesFromHex, replayMatch, stepsFromRecord } from "../../src/lib/pool/verify";

const baseURL = "https://pvpspinarena-staging.pvpspinarena.workers.dev";
test.use({ baseURL, trace: "off", video: "off" });
test.skip(process.env.POOL_FULL_E2E !== "1", "Explicit isolated staging opt-in required");

// Automated shot selection drives two ordinary human seats. No stand-in RPC,
// state edits, fake shot acknowledgements or artificial game-ending event.
function choose(state: TableState, safety: boolean): ShotInput {
  let best: { shot: ShotInput; score: number } | undefined;
  for (let n = 0; n < 64; n++) {
    const seed = Uint8Array.from(
      { length: 32 },
      (_, i) => (n * 53 + i * 31 + state.shot * 17) & 255,
    );
    const raw = planStandInShot(state, seed);
    const shot = {
      ...raw,
      angleMilli: (Math.round(raw.angleMilli / 100) * 100) % 360000,
      power: Math.min(6501, Math.max(501, Math.round(raw.power / 500) * 500 + 1)),
      spinX: 0,
      spinY: 0,
    };
    const played = playShot(state, shot);
    if (!played.ok) continue;
    const own = seatGroup(state, state.turn);
    const pots = played.event.pocketed.filter(
      (id) => id !== 0 && id !== 8 && (!own || groupOf(id) === own),
    ).length;
    const loss = played.event.winner && played.event.winner !== state.turn;
    const score = loss
      ? -10000
      : played.event.winner
        ? 10000
        : (played.event.foul ? -100 : 0) +
          pots * (safety ? -20 : 100) +
          (safety && played.state.turn !== state.turn ? 30 : 0);
    if (!best || score > best.score) best = { shot, score };
    if (score >= 10000) break;
  }
  if (!best) throw Error("No legal test shot");
  return best.shot;
}

test("Chrome versus Firefox plays a full rack through settlement and replay", async ({
  page,
}, info) => {
  assertStaging();
  test.setTimeout(1200000);
  const sql = connect(2),
    users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")).slice(22, 24);
  const guestBrowser = await firefox.launch({ channel: "" });
  const guestContext = await guestBrowser.newContext({
    baseURL,
    viewport: { width: 1280, height: 800 },
  });
  const other = await guestContext.newPage(),
    pages = { A: page, B: other };
  const errors: string[] = [],
    audit: unknown[] = [],
    counts = { A: 0, B: 0 };
  let matchId: number | undefined,
    clock: ReturnType<typeof setInterval> | undefined,
    clockBusy = false;
  const read = async () =>
    (
      await sql`select m.*,case when m.status='COMPLETED' then encode(s.server_seed,'hex') end as server_seed from pool_matches m join pool_secrets s on s.match_id=m.id where m.id=${matchId}`
    )[0];
  const events = async () =>
    await sql`select * from pool_events where match_id=${matchId} order by seq`;
  const balances = async () =>
    await sql`select owner_id,balance::text from wallet_accounts where owner_id=any(${users.map((u) => u.id)}::uuid[]) and kind='user_available' and account_type='real'`;
  const angles = new Map<Page, number>([
    [page, 0],
    [other, 0],
  ]);
  async function login(p: Page, user: { email: string; password: string }) {
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript(() => localStorage.setItem("pvp-pool-tutorial", "1"));
    await p.goto("/auth");
    await p.locator("#email").fill(user.email);
    await p.locator("#password").fill(user.password);
    await p.locator("button[type=submit]").click();
    await expect.poll(() => p.url()).not.toContain("/auth");
    return p.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
      )!;
      const jwt = JSON.parse(localStorage.getItem(key)!).access_token;
      return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    });
  }
  async function point(p: Page, x: number, y: number) {
    const canvas = p.locator("canvas.pool-canvas"),
      box = (await canvas.boundingBox())!;
    const size = await canvas.evaluate((c) => ({ w: c.clientWidth, h: c.clientHeight }));
    const pos = viewOf(size.w, size.h).project(x, y);
    return { x: box.x + (pos.x / size.w) * box.width, y: box.y + (pos.y / size.h) * box.height };
  }
  async function shoot(p: Page, state: TableState, shot: ShotInput) {
    await p.bringToFront();
    await expect(p.locator(".pool-banner")).toHaveText(
      /^(Your turn|(?:Foul\. (?:That ball stays down\. )?)?(?:Ball in hand|Place the cue ball)|Click a lit pocket|Pocket the 8-ball|Drag back and release)/,
      { timeout: 15000 },
    );
    await expect(p.getByText("Balls moving", { exact: true })).not.toBeVisible({ timeout: 20000 });
    if (state.ballInHand && shot.placeX != null && shot.placeY != null) {
      const cue = state.balls.find((b) => b.id === 0 && !b.pocketed) ?? defaultCueSpot(state)!;
      const from = await point(p, cue.x, cue.y),
        to = await point(p, shot.placeX, shot.placeY);
      await p.mouse.move(from.x, from.y);
      await p.mouse.down();
      await p.mouse.move(to.x, to.y, { steps: 8 });
      await p.mouse.up();
    }
    if (shot.calledPocket != null) {
      const pocket = POCKETS[shot.calledPocket]!,
        at = await point(p, pocket.x, pocket.y);
      await p.mouse.click(at.x, at.y);
    }
    const delta = (shot.angleMilli - (angles.get(p) ?? 0) + 360000) % 360000;
    const backwards = delta > 180000,
      amount = backwards ? 360000 - delta : delta;
    // Real keyboard event handlers change aim/power; no component state injection.
    await p.evaluate(
      ({ amount, backwards, power }) => {
        const key = backwards ? "ArrowLeft" : "ArrowRight";
        for (let n = 0; n < Math.floor(amount / 1000); n++)
          window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        for (let n = 0; n < Math.round((amount % 1000) / 100); n++)
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key, shiftKey: true, bubbles: true }),
          );
        for (let n = 0; n < Math.round((power - 1) / 500); n++)
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      },
      { amount, backwards, power: shot.power },
    );
    angles.set(p, shot.angleMilli);
    if (state.breakShot) {
      const cue = await point(p, shot.placeX!, shot.placeY!);
      await p.mouse.move(cue.x - 36, cue.y);
      await p.mouse.down();
      await p.mouse.move(cue.x - 256, cue.y, { steps: 16 });
      await p.mouse.up();
    } else await p.keyboard.press("Enter");
  }
  try {
    users[0].claims = await login(page, users[0]);
    users[1].claims = await login(other, users[1]);
    const before = await balances();
    await page.goto("/8-ball-pool");
    await page.getByRole("tab", { name: "Create game", exact: true }).click();
    await page.getByRole("button", { name: /^\$1(?:\.00)?$/ }).click();
    await page.getByRole("button", { name: "Create game", exact: true }).click();
    await expect(page).toHaveURL(/\/pool\/\d+/);
    matchId = Number(new URL(page.url()).pathname.split("/").pop());
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
    await other.goto("/8-ball-pool");
    const room = other.getByRole("listitem").filter({ hasText: users[0].username });
    await room.getByRole("button", { name: "Join", exact: true }).click();
    await expect(other).toHaveURL(new RegExp("/pool/" + matchId));
    await expect.poll(async () => (await read()).status, { timeout: 45000 }).toBe("PLAYING");
    for (const p of [page, other]) await expect(p.locator("canvas.pool-canvas")).toBeVisible();
    for (let n = 0; n < 75; n++) {
      const row = await read(),
        state = row.state as TableState;
      if (row.status === "COMPLETED") break;
      expect(row.status).toBe("PLAYING");
      const seat = state.turn,
        p = pages[seat];
      const shot = state.breakShot
        ? {
            angleMilli: 0,
            power: 6800,
            spinX: 0,
            spinY: 0,
            placeX: 635000,
            placeY: 635000,
            calledPocket: null,
          }
        : n === 2
          ? {
              angleMilli: 180000,
              power: 501,
              spinX: 0,
              spinY: 0,
              placeX: null,
              placeY: null,
              calledPocket: null,
            }
          : choose(state, n < 5);
      await shoot(p, state, shot);
      await expect
        .poll(async () => (await read()).state.shot, { timeout: 20000 })
        .toBe(state.shot + 1);
      counts[seat]++;
      const accepted = await read();
      const committed = (await events()).at(-1)!;
      expect(committed.kind).toBe("shot");
      expect(committed.seat).toBe(seat);
      expect(committed.event.standIn).not.toBe(true);
      // Pointer coordinates in Firefox can quantize placement to a screen
      // pixel. Verify the input actually submitted through the UI, not an
      // impossible subpixel position from the test's shot planner.
      const expected = playShot(state, committed.input as ShotInput);
      if (!expected.ok) throw Error(expected.error);
      expect(committed.input.angleMilli).toBe(shot.angleMilli);
      if (shot.placeX != null) {
        expect(Math.abs(committed.input.placeX - shot.placeX)).toBeLessThan(12000);
        expect(Math.abs(committed.input.placeY - shot.placeY!)).toBeLessThan(12000);
      }
      audit.push({
        shot: n + 1,
        seat,
        input: committed.input,
        event: expected.event,
        acceptedHash: stateHash(accepted.state),
      });
      fs.writeFileSync(
        info.outputPath("progress.json"),
        JSON.stringify({ matchId, counts, audit, errors, before }, null, 2),
      );
      expect(stateHash(accepted.state)).toBe(expected.hash);
      for (const view of [page, other])
        await expect(view.getByText("Balls moving", { exact: true })).not.toBeVisible({
          timeout: 20000,
        });
      console.log(
        `Shot ${n + 1}: ${seat}, pots ${expected.event.pocketed.join(",") || "-"}, foul ${expected.event.foul}, next ${accepted.state.turn}`,
      );
      if (n === 3) {
        await other.reload();
        angles.set(other, 0);
        await expect(other.locator("canvas.pool-canvas")).toBeVisible();
        // The placeholder also contains a canvas. Wait for the actual table
        // before the separate reconnect exercise; hydration interruption has
        // its own recovery regression test.
        await expect(other.locator(".pool-banner")).not.toHaveText("Loading the table…");
        await other.context().setOffline(true);
        await page.waitForTimeout(1200);
        await other.context().setOffline(false);
      }
    }
    const final = await read();
    expect(final.status).toBe("COMPLETED");
    expect(counts.A).toBeGreaterThan(0);
    expect(counts.B).toBeGreaterThan(0);
    const history = await events();
    expect(history.filter((e) => ["timeout", "forfeit"].includes(e.kind))).toEqual([]);
    const steps = stepsFromRecord(history)!;
    const replay = await replayMatch(
      bytesFromHex(final.server_seed),
      final.server_seed_hash,
      steps,
      final.state.physics,
    );
    expect(replay.ok).toBe(true);
    expect(replay.finalHash).toBe(stateHash(final.state));
    expect(final.winner_id).toBe(users[replay.winner === "A" ? 0 : 1].id);
    expect(Number(final.payout_amount)).toBe(190);
    expect(Number(final.fee_amount)).toBe(10);
    const after = await balances();
    for (const u of users)
      expect(
        Number(after.find((r) => r.owner_id === u.id)!.balance) -
          Number(before.find((r) => r.owner_id === u.id)!.balance),
      ).toBe(u.id === final.winner_id ? 90 : -100);
    expect(
      (
        await sql`select count(*)::int n from pool_payouts where match_id=${matchId} and kind='WIN'`
      )[0].n,
    ).toBe(1);
    for (const p of [page, other]) {
      await expect(p.getByText(/^(You won|You lost)$/)).toBeVisible();
      await p.getByRole("button", { name: "Check this match", exact: true }).click();
      await expect(
        p.getByText("These shots replay to the same result.", { exact: true }),
      ).toBeVisible();
      await p.screenshot({
        path: info.outputPath(p === page ? "chrome-result.png" : "firefox-result.png"),
      });
    }
    const invariants = (await sql`select money_real_invariants() r`)[0].r;
    for (const [key, value] of Object.entries(invariants))
      if (key.startsWith("ok_")) expect(value, key).toBe(true);
    expect(errors).toEqual([]);
    fs.writeFileSync(
      info.outputPath("full-game.json"),
      JSON.stringify({ matchId, counts, audit, replay, payout: 190, fee: 10, errors }, null, 2),
    );
  } catch (error) {
    for (const [seat, p] of Object.entries(pages)) {
      fs.writeFileSync(
        info.outputPath(`failure-${seat}.txt`),
        await p
          .locator("body")
          .innerText()
          .catch(() => ""),
      );
      await p.screenshot({ path: info.outputPath(`failure-${seat}.png`) }).catch(() => {});
    }
    throw error;
  } finally {
    if (clock) clearInterval(clock);
    while (clockBusy) await new Promise((r) => setTimeout(r, 20));
    if (matchId && ["STARTING", "PLAYING"].includes((await read()).status))
      await asUser(sql, users[1], async (tx) => tx`select pool_forfeit(${matchId})`);
    await guestBrowser.close();
    await sql.end({ timeout: 2 });
  }
});
