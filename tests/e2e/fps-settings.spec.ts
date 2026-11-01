import { test, expect } from "@playwright/test";
test("settings supports keyboard controls, five crosshairs, custom color and persistence", async ({
  page,
}) => {
  await page.route("**/__strike_settings__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/components/fps/duel.css"><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script></head><body><main></main></body></html>`,
    }),
  );
  const mount = async () => {
    await page.goto("/__strike_settings__");
    await page.evaluate(async () => {
      const { mountSettings } = await import("/tests/e2e/helpers/settings-harness.tsx" as string);
      mountSettings(document.querySelector("main")!);
    });
  };
  await mount();
  await expect(page.getByRole("dialog")).toBeVisible();
  const sensitivity = page.getByRole("slider", { name: "Mouse sensitivity" });
  await sensitivity.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sensitivity).toHaveValue("1.05");
  for (const name of ["Dynamic cross", "Dot", "Circle", "Cross and dot", "Static cross"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("button", { name, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await page.getByLabel("Crosshair color").fill("#ff8800");
  await page.getByRole("button", { name: "Resume game" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".crosshair-4 i").first()).toHaveCSS(
    "background-color",
    "rgb(255, 136, 0)",
  );
  await mount();
  await expect(page.getByRole("slider", { name: "Mouse sensitivity" })).toHaveValue("1.05");
  await expect(page.getByLabel("Crosshair color")).toHaveValue("#ff8800");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
