/** Cloudflare Worker bindings. Nitro/node process.env is not always populated. */
let bindings: Record<string, string> = {};

export function applyWorkerEnv(env: unknown) {
  if (!env || typeof env !== "object") return;
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
    if (typeof value === "string" && value.length > 0) {
      next[key] = value;
      process.env[key] = value;
    }
  }
  bindings = next;
}

export function workerEnv(name: string): string | undefined {
  const v = bindings[name] ?? process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
