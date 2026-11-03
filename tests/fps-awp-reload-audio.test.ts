import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AWP_TIMELINE } from "../src/lib/fps/awp-timeline";
describe("AK-derived AWP reload recordings", () => {
  for (const empty of [false, true])
    it(`keeps ${empty ? "empty" : "tactical"} cues on the AWP timeline without clipping`, () => {
      const b = readFileSync(`public/fps/audio/awp-reload-${empty ? "empty" : "tactical"}-v3.wav`);
      expect(b.toString("ascii", 8, 12)).toBe("WAVE");
      expect(b.readUInt32LE(24)).toBe(48000);
      expect(b.readUInt16LE(22)).toBe(1);
      expect(b.readUInt16LE(34)).toBe(16);
      const seconds = (b.length - 44) / 2 / 48000;
      expect(seconds * 1000).toBe(AWP_TIMELINE.reloadMs);
      const t = empty ? AWP_TIMELINE.empty : AWP_TIMELINE.tactical;
      for (const ms of [
        t.release,
        t.seat,
        ...(empty ? [AWP_TIMELINE.empty.lift[0], AWP_TIMELINE.empty.forward[0]] : []),
      ]) {
        let peak = 0;
        for (let i = Math.round(ms * 48); i < Math.round((ms + 60) * 48); i++)
          peak = Math.max(peak, Math.abs(b.readInt16LE(44 + i * 2)));
        expect(peak, `Missing handling cue at ${ms} ms`).toBeGreaterThan(100);
      }
    });
});
