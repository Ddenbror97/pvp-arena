import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.spec.ts",
  timeout: 360_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173",
    channel: "chrome",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
    actionTimeout: 20_000,
  },
});
