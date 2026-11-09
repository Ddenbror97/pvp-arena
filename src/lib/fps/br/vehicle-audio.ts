import { spec, type Vehicle } from "./vehicles";

export const VEHICLE_SAMPLES = {
  "car-start": "br-car-start-v1.wav",
  "car-idle": "br-car-idle-v1.wav",
  "car-drive": "br-car-drive-v1.wav",
  "bike-start": "br-bike-start-v1.wav",
  "bike-idle": "br-bike-idle-v1.wav",
  "bike-drive": "br-bike-drive-v1.wav",
} as const;
type Sample = keyof typeof VEHICLE_SAMPLES;
export type VehicleSound = Pick<Vehicle, "id" | "kind" | "speed" | "destroyed">;
type Voice = { source: AudioBufferSourceNode; gain: GainNode };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const pitches = { sedan: 1, suv: 0.94, pickup: 0.88, bike: 1 } as const;

/** One driver, one ignition and two persistent loops. Snapshot objects may change; ids do not. */
export function createVehicleAudio(
  context: AudioContext,
  output: AudioNode,
  buffer: (key: Sample) => AudioBuffer | undefined,
) {
  let current: VehicleSound | null = null;
  let enteredAt = 0,
    gear = 0,
    started = false,
    rollingEntry = false,
    disposed = false;
  let start: Voice | undefined, idle: Voice | undefined, drive: Voice | undefined;
  const stop = (voice: Voice | undefined, immediate = false) => {
    if (!voice) return;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    if (immediate || context.state !== "running") {
      voice.gain.gain.value = 0;
      voice.source.stop();
    } else {
      voice.gain.gain.setTargetAtTime(0, now, 0.025);
      voice.source.stop(now + 0.15);
    }
  };
  const clear = (immediate = false) => {
    stop(start, immediate);
    stop(idle, immediate);
    stop(drive, immediate);
    start = idle = drive = undefined;
    current = null;
  };
  const play = (key: Sample, loop: boolean, pitch: number, level = 0): Voice | undefined => {
    const recording = buffer(key);
    if (!recording) return;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = recording;
    source.loop = loop;
    source.playbackRate.value = pitch;
    gain.gain.value = level;
    source.connect(gain).connect(output);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    return { source, gain };
  };
  return {
    update(vehicle: VehicleSound | null, throttle = 0, now = performance.now()) {
      if (disposed) return;
      if (!vehicle || vehicle.destroyed) {
        clear();
        return;
      }
      if (current?.id !== vehicle.id || current.kind !== vehicle.kind) {
        clear();
        enteredAt = now;
        gear = 0;
        rollingEntry = Math.abs(vehicle.speed) > 0.4;
        started = rollingEntry;
      }
      current = vehicle;
      // Observe seating while autoplay is blocked, but never queue a stale ignition.
      if (context.state !== "running") return;
      const age = now - enteredAt;
      const group = vehicle.kind === "bike" ? "bike" : "car";
      const tuning = pitches[vehicle.kind];
      if (!started) {
        if (age > 400) started = true;
        else {
          start = play(`${group}-start`, false, tuning, 0.4);
          started = !!start;
        }
      }
      idle ??= play(`${group}-idle`, true, tuning);
      drive ??= play(`${group}-drive`, true, tuning);
      const speed = Number.isFinite(vehicle.speed) ? Math.abs(vehicle.speed) : 0;
      const input = Number.isFinite(throttle) ? Math.max(-1, Math.min(1, throttle)) : 0;
      const load =
        speed < 0.4 || Math.sign(input) === Math.sign(vehicle.speed) ? Math.abs(input) : 0;
      const width = spec(vehicle.kind).maxSpeed / 4;
      // Hysteresis avoids gear/pitch chatter when snapshots straddle a shift speed.
      if (vehicle.speed < 0) gear = 0;
      else {
        while (gear < 3 && speed > (gear + 1) * width + 0.8) gear++;
        while (gear > 0 && speed < gear * width - 1.2) gear--;
      }
      const rpm =
        vehicle.speed < 0
          ? clamp(speed / spec(vehicle.kind).reverse)
          : clamp((speed - gear * width) / (width + 1));
      const mix = clamp(speed / 5 + load * 0.35);
      const entrance = rollingEntry ? 1 : clamp((age - 100) / 450);
      const time = context.currentTime;
      idle?.source.playbackRate.setTargetAtTime(
        tuning * (0.95 + 0.12 * load + 0.06 * rpm),
        time,
        0.12,
      );
      drive?.source.playbackRate.setTargetAtTime(
        tuning * (0.8 + 0.38 * rpm + 0.1 * load),
        time,
        0.12,
      );
      idle?.gain.gain.setTargetAtTime(0.18 * (1 - 0.7 * mix) * entrance, time, 0.08);
      drive?.gain.gain.setTargetAtTime((0.24 + 0.1 * rpm) * mix * entrance, time, 0.08);
    },
    dispose() {
      disposed = true;
      clear(true);
    },
  };
}
