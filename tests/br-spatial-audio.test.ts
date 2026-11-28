import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrAudio } from "../src/lib/fps/br/br-audio";
import {
  airCutoff,
  distanceGain,
  ENGINE_VOICES,
  SHOT_FALLOFF,
  STEP_PACE,
  stepPace,
} from "../src/lib/fps/br/spatial-audio";
import { BrStrides } from "../src/lib/fps/br/footsteps";
import { createRemoteEngines, type EngineSource } from "../src/lib/fps/br/vehicle-audio";

/**
 * Owner, 2026-11-27: others' gunshots "do not feel sufficiently distance-dependent"; footsteps by
 * distance, pace and direction; other players must hear nearby vehicles; one positional system
 * for all of it, the listener on the camera, no leaks, nothing more on the network.
 */
afterEach(() => vi.unstubAllGlobals());

type Param = { value: number; setTargetAtTime: (v: number) => void; [k: string]: unknown };
const param = (value = 0): Param => {
  const p: Param = {
    value,
    setTargetAtTime: (v: number) => {
      p.value = v;
    },
    cancelScheduledValues: () => {},
    setValueAtTime: (v: number) => {
      p.value = v;
    },
    exponentialRampToValueAtTime: () => {},
  };
  return p;
};
type Node = {
  kind: string;
  disconnect: ReturnType<typeof vi.fn>;
  out: Node[];
  [k: string]: unknown;
};
function fakeContext() {
  const made: Node[] = [];
  const node = (kind: string, extra: Record<string, unknown> = {}): Node => {
    const n: Node = {
      kind,
      out: [],
      disconnect: vi.fn(),
      connect(to: Node) {
        n.out.push(to);
        return to;
      },
      ...extra,
    };
    made.push(n);
    return n;
  };
  const listener = Object.fromEntries(
    [
      "positionX",
      "positionY",
      "positionZ",
      "forwardX",
      "forwardY",
      "forwardZ",
      "upX",
      "upY",
      "upZ",
    ].map((k) => [k, param()]),
  );
  const ctx = {
    currentTime: 10,
    sampleRate: 48000,
    state: "running",
    destination: { kind: "destination" },
    listener,
    close: vi.fn(),
    resume: vi.fn(),
    decodeAudioData: async () => ({
      sampleRate: 48000,
      duration: 2,
      getChannelData: () => new Float32Array(64),
    }),
    createBuffer: (_c: number, length: number) => ({
      duration: 1,
      copyToChannel: vi.fn(),
      getChannelData: () => new Float32Array(length),
    }),
    createGain: () => node("gain", { gain: param(1) }),
    createDynamicsCompressor: () =>
      node("compressor", { threshold: param(), ratio: param(), knee: param() }),
    createBiquadFilter: () => node("filter", { type: "", frequency: param(20000), Q: param() }),
    createPanner: () =>
      node("panner", {
        panningModel: "equalpower",
        distanceModel: "inverse",
        rolloffFactor: 1,
        positionX: param(),
        positionY: param(),
        positionZ: param(),
      }),
    createOscillator: () =>
      node("osc", { frequency: param(), type: "", start: vi.fn(), stop: vi.fn() }),
    createBufferSource: () => {
      const s = node("source", {
        buffer: null,
        loop: false,
        playbackRate: param(1),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      });
      return s;
    },
  };
  return { ctx, made };
}

/** What one played sound made: its source, gain, filter (if any) and panner (if any). */
function lastSound(made: Node[]) {
  const i = made.map((n) => n.kind).lastIndexOf("source");
  const after = made.slice(i);
  return {
    source: after[0]!,
    gain: after.find((n) => n.kind === "gain") as Node & { gain: Param },
    filter: after.find((n) => n.kind === "filter") as (Node & { frequency: Param }) | undefined,
    panner: after.find((n) => n.kind === "panner") as
      | (Node & { panningModel: string; rolloffFactor: number; positionX: Param; positionZ: Param })
      | undefined,
  };
}

async function brAudio() {
  const fake = fakeContext();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })),
  );
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        return fake.ctx;
      }
    },
  );
  const audio = createBrAudio("https://example.test/");
  audio.unlock();
  await audio.prepare();
  // The camera at head height at the origin, looking down −z.
  audio.setListener(0, 1.6, 0, 0);
  return { audio, ...fake };
}

