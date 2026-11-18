import { expect, it, vi } from "vitest";
import { createAircraftAudio, type AircraftSound } from "@/lib/fps/br/aircraft-audio";

it("keeps the takeoff recording running in flight, without adding a driving loop", () => {
  const parameter = () => ({ value: 0, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() });
  const node = () => ({ connect: (n: unknown) => n, disconnect: vi.fn() });
  const sources: Array<ReturnType<typeof source>> = [];
  const source = () => ({
    ...node(),
    buffer: null,
    playbackRate: parameter(),
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    start: vi.fn(),
    stop: vi.fn(),
  });
  const context = {
    state: "running",
    currentTime: 10,
    createGain: () => ({ ...node(), gain: parameter() }),
    createBiquadFilter: () => ({ ...node(), frequency: parameter() }),
    createPanner: () => ({
      ...node(),
      positionX: parameter(),
      positionY: parameter(),
      positionZ: parameter(),
    }),
    createBufferSource: () => {
      const s = source();
      sources.push(s);
      return s;
    },
  };
  const buffer = vi.fn((key: string) => {
    void key;
    return {} as AudioBuffer;
  });
  const audio = createAircraftAudio(context as unknown as AudioContext, {} as AudioNode, buffer);
  const a: AircraftSound = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: -30,
    engine: "running",
    startAt: 0,
    rpm: 1,
    grounded: true,
    destroyed: false,
  };
  audio.update(a, true, { x: 0, y: 0, z: 0, yaw: 0 }, 100_000, 1000);
  a.grounded = false;
  a.y = 200;
  for (let i = 0; i < 60; i++)
    audio.update(a, true, { x: 0, y: 200, z: 0, yaw: 0 }, 101_000 + i * 100, 2000 + i * 100);
  expect(buffer.mock.calls.map((c) => c[0])).toEqual(["planeRoll"]);
  expect(sources).toHaveLength(1);
  expect(sources[0]!.loop).toBe(true);
  expect(sources[0]!.loopEnd).toBe(12.25);
  expect(sources[0]!.start).toHaveBeenCalledOnce();
  expect(sources[0]!.stop).not.toHaveBeenCalled();
  audio.dispose();
  expect(sources[0]!.stop).toHaveBeenCalledOnce();
});
