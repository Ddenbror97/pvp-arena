import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
test.skip(
  process.env["FPS_CAPTURE_LOBBY"] !== "1",
  "Explicit opt-in to regenerate the tracked showcase image",
);

test("capture actual arena for lobby showcase", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture(page, "A");
  await page.waitForTimeout(1000);
  await page
    .locator("canvas")
    .screenshot({ path: "public/fps/lobby-gameplay.jpg", type: "jpeg", quality: 88 });
});
