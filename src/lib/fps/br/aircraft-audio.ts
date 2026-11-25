import { AIRCRAFT, type Aircraft } from "./aircraft";

/**
 * The aircraft's engine (owner, 2026-11-17: "use the 3 sound, sync them correctly to sound good
 * and real"): the owner's start-up and take-off recordings as one engine.
 *
 * - The start-up (the starter cranking, the catch, the first idle) plays from the starter's own
 *   moment on the server's clock (`startAt`): its catch falls 4.5 s in, when the simulation's
 *   engine runs (AIRCRAFT.startS), for the pilot and for everyone near.
 * - On the ground the take-off run's recording (a loop of its loudest stretch) is the engine:
 *   quiet and low at idle, up in pitch and level with the RPM and the speed of the roll.
 * - In the air the same take-off recording continues without a second engine layer.
 *
 * Everything follows the RPM (never the throttle key): the propeller spools up and winds down
 * as the simulation's does, so the sound never runs ahead of the picture. Inside (pilot and
 * passenger) it plays centred and a little muffled, with the stall horn; outside it is placed
 * at the aircraft and heard far (a light aircraft carries over a kilometre).
 *
 * Outside, the level falls with the distance as a real engine's does (owner, 2026-11-18: "the
 * airplane sound hears louder for other players higher if close, lower if longer distance"):
 * the inverse-distance law from OUTSIDE.refM (full, and louder than before overhead), about a
 * fifth at 100 m and a twentieth at 400 m, still there at a kilometre; the far sound also loses
 * its top (the air takes the high frequencies first). Before, the fall-off was linear over the
 * whole 1.4 km: at 300 m the engine was still four fifths as loud as overhead.
 */
export const AIRCRAFT_SAMPLES = {
  planeStart: "br-plane-start-v1.mp3",
  planeRoll: "br-plane-roll-loop-v2.mp3",
} as const;
type Sample = keyof typeof AIRCRAFT_SAMPLES;
/** The loops' regions in their files (s): stored between copies of their own ends. */
const LOOPS = {
  planeRoll: { pad: 0.25, length: 12 },
} as const;
/** The start-up's catch (s into the file) and its length. */
const START = { catch: AIRCRAFT.startS, length: 11.9 } as const;
/** Heard this far outside (m). */
export const AIRCRAFT_HEAR_M = 1400;
/**
 * Outside: the panner's inverse-distance law (full within `refM`, then refM / (refM +
 * rolloff · (d − refM))), the level overhead, and the air's low-pass (Hz at the aircraft, the
 * floor far off, and the distance over which it falls).
 */
export const OUTSIDE = {
  refM: 25,
  rolloff: 1.2,
  gain: 1.5,
  lowpass: { near: 20000, far: 1400, overM: 380 },
} as const;
/** All of the aircraft's sound, inside and out (owner, 2026-11-25: 15 % quieter, "a bit too loud"). */
export const AIRCRAFT_VOLUME = 0.85;
/** The outside level at `d` m (the panner's own sum), for tests and tuning. */
export function outsideLevel(d: number) {
  const r = Math.max(d, OUTSIDE.refM);
  return (OUTSIDE.gain * OUTSIDE.refM) / (OUTSIDE.refM + OUTSIDE.rolloff * (r - OUTSIDE.refM));
}

export type AircraftSound = Pick<
  Aircraft,
  "x" | "y" | "z" | "vx" | "vy" | "vz" | "engine" | "startAt" | "rpm" | "grounded" | "destroyed"
> & { stallWarn?: boolean };
export type Listener = { x: number; y: number; z: number; yaw: number };