describe("distance curves (spatial-audio.ts)", () => {
  it("a rifle is loud near, noticeably quieter at medium range, soft far, never cut off", () => {
    const f = SHOT_FALLOFF.rifle,
      range = 180;
    const near = distanceGain(8, range, f),
      medium = distanceGain(60, range, f),
      far = distanceGain(150, range, f);
    expect(near).toBe(1);
    expect(near / medium).toBeGreaterThan(5); // −14 dB or more
    expect(medium / far).toBeGreaterThan(2.5);
    expect(far).toBeGreaterThan(0.005);
    // Smooth all the way down to −40 dB: no step of more than 1.5 dB between metres.
    for (let d = 9; d < range - 1; d++) {
      const a = distanceGain(d, range, f),
        b = distanceGain(d + 1, range, f);
      if (b > 0.01) expect(20 * Math.log10(a / b)).toBeLessThan(1.5);
    }
    expect(distanceGain(range, range, f)).toBe(0);
  });

  it("the old linear curve kept 75 % of the level 35 m away; the new one keeps under a third", () => {
    const linear = 1 - (35 - 4) / (140 - 4);
    expect(linear).toBeGreaterThan(0.75);
    expect(distanceGain(35, 180, SHOT_FALLOFF.rifle)).toBeLessThan(0.33);
  });

  it("carry by class: at 100 m a sniper is louder than a rifle, a rifle than a pistol", () => {
    const at = (c: keyof typeof SHOT_FALLOFF) => distanceGain(100, 300, SHOT_FALLOFF[c]);
    expect(at("sniper")).toBeGreaterThan(at("rifle"));
    expect(at("rifle")).toBeGreaterThan(at("pistol"));
    expect(at("pistol")).toBeGreaterThan(at("silenced"));
  });

  it("the air takes the highs: the cutoff falls with distance", () => {
    const f = SHOT_FALLOFF.rifle;
    expect(airCutoff(5, f)).toBe(20000);
    expect(airCutoff(100, f)).toBeLessThan(12000);
    expect(airCutoff(250, f)).toBeLessThan(airCutoff(100, f));
  });

  it("footsteps by pace: crouched < walking < running < sprinting, in level and in range", () => {
    const order = ["crouch", "walk", "run", "sprint"] as const;
    for (let i = 1; i < order.length; i++) {
      expect(STEP_PACE[order[i]!].range).toBeGreaterThan(STEP_PACE[order[i - 1]!].range);
      expect(STEP_PACE[order[i]!].gain).toBeGreaterThan(STEP_PACE[order[i - 1]!].gain);
    }
    // Within the 45 m the server always sends: nothing is heard that is not on the wire.
    expect(STEP_PACE.sprint.range).toBeLessThanOrEqual(45);
    expect(stepPace(2.25, false)).toBe("walk");
    expect(stepPace(2.4, true)).toBe("crouch");
    expect(stepPace(5, false)).toBe("run");
    expect(stepPace(7.5, false)).toBe("sprint");
  });

  it("strides report the pace: a walk and a crouched walk now step (quietly), a sprint faster", () => {
    const pace = (speed: number) => {
      const s = new BrStrides();
      let got = 0;
      for (let f = 0; f <= 120; f++) {
        const r = s.advance(0, (f / 60) * speed, 0, 0, true, false, (f / 60) * 1000);
        if (r) got = r;
      }
      return got;
    };
    expect(pace(2.25)).toBeCloseTo(2.25, 0);
    expect(stepPace(pace(2.25), false)).toBe("walk");
    expect(stepPace(pace(7.5), false)).toBe("sprint");
  });
});

