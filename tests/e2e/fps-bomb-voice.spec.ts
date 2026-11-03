import { test, expect } from "@playwright/test";
test("supplied Bomb announcements decode, respect mute and sequence the defuse result", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (r) => {
    if (/voice-(bomb-planted|terrorist-win|police-win)/.test(r.url())) requested.push(r.url());
  });
  await page.route("**/__bomb_voice__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<!doctype html><button id="start">Enable sound</button>',
    }),
  );
  await page.goto("/__bomb_voice__");
  await page.evaluate(async () => {
    const { createCombatAudio } = await import("/src/lib/fps/audio.ts" as string);
    const aim = createCombatAudio();
    await aim.ready();
    aim.dispose();
  });
  expect(requested).toHaveLength(0);
  await page.evaluate(async () => {
    const { createCombatAudio } = await import("/src/lib/fps/audio.ts" as string);
    const a = createCombatAudio(undefined, { bomb: true });
    await a.ready();
    Object.assign(window, { bombVoice: a });
    document.querySelector("#start")!.addEventListener("click", () => void a.unlock());
  });
  await page.locator("#start").click();
  const stats = await page.evaluate(async () => {
    const a = (window as unknown as { bombVoice: import("../../src/lib/fps/audio").CombatAudio })
      .bombVoice;
    await a.unlock();
    const starts: number[] = [];
    const original = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof original>) {
      starts.push(args[0] ?? 0);
      return original.apply(this, args);
    };
    a.cue("voice-bomb-planted");
    a.cue("voice-terrorist-win");
    a.cue("voice-bomb-defused");
    a.cue("voice-police-win", { afterDefused: true });
    AudioBufferSourceNode.prototype.start = original;
    const delay = starts.at(-1)! - starts[0]!;
    const active = a.diagnostics.voices;
    a.setMuted(true);
    a.cue("voice-bomb-planted");
    const muted = a.diagnostics.voices;
    a.dispose();
    return { active, muted, delay };
  });
  expect(requested).toHaveLength(3);
  expect(stats.delay).toBeGreaterThan(0.5);
  expect(stats.active).toBeGreaterThanOrEqual(4);
  expect(stats.muted).toBeLessThanOrEqual(stats.active);
});
