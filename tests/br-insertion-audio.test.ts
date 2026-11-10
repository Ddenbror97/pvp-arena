import { afterEach, expect, test, vi } from "vitest";
import { createBrAudio } from "../src/lib/fps/br/br-audio";
import { readFileSync } from "node:fs";

afterEach(() => vi.unstubAllGlobals());

test("the shipped wind loop is short, audible PCM with headroom for a gentle mix", () => {
  const b = readFileSync("public/fps/audio/br-wind-loop-v1.wav");
  expect(b.toString("ascii", 0, 4)).toBe("RIFF");
  expect(b.readUInt16LE(20)).toBe(1);
  expect(b.readUInt16LE(22)).toBe(1);
  expect(b.readUInt32LE(24)).toBe(24000);
  const samples = (b.length - 44) / 2;
  expect(samples / 24000).toBe(12);
  let energy = 0,
    peak = 0;
  for (let i = 0; i < samples; i++) {
    const v = b.readInt16LE(44 + i * 2) / 32768;
    energy += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  expect(Math.sqrt(energy / samples)).toBeGreaterThan(0.05);
  expect(Math.sqrt(energy / samples)).toBeLessThan(0.1);
  expect(peak).toBeLessThan(0.5);
});

test("insertion audio plays the opening once, loops quiet wind only while airborne, and fades on exit", async () => {
  const sources: Array<{
    loop: boolean;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];
  const fade = vi.fn();
  const close = vi.fn();
  const contextState = { value: "running" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })),
  );
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 10;
      sampleRate = 48000;
      get state() {
        return contextState.value;
      }
      destination = {};
      close = close;
      decodeAudioData = async () => ({
        sampleRate: 48000,
        getChannelData: () => new Float32Array(32),
      });
      createBuffer = (_channels: number, length: number) => ({
        copyToChannel: vi.fn(),
        getChannelData: () => new Float32Array(length),
      });
      createGain = () => ({ gain: { value: 0, setTargetAtTime: fade }, connect: vi.fn() });
      createDynamicsCompressor = () => ({
        threshold: { value: 0 },
        ratio: { value: 0 },
        connect: vi.fn(),
      });
      createBufferSource = () => {
        const source = {
          buffer: null,
          loop: false,
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        sources.push(source);
        return source;
      };
    },
  );
  const audio = createBrAudio("https://example.test/");
  audio.unlock();
  // A delayed download still starts on a subsequent frame while aboard.
  await vi.waitFor(() => {
    audio.setPlaneAboard(true);
    expect(sources).toHaveLength(1);
  });
  for (let frame = 0; frame < 60; frame++) audio.setPlaneAboard(true);
  expect(sources).toHaveLength(1);
  expect(sources[0]!.loop).toBe(true);
  audio.setPlaneAboard(false);
  expect(sources[0]!.stop).toHaveBeenCalledWith(10.3);
  expect(fade).toHaveBeenCalledWith(0, 10, 0.06);
  contextState.value = "suspended";
  audio.setParachuteOpen(true);
  expect(sources).toHaveLength(1); // Never queue the opening/wind behind blocked autoplay.
  contextState.value = "running";
  for (let frame = 0; frame < 60; frame++) audio.setParachuteOpen(true);
  expect(sources).toHaveLength(3);
  expect(sources[1]!.loop).toBe(false);
  expect(sources[1]!.start).toHaveBeenCalledOnce();
  expect(sources[2]!.loop).toBe(true);
  expect(sources[2]!.start).toHaveBeenCalledOnce();
  expect(fade).toHaveBeenCalledWith(0.18, 10, 0.15);
  for (let frame = 0; frame < 3000; frame++) audio.setParachuteOpen(true);
  expect(sources).toHaveLength(3); // A long glide neither stacks loops nor repeats the opening.
  audio.setParachuteOpen(false);
  expect(sources[1]!.stop).toHaveBeenCalledWith(10.2);
  expect(fade).toHaveBeenCalledWith(0, 10, 0.04);
  expect(sources[2]!.stop).toHaveBeenCalledWith(10.2);
  for (let frame = 0; frame < 60; frame++) audio.setParachuteOpen(false);
  expect(sources[2]!.stop).toHaveBeenCalledOnce();
  audio.step("dirt", null);
  expect(sources).toHaveLength(4);
  expect(sources[3]!.start).toHaveBeenCalledOnce();
  contextState.value = "suspended";
  audio.captain(true);
  expect(sources).toHaveLength(4); // Never queue speech for later autoplay while blocked.
  contextState.value = "running";
  audio.captain(false);
  expect(sources).toHaveLength(4); // Loading/warm-up does not trigger the announcement.
  audio.setPlaneAboard(true);
  audio.captain(true);
  for (let frame = 0; frame < 60; frame++) audio.captain(true);
  expect(sources).toHaveLength(6);
  expect(sources[5]!.loop).toBe(false);
  expect(fade).toHaveBeenCalledWith(0.2, 10, 0.1);
  audio.captain(false);
  expect(sources[5]!.stop).toHaveBeenCalledWith(10.2);
  audio.captain(true);
  expect(sources).toHaveLength(6); // A reconnect/plane correction never repeats the voice.
  // A genuinely new deployment may play again; leaving the game stops both voices.
  audio.setParachuteOpen(true);
  expect(sources).toHaveLength(8);
  audio.dispose();
  expect(close).toHaveBeenCalledOnce();
  expect(sources[6]!.stop).toHaveBeenCalledOnce();
  expect(sources[7]!.stop).toHaveBeenCalledOnce();
  audio.setParachuteOpen(true);
  expect(sources).toHaveLength(8);
});