describe("placed sounds (br-audio.ts)", () => {
  it("the listener is the camera: its place and the way it looks, pitch included", async () => {
    const { audio, ctx } = await brAudio();
    audio.setListener(10, 20, 30, 0, 0, -Math.sin(0.5), -Math.cos(0.5));
    const L = ctx.listener as Record<string, Param>;
    expect(L.positionX!.value).toBe(10);
    expect(L.positionY!.value).toBe(20);
    expect(L.forwardY!.value).toBeCloseTo(-Math.sin(0.5), 5);
    // Up stays square to the view.
    const dot =
      L.forwardX!.value * L.upX!.value +
      L.forwardY!.value * L.upY!.value +
      L.forwardZ!.value * L.upZ!.value;
    expect(Math.abs(dot)).toBeLessThan(1e-6);
  });

  it("others' shots sit in the world and fall off with distance, the far ones duller", async () => {
    const { audio, made } = await brAudio();
    const levels: number[] = [],
      cutoffs: number[] = [];
    for (const d of [8, 60, 150]) {
      audio.shot("ak47", false, [0, 1.6, -d], 180);
      const s = lastSound(made);
      levels.push(s.gain.gain.value);
      cutoffs.push(s.filter?.frequency.value ?? 20000);
      // World coordinates; the panner only places (its own distance roll-off is off).
      expect(s.panner!.positionZ.value).toBe(-d);
      expect(s.panner!.rolloffFactor).toBe(0);
    }
    expect(levels[0]! / levels[1]!).toBeGreaterThan(5);
    expect(levels[1]! / levels[2]!).toBeGreaterThan(2.5);
    expect(cutoffs[2]!).toBeLessThan(cutoffs[0]!);
  });

  it("your own shot stays centred and as loud as before (no panner, no filter)", async () => {
    const { audio, made } = await brAudio();
    const from = made.length;
    audio.shot("ak47", false, null, 180);
    const call = made.slice(from);
    expect(call.some((n) => n.kind === "panner" || n.kind === "filter")).toBe(false);
    // The report's gain (the first after its source; the casing follows).
    const report = call[call.findIndex((n) => n.kind === "source") + 1] as Node & { gain: Param };
    expect(report.gain.value).toBeCloseTo(0.75 * 0.85, 5);
  });

  it("a silenced shot is heard to the range it was sent (it was cut a second time here)", async () => {
    const { audio, made } = await brAudio();
    // combat.ts already sends a silenced AK-47 within 180 × 0.45 = 81 m.
    const before = made.length;
    audio.shot("ak47", true, [0, 1.6, -50], 81);
    expect(made.length).toBeGreaterThan(before);
    expect(lastSound(made).gain.gain.value).toBeGreaterThan(0);
  });

  it("beyond its range a sound makes no nodes at all", async () => {
    const { audio, made } = await brAudio();
    const before = made.length;
    audio.shot("deagle", false, [0, 1.6, -200], 130);
    audio.step("concrete", [0, 0, -30], "walk");
    expect(made.length).toBe(before);
  });

  it("through a wall it is muffled; through a floor more", async () => {
    const { audio, made } = await brAudio();
    audio.shot("m4a1s", false, [0, 1.6, -20], 180);
    const open = lastSound(made).gain.gain.value;
    audio.setOccluder(() => true);
    audio.shot("m4a1s", false, [0, 1.6, -20], 180);
    const wall = lastSound(made);
    expect(wall.gain.gain.value).toBeCloseTo(open * 0.5, 5);
    expect(wall.filter!.frequency.value).toBeLessThanOrEqual(1300);
    audio.step("wood", [0, 5, -4], "run");
    const floor = lastSound(made);
    expect(floor.filter!.frequency.value).toBeLessThanOrEqual(900);
  });

  it("footsteps carry by pace: a sprint at 35 m is heard, a walk at 20 m is not", async () => {
    const { audio, made } = await brAudio();
    let n = made.length;
    audio.step("concrete", [0, 0, -35], "sprint");
    expect(made.length).toBeGreaterThan(n);
    n = made.length;
    audio.step("concrete", [0, 0, -20], "walk");
    expect(made.length).toBe(n);
    audio.step("concrete", [0, 0, -6], "crouch");
    const crouch = lastSound(made).gain.gain.value;
    audio.step("concrete", [0, 0, -6], "run");
    expect(lastSound(made).gain.gain.value).toBeGreaterThan(crouch * 2);
  });

  it("HRTF for near sounds, a few at a time; every node let go when a sound ends", async () => {
    const { audio, made } = await brAudio();
    const sounds = [];
    for (let i = 0; i < 14; i++) {
      audio.step("concrete", [i - 7, 0, -5], "run");
      sounds.push(lastSound(made));
    }
    const hrtf = sounds.filter((s) => s.panner!.panningModel === "HRTF").length;
    expect(hrtf).toBe(10);
    for (const s of sounds) (s.source as { onended: () => void }).onended();
    for (const s of sounds) {
      expect(s.source.disconnect).toHaveBeenCalled();
      expect(s.gain.disconnect).toHaveBeenCalled();
      expect(s.panner!.disconnect).toHaveBeenCalled();
    }
    audio.step("concrete", [0, 0, -5], "run");
    expect(lastSound(made).panner!.panningModel).toBe("HRTF");
  });
});

