export default function cryptoCronPlugin(nitroApp: {
  hooks: { hook: (name: string, fn: (event: { env: unknown }) => Promise<void>) => void };
}) {
  nitroApp.hooks.hook("cloudflare:scheduled", async ({ env }) => {
    const { applyWorkerEnv } = await import("../src/lib/worker-env");
    applyWorkerEnv(env);
    const { runScheduledCryptoJobs, runScheduledRouletteWorker } = await import("../src/lib/crypto/jobs.server");
    await Promise.all([
      runScheduledCryptoJobs(),
      runScheduledRouletteWorker(),
    ]);
  });
}
