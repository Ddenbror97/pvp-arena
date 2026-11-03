import { test, expect } from "@playwright/test";
test("supplied planted announcement decodes, plays and respects mute in Bomb only", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("voice-bomb-planted")) requested.push(r.url());
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
    a.cue("voice-bomb-planted");
    const active = a.diagnostics.voices;
    a.setMuted(true);
    a.cue("voice-bomb-planted");
    const muted = a.diagnostics.voices;
    a.dispose();
    return { active, muted };
  });
  expect(requested).toHaveLength(1);
  expect(stats.active).toBeGreaterThan(0);
  expect(stats.muted).toBeLessThanOrEqual(stats.active);
});
