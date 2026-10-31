import { type Page } from "@playwright/test";

/** These fixtures mount the real renderer/controller/simulation; no production mock route exists. */
export async function fixture(
  page: Page,
  seat: "A" | "B" = "A",
  bestOf: 5 | 9 = 5,
  snapshotDelay = 0,
) {
  // Isolate the real renderer from React hydration; this HTML exists only in the test transport.
  await page.route("**/__fps_polish_test__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><link rel="stylesheet" href="/src/components/fps/duel.css"></head><body style="margin:0"></body></html>',
    }),
  );
  await page.goto("/__fps_polish_test__");
  await page.evaluate(
    async ({ seat, bestOf, snapshotDelay }) => {
      const rendererPath = "/src/lib/fps/renderer.ts",
        simulationPath = "/src/lib/fps/simulation.ts";
      const { mountArena } = await import(rendererPath);
      const { createMatch, startMatch, stepMatch, TICK_MS } = await import(simulationPath);
      const now = Date.now(),
        state = createMatch(
          { A: "local-test-officer", B: "local-test-fighter" },
          bestOf,
          now - 3000,
        );
      startMatch(state, now - 3000);
      stepMatch(state, {}, now, TICK_MS);
      // Keep both behind the real cover during input tests. Showcase placement is explicit below.
      const container = document.createElement("div");
      container.className = "duel-game";
      container.innerHTML =
        '<div class="duel-render-host"></div><div class="duel-crosshair"><i></i><i></i><i></i><i></i></div><div class="duel-hit-marker"><i></i><i></i><i></i><i></i></div>';
      document.body.replaceChildren(container);
      const host = container.querySelector<HTMLElement>(".duel-render-host")!;
      const inputs: unknown[] = [];
      const localShots: Array<{ weapon: string; seq: number; at: number }> = [];
      const eventLog: Array<{ type: string; impact?: { surface: string; solidId: string } }> = [];
      const queue: Record<string, unknown>[] = [];
      let eventId = 0;
      let lastDeliveryAt = 0;
      const deliveries = new Set<ReturnType<typeof setTimeout>>();
      const controls = mountArena(
        host,
        (next: Record<string, unknown>) => {
          inputs.push(next);
          queue.push(next);
          if (queue.length > 8) queue.shift();
        },
        () => {},
        (weapon: string, seq: number) => {
          localShots.push({ weapon, seq, at: performance.now() });
          Reflect.get(window, "fpsTestAudio")?.localShot(weapon, seq);
        },
      );
      host.addEventListener("click", () => void controls.lock());
      state.server.lastStepAt = Date.now();
      state.phaseEndsAt = Date.now() + 60000;
      const send = () => {
        const now = Date.now(),
          events: object[] = [];
        for (
          let step = 0;
          step < 3 &&
          ["countdown", "live", "round-end"].includes(state.phase) &&
          now - state.server.lastStepAt >= 34;
          step++
        ) {
          const input = queue.shift();
          const opponent = Reflect.get(window, "fpsTestOpponent")?.(state, now);
          const before = structuredClone(state.players);
          stepMatch(
            state,
            {
              ...(input ? { [seat]: input } : {}),
              ...(opponent ? { [seat === "A" ? "B" : "A"]: opponent } : {}),
            },
            Math.max(state.server.lastStepAt + 34, now - 68),
            TICK_MS,
          );
          Reflect.get(window, "fpsTestAfterStep")?.(state, before, now);
          events.push(...state.events.map((e: object) => ({ ...e, id: ++eventId })));
        }
        state.events = events;
        eventLog.push(...state.events);
        const frame = {
          state: structuredClone(state),
          serverNow: Date.now(),
          settled: false,
          settlementPending: false,
        };
        if (snapshotDelay) {
          // Ordered variable-delay delivery models a jittery WebSocket; authority
          // and physics still advance independently of rendering and delivery.
          const due = Math.max(
            lastDeliveryAt + 1,
            now + snapshotDelay + (Math.floor(now / 600) % 2) * 35,
          );
          lastDeliveryAt = due;
          const delivery = setTimeout(() => {
            deliveries.delete(delivery);
            controls.snapshot(frame, seat);
          }, due - now);
          deliveries.add(delivery);
        } else controls.snapshot(frame, seat);
      };
      controls.snapshot(
        {
          state: structuredClone(state),
          serverNow: Date.now(),
          settled: false,
          settlementPending: false,
        },
        seat,
      );
      const timer = setInterval(send, 34);
      Object.assign(window, {
        fpsPolishTest: {
          state,
          inputs,
          localShots,
          eventLog,
          resetView: () => {
            queue.length = 0;
            controls.snapshot(
              {
                state: structuredClone(state),
                serverNow: Date.now(),
                settled: false,
                settlementPending: false,
              },
              seat,
            );
          },
          controls,
          seat,
          dispose: () => {
            clearInterval(timer);
            for (const timer of deliveries) clearTimeout(timer);
            controls.dispose();
          },
        },
      });
    },
    { seat, bestOf, snapshotDelay },
  );
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset["authoredModels"] === "ready",
    {},
    { timeout: Number(process.env["FPS_READY_TIMEOUT"] ?? 30000) },
  );
}
