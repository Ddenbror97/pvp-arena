import { test, expect } from "@playwright/test";

test("real BR renderer never draws an audio-only decoy, including after a delayed removal", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__br_canary_render__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><body style="margin:0"><div id="arena" style="width:100vw;height:100vh"></div></body></html>',
    }),
  );
  await page.goto("/__br_canary_render__");
  await page.evaluate(async () => {
    const arenaPath = "/src/lib/fps/br/br-arena.ts",
      matchPath = "/src/lib/fps/br/match.ts",
      heightPath = "/src/lib/fps/br/heightfield.ts",
      worldPath = "/src/lib/fps/br/static-world.ts";
    const [
      { createBrArena },
      { createBrMatch, brViewFor, BrSight, BrSeatSync, BR_RULES },
      { decodeHeightfield },
      { StaticWorld },
    ] = await Promise.all([
      import(arenaPath),
      import(matchPath),
      import(heightPath),
      import(worldPath),
    ]);
    const [meta, hf] = await Promise.all([
      fetch("/fps/br/world.v1.json").then((r) => r.json()),
      fetch("/fps/br/height.v1.hf")
        .then((r) => r.arrayBuffer())
        .then(decodeHeightfield),
    ]);
    const state = createBrMatch(meta, 7, (x: number, z: number) => hf.heightAt(x, z));
    state.phase = "starting";
    const [x, z] = BR_RULES.warmupCentre;
    Object.assign(state.seats[0].body, {
      x,
      y: hf.heightAt(x, z),
      z,
      phase: "ground",
      grounded: true,
    });
    const solid = new StaticWorld(hf, [], { voxel: 0.1, models: {} }, null);
    const arena = createBrArena(document.querySelector("#arena")!, location.origin + "/", () => {});
    Reflect.set(window, "canaryRender", {
      arena,
      state,
      solid,
      brViewFor,
      BrSight,
      BrSeatSync,
      x,
      z,
    });
    await arena.ready;
    arena.setScenePresented(true);
  });
  const publish = async (hidden: boolean) =>
    page.evaluate((hidden) => {
      const q = Reflect.get(window, "canaryRender");
      q.state.tick += 3;
      const view = q.brViewFor(
        q.state,
        q.solid,
        new q.BrSight(),
        0,
        (q.state.tick * 1000) / 30,
        new q.BrSeatSync(),
      );
      view.players = [
        [99, q.x + 3, q.state.seats[0].body.y, q.z - 6, 4, 0, -1, hidden ? 5 : 1, -1, -1, -1, 0],
      ];
      q.arena.snapshot(view);
    }, hidden);
  await publish(false);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "canaryRender").arena.debug().fullActors), {
      timeout: 90_000,
    })
    .toBe(1);
  await publish(true);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const d = Reflect.get(window, "canaryRender").arena.debug();
        return { rows: d.visibleRemotes, actors: d.fullActors, standIns: d.standIns };
      }),
    )
    .toEqual({ rows: 1, actors: 0, standIns: 0 });
  // No further snapshots: a slow/lost removal must never reveal the retained row.
  await page.evaluate(() => Reflect.get(window, "canaryRender").arena.look(Math.PI / 2, 0));
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(() => {
      const d = Reflect.get(window, "canaryRender").arena.debug();
      return d.fullActors + d.standIns;
    }),
  ).toBe(0);
  await publish(false);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "canaryRender").arena.debug().fullActors))
    .toBe(1);
  await page.evaluate(() => Reflect.get(window, "canaryRender").arena.dispose());
  expect(errors).toEqual([]);
});
