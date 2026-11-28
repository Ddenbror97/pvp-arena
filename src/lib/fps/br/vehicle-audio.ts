import {
  airCutoff,
  distanceGain,
  ENGINE_FALLOFF,
  ENGINE_RANGE,
  ENGINE_VOICES,
  INAUDIBLE,
} from "./spatial-audio";
import { spec, type Vehicle, type VehicleKind } from "./vehicles";

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

/**
 * The engine's note from the speed and the throttle (the driver's own and everyone else's):
 * four gears with hysteresis (no chatter when snapshots straddle a shift speed), the rev within
 * the gear, and the loops' rates and levels. `gear` is the voice's own, carried between calls.
 */
type EngineNote = {
  gear: number;
  idleRate: number;
  driveRate: number;
  idle: number;
  drive: number;
};
export function engineNote(
  kind: VehicleKind,
  signedSpeed: number,
  throttle: number,
  gear: number,
  /** Written into and returned (none: a new one). */
  out: EngineNote = { gear: 0, idleRate: 1, driveRate: 1, idle: 0, drive: 0 },
): EngineNote {
  const tuning = pitches[kind];
  const speed = Number.isFinite(signedSpeed) ? Math.abs(signedSpeed) : 0;
  const input = Number.isFinite(throttle) ? Math.max(-1, Math.min(1, throttle)) : 0;
  const load = speed < 0.4 || Math.sign(input) === Math.sign(signedSpeed) ? Math.abs(input) : 0;
  const width = spec(kind).maxSpeed / 4;
  if (signedSpeed < 0) gear = 0;
  else {
    while (gear < 3 && speed > (gear + 1) * width + 0.8) gear++;
    while (gear > 0 && speed < gear * width - 1.2) gear--;
  }
  const rpm =
    signedSpeed < 0
      ? clamp(speed / spec(kind).reverse)
      : clamp((speed - gear * width) / (width + 1));
  const mix = clamp(speed / 5 + load * 0.35);
  out.gear = gear;
  out.idleRate = tuning * (0.95 + 0.12 * load + 0.06 * rpm);
  out.driveRate = tuning * (0.8 + 0.38 * rpm + 0.1 * load);
  out.idle = 0.18 * (1 - 0.7 * mix);
  out.drive = (0.24 + 0.1 * rpm) * mix;
  return out;
}

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
      const note = engineNote(vehicle.kind, vehicle.speed, throttle, gear);
      gear = note.gear;
      const entrance = rollingEntry ? 1 : clamp((age - 100) / 450);
      const time = context.currentTime;
      idle?.source.playbackRate.setTargetAtTime(note.idleRate, time, 0.12);
      drive?.source.playbackRate.setTargetAtTime(note.driveRate, time, 0.12);
      idle?.gain.gain.setTargetAtTime(note.idle * entrance, time, 0.08);
      drive?.gain.gain.setTargetAtTime(note.drive * entrance, time, 0.08);
    },
    dispose() {
      disposed = true;
      clear(true);
    },
  };
}

/**
 * Another vehicle as heard (owner, 2026-11-27: "currently, only the driver can hear the vehicle
 * engine. Other players must also hear nearby cars and motorcycles"): where it is drawn, how it
 * moves, and whether its engine runs (a driver in it, not wrecked or flooded). Filled by the
 * vehicle renderer into reused objects; `d` is set here.
 */
export type EngineSource = {
  id: number;
  kind: VehicleKind;
  x: number;
  y: number;
  z: number;
  speed: number;
  running: boolean;
  d?: number;
};
type Listener = { x: number; y: number; z: number };
type RemoteVoice = {
  id: number;
  group: "car" | "bike";
  kind: VehicleKind;
  idle: Voice | undefined;
  drive: Voice | undefined;
  bus: GainNode;
  filter: BiquadFilterNode;
  panner: PannerNode;
  gear: number;
  lastSpeed: number;
  load: number;
  /** The frame it last had a vehicle (released 1.5 s after it lost it). */
  seen: number;
  lostAt: number;
};
/** Other vehicles' engines against the driver's own (the same recordings, the same note). */
const REMOTE_LEVEL = 1.1;
/** Within this the engine is placed with HRTF (front, behind, above); further, equal power. */
const ENGINE_HRTF_M = 45;

