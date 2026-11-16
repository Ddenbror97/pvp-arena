import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AWP_TIMELINE } from "../src/lib/fps/awp-timeline";
describe("AK-derived AWP reload recordings", () => {
  it("does not embed the AK firing attack in the empty reload's bolt cues", () => {
    const shot = readFileSync("public/fps/audio/ak47-reference-v1.wav");
    const reload = readFileSync("public/fps/audio/awp-reload-empty-v4.wav");
    // The old v3 file correlates at 0.95 at 2.460729 s. Detect the actual
    // firing waveform, rather than rejecting legitimate loud mechanical clicks.
    const count = 960; // First 20 ms at 48 kHz.
    let shotEnergy = 0;
    for (let i = 0; i < count; i++) shotEnergy += shot.readInt16LE(44 + i * 2) ** 2;
    let strongest = 0;
    for (const [from, to] of [
      [2.44, 2.52],
      [2.7, 2.8],
    ] as const) {
      for (let start = Math.round(from * 48000); start < to * 48000; start++) {
        let dot = 0,
          energy = 0;
        for (let i = 0; i < count; i++) {
          const a = shot.readInt16LE(44 + i * 2);
          const b = reload.readInt16LE(44 + (start + i) * 2);
          dot += a * b;
          energy += b * b;
        }
        strongest = Math.max(strongest, dot / Math.sqrt(shotEnergy * energy || 1));
      }
    }
    expect(strongest).toBeLessThan(0.35);
  });
  for (const empty of [false, true])
    it(`keeps ${empty ? "empty" : "tactical"} cues on the AWP timeline without clipping`, () => {
      const b = readFileSync(`public/fps/audio/awp-reload-${empty ? "empty" : "tactical"}-v4.wav`);
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
