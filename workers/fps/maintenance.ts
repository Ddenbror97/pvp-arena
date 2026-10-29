/** Bounded, independent financial recovery. Never receives browser requests. */
export async function maintainMatches(
  env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string },
  fetcher: typeof fetch = fetch,
) {
  const headers = {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };
  for (const fn of ["fps_reconcile", "fps_expire"] as const) {
    for (let batch = 0; batch < 5; batch++) {
      const response = await fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ p_limit: 100 }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`${fn}:HTTP_${response.status}`);
      const result = (await response.json()) as {
        settled?: number;
        failed?: number;
        expired?: number;
      };
      if (result.failed) throw new Error(`${fn}:FAILED_${result.failed}`);
      const count = fn === "fps_reconcile" ? result.settled : result.expired;
      if (!Number.isSafeInteger(count) || count! < 0 || count! > 100)
        throw new Error(`${fn}:INVALID_RESPONSE`);
      if (count! < 100) break;
      if (batch === 4) console.warn(JSON.stringify({ event: "fps_maintenance_backlog", task: fn }));
    }
  }
}