/**
 * Others' engines: positional loops for the ENGINE_VOICES nearest running vehicles within
 * ENGINE_RANGE, each with the driver's own note (engineNote: gears, revs, load estimated from
 * how the speed changes), its level and air absorption from the distance (spatial-audio.ts),
 * placed in the world. A voice follows one vehicle; when that vehicle stops, is wrecked, sinks
 * or leaves the range it fades out and is let go (its nodes disconnected); a freed voice takes
 * the next vehicle. An ignition is heard when a nearby parked vehicle's engine starts.
 */
export function createRemoteEngines(
  context: AudioContext,
  output: AudioNode,
  buffer: (key: Sample) => AudioBuffer | undefined,
) {
  const voices: RemoteVoice[] = [];
  const picked: EngineSource[] = [];
  const note: EngineNote = { gear: 0, idleRate: 1, driveRate: 1, idle: 0, drive: 0 };
  /** Vehicles in range and whether their engine ran when last seen (for the ignition). */
  const running = new Map<number, boolean>();
  let frame = 0,
    disposed = false;
  const loop = (v: RemoteVoice, key: Sample): Voice | undefined => {
    const recording = buffer(key);
    if (!recording) return;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = recording;
    source.loop = true;
    source.playbackRate.value = pitches[v.kind];
    gain.gain.value = 0;
    source.connect(gain).connect(v.bus);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    // (A random point in the loop: two cars side by side do not phase.)
    source.start(0, Math.random() * recording.duration);
    return { source, gain };
  };
  const drop = (v: RemoteVoice) => {
    const t = context.currentTime;
    for (const x of [v.idle, v.drive]) {
      if (!x) continue;
      x.gain.gain.cancelScheduledValues(t);
      x.gain.gain.setTargetAtTime(0, t, 0.05);
      x.source.stop(t + 0.3);
    }
    v.idle = v.drive = undefined;
  };
  const release = (v: RemoteVoice) => {
    drop(v);
    // After the loops have stopped: nothing of the voice is left connected.
    setTimeout(
      () => {
        v.bus.disconnect();
        v.filter.disconnect();
        v.panner.disconnect();
      },
      context.state === "running" ? 400 : 0,
    );
  };
  const make = (s: EngineSource): RemoteVoice => {
    const bus = context.createGain(),
      filter = context.createBiquadFilter(),
      panner = context.createPanner();
    bus.gain.value = 0;
    filter.type = "lowpass";
    filter.frequency.value = 20000;
    filter.Q.value = 0.5;
    panner.panningModel = "equalpower";
    // (The level is ours, from the distance; the panner only places the sound.)
    panner.distanceModel = "linear";
    panner.rolloffFactor = 0;
    panner.positionX.value = s.x;
    panner.positionY.value = s.y;
    panner.positionZ.value = s.z;
    bus.connect(filter).connect(panner).connect(output);
    return {
      id: s.id,
      group: s.kind === "bike" ? "bike" : "car",
      kind: s.kind,
      idle: undefined,
      drive: undefined,
      bus,
      filter,
      panner,
      gear: 0,
      lastSpeed: s.speed,
      load: 0,
      seen: frame,
      lostAt: 0,
    };
  };
  return {
    /** Voices sounding now (tests, the dev overlay). */
    get voices(): ReadonlyArray<{ id: number; level: number }> {
      return voices.map((v) => ({ id: v.seen === frame ? v.id : -1, level: v.bus.gain.value }));
    },
    /**
     * Each frame: the vehicles shown (`count` of `sources`, not the one you drive), the
     * listener (the camera), the frame's length (ms).
     */
    update(
      sources: readonly EngineSource[],
      count: number,
      listener: Listener,
      dtMs: number,
      now = performance.now(),
    ) {
      if (disposed) return;
      frame++;
      const dt = Math.max(0.001, Math.min(0.1, dtMs / 1000));
      const live = context.state === "running";
      picked.length = 0;
      for (let i = 0; i < count; i++) {
        const s = sources[i]!;
        const d = Math.hypot(s.x - listener.x, s.y - listener.y, s.z - listener.z);
        s.d = d;
        const range = ENGINE_RANGE[s.kind === "bike" ? "bike" : "car"];
        const was = running.get(s.id);
        if (d > range) {
          if (was !== undefined) running.delete(s.id);
          continue;
        }
        if (was !== s.running) running.set(s.id, s.running);
        if (!s.running || distanceGain(d, range, ENGINE_FALLOFF) < INAUDIBLE) continue;
        // The ignition: a vehicle seen parked here that now runs, standing (not driven in).
        if (was === false && live && Math.abs(s.speed) < 0.5) {
          const start = buffer(s.kind === "bike" ? "bike-start" : "car-start");
          if (start) {
            const src = context.createBufferSource(),
              g = context.createGain(),
              p = context.createPanner();
            p.panningModel = d < ENGINE_HRTF_M ? "HRTF" : "equalpower";
            p.distanceModel = "linear";
            p.rolloffFactor = 0;
            p.positionX.value = s.x;
            p.positionY.value = s.y;
            p.positionZ.value = s.z;
            src.buffer = start;
            src.playbackRate.value = pitches[s.kind];
            g.gain.value = 0.4 * REMOTE_LEVEL * distanceGain(d, range, ENGINE_FALLOFF);
            src.connect(g).connect(p).connect(output);
            src.onended = () => {
              src.disconnect();
              g.disconnect();
              p.disconnect();
            };
            src.start();
          }
        }
        picked.push(s);
      }
      // The nearest ones.
      picked.sort((a, b) => a.d! - b.d!);
      if (picked.length > ENGINE_VOICES) picked.length = ENGINE_VOICES;
      for (const s of picked) {
        const v = voices.find((x) => x.id === s.id);
        if (v) v.seen = frame;
      }
      for (const s of picked) {
        let v = voices.find((x) => x.id === s.id && x.seen === frame);
        if (!v) {
          // A voice nobody holds this frame, or a new one.
          v = voices.find((x) => x.seen !== frame);
          if (v) {
            if (v.group !== (s.kind === "bike" ? "bike" : "car") || v.kind !== s.kind) drop(v);
            v.id = s.id;
            v.kind = s.kind;
            v.group = s.kind === "bike" ? "bike" : "car";
            v.gear = 0;
            v.load = 0;
            v.lastSpeed = s.speed;
            v.bus.gain.cancelScheduledValues(context.currentTime);
            v.bus.gain.value = 0;
          } else if (voices.length < ENGINE_VOICES) voices.push((v = make(s)));
          else continue;
          v.seen = frame;
        }
        if (!live) continue;
        v.idle ??= loop(v, `${v.group}-idle`);
        v.drive ??= loop(v, `${v.group}-drive`);
        // The throttle as heard: pulling away (the speed rising), cruising, coasting.
        const accel = (Math.abs(s.speed) - Math.abs(v.lastSpeed)) / dt;
        v.lastSpeed = s.speed;
        const want = Math.max(
          Math.abs(s.speed) > 2 ? 0.3 : 0,
          Math.min(1, accel / (0.6 * spec(s.kind).accel)),
        );
        v.load += (want - v.load) * (1 - Math.exp(-dt * 6));
        engineNote(s.kind, s.speed, Math.sign(s.speed || 1) * v.load, v.gear, note);
        v.gear = note.gear;
        const range = ENGINE_RANGE[v.group];
        const t = context.currentTime;
        v.panner.positionX.setTargetAtTime(s.x, t, 0.03);
        v.panner.positionY.setTargetAtTime(s.y, t, 0.03);
        v.panner.positionZ.setTargetAtTime(s.z, t, 0.03);
        const hrtf = s.d! < ENGINE_HRTF_M;
        if (hrtf !== (v.panner.panningModel === "HRTF"))
          v.panner.panningModel = hrtf ? "HRTF" : "equalpower";
        v.bus.gain.setTargetAtTime(
          REMOTE_LEVEL * distanceGain(s.d!, range, ENGINE_FALLOFF),
          t,
          0.08,
        );
        v.filter.frequency.setTargetAtTime(airCutoff(s.d!, ENGINE_FALLOFF), t, 0.1);
        v.idle?.source.playbackRate.setTargetAtTime(note.idleRate, t, 0.12);
        v.drive?.source.playbackRate.setTargetAtTime(note.driveRate, t, 0.12);
        v.idle?.gain.gain.setTargetAtTime(note.idle, t, 0.08);
        v.drive?.gain.gain.setTargetAtTime(note.drive, t, 0.08);
      }
      // Voices that lost their vehicle: fade, then let go.
      for (let i = voices.length - 1; i >= 0; i--) {
        const v = voices[i]!;
        if (v.seen === frame) {
          v.lostAt = 0;
          continue;
        }
        if (!v.lostAt) {
          v.lostAt = now;
          v.bus.gain.setTargetAtTime(0, context.currentTime, 0.12);
        } else if (now - v.lostAt > 1500 || !live) {
          release(v);
          voices.splice(i, 1);
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const v of voices) release(v);
      voices.length = 0;
      running.clear();
    },
  };
}
