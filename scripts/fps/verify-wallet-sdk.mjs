import fs from "node:fs";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

// Exercise the real browser SDK bundle without requesting wallet permissions,
// signatures, transactions, or any external transport.
const bundle = await build({
  stdin: {
    contents: 'export {createEVMClient} from "@metamask/connect-evm";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  globalName: "WalletSdkContract",
  platform: "browser",
  conditions: ["browser"],
  target: "es2022",
});
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { started: new Date().toISOString(), externalRequestsBlocked: 0, errors: [] };
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.route("**/*", async (route) => {
    if (route.request().url() === "https://wallet-contract.invalid/")
      return route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><html><body>Wallet SDK contract</body></html>",
      });
    report.externalRequestsBlocked++;
    return route.abort();
  });
  await page.routeWebSocket("**/*", (socket) => {
    report.externalRequestsBlocked++;
    socket.close({ code: 1000, reason: "External transports disabled in contract test" });
  });
  await page.goto("https://wallet-contract.invalid/");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  report.client = await page.evaluate(async () => {
    const client = await window.WalletSdkContract.createEVMClient({
      dapp: { name: "PvP SDK compatibility test", url: window.location.origin },
      api: { supportedNetworks: { "0x2105": "https://rpc.wallet-contract.invalid" } },
      analytics: { enabled: false },
      skipAutoAnnounce: true,
    });
    const result = {
      providerRequest: typeof client.getProvider().request,
      connect: typeof client.connect,
      disconnect: typeof client.disconnect,
      status: client.status,
    };
    await client.disconnect();
    return result;
  });
  assert.equal(report.client.providerRequest, "function");
  assert.equal(report.client.connect, "function");
  assert.equal(report.client.disconnect, "function");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  report.finished = new Date().toISOString();
  fs.writeFileSync(
    "test-results/uuid-remediation-browser-sdk.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
}