describe("others' engines (vehicle-audio.ts createRemoteEngines)", () => {
  const harness = () => {
    const fake = fakeContext();
    const engines = createRemoteEngines(
      fake.ctx as unknown as AudioContext,
      { kind: "out" } as unknown as AudioNode,
      (key) => ({ key, duration: 3 }) as unknown as AudioBuffer,
    );
    const at = (id: number, z: number, running = true, speed = 12): EngineSource => ({
      id,
      kind: id % 2 ? "bike" : "sedan",
      x: 0,
      y: 0.6,
      z,
      speed,
      running,
    });
    return { ...fake, engines, at };
  };
  const listener = { x: 0, y: 1.6, z: 0 };
  const sources = (made: Node[]) => made.filter((n) => n.kind === "source");

  it("the nearest running vehicles sound, at most ENGINE_VOICES, placed where they are drawn", () => {
    const { engines, at, made } = harness();
    const list = Array.from({ length: 9 }, (_, i) => at(i + 1, -(10 + i * 12)));
    engines.update(list, list.length, listener, 16);
    const ids = engines.voices.map((v) => v.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6].slice(0, ENGINE_VOICES));
    const panners = made.filter((n) => n.kind === "panner") as Array<Node & { positionZ: Param }>;
    expect(panners.map((p) => p.positionZ.value)).toContain(-10);
    // The same frame again: no new loops (no duplicated sources).
    const n = sources(made).length;
    for (let i = 0; i < 10; i++) engines.update(list, list.length, listener, 16);
    expect(sources(made).length).toBe(n);
  });

  it("louder near than far, and parked or out-of-range vehicles are silent", () => {
    const { engines, at } = harness();
    const list = [at(2, -8), at(4, -90), at(6, -400), at(8, -5, false)];
    for (let i = 0; i < 30; i++) engines.update(list, list.length, listener, 16);
    const v = Object.fromEntries(engines.voices.map((x) => [x.id, x.level]));
    expect(v[2]!).toBeGreaterThan(v[4]! * 4);
    expect(v[6]).toBeUndefined();
    expect(v[8]).toBeUndefined();
  });

  it("a driver getting out (or a wreck, or leaving range) fades the engine and lets it go", () => {
    const { engines, at, made } = harness();
    const car = at(2, -10);
    engines.update([car], 1, listener, 16, 0);
    const loops = sources(made);
    expect(loops.length).toBe(2);
    car.running = false;
    engines.update([car], 1, listener, 16, 100);
    expect(engines.voices[0]!.id).toBe(-1);
    engines.update([car], 1, listener, 16, 1700);
    expect(engines.voices.length).toBe(0);
    for (const s of loops) expect(s.stop).toHaveBeenCalled();
  });

  it("a nearby parked vehicle starting up is heard starting (an ignition, once)", () => {
    const { engines, at, made } = harness();
    const car = at(2, -12, false, 0);
    engines.update([car], 1, listener, 16);
    car.running = true;
    engines.update([car], 1, listener, 16);
    engines.update([car], 1, listener, 16);
    const oneShots = sources(made).filter((s) => !s.loop);
    expect(oneShots.length).toBe(1);
  });

  it("disposes every voice", () => {
    vi.useFakeTimers();
    const { engines, at, made } = harness();
    const list = [at(2, -10), at(4, -20)];
    engines.update(list, list.length, listener, 16);
    engines.dispose();
    vi.runAllTimers();
    for (const n of made.filter((n) => n.kind === "panner"))
      expect(n.disconnect).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
