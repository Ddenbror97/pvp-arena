/**
 * Table sound effects, synthesized on the site's shared audio output (`playSynth`), so they
 * follow the global mute, stay silent until a user gesture unlocks audio, and ship no
 * third-party recordings. Volume is the poker "effects" preference.
 */
import { playSynth } from "@/lib/sound";
import { getPokerPrefs } from "./prefs";

export type PokerSfx =
  "shuffle" | "deal" | "land" | "flip" | "chip" | "collect" | "win" | "turn" | "tap";

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext) {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    // Deterministic noise: this buffer is a sound texture, not game randomness.
    let x = 0x2545f491;
    for (let i = 0; i < d.length; i++) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      d[i] = ((x >>> 0) / 4294967296) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

function burst(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  o: { dur: number; gain: number; freq: number; q?: number; type?: BiquadFilterType },
) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.value = o.freq;
  f.Q.value = o.q ?? 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(o.gain, at + Math.min(0.006, o.dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  src.connect(f).connect(g).connect(out);
  offset = (offset + 0.137) % 0.8;
  src.start(at, offset, o.dur + 0.02);
}
let offset = 0;

function tone(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  o: { freq: number; dur: number; gain: number; type?: OscillatorType; to?: number },
) {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + o.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(o.gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + o.dur + 0.02);
}

function clack(ctx: AudioContext, out: AudioNode, at: number, level: number) {
  tone(ctx, out, at, { freq: 3100, dur: 0.05, gain: 0.18 * level, type: "triangle", to: 2600 });
  tone(ctx, out, at + 0.004, { freq: 4700, dur: 0.035, gain: 0.08 * level });
  burst(ctx, out, at, { dur: 0.04, gain: 0.12 * level, freq: 5200, q: 2 });
}

const SOUNDS: Record<PokerSfx, (ctx: AudioContext, out: AudioNode, t: number) => void> = {
  shuffle: (ctx, out, t) => {
    for (let i = 0; i < 14; i++)
      burst(ctx, out, t + i * 0.028, {
        dur: 0.03,
        gain: 0.07 + (i % 3) * 0.015,
        freq: 3500 + (i % 4) * 400,
      });
    burst(ctx, out, t + 0.42, { dur: 0.08, gain: 0.12, freq: 1800, q: 0.8 });
  },
  deal: (ctx, out, t) =>
    burst(ctx, out, t, { dur: 0.07, gain: 0.16, freq: 4200, q: 0.9, type: "highpass" }),
  land: (ctx, out, t) => burst(ctx, out, t, { dur: 0.05, gain: 0.12, freq: 1600, q: 1.4 }),
  flip: (ctx, out, t) => {
    burst(ctx, out, t, { dur: 0.04, gain: 0.12, freq: 3000 });
    burst(ctx, out, t + 0.06, { dur: 0.05, gain: 0.14, freq: 2000 });
  },
  chip: (ctx, out, t) => {
    clack(ctx, out, t, 1);
    clack(ctx, out, t + 0.055, 0.6);
  },
  collect: (ctx, out, t) => {
    for (let i = 0; i < 6; i++) clack(ctx, out, t + i * 0.045 + (i % 2) * 0.01, 0.9 - i * 0.1);
  },
  win: (ctx, out, t) => {
    tone(ctx, out, t, { freq: 659.25, dur: 0.5, gain: 0.08 });
    tone(ctx, out, t + 0.12, { freq: 987.77, dur: 0.7, gain: 0.07 });
    tone(ctx, out, t + 0.12, { freq: 1318.5, dur: 0.6, gain: 0.025 });
  },
  turn: (ctx, out, t) => {
    tone(ctx, out, t, { freq: 880, dur: 0.18, gain: 0.05 });
    tone(ctx, out, t + 0.09, { freq: 1174.7, dur: 0.24, gain: 0.04 });
  },
  tap: (ctx, out, t) => burst(ctx, out, t, { dur: 0.025, gain: 0.06, freq: 2500, q: 3 }),
};

const lastAt = new Map<PokerSfx, number>();

/** Plays one effect. Identical effects within 25 ms merge so bursts of events never stack. */
export function playPokerSfx(name: PokerSfx) {
  const now = typeof performance === "undefined" ? 0 : performance.now();
  if (now - (lastAt.get(name) ?? -1e9) < 25) return;
  lastAt.set(name, now);
  const vol = getPokerPrefs().effectsVolume;
  if (vol <= 0) return;
  playSynth((ctx, master) => {
    const g = ctx.createGain();
    g.gain.value = vol;
    g.connect(master);
    SOUNDS[name](ctx, g, ctx.currentTime + 0.005);
    setTimeout(() => g.disconnect(), 1500);
  });
}
