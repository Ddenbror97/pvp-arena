import { wheelSpeed } from "@/lib/jackpot/wheel-motion";

/**
 * Presentation-only cues. The jackpot ratchet lasts `SPIN_MS` and slows with
 * the wheel's own speed (`wheelSpeed`), which falls in a straight line.
 */

export const WHEEL_SPIN_MS = 10_600;
/** Linear gain vs the first live mix. 1.15 shipped, then +20% twice. */
const CUE_GAIN = 1.66;

export type LandGate = { armedEnd: number; announcedEnd: number };

/** Playback rate is the wheel's remaining speed: fast at the release, quiet at the stop. */
export function wheelPlaybackRate(progress: number): number {
  return 0.28 + wheelSpeed(progress) * 1.08;
}

/**
 * One wheel cue at a time. A second start during the same spin is ignored,
 * so a clock resync cannot stack another recording on top.
 */
export function claimWheelSpin(
  now: number,
  busyUntil: number,
  duration = WHEEL_SPIN_MS,
): { busyUntil: number; play: boolean } {
  if (now < busyUntil) return { busyUntil, play: false };
  return { busyUntil: now + duration, play: true };
}

/**
 * Beep only if this spin was already on screen before it reached the land time.
 * Opening the page onto a finished round does not beep. Each end time beeps once.
 */
export function nextRouletteLand(
  gate: LandGate,
  end: number,
  now: number,
  spinning: boolean,
): { gate: LandGate; play: boolean } {
  let armedEnd = gate.armedEnd;
  const announcedEnd = gate.announcedEnd;
  if (spinning && end > 0 && now < end) armedEnd = end;
  if (!(spinning && end > 0 && now >= end && announcedEnd !== end)) {
    return { gate: { armedEnd, announcedEnd }, play: false };
  }
  return { gate: { armedEnd, announcedEnd: end }, play: armedEnd === end };
}

const buffers = new WeakMap<AudioContext, { ratchet: AudioBuffer; tick: AudioBuffer }>();

function noiseBurst(
  ctx: BaseAudioContext,
  seconds: number,
  decay: number,
  toneHz: number,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * seconds)), sampleRate);
  const data = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t / decay);
    const sample =
      ((Math.random() * 2 - 1) * 0.55 + Math.sin(2 * Math.PI * toneHz * t) * 0.45) * env;
    data[i] = sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  if (peak > 0) {
    const scale = 0.7 / peak;
    for (let i = 0; i < data.length; i++) data[i] = (data[i] ?? 0) * scale;
  }
  return buf;
}

function ratchetLoop(ctx: BaseAudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const seconds = 0.36;
  const buf = ctx.createBuffer(1, Math.floor(sampleRate * seconds), sampleRate);
  const data = buf.getChannelData(0);
  const pegs = 6;
  for (let p = 0; p < pegs; p++) {
    const center = Math.floor(((p + 0.15) / pegs) * data.length);
    const span = Math.floor(sampleRate * 0.012);
    for (let i = 0; i < span && center + i < data.length; i++) {
      const env = Math.exp(-i / (sampleRate * 0.0025));
      data[center + i] = (data[center + i] ?? 0) + (Math.random() * 2 - 1) * env;
    }
  }
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] ?? 0));
  if (peak > 0) {
    const scale = 0.65 / peak;
    for (let i = 0; i < data.length; i++) data[i] = (data[i] ?? 0) * scale;
  }
  return buf;
}

function cueBuffers(ctx: AudioContext) {
  let cached = buffers.get(ctx);
  if (!cached) {
    cached = {
      ratchet: ratchetLoop(ctx),
      tick: noiseBurst(ctx, 0.03, 0.006, 220),
    };
    buffers.set(ctx, cached);
  }
  return cached;
}

function stopAt(node: AudioBufferSourceNode, at: number) {
  try {
    node.stop(at);
  } catch {
    /* already stopped */
  }
}

/** Playback rate and level at a point in the spin. Both follow the wheel, so a late join or a clock correction matches the picture. */
export function wheelCueLevel(progress: number): { rate: number; gain: number } {
  const p = Math.min(1, Math.max(0, progress));
  const full = 0.024 * CUE_GAIN;
  let gain = full;
  if (p < 0.008) gain = 0.0001 + (full - 0.0001) * (p / 0.008);
  else if (p > 0.85) gain = full * (1 - (p - 0.85) / 0.15) ** 2;
  return { rate: wheelPlaybackRate(p), gain };
}

/** One looping ratchet. `setProgress` is the wheel's current 0..1, not a pre-baked timeline. */
export function playWheelCue(
  ctx: AudioContext,
  master: GainNode,
  progress = 0,
): { setProgress: (progress: number) => void; stop: () => void } {
  const { ratchet } = cueBuffers(ctx);
  const src = ctx.createBufferSource();
  src.buffer = ratchet;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.6;
  const gain = ctx.createGain();
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  let stopped = false;
  const setProgress = (progress: number) => {
    if (stopped) return;
    const level = wheelCueLevel(progress);
    const t = ctx.currentTime;
    src.playbackRate.setValueAtTime(level.rate, t);
    gain.gain.setValueAtTime(Math.max(0.0001, level.gain), t);
  };
  setProgress(progress);
  src.start();
  return {
    setProgress,
    stop: () => {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(0, t);
      stopAt(src, t);
      try {
        src.disconnect();
        gain.disconnect();
      } catch {
        /* already disconnected */
      }
    },
  };
}

/** Short confirmation tone. One oscillator, about 80ms, quiet. */
export function playLandCue(ctx: AudioContext, master: GainNode, when = ctx.currentTime) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 988;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.04 * CUE_GAIN, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  osc.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + 0.09);
}
