import { test, expect } from "@playwright/test";

for (const mode of ["poker-action", "poker-buyin", "slot-status"])
  test(`${mode} survives browser-translated live controls`, async ({ page }, info) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await page.route("**/__translation_test__", (r) =>
      r.fulfill({ contentType: "text/html", body: "<!doctype html><body></body>" }),
    );
    await page.route("**/rest/v1/rpc/poker_buyin_info", (r) =>
      r.fulfill({ json: { available: 10000, cash: 10000, min_buy_in: 100, max_buy_in: 5000 } }),
    );
    await page.goto("/__translation_test__");
    await page.evaluate(async (mode) => {
      const path = "/tests/e2e/helpers/translation-fixture.tsx";
      const { mountTranslationFixture } = await import(path);
      mountTranslationFixture(mode);
    }, mode);
    if (mode === "slot-status") await expect(page.locator("#slot-status")).toContainText("scored");
    else
      await expect(
        page.getByRole("button", { name: mode === "poker-action" ? /Call \$1/ : /^Take a seat$/ }),
      ).toBeEnabled();
    // Reproduce the text-node replacement performed by browser translation,
    // respecting the standard translate=no exclusion; never patch DOM methods.
    await page.evaluate(() => {
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT),
        nodes: Text[] = [];
      while (walk.nextNode()) {
        const n = walk.currentNode as Text;
        if (
          n.textContent?.trim() &&
          !n.parentElement?.closest('script,style,textarea,[translate="no"],font')
        )
          nodes.push(n);
      }
      for (const node of nodes) {
        const outer = document.createElement("font"),
          inner = document.createElement("font");
        inner.textContent = node.textContent;
        outer.append(inner);
        node.replaceWith(outer);
      }
    });
    for (let cycle = 0; cycle < 6; cycle++) {
      if (mode === "slot-status")
        await page.evaluate(() => Reflect.get(window, "translationNext")());
      else
        await page
          .getByRole("button", { name: mode === "poker-action" ? /Call \$1/ : /^Take a seat$/ })
          .click();
      await page.waitForTimeout(300);
    }
    const failure = await page.evaluate(() => Reflect.get(window, "translationFailure") ?? null);
    await info.attach("translation-result", {
      body: JSON.stringify({ mode, failure }),
      contentType: "application/json",
    });
    expect(failure).toBeNull();
    await expect(page.getByRole("heading", { name: "This page didn't load" })).toHaveCount(0);
  });
