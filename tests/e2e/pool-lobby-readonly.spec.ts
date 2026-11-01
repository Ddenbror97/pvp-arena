import { test, expect } from "@playwright/test";
test("lobby cue is a read-only showcase, including out-of-table pointer gestures", async ({
  page,
}) => {
  await page.goto("/8-ball-pool");
  const cue = page.locator(".pool-stage-felt canvas.pool-cue");
  const table = page.locator(".pool-stage-felt canvas.pool-canvas");
  await expect(cue).toBeAttached();
  await expect(table).toBeVisible();
  await page.waitForTimeout(600);
  await cue.evaluate((c) =>
    Reflect.set(window, "previewCueBefore", (c as HTMLCanvasElement).toDataURL()),
  );
  const box = (await table.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2, { steps: 15 });
  await page.mouse.up();
  // The stick overhangs the table; cover global listeners as well as canvas handlers.
  await cue.evaluate((canvas) => {
    const b = canvas.getBoundingClientRect();
    for (let x = b.left; x < b.right; x += 25) {
      window.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 17,
          button: 0,
          clientX: x,
          clientY: b.top + b.height / 2,
          bubbles: true,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerId: 17,
          clientX: x + 120,
          clientY: b.top + 20,
          bubbles: true,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          pointerId: 17,
          button: 0,
          clientX: x + 120,
          clientY: b.top + 20,
          bubbles: true,
        }),
      );
    }
  });
  await page.waitForTimeout(200);
  expect(
    await cue.evaluate(
      (c) => (c as HTMLCanvasElement).toDataURL() === Reflect.get(window, "previewCueBefore"),
    ),
  ).toBe(true);
});
