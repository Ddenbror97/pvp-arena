import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
test("remote footsteps follow the displayed pose and live listener orientation", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(async () => {
    const { createCombatAudio } = await import("/src/lib/fps/audio.ts" as string);
    const { createMatch } = await import("/src/lib/fps/simulation.ts" as string);
    const starts: number[] = [],
      pans: StereoPannerNode[] = [];
    const start = AudioBufferSourceNode.prototype.start,
      create = AudioContext.prototype.createStereoPanner;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<AudioBufferSourceNode["start"]>
    ) {
      starts.push(performance.now());
      return start.apply(this, args);
    };
    AudioContext.prototype.createStereoPanner = function () {
      const pan = create.call(this);
      pans.push(pan);
      return pan;
    };
    const view = { yaw: 0, poseAt: 900 },
      audio = createCombatAudio(() => view),
      state = createMatch({ A: "a", B: "b" }, 13, 0);
    await audio.ready();
    document.querySelector("canvas")!.addEventListener("click", () => void audio.unlock());
    Reflect.set(window, "stepTest", { view, audio, state, starts, pans });
  });
  await page.locator("canvas").click();
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const t = Reflect.get(window, "stepTest");
    t.state.phase = "live";
    t.state.tick = 1;
    t.state.events = [
      {
        type: "step",
        seat: "B",
        text: "",
        at: 1000,
        id: 1,
        audio: { kind: "step", surface: "metal", gain: 1, pan: 0, bearing: Math.PI / 2 },
      },
    ];
    t.audio.snapshot(t.state, "A", 1000);
  });
  await page.waitForTimeout(70);
  expect(await page.evaluate(() => Reflect.get(window, "stepTest").starts.length)).toBe(0);
  await page.evaluate(() => (Reflect.get(window, "stepTest").view.poseAt = 1000));
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "stepTest").starts.length))
    .toBe(1);
  expect(
    await page.evaluate(() => Reflect.get(window, "stepTest").pans.at(-1).pan.value),
  ).toBeCloseTo(1, 1);
  await page.evaluate(() => (Reflect.get(window, "stepTest").view.yaw = Math.PI));
  await page.waitForTimeout(40);
  expect(
    await page.evaluate(() => Reflect.get(window, "stepTest").pans.at(-1).pan.value),
  ).toBeLessThan(0);
  await page.evaluate(() => {
    const t = Reflect.get(window, "stepTest");
    t.state.tick++;
    t.audio.snapshot(t.state, "A", 1000);
  });
  expect(await page.evaluate(() => Reflect.get(window, "stepTest").starts.length)).toBe(1);
  await page.evaluate(() => Reflect.get(window, "stepTest").audio.dispose());
});
