import { test, expect } from "@playwright/test";
import { freshTable } from "../../src/lib/pool/rules";
import { viewOf } from "../../src/lib/pool/view";

test("guest can practise, watch the bot, resume and restart without a cash match", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [],
    writes: string[] = [];
  await page.addInitScript(
    (value) => {
      if (!sessionStorage.getItem("pool-free-practice-v1"))
        sessionStorage.setItem("pool-free-practice-v1", JSON.stringify(value));
    },
    freshTable(new Uint8Array(32).fill(4)),
  );
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      r.method() === "POST" &&
      /pool_(create|join|shot|settle|leave)|\/pool\.functions/.test(r.url())
    )
      writes.push(r.url());
  });
  await page.goto("/8-ball-pool");
  await page.getByRole("link", { name: "Practice vs bot · Free" }).click();
  await expect(page).toHaveURL(/\/pool\/practice$/);
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-phase", "idle");
  await expect(page.locator("canvas.pool-canvas")).toBeVisible();
  await expect(page.getByText("Free · no stake · no payout")).toBeVisible();
  // Real keyboard controls send a legal break, not a component-state injection.
  await page.locator("h1").click();
  for (let n = 0; n < 19; n++) await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-phase", "rolling");
  await expect
    .poll(() => page.locator(".pool-practice").getAttribute("data-shot"), { timeout: 18000 })
    .not.toBe("0");
  // A weak follow-up hands the table over if the break retained the human's turn.
  if ((await page.locator(".pool-practice").getAttribute("data-turn")) === "A") {
    await expect(page.locator(".pool-practice")).toHaveAttribute("data-phase", "idle");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-phase", "aiming", {
    timeout: 20000,
  });
  await expect(page.locator(".practice-status")).toContainText("bot is aiming");
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-phase", "rolling", {
    timeout: 5000,
  });
  await expect
    .poll(
      async () =>
        JSON.parse((await page.evaluate(() => sessionStorage.getItem("pool-free-practice-v1")))!)
          .shot,
      { timeout: 16000 },
    )
    .toBeGreaterThanOrEqual(2);
  await page.reload();
  await expect.poll(() => page.locator(".pool-practice").getAttribute("data-shot")).not.toBe("0");
  await page.getByRole("button", { name: "Start new rack" }).click();
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-shot", "0");
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-turn", "A");
  await page.waitForTimeout(2300);
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-shot", "0");
  await page.screenshot({ path: "test-results/pool-practice-desktop.png" });
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("restart cancels bot work and mobile table fits without overflow", async ({ page }) => {
  const table = freshTable(new Uint8Array(32).fill(23));
  table.turn = "B";
  await page.addInitScript(
    (value) => sessionStorage.setItem("pool-free-practice-v1", JSON.stringify(value)),
    table,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pool/practice", { waitUntil: "domcontentloaded" });
  // Image loading can outlast the brief aiming phase; restart any in-flight bot shot.
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-turn", "B");
  await expect(page.locator(".pool-practice")).toHaveAttribute(
    "data-phase",
    /thinking|aiming|stroke|rolling/,
  );
  await page.getByRole("button", { name: "Start new rack" }).click();
  await page.waitForTimeout(2500);
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-shot", "0");
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-turn", "A");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/pool-practice-mobile.png" });
});

test("a legally called 8 ends Practice with a replayable, non-cash result", async ({ page }) => {
  const state = freshTable(new Uint8Array(32).fill(9));
  Object.assign(state, {
    breakShot: false,
    ballInHand: false,
    kitchenOnly: false,
    open: false,
    groupA: "solids",
  });
  for (const ball of state.balls) {
    ball.pocketed = ball.id !== 0 && ball.id !== 8;
    if (ball.id === 0) {
      ball.x = 1270000;
      ball.y = 1000000;
    }
    if (ball.id === 8) {
      ball.x = 1270000;
      ball.y = 330000;
    }
  }
  // Restore a final-ball layout; the winning shot still goes through actual controls and physics.
  await page.addInitScript(
    (value) => sessionStorage.setItem("pool-free-practice-v1", JSON.stringify(value)),
    state,
  );
  await page.goto("/pool/practice");
  await expect(page.locator(".practice-status")).toContainText("Call a pocket");
  const canvas = page.locator("canvas.pool-canvas"),
    box = (await canvas.boundingBox())!;
  const size = await canvas.evaluate((node) => ({ w: node.clientWidth, h: node.clientHeight }));
  const pocket = viewOf(size.w, size.h).project(1270000, 18000);
  await page.mouse.click(
    box.x + (pocket.x / size.w) * box.width,
    box.y + (pocket.y / size.h) * box.height,
  );
  await page.evaluate(() => {
    for (let n = 0; n < 90; n++)
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    for (let n = 0; n < 8; n++)
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
  });
  await page.keyboard.press("Enter");
  await expect(page.locator(".pool-result")).toContainText("You won!", { timeout: 15000 });
  await expect(page.locator(".pool-result")).toContainText("No money was wagered or awarded");
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.locator(".pool-result")).toHaveCount(0);
  await expect(page.locator(".pool-practice")).toHaveAttribute("data-shot", "0");
});
