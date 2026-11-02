import { test, expect } from "@playwright/test";

test("recent rooms filter, paginate and handle stale, failed and empty states", async ({
  page,
}, info) => {
  await page.route("**/__strike_rooms__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/components/fps/strike-lobby.css"><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script></head><body style="margin:0"><main></main></body></html>`,
    }),
  );
  const mount = async (props: Record<string, unknown> = {}) => {
    await page.goto("/__strike_rooms__");
    await page.evaluate(async (props) => {
      const { mountGames } = await import("/tests/e2e/helpers/open-games-harness.tsx" as string);
      mountGames(document.querySelector("main")!, props);
    }, props);
  };
  await mount();
  await expect(page.locator(".strike-room-list li")).toHaveCount(5);
  await expect(page.getByText("Page 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Next games", exact: true }).click();
  await expect(page.getByText("Page 2 of 4")).toBeVisible();
  await page.getByLabel("Filter games by entry").selectOption("100");
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator(".strike-room-price strong")).toHaveText(Array(5).fill("$1.00"));
  await page
    .getByRole("button", { name: /Review game with/ })
    .first()
    .click();
  await expect(page.locator("body")).toHaveAttribute("data-review", "room-0");
  await page.getByLabel("Filter games by entry").selectOption("all");
  await page.getByLabel("Sort open games").selectOption("high");
  await expect(page.locator(".strike-room-price strong")).toHaveText(Array(5).fill("$10.00"));
  await page.screenshot({
    path: info.outputPath("open-games-desktop.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await mount();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({ path: info.outputPath("open-games-mobile.png"), animations: "disabled" });
  await mount({ fresh: false });
  await expect(page.getByRole("button", { name: /Review game with/ }).first()).toBeDisabled();
  await expect(page.getByText("Connection interrupted.", { exact: false })).toBeVisible();
  await mount({ rooms: [], failed: true, fresh: false });
  await expect(page.getByText("Start the next duel.")).toHaveCount(0);
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-refreshed", "true");
  await mount({ rooms: [], loading: true });
  await expect(page.getByRole("status", { name: "Loading open games" })).toBeVisible();
  await expect(page.getByText("Start the next duel.")).toHaveCount(0);
  await mount({ rooms: [] });
  await page.getByRole("button", { name: "Create a game", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-create", "true");
});
