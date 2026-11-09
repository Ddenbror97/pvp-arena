import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createVehicleAudio,
  VEHICLE_SAMPLES,
  type VehicleSound,
} from "../src/lib/fps/br/vehicle-audio";

function harness() {
  const parameter = () => {
    const p = {
      value: 0,
      cancelScheduledValues: vi.fn(),
      setTargetAtTime: vi.fn((v: number) => {
        p.value = v;
      }),
    };
    return p;
  };
  const sources: Array<{
    buffer: { key: string } | null;
    loop: boolean;
    playbackRate: ReturnType<typeof parameter>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const gains: Array<{ gain: ReturnType<typeof parameter> }> = [];
  const context = {
    currentTime: 10,
    state: "running",
    createBufferSource() {
      const s = {
        buffer: null,
        loop: false,
        playbackRate: parameter(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        connect: (n: unknown) => n,
      };
      sources.push(s);
      return s;
    },
    createGain() {
      const g = { gain: parameter(), disconnect: vi.fn(), connect: (n: unknown) => n };
      gains.push(g);
      return g;
    },
  };
  let loaded = true;
  const audio = createVehicleAudio(context as unknown as AudioContext, {} as AudioNode, (key) =>
    loaded ? ({ key } as unknown as AudioBuffer) : undefined,
  );
  const vehicle = (kind: VehicleSound["kind"] = "sedan", speed = 0, id = 1): VehicleSound => ({
    kind,
    speed,
    id,
    destroyed: false,
  });
  return {
    audio,
    context,
    sources,
    gains,
    vehicle,
    setLoaded: (value: boolean) => {
      loaded = value;
    },
  };
}

describe("recorded driver audio", () => {
  for (const kind of ["sedan", "suv", "pickup", "bike"] as const) {
    it(`${kind}: starts on confirmed entry, idles at rest, and never restarts on snapshots`, () => {
      const h = harness();
      h.audio.update(h.vehicle(kind), 0, 0);
      expect(h.sources.map((s) => s.buffer!.key)).toEqual(
        kind === "bike"
          ? ["bike-start", "bike-idle", "bike-drive"]
          : ["car-start", "car-idle", "car-drive"],
      );
      expect(h.sources.map((s) => s.loop)).toEqual([false, true, true]);
      h.audio.update(h.vehicle(kind), 0, 1000);
      expect(h.gains[1]!.gain.value).toBeGreaterThan(0);
      expect(h.gains[2]!.gain.value).toBe(0);
      for (let i = 0; i < 3000; i++) h.audio.update(h.vehicle(kind, i % 30), i % 2, 1100 + i * 16);
      expect(h.sources).toHaveLength(3);
      expect(h.sources.every((s) => s.start.mock.calls.length === 1)).toBe(true);
      const targets = h.sources[2]!.playbackRate.setTargetAtTime.mock.calls.map((c) => c[0]);
      expect(Math.min(...targets)).toBeGreaterThan(0.65);
      expect(Math.max(...targets)).toBeLessThan(1.4);
      expect(new Set(targets).size).toBeGreaterThan(10);
    });
  }

  it("responds to throttle immediately and treats reverse/braking as different loads", () => {
    const h = harness();
    h.audio.update(h.vehicle(), 0, 0);
    h.audio.update(h.vehicle(), 0, 1000);
    const idlePitch = h.sources[2]!.playbackRate.value;
    h.audio.update(h.vehicle(), 1, 1016);
    expect(h.sources[2]!.playbackRate.value).toBeGreaterThan(idlePitch);
    expect(h.gains[2]!.gain.value).toBeGreaterThan(0);
    h.audio.update(h.vehicle("sedan", -4), -1, 1032);
    const reversing = h.sources[2]!.playbackRate.value;
    h.audio.update(h.vehicle("sedan", -4), 1, 1048);
    expect(h.sources[2]!.playbackRate.value).toBeLessThan(reversing);
  });

  it("does not chatter gears when speed corrections straddle the upshift boundary", () => {
    const h = harness();
    h.audio.update(h.vehicle(), 0, 0);
    h.audio.update(h.vehicle("sedan", 9.2), 1, 1000);
    h.audio.update(h.vehicle("sedan", 8.1), 1, 1016);
    const low = h.sources[2]!.playbackRate.value;
    h.audio.update(h.vehicle("sedan", 8.4), 1, 1032);
    expect(Math.abs(h.sources[2]!.playbackRate.value - low)).toBeLessThan(0.03);
  });

  it("fades out on exit/destruction, restarts on another vehicle, and disposes once", () => {
    const h = harness();
    h.audio.update(h.vehicle(), 0, 0);
    h.audio.update(null, 0, 1000);
    h.audio.update(null, 0, 1016);
    expect(h.sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true);
    expect(h.sources[0]!.stop).toHaveBeenCalledWith(10.15);
    h.audio.update(h.vehicle("bike", 0, 2), 0, 1200);
    expect(h.sources[3]!.buffer!.key).toBe("bike-start");
    h.audio.update({ ...h.vehicle("bike", 0, 2), destroyed: true }, 0, 1300);
    expect(h.sources[4]!.stop).toHaveBeenCalledOnce();
    h.audio.dispose();
    h.audio.dispose();
    h.audio.update(h.vehicle(), 1, 1400);
    expect(h.sources).toHaveLength(6);
  });

  it("doesn't queue a stale ignition behind autoplay or a delayed buffer", () => {
    const h = harness();
    h.context.state = "suspended";
    h.audio.update(h.vehicle(), 0, 0);
    expect(h.sources).toHaveLength(0);
    h.context.state = "running";
    h.audio.update(h.vehicle(), 0, 2000);
    expect(h.sources.map((s) => s.buffer!.key)).toEqual(["car-idle", "car-drive"]);
    h.audio.update(null, 0, 2100);
    h.setLoaded(false);
    h.audio.update(h.vehicle(), 0, 2200);
    h.setLoaded(true);
    h.audio.update(h.vehicle(), 0, 2800);
    expect(h.sources).toHaveLength(4);
    expect(h.sources.some((s) => s.buffer!.key.endsWith("start"))).toBe(false);
  });

  it("never cranks an already moving vehicle", () => {
    const h = harness();
    h.audio.update(h.vehicle("suv", 1), 0, 0);
    expect(h.sources.map((s) => s.buffer!.key)).toEqual(["car-idle", "car-drive"]);
    expect(h.gains[1]!.gain.value).toBeGreaterThan(0);
  });
});

it("ships audible mono PCM with headroom and seamless loops", () => {
  for (const [key, file] of Object.entries(VEHICLE_SAMPLES)) {
    const bytes = readFileSync("public/fps/audio/" + file);
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.readUInt16LE(22)).toBe(1);
    expect(bytes.readUInt32LE(24)).toBe(32000);
    const n = (bytes.length - 44) / 2;
    let power = 0,
      peak = 0;
    for (let i = 0; i < n; i++) {
      const v = bytes.readInt16LE(44 + i * 2) / 32768;
      power += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    expect(Math.sqrt(power / n)).toBeGreaterThan(0.1);
    expect(peak).toBeLessThan(0.79);
    if (!key.endsWith("start")) {
      const seam = Math.abs(bytes.readInt16LE(44) - bytes.readInt16LE(bytes.length - 2)) / 32768;
      expect(seam).toBeLessThan(0.12);
    }
  }
});
