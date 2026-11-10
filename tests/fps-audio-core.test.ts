import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSample, footstepVariants, masterChain } from "../src/lib/fps/audio-core";
import { STEP_VARIANTS } from "../src/lib/fps/footstep-surfaces";
import { materialFootstep } from "../src/lib/fps/footsteps";

/** The shared audio core against a recording stand-in for the Web Audio API. */
const param = (value: number) => ({ value });
function context() {
  const links: Array<[unknown, unknown]> = [];
  const node = (extra: object) => ({
    ...extra,
    connect(to: unknown) {
      links.push([this, to]);
    },
  });
  const ctx = {
    destination: { name: "speakers" },
    createGain: () => node({ gain: param(1) }),
    createDynamicsCompressor: () =>
      node({
        threshold: param(-24),
        knee: param(30),
        ratio: param(12),
        attack: param(0.003),
        release: param(0.25),
      }),
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length);
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: () => data,
        copyToChannel: (from: Float32Array) => data.set(from),
      };
    },
    decodeAudioData: vi.fn(async (bytes: ArrayBuffer) => ({ decoded: bytes.byteLength })),
  };
  return { ctx: ctx as unknown as AudioContext, links };
}

describe("shared audio core", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds each engine's output chain with that engine's mix", () => {
    const duel = context();
    const a = masterChain(duel.ctx, {
      gain: 0.55,
      threshold: -16,
      knee: 12,
      ratio: 4,
      attack: 0.003,
      release: 0.15,
    });
    expect(a.master.gain.value).toBe(0.55);
    expect([
      a.compressor.threshold.value,
      a.compressor.knee.value,
      a.compressor.ratio.value,
    ]).toEqual([-16, 12, 4]);
    expect(a.compressor.release.value).toBe(0.15);
    expect(duel.links).toEqual([
      [a.master, a.compressor],
      [a.compressor, duel.ctx.destination],
    ]);
    // The battle royale sets only threshold and ratio: the rest stay the browser's.
    const br = masterChain(context().ctx, { gain: 0.6, threshold: -14, ratio: 4 });
    expect([br.compressor.knee.value, br.compressor.release.value]).toEqual([30, 0.25]);
  });

  it("decodes a sample and refuses a missing file", async () => {
    const { ctx } = context();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("missing.wav")
          ? new Response("no", { status: 404 })
          : new Response(new Uint8Array(64)),
      ),
    );
    expect(await fetchSample(ctx, "/fps/audio/shot.wav")).toEqual({ decoded: 64 });
    await expect(fetchSample(ctx, "/fps/audio/missing.wav")).rejects.toThrow("AUDIO_UNAVAILABLE");
  });

  it("makes every surface's footstep from one recording", () => {
    const { ctx } = context();
    const step = ctx.createBuffer(1, 2000, 48_000);
    step.getChannelData(0).set(Float32Array.from({ length: 2000 }, (_, i) => Math.sin(i / 9)));
    const variants = footstepVariants(ctx, step);
    expect(variants.map(([surface]) => surface)).toEqual([...STEP_VARIANTS]);
    for (const [surface, buffer] of variants)
      expect(Array.from(buffer.getChannelData(0))).toEqual(
        Array.from(materialFootstep(step.getChannelData(0), 48_000, surface)),
      );
  });
});
