import { readFileSync } from "node:fs";
import postgres from "postgres";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const SINK = "/tmp/e2e-mail.jsonl";
const FORBIDDEN = ["dkyabirifoixnfbmheay", "gqeaadpdtuussxdlnmof", "fdsovopvmjogjcllmxwj"];

function secret(name: string): string {
  const env = Object.fromEntries(
    readFileSync("/tmp/secrets/sb-test.env", "utf8")
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
  const value = env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

function database() {
  const ref = secret("TEST_PROJECT_REF");
  if (ref !== "ljpqxsndqywbndnpitja") throw new Error("refusing unexpected test ref");
  for (const bad of FORBIDDEN) {
    if (ref.includes(bad)) throw new Error("refusing forbidden ref");
  }
  const user = `postgres.${ref}`;
  const password = secret("TEST_DB_PASSWORD");
  return postgres(
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
    { max: 1, prepare: false, idle_timeout: 5 },
  );
}

async function codeFor(email: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const lines = readFileSync(SINK, "utf8").trim().split("\n").filter(Boolean);
    for (const line of lines.reverse()) {
      const row = JSON.parse(line) as { to?: string; text?: string };
      if (row.to?.toLowerCase() !== email.toLowerCase()) continue;
      const code = row.text?.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("verification code was not captured");
}

async function openSignup(page: Page) {
  // The sign-in form is in the first HTML. A click before hydration is discarded
  // and the username field never mounts, so retry until the client keeps signup mode.
  await expect(async () => {
    const username = page.locator("#username");
    if (!(await username.isVisible())) {
      await page.getByRole("button", { name: "No account? Create one" }).click({ timeout: 3_000 });
    }
    await expect(username).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 45_000 });
}

async function register(page: Page, input: { username: string; email: string; password: string }) {
  await page.goto("/auth");
  await openSignup(page);
  await page.locator("#username").fill(input.username);
  await page.locator("#email").fill(input.email);
  await page.locator("#email-confirm").fill(input.email);
  await page.locator("#password").fill(input.password);
  await page.locator("#password-confirm").fill(input.password);
  await page.locator("#age").click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const code = await codeFor(input.email);
  await page.getByLabel("Digit 1").fill(code);
  const profile = page.getByRole("heading", { name: "Pick your username" });
  const wallet = page.getByRole("link", { name: /Wallet,/ });
  await expect(profile.or(wallet)).toBeVisible();
  // Signup metadata already calls ensure_profile, so the dialog is only there
  // when that first create did not stick.
  if (await profile.isVisible()) {
    await page.getByPlaceholder("username").fill(input.username);
    await page.locator("#age2").click();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(wallet).toBeVisible();
  await expect(page.getByRole("img", { name: new RegExp(`^${input.username},`) })).toBeVisible();
}

async function openContext(browser: Browser, ip: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Signup rate limits read these headers on the local server. Sending them on
  // every request makes the browser preflight to Supabase fail CORS.
  await page.route("http://127.0.0.1:4173/**", async (route) => {
    const headers = {
      ...route.request().headers(),
      "cf-connecting-ip": ip,
      "x-forwarded-for": ip,
    };
    await route.continue({ headers });
  });
  const frames: string[] = [];
  page.on("websocket", (socket) => {
    socket.on("framereceived", (frame) => {
      const payload = typeof frame.payload === "string" ? frame.payload : "";
      if (payload.includes("pool_matches") || payload.includes("postgres_changes")) frames.push(payload);
    });
  });
  (page as Page & { realtimeFrames?: string[] }).realtimeFrames = frames;
  return { context, page };
}

test("two players register, play, and settle an 8-ball match", async ({ browser }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "requires the isolated staging server");
  const sql = database();
  const stamp = Date.now().toString(36);
  const password = `Pool-e2e-${stamp}-A9`;
  const host = {
    username: `e2ea${stamp}`.slice(0, 20),
    email: `e2ea-${stamp}@example.com`,
    password,
  };
  const guest = {
    username: `e2eb${stamp}`.slice(0, 20),
    email: `e2eb-${stamp}@example.com`,
    password,
  };
  const octet = 20 + (Date.now() % 200);
  const hostSession = await openContext(browser, `203.0.113.${octet}`);
  const guestSession = await openContext(browser, `198.51.100.${octet}`);
  try {
    await register(hostSession.page, host);
    await register(guestSession.page, guest);
    // A fresh database is still PRE_MIGRATION. The header chip reads the real
    // USD account, which stays at zero. Play spends the test-credit grant.
    const names = [host.username, guest.username];
    await expect
      .poll(async () => {
        const grants = await sql<{ username: string; account_type: string; balance: string }[]>`
          select p.username, w.account_type, w.balance::text
          from public.profiles p
          join public.wallet_accounts w on w.owner_id = p.id
          where p.username = any(${names})
            and w.kind = 'user_available'
        `;
        const grantOf = (name: string, type: string) =>
          grants.find((row) => row.username === name && row.account_type === type)?.balance;
        return names.every((name) => grantOf(name, "test_credit") === "100000" && grantOf(name, "real") === "0");
      }, { timeout: 15_000 })
      .toBe(true);

    await hostSession.page.goto("/8-ball-pool");
    const oneDollar = hostSession.page.getByRole("button", { name: "$1", exact: true });
    // The lobby redraws the clock every second. Repeat the click until the
    // pressed stake sticks, then create the table.
    await expect(async () => {
      await oneDollar.click({ timeout: 3_000 });
      await expect(oneDollar).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(async () => {
      if (!/\/pool\/\d+/.test(hostSession.page.url())) {
        await hostSession.page.getByRole("button", { name: "Create game" }).click({ timeout: 3_000 });
      }
      await expect(hostSession.page).toHaveURL(/\/pool\/\d+/, { timeout: 8_000 });
    }).toPass({ timeout: 40_000 });
    const matchId = Number(new URL(hostSession.page.url()).pathname.split("/").pop());
    expect(matchId).toBeGreaterThan(0);

    await guestSession.page.goto("/8-ball-pool");
    await expect(guestSession.page.getByRole("button", { name: "Join table" })).toBeVisible();
    await guestSession.page.getByRole("button", { name: "Join table" }).click();
    await guestSession.page.waitForURL(new RegExp(`/pool/${matchId}`), { timeout: 30_000 });

    for (const page of [hostSession.page, guestSession.page]) {
      await expect(page.getByRole("img", { name: "Groups not chosen yet" }).first()).toBeVisible({
        timeout: 60_000,
      });
      const skip = page.getByRole("button", { name: "Skip" });
      if (await skip.isVisible().catch(() => false)) await skip.click();
    }
    await hostSession.page.getByRole("button", { name: "Shot settings and fairness" }).click();
    await expect(hostSession.page.getByText("The rack matches the commitment.")).toBeVisible();

    const shots = async () =>
      Number(
        (
          await sql<{ n: string }[]>`
            select count(*)::text as n from public.pool_events
            where match_id = ${matchId} and kind = 'shot'
          `
        )[0]?.n ?? 0,
      );
    const drag = async (page: Page) => {
      const canvas = page.locator("canvas.pool-canvas");
      const box = await canvas.boundingBox();
      if (!box) throw new Error("table canvas has no box");
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + 220, { steps: 12 });
      await page.mouse.up();
    };

    await drag(guestSession.page);
    await guestSession.page.waitForTimeout(1500);
    expect(await shots()).toBe(0);

    let made = false;
    for (let attempt = 0; attempt < 4 && !made; attempt += 1) {
      await drag(hostSession.page);
      const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        if ((await shots()) >= 1) {
          made = true;
          break;
        }
        await hostSession.page.waitForTimeout(500);
      }
    }
    expect(made).toBe(true);

    const guestFrames = (guestSession.page as Page & { realtimeFrames?: string[] }).realtimeFrames ?? [];
    await expect.poll(() => guestFrames.length, { timeout: 15_000 }).toBeGreaterThan(0);

    await hostSession.page.reload();
    await expect(hostSession.page.locator("canvas.pool-canvas")).toBeVisible();
    await hostSession.page.context().setOffline(true);
    await hostSession.page.waitForTimeout(1000);
    await hostSession.page.context().setOffline(false);
    await expect(hostSession.page.locator("canvas.pool-canvas")).toBeVisible();

    await guestSession.page.setViewportSize({ width: 390, height: 844 });
    const mobileBox = await guestSession.page.locator("canvas.pool-canvas").boundingBox();
    expect(mobileBox).not.toBeNull();
    expect(mobileBox!.width).toBeLessThanOrEqual(390);
    expect(mobileBox!.x).toBeGreaterThanOrEqual(0);

    const turn = await sql<{ seat: string }[]>`
      select state->>'turn' as seat from public.pool_matches where id = ${matchId}
    `;
    const away = turn[0]?.seat === "A" ? hostSession : guestSession;
    const stay = away === hostSession ? guestSession : hostSession;
    await away.context.close();
    await expect(stay.page.getByText(/You won \$1\.90|You lost/)).toBeVisible({ timeout: 240_000 });
    await expect(stay.page.getByText("Winner receives $1.90. Fee $0.10.")).toBeVisible();

    const balances = await sql<{ username: string; account_type: string; balance: string }[]>`
      select p.username, w.account_type, w.balance::text
      from public.profiles p
      join public.wallet_accounts w on w.owner_id = p.id
      where p.username = any(${[host.username, guest.username]})
        and w.kind = 'user_available'
      order by p.username
    `;
    const byName = Object.fromEntries(
      balances
        .filter((row) => row.account_type === "test_credit")
        .map((row) => [row.username, Number(row.balance)]),
    );
    for (const row of balances) {
      if (row.account_type === "real") expect(Number(row.balance)).toBe(0);
    }
    const winnerName = (await stay.page.getByText("You won").count()) > 0 ? stay : away;
    const winner = winnerName === hostSession ? host.username : guest.username;
    const loser = winner === host.username ? guest.username : host.username;
    expect(byName[winner]).toBe(100_090);
    expect(byName[loser]).toBe(99_900);
    const dupes = await sql<{ n: string }[]>`
      select count(*)::text as n from (
        select match_id from public.pool_settlements where match_id = ${matchId}
        group by match_id having count(*) > 1
      ) d
    `;
    expect(Number(dupes[0]?.n ?? 0)).toBe(0);
    if (!stay.page.isClosed()) {
      await stay.page.reload();
      await expect(stay.page.getByRole("link", { name: /Wallet, \$0\.00 USDC/ })).toBeVisible();
    }
  } finally {
    await sql.end();
    await hostSession.context.close().catch(() => {});
    await guestSession.context.close().catch(() => {});
  }
});
