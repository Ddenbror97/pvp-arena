import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { assertStaging, connect } from "../../scripts/fps/staging-lib.mjs";
import type { MatchState } from "../../src/lib/fps/protocol";

test.skip(process.env["FPS_STAGING_E2E"] !== "1", "Isolated staging opt-in required");
const baseURL = "https://pvpspinarena-staging.pvpspinarena.workers.dev";
test.use({ baseURL, trace: "off", video: "off" });
test("solo Practice completes seven rounds, reconnects and starts again without money or ratings", async ({
  page,
}, info) => {
  assertStaging();
  test.setTimeout(480000);
  const user = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8"))[14],
    sql = connect(1);
  const errors: string[] = [],
    rounds = new Set<number>(),
    zones = new Set<string>();
  let state: MatchState | undefined,
    settled = false,
    matchId: string | undefined;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("websocket", (ws) =>
    ws.on("framereceived", ({ payload }) => {
      try {
        const f = JSON.parse(payload.toString());
        if (f.type === "snapshot") {
          state = f.state;
          settled = f.settled;
          rounds.add(f.state.round);
          for (const e of f.state.events) if (e.hit) zones.add(e.hit.zone);
        }
      } catch {
        /* non-state frame */
      }
    }),
  );
  try {
    await sql`update fps_private.practice_matches set status='CANCELLED',reason='QA_CLEANUP' where owner_id=${user.id} and status='FUNDED'`;
    const before = (
      await sql`select (select count(*)::int from ledger_transactions where user_id=${user.id}) tx,(select coalesce(sum(balance),0)::text from wallet_accounts where owner_id=${user.id}) balance,(select row_to_json(r) from fps_ratings r where user_id=${user.id}) rating`
    )[0];
    await page.goto("/auth");
    await page.locator("#email").fill(user.email);
    await page.locator("#password").fill(user.password);
    await page.locator("button[type=submit]").click();
    await expect.poll(() => page.url(), { timeout: 45000 }).not.toContain("/auth");
    await page.goto("/fps-duel");
    await expect(page.getByRole("button", { name: "Practice vs bot" })).toBeEnabled();
    await page.getByRole("button", { name: "Practice vs bot" }).click();
    await expect.poll(() => page.url()).toMatch(/\/fps\/[a-f0-9-]{36}/);
    matchId = page.url().split("/fps/")[1]!.split("?")[0];
    await expect(page.getByRole("button", { name: "Ready & enter arena" })).toBeEnabled();
    await page.getByRole("button", { name: "Ready & enter arena" }).click();
    await expect.poll(() => state?.phase).toBe("live");
    expect(state?.bestOf).toBe(13);
    await expect.poll(() => state?.round, { timeout: 180000 }).toBeGreaterThanOrEqual(2);
    await page.reload();
    await expect(
      page.getByRole("button", { name: /Resume aiming|Ready & enter arena/ }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /Resume aiming|Ready & enter arena/ }).click();
    await expect.poll(() => state?.phase, { timeout: 300000 }).toBe("completed");
    await expect.poll(() => settled, { timeout: 30000 }).toBe(true);
    expect(state?.score).toEqual({ A: 0, B: 7 });
    expect(rounds.size).toBe(7);
    await expect(page.getByText("Practice complete. No wager or rating changes.")).toBeVisible();
    await page.screenshot({ path: info.outputPath("practice-seven-rounds.png") });
    const after = (
      await sql`select (select count(*)::int from ledger_transactions where user_id=${user.id}) tx,(select coalesce(sum(balance),0)::text from wallet_accounts where owner_id=${user.id}) balance,(select row_to_json(r) from fps_ratings r where user_id=${user.id}) rating`
    )[0];
    expect(after).toEqual(before);
    const result = (
      await sql`select status,score_a,score_b from fps_private.practice_matches where id=${matchId}`
    )[0];
    expect(result).toEqual({ status: "COMPLETED", score_a: 0, score_b: 7 });
    await page.getByRole("button", { name: "Practice again", exact: true }).click();
    await expect.poll(() => page.url()).not.toContain(matchId!);
    await expect(page.getByRole("button", { name: "Ready & enter arena" })).toBeEnabled();
    expect(errors).toEqual([]);
    await info.attach("solo-practice-result", {
      body: JSON.stringify({
        matchId,
        result,
        rounds: [...rounds],
        zones: [...zones],
        financialAndRatingUnchanged: true,
        errors,
      }),
      contentType: "application/json",
    });
  } finally {
    await page.close();
    await sql`update fps_private.practice_matches set status='CANCELLED',reason='QA_CLEANUP' where owner_id=${user.id} and status='FUNDED'`;
    await sql.end();
  }
});