type Voice = { source: AudioBufferSourceNode; gain: GainNode };
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function createAircraftAudio(
  context: AudioContext,
  output: AudioNode,
  buffer: (key: Sample) => AudioBuffer | undefined,
) {
  const master = context.createGain();
  master.gain.value = AIRCRAFT_VOLUME;
  master.connect(output);
  output = master;
  // Inside: a gentle low-pass (the cabin). Outside: placed with a panner.
  const bus = context.createGain();
  const cabin = context.createBiquadFilter();
  cabin.type = "lowpass";
  cabin.frequency.value = 20000;
  const panner = context.createPanner();
  panner.panningModel = "equalpower";
  panner.distanceModel = "inverse";
  panner.refDistance = OUTSIDE.refM;
  panner.maxDistance = AIRCRAFT_HEAR_M;
  panner.rolloffFactor = OUTSIDE.rolloff;
  bus.connect(cabin);
  let placed: "in" | "out" | null = null;
  const route = (inside: boolean) => {
    const want = inside ? "in" : "out";
    if (placed === want) return;
    cabin.disconnect();
    panner.disconnect();
    if (inside) cabin.connect(output);
    else cabin.connect(panner).connect(output);
    placed = want;
  };
  let start: Voice | undefined, roll: Voice | undefined;
  let startedFor = NaN;
  let horn: { osc: OscillatorNode; gain: GainNode } | undefined;
  let disposed = false;
  const voice = (key: Sample, loop: boolean, offset = 0): Voice | undefined => {
    const recording = buffer(key);
    if (!recording) return;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = recording;
    source.loop = loop;
    const region = loop ? LOOPS[key as keyof typeof LOOPS] : undefined;
    if (region) {
      source.loopStart = region.pad;
      source.loopEnd = region.pad + region.length;
    }
    gain.gain.value = 0;
    source.connect(gain).connect(bus);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(0, region ? region.pad + (offset % region.length) : offset);
    return { source, gain };
  };
  const stop = (v: Voice | undefined) => {
    if (!v) return;
    const t = context.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setTargetAtTime(0, t, 0.08);
    v.source.stop(t + 0.5);
  };
  const silence = () => {
    stop(start);
    stop(roll);
    start = roll = undefined;
    startedFor = NaN;
    if (horn) {
      horn.gain.gain.setTargetAtTime(0, context.currentTime, 0.02);
      horn.osc.stop(context.currentTime + 0.2);
      horn = undefined;
    }
  };
  return {
    /**
     * Each frame: the aircraft as shown (null: none near or none at all), whether the listener
     * is aboard, the listener, and the server's clock now (ms, the starter's clock).
     */
    update(
      a: AircraftSound | null,
      inside: boolean,
      listener: Listener,
      serverNow: number,
      frameMs = performance.now(),
    ) {
      if (disposed) return;
      void frameMs;
      const far =
        !a || (!inside && Math.hypot(a.x - listener.x, a.z - listener.z) > AIRCRAFT_HEAR_M + 100);
      if (far || context.state !== "running") {
        if (start || roll) silence();
        return;
      }
      route(inside);
      const t = context.currentTime;
      let lowpass = 3800;
      if (!inside) {
        const dx = a.x - listener.x,
          dy = a.y - listener.y,
          dz = a.z - listener.z;
        const cos = Math.cos(listener.yaw),
          sin = Math.sin(listener.yaw);
        panner.positionX.setTargetAtTime(dx * cos - dz * sin, t, 0.03);
        panner.positionY.setTargetAtTime(dy, t, 0.03);
        panner.positionZ.setTargetAtTime(dx * sin + dz * cos, t, 0.03);
        const { near, far, overM } = OUTSIDE.lowpass;
        lowpass = far + (near - far) * Math.exp(-Math.hypot(dx, dy, dz) / overM);
      }
      bus.gain.setTargetAtTime(inside ? 1 : OUTSIDE.gain, t, 0.1);
      cabin.frequency.setTargetAtTime(lowpass, t, 0.1);
      // The start-up from the starter's moment: late joiners hear the rest of it.
      const sinceStart = (serverNow - a.startAt) / 1000;
      if (
        (a.engine === "starting" || a.engine === "running") &&
        a.startAt !== startedFor &&
        sinceStart >= 0 &&
        sinceStart < START.length - 0.5
      ) {
        stop(start);
        start = voice("planeStart", false, sinceStart);
        if (start) {
          start.gain.gain.value = 0.85;
          startedFor = a.startAt;
        }
      }
      if (a.engine === "off" || a.engine === "dead" || a.destroyed) {
        // Shut down (or out of fuel): the start-up stops at once, the loops wind down with the
        // propeller (below).
        if (start && a.engine !== "starting") {
          stop(start);
          start = undefined;
        }
      }
      roll ??= voice("planeRoll", true, Math.random() * 3);
      // Power: the engine firing (after the catch) at this RPM.
      const firing = a.engine === "running" && !a.destroyed;
      const rpm = clamp01(a.rpm);
      const power = clamp01((rpm - AIRCRAFT.idleRpm) / (1 - AIRCRAFT.idleRpm));
      const speed = Math.hypot(a.vx, a.vy, a.vz);
      // While the start-up's own idle still sounds, the loops come in under it.
      const afterCatch = sinceStart - START.catch;
      const under =
        a.engine === "running" && start && afterCatch < 7
          ? Math.max(clamp01((afterCatch - 1) / 5), power * 2)
          : 1;
      // Without power the propeller still turns (windmilling, winding down): a fading rush.
      const turning = firing ? 1 : clamp01(rpm / 0.35) * 0.35;
      const level = Math.min(1, under) * turning;
      roll?.gain.gain.setTargetAtTime((0.18 + 0.62 * power) * level, t, 0.12);
      roll?.source.playbackRate.setTargetAtTime(
        0.78 + 0.3 * power + Math.min(0.1, speed / 300),
        t,
        0.15,
      );
      // The stall horn (inside only): a reed's steady tone while the wing is near the stall.
      const warn = inside && !!a.stallWarn && !a.grounded && !a.destroyed;
      if (warn && !horn) {
        const osc = context.createOscillator(),
          gain = context.createGain();
        osc.type = "square";
        osc.frequency.value = 1450;
        gain.gain.value = 0;
        osc.connect(gain).connect(output);
        osc.start();
        horn = { osc, gain };
      }
      if (horn) horn.gain.gain.setTargetAtTime(warn ? 0.035 : 0, t, 0.03);
    },
    dispose() {
      disposed = true;
      silence();
      bus.disconnect();
      cabin.disconnect();
      panner.disconnect();
      master.disconnect();
    },
  };
}
