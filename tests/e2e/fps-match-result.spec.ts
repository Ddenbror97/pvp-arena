import { test, expect } from "@playwright/test";

test("one match result works for practice, funded rematches, low balance and settlement", async ({
  page,
}, info) => {
  await page.route("**/__strike_result__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/components/fps/duel.css"><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script></head><body style="margin:0"><main></main></body></html>`,
    }),
  );
  const mount = async (props: Record<string, unknown> = {}) => {
    await page.goto("/__strike_result__");
    await page.evaluate(async (props) => {
      const { mountResult } = await import("/tests/e2e/helpers/match-result-harness.tsx" as string);
      mountResult(document.querySelector("main")!, props);
    }, props);
  };
  await mount();
  await expect(page.getByRole("heading", { name: "ddenbror97" })).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("cash-result.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.getByRole("button", { name: "Starting…" })).toBeDisabled();
  await expect(page.locator("body")).toHaveAttribute("data-replay", "1");
  await mount({ available: 25 });
  await expect(page.getByRole("button", { name: "Play again" })).toBeDisabled();
  await expect(page.getByText("You need $0.75 more", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open wallet" })).toBeVisible();
  await mount({ settled: false });
  await expect(page.getByRole("button", { name: "Play again" })).toBeDisabled();
  await expect(page.getByText("Finalizing result…")).toBeVisible();
  await page.setViewportSize({ width: 800, height: 500 });
  await mount({ practice: true, available: 0 });
  await expect(page.getByRole("button", { name: "Play again" })).toBeEnabled();
  await expect(page.getByText("No wager. No rating changes.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("practice-result.png"), animations: "disabled" });
});
