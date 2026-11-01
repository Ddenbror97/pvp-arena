import { test, expect } from "@playwright/test";
test("recorded combat audio plays once per confirmed event, supports mute and bounds voices", async ({
  page,
}, info) => {
  await page.route("**/__combat_audio__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<!doctype html><button id="start">Enable audio</button>',
    }),
  );
  await page.goto("/__combat_audio__");
  await page.evaluate(async () => {
    const path = "/src/lib/fps/audio.ts",
      sim = "/src/lib/fps/simulation.ts";
    const { createCombatAudio } = await import(path),
      { createMatch } = await import(sim);
    const audio = createCombatAudio();
    await audio.ready();
    const state = createMatch({ A: "a", B: "b" }, 5, 0);
    state.phase = "live";
    Object.assign(window, { combatAudio: audio, combatState: state });
    document.querySelector("#start")!.addEventListener("click", () => void audio.unlock());
  });
  await page.locator("#start").click();
  const stats = await page.evaluate(async () => {
    const w = window as unknown as {
        combatAudio: import("../../src/lib/fps/audio").CombatAudio;
        combatState: import("../../src/lib/fps/protocol").MatchState;
      },
      audio = w.combatAudio,
      s = w.combatState;
    await audio.unlock();
    s.tick = 1;
    s.events = [
      {
        id: 1,
        type: "shot",
        seat: "A",
        text: "rifle fired",
        weapon: "rifle",
        audio: { kind: "shot", gain: 1, pan: 0 },
      },
    ];
    audio.snapshot(s, "A");
    audio.snapshot(s, "A");
    const single = audio.diagnostics;
    s.tick++;
    audio.snapshot(s, "A");
    const repeat = audio.diagnostics;
    audio.setMuted(true);
    s.tick++;
    s.events = [{ ...s.events[0]!, id: 2 }];
    audio.snapshot(s, "A");
    const muted = audio.diagnostics;
    audio.setMuted(false);
    s.tick++;
    s.events = [
      {
        id: 3,
        type: "step",
        seat: "A",
        text: "Footstep",
        audio: { kind: "step", gain: 1, pan: 0 },
      },
    ];
    audio.snapshot(s, "A");
    const step = audio.diagnostics;
    for (let n = 4; n < 104; n++) {
      s.tick++;
      s.events = [
        {
          id: n,
          type: "shot",
          seat: "A",
          text: "rifle fired",
          weapon: "rifle",
          audio: { kind: "shot", gain: 1, pan: 0 },
        },
      ];
      audio.snapshot(s, "A");
    }
    const bounded = audio.diagnostics;
    audio.localShot("rifle", 201);
    const predicted = audio.diagnostics.shots;
    s.tick++;
    s.events = [
      { id: 104, type: "shot", seat: "A", text: "rifle fired", weapon: "rifle", shotSeq: 201 },
    ];
    audio.snapshot(s, "A");
    const confirmed = audio.diagnostics.shots;
    s.tick++;
    s.events = [
      {
        id: 105,
        type: "hit",
        seat: "B",
        text: "Hit",
        hit: {
          victim: "A",
          zone: "chest",
          point: { x: 0, y: 1, z: 0 },
          direction: { x: 0, y: 0, z: 1 },
          damage: 26,
        },
      },
    ];
    audio.snapshot(s, "A");
    audio.snapshot(s, "A");
    const hurt = audio.diagnostics.hits;
    s.tick++;
    s.events = [{ id: 106, type: "round-end", seat: "B", text: "Round victory" }];
    audio.snapshot(s, "A");
    const roundVoices = audio.diagnostics.voices;
    audio.snapshot(s, "A");
    const repeatedRoundVoices = audio.diagnostics.voices;
    audio.dispose();
    return {
      single,
      repeat,
      muted,
      step,
      bounded,
      predicted,
      confirmed,
      hurt,
      roundVoices,
      repeatedRoundVoices,
    };
  });
  // 8 recorded samples (AK, pistol, steps, AK reloads) + 3 Police M4 (shot, two reloads) + 3
  // synthesised (hurt, elimination, casing).
  expect(stats.single.decoded).toBe(14);
  expect(stats.single.shots).toBe(1);
  // Own Police M4 shot: the report plus its ejected case landing a moment later.
  expect(stats.single.voices).toBe(2);
  expect(stats.repeat.shots).toBe(1);
  expect(stats.muted.voices).toBe(stats.single.voices);
  expect(stats.step.steps).toBe(1);
  expect(stats.bounded.voices).toBeLessThanOrEqual(24);
  expect(stats.predicted).toBe(stats.bounded.shots + 1);
  expect(stats.confirmed).toBe(stats.predicted);
  expect(stats.hurt).toBe(1);
  expect(stats.repeatedRoundVoices).toBe(stats.roundVoices);
  await info.attach("combat-audio", {
    body: JSON.stringify(stats),
    contentType: "application/json",
  });
});

