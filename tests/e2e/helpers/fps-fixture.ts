import { type Page } from "@playwright/test";

/** These fixtures mount the real renderer/controller/simulation; no production mock route exists. */
export async function fixture(page: Page, seat: "A" | "B" = "A") {
  // Isolate the real renderer from React hydration; this HTML exists only in the test transport.
  await page.route("**/__fps_polish_test__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><link rel="stylesheet" href="/src/components/fps/duel.css"></head><body style="margin:0"></body></html>',
    }),
  );
  await page.goto("/__fps_polish_test__");
  await page.evaluate(async (seat) => {
    const rendererPath = "/src/lib/fps/renderer.ts",
      simulationPath = "/src/lib/fps/simulation.ts";
    const { mountArena } = await import(rendererPath);
    const { createMatch, startMatch, stepMatch, TICK_MS } = await import(simulationPath);
    const now = Date.now(),
      state = createMatch({ A: "local-test-officer", B: "local-test-fighter" }, 5, now - 3000);
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
    const eventLog: Array<{ type: string; impact?: { surface: string; solidId: string } }> = [];
    const queue: Record<string, unknown>[] = [];
    let eventId = 0;
    const controls = mountArena(
      host,
      (next: Record<string, unknown>) => {
        inputs.push(next);
        queue.push(next);
        if (queue.length > 8) queue.shift();
      },
      () => {},
    );
    host.addEventListener("click", () => void controls.lock());
    const send = () => {
      if (Date.now() - state.server.lastStepAt < 34) return;
      const input = queue.shift();
      stepMatch(state, input ? { [seat]: input } : {}, state.server.lastStepAt + 34, TICK_MS);
      state.events = state.events.map((e: object) => ({ ...e, id: ++eventId }));
      eventLog.push(...state.events);
      controls.snapshot(
        {
          state: structuredClone(state),
          serverNow: Date.now(),
          settled: false,
          settlementPending: false,
        },
        seat,
      );
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
          controls.dispose();
        },
      },
    });
  }, seat);
}
