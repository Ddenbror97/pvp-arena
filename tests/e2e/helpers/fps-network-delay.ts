import type { Page } from "@playwright/test";

/** Delay the actual hosted room socket in both directions, preserving TCP order.
 * These are added delays, not measurements from real geographical regions. */
export async function delayRoomSocket(page: Page, rttMs: number, jitterMs = 0) {
  if (![rttMs, jitterMs].every((n) => Number.isFinite(n) && n >= 0 && n <= 400))
    throw Error("Invalid test delay");
  const timers = new Set<ReturnType<typeof setTimeout>>();
  if (rttMs || jitterMs)
    await page.routeWebSocket(/\/matches\/[a-f0-9-]+\/socket\?/, (ws) => {
      const server = ws.connectToServer();
      let up = 0,
        down = 0,
        index = 0;
      const schedule = (send: () => void, outbound: boolean) => {
        const now = performance.now(),
          at = Math.max(
            (outbound ? up : down) + 0.1,
            now + rttMs / 2 + ((index++ % 5) * jitterMs) / 4,
          );
        if (outbound) up = at;
        else down = at;
        const timer = setTimeout(() => {
          timers.delete(timer);
          try {
            send();
          } catch {
            /* socket already closed */
          }
        }, at - now);
        timers.add(timer);
      };
      ws.onMessage((message) => schedule(() => server.send(message), true));
      server.onMessage((message) => schedule(() => ws.send(message), false));
    });
  return () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  };
}
