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
    audio.dispose();
    return { single, repeat, muted, step, bounded };
  });
  expect(stats.single.decoded).toBe(7);
  expect(stats.single.shots).toBe(1);
  expect(stats.single.voices).toBe(1);
  expect(stats.repeat.shots).toBe(1);
  expect(stats.muted.voices).toBe(stats.single.voices);
  expect(stats.step.steps).toBe(1);
  expect(stats.bounded.voices).toBeLessThanOrEqual(24);
  await info.attach("combat-audio", {
    body: JSON.stringify(stats),
    contentType: "application/json",
  });
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
