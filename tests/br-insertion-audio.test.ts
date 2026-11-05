import { afterEach, expect, test, vi } from "vitest";
import { createBrAudio } from "../src/lib/fps/br/br-audio";

afterEach(() => vi.unstubAllGlobals());

test("insertion audio starts once, loops only the plane, and fades on exit", async () => {
  const sources: Array<{
    loop: boolean;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];
  const fade = vi.fn();
  const close = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(1) })),
  );
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 10;
      state = "running";
      destination = {};
      close = close;
      decodeAudioData = async () => ({
        sampleRate: 48000,
        getChannelData: () => new Float32Array(32),
      });
      createBuffer = () => ({ copyToChannel: vi.fn() });
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
  for (let frame = 0; frame < 60; frame++) audio.setParachuteOpen(true);
  expect(sources).toHaveLength(2);
  expect(sources[1]!.loop).toBe(false);
  expect(sources[1]!.start).toHaveBeenCalledOnce();
  audio.setParachuteOpen(false);
  expect(sources[1]!.stop).toHaveBeenCalledWith(10.2);
  expect(fade).toHaveBeenCalledWith(0, 10, 0.04);
  audio.step("dirt", null);
  expect(sources).toHaveLength(3);
  expect(sources[2]!.start).toHaveBeenCalledOnce();
  audio.dispose();
  expect(close).toHaveBeenCalledOnce();
});
