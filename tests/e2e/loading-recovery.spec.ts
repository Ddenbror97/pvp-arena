import { test, expect, firefox } from "@playwright/test";
import fs from "node:fs";
import { assertStaging, connect } from "../../scripts/fps/staging-lib.mjs";
const baseURL = "https://pvpspinarena-staging.pvpspinarena.workers.dev";
test.skip(process.env.LOADING_RECOVERY_E2E !== "1", "Explicit staging opt-in required");
for (const stalledRead of [false, true])
  test(`initial table load recovers after ${stalledRead ? "a stalled state read" : "network interruption"}`, async ({
    browserName,
  }, info) => {
    assertStaging();
    const browser = await firefox.launch({ channel: "" }),
      context = await browser.newContext({ baseURL }),
      page = await context.newPage();
    const network: Array<{ path: string; error: string | null }> = [];
    page.on("requestfailed", (r) =>
      network.push({ path: new URL(r.url()).pathname, error: r.failure()?.errorText ?? null }),
    );
    await page.addInitScript(() => {
      const rows: object[] = [];
      Reflect.set(window, "loadRecoveryLog", rows);
      for (const type of ["online", "offline", "error", "unhandledrejection"])
        window.addEventListener(type, () =>
          rows.push({ type, at: performance.now(), online: navigator.onLine }),
        );
      const original = window.fetch;
      window.fetch = async (...args) => {
        const url = args[0] instanceof Request ? args[0].url : String(args[0]),
          row = {
            path: new URL(url, location.href).pathname,
            start: performance.now(),
            end: 0,
            status: 0,
            error: false,
          };
        rows.push(row);
        try {
          const response = await original(...args);
          row.status = response.status;
          return response;
        } catch (e) {
          row.error = true;
          throw e;
        } finally {
          row.end = performance.now();
        }
      };
    });
    try {
      const user = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8"))[23];
      const sql = connect(1);
      let matchId: number;
      try {
        const rows =
          await sql`select id from pool_matches where status='COMPLETED' and (creator_id=${user.id}::uuid or opponent_id=${user.id}::uuid) order by id desc limit 1`;
        if (!rows.length) throw Error("Run the complete staging pool game first");
        matchId = Number(rows[0].id);
      } finally {
        await sql.end();
      }
      await page.goto("/auth");
      await page.locator("#email").fill(user.email);
      await page.locator("#password").fill(user.password);
      await page.locator("button[type=submit]").click();
      await expect.poll(() => page.url()).not.toContain("/auth");
      let intercepted = 0;
      if (stalledRead)
        await page.route("**/rest/v1/rpc/pool_state", async (route) => {
          intercepted++;
          if (intercepted === 1) return; // Hold until the real client deadline aborts this read.
          await route.continue();
        });
      await page.goto(`/pool/${matchId}`);
      await expect(page.locator("canvas.pool-canvas")).toBeVisible();
      if (!stalledRead) {
        await context.setOffline(true);
        await page.waitForTimeout(1200);
        await context.setOffline(false);
      }
      await expect(page.getByText(/^(You won|You lost)$/)).toBeVisible({ timeout: 20000 });
      if (stalledRead) expect(intercepted).toBeGreaterThanOrEqual(2);
    } finally {
      const state = await page.evaluate(async () => ({
        online: navigator.onLine,
        ready: document.readyState,
        banner: document.querySelector(".pool-banner")?.textContent,
        events: Reflect.get(window, "loadRecoveryLog"),
        locks:
          typeof navigator.locks?.query === "function"
            ? (await navigator.locks.query()).held?.length
            : null,
      }));
      fs.writeFileSync(
        info.outputPath("load-recovery.json"),
        JSON.stringify({ state, network }, null, 2),
      );
      await browser.close();
    }
  });