test("AK reload audio joins the server timeline once and stops on death", async ({ page }) => {
  await page.route("**/__reload_audio__", (r) =>
    r.fulfill({ contentType: "text/html", body: '<button id="start">Enable audio</button>' }),
  );
  await page.goto("/__reload_audio__");
  await page.evaluate(async () => {
    const { createCombatAudio } = await import("/src/lib/fps/audio.ts" as string);
    const { createMatch } = await import("/src/lib/fps/simulation.ts" as string);
    const audio = createCombatAudio();
    await audio.ready();
    Reflect.set(window, "reloadTest", { audio, state: createMatch({ A: "a", B: "b" }, 5, 0) });
    document.querySelector("button")!.addEventListener("click", () => void audio.unlock());
  });
  await page.locator("button").click();
  const result = await page.evaluate(async () => {
    const { audio, state } = Reflect.get(window, "reloadTest");
    await audio.unlock();
    const offsets: number[] = [];
    const original = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when = 0, offset = 0) {
      offsets.push(offset);
      original.call(this, when, offset);
    };
    try {
      state.phase = "live";
      state.players.A.ammo = 0;
      state.players.A.reloadUntil = 2300;
      state.tick = 1;
      audio.snapshot(state, "A", 1000);
      audio.snapshot(state, "A", 1000);
      state.tick++;
      audio.snapshot(state, "A", 1100);
      const active = audio.diagnostics;
      state.players.A.hp = 0;
      state.tick++;
      audio.snapshot(state, "A", 1200);
      await new Promise((r) => setTimeout(r, 30));
      const stopped = audio.diagnostics.voices;
      state.round++;
      state.tick++;
      state.players.A.hp = 100;
      state.players.A.ammo = 15;
      state.players.A.reloadUntil = 3800;
      audio.snapshot(state, "A", 2000);
      return { offsets, active, stopped, reloads: audio.diagnostics.reloads };
    } finally {
      AudioBufferSourceNode.prototype.start = original;
      audio.dispose();
    }
  });
  expect(result.offsets).toEqual([0.5, 0]);
  expect(result.active.reloads).toBe(1);
  expect(result.active.voices).toBe(1);
  expect(result.stopped).toBe(0);
  expect(result.reloads).toBe(2);
});
test("blood marks and droplets have bounded pools and reset each round", async ({ page }) => {
  await page.route("**/__combat_blood__", (r) =>
    r.fulfill({ contentType: "text/html", body: "<!doctype html><body></body>" }),
  );
  await page.goto("/__combat_blood__");
  const data = await page.evaluate(async () => {
    const bloodPath = "/src/lib/fps/blood-effects.ts",
      threePath = "/node_modules/three/build/three.module.js";
    const { createBloodEffects } = await import(bloodPath),
      THREE = await import(threePath),
      scene = new THREE.Scene(),
      fx = createBloodEffects(scene);
    const hit = {
      victim: "B",
      zone: "head",
      damage: 50,
      point: { x: 9, y: 1.6, z: -14.2 },
      direction: { x: 0, y: 0, z: -1 },
      splatter: {
        distance: 1.8,
        point: { x: 9, y: 1.6, z: -16 },
        normal: { x: 0, y: 0, z: 1 },
        surface: "concrete",
        solidId: "wall-back",
      },
    };
    for (let n = 0; n < 2000; n++) fx.emit(hit, 100);
    fx.update(16, 116);
    const marks = scene.getObjectByName("confirmed-blood-splatter"),
      particles = scene.getObjectByName("confirmed-blood-drops"),
      before = {
        marks: marks.count,
        instances: marks.instanceMatrix.count,
        particles: particles.geometry.getAttribute("position").count,
      };
    fx.reset();
    const after = marks.count;
    fx.dispose();
    return { before, after };
  });
  expect(data.before).toEqual({ marks: 48, instances: 48, particles: 96 });
  expect(data.after).toBe(0);
});
