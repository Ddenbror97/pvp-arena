import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: [
    "fps-motion-continuity.spec.ts",
    "fps-close-opponent.spec.ts",
    "fps-death-feedback.spec.ts",
    "fps-vertical-motion.spec.ts",
    "fps-browser-input.spec.ts",
    "fps-pointer-lock.spec.ts",
    "fps-six-rounds.spec.ts",
    "fps-culling.spec.ts",
    "fps-lifecycle.spec.ts",
    "fps-combat.spec.ts",
    "fps-surface-depth.spec.ts",
  ],
  timeout: 180000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 800 },
    trace: "off",
    video: "off",
  },
  projects: [
    { name: "chrome", use: { browserName: "chromium", channel: "chrome" } },
    { name: "edge", use: { browserName: "chromium", channel: "msedge" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
