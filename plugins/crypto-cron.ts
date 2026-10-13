export default function cryptoCronPlugin(nitroApp: {
  hooks: { hook: (name: string, fn: (event: { env?: unknown; waitUntil?: (work: Promise<unknown>) => void; req?: { waitUntil?: (work: Promise<unknown>) => void } }) => void | Promise<void>) => void };
}) {
  nitroApp.hooks.hook("request", (event) => {
    const waitUntil =
      typeof event.waitUntil === "function"
        ? event.waitUntil.bind(event)
        : event.req?.waitUntil?.bind(event.req);
    if (!waitUntil) return;
    (globalThis as { __pvpWait?: (work: Promise<unknown>) => void }).__pvpWait = waitUntil;
  });
  nitroApp.hooks.hook("cloudflare:scheduled", async ({ env }) => {
    const { applyWorkerEnv } = await import("../src/lib/worker-env");
    applyWorkerEnv(env);
    const { runScheduledCryptoJobs } = await import("../src/lib/crypto/jobs.server");
    // Game ticks stay on pg_cron. This Cloudflare schedule is independent of
    // that database cron: it reads worker heartbeats first, then publishes
    // treasury inventory and pays withdrawals. Deposit scanning stays on pg_cron.
    await runScheduledCryptoJobs().catch((error: unknown) => {
      console.error("[crypto:cron]", error instanceof Error ? error.message : "failed");
    });
  });
}
