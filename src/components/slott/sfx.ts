import { audioRunning, playSynth } from "@/lib/sound";
import type { LineWin } from "@/lib/slott/paytable";
import { hitsDoneMs, orderLines, rarityRank, reachMs, type WinLevel } from "./hits";
import { fxTier, stopVariant } from "./presentation";
import { reelStops, teases, type ReelSpin } from "./timing";

const VOLUME_KEY = "pvp-slott-volume";
let slotGain = 1;
const volumeListeners = new Set<() => void>();

function readSlotVolume() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw == null) return;
    const n = Number(raw);
    if (Number.isFinite(n)) slotGain = Math.min(1, Math.max(0, n));
  } catch {
    /* private mode */
  }
}

readSlotVolume();

export function slotVolume() {
  return slotGain;
}

export function subscribeSlotVolume(listener: () => void) {
  volumeListeners.add(listener);
  return () => volumeListeners.delete(listener);
}

/** Persists the slot mix. 0 silences slot cues without changing the site mute. */
export function setSlotVolume(next: number) {
  slotGain = Math.min(1, Math.max(0, next));
  try {
    localStorage.setItem(VOLUME_KEY, String(slotGain));
  } catch {
    /* private mode */
  }
  volumeListeners.forEach((listener) => listener());
}

function scaled(volume: number) {
  return Math.min(1.15, Math.max(0, volume * slotGain));
}

/** Major pentatonic from C5: every combination of notes sounds consonant. */
const SCALE = [
  523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32,
  2637.02,
];
const note = (i: number) => SCALE[Math.max(0, Math.min(SCALE.length - 1, i))]!;

const noiseBufs = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext) {
  let b = noiseBufs.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBufs.set(ctx, b);
  }
  return b;
}

function bus(ctx: AudioContext, out: AudioNode, volume: number) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  const g = ctx.createGain();
  g.gain.value = volume;
  g.connect(comp);
  comp.connect(out);
  return g;
}

function envelope(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

type ToneOpts = {
  type?: OscillatorType;
  peak?: number;
  attack?: number;
  decay?: number;
  glideTo?: number;
  detune?: number;
  lowpass?: number;
};
function tone(ctx: AudioContext, out: AudioNode, t: number, freq: number, o: ToneOpts = {}) {
  const {
    type = "sine",
    peak = 0.05,
    attack = 0.005,
    decay = 0.3,
    glideTo,
    detune = 0,
    lowpass,
  } = o;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + attack + decay);
  const g = ctx.createGain();
  envelope(g, t, peak, attack, decay);
  if (lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = lowpass;
    osc.connect(f);
    f.connect(g);
  } else osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + attack + decay + 0.05);
}

type BurstOpts = {
  dur: number;
  peak: number;
  filter: BiquadFilterType;
  freq: number;
  freqTo?: number;
  q?: number;
  attack?: number;
};
function burst(ctx: AudioContext, out: AudioNode, t: number, o: BurstOpts) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.frequency.setValueAtTime(o.freq, t);
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + o.dur);
  f.Q.value = o.q ?? 0.7;
  const g = ctx.createGain();
  envelope(g, t, o.peak, o.attack ?? 0.003, o.dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + (o.attack ?? 0.003) + o.dur + 0.05);
}

/** Mechanical rolling: soft ticks that thin out as reels stop. */
function ratchet(ctx: AudioContext, out: AudioNode, from: number, stops: number[]) {
  const end = stops[stops.length - 1]!;
  for (let t = from; t < end - 0.04; t += 0.062) {
    const spinning = stops.filter((s) => s > t).length;
    burst(ctx, out, t, {
      dur: 0.018,
      peak: 0.006 + spinning * 0.0035,
      filter: "bandpass",
      freq: 2400 + spinning * 180,
      q: 3,
    });
  }
}

const STOP_THUD = [156, 174, 142, 188];
const STOP_CLICK = [1680, 1980, 2140, 1820];

function reelStop(ctx: AudioContext, out: AudioNode, t: number, reel: number, variant: number) {
  const thud = STOP_THUD[variant % STOP_THUD.length]!;
  const click = STOP_CLICK[variant % STOP_CLICK.length]!;
  burst(ctx, out, t, { dur: 0.08, peak: 0.09, filter: "lowpass", freq: 1400 + variant * 80 });
  tone(ctx, out, t, thud + reel * 8, { peak: 0.12, decay: 0.14, glideTo: 58 });
  tone(ctx, out, t, click + reel * 40, { type: "triangle", peak: 0.016, decay: 0.035 });
}

/** Soft acceleration at the start of the travel. Kept under the ratchet. */
function spinWhoosh(ctx: AudioContext, out: AudioNode, t: number) {
  tone(ctx, out, t, 96, { peak: 0.035, attack: 0.03, decay: 0.26, glideTo: 210 });
  burst(ctx, out, t, {
    dur: 0.1,
    peak: 0.016,
    filter: "bandpass",
    freq: 700,
    freqTo: 2200,
    q: 0.7,
  });
}

/** Rising tension while the last reels decide a WILD bonus. */
function riser(ctx: AudioContext, out: AudioNode, from: number, to: number) {
  const dur = Math.max(0.2, to - from);
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(160, from);
  osc.frequency.exponentialRampToValueAtTime(760, to);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(700, from);
  f.frequency.exponentialRampToValueAtTime(3200, to);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, from);
  g.gain.exponentialRampToValueAtTime(0.04, to - 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, to + 0.08);
  osc.connect(f);
  f.connect(g);
  g.connect(out);
  osc.start(from);
  osc.stop(to + 0.12);
  for (let t = from, gap = 0.5; t < to - 0.1; t += gap, gap = Math.max(0.2, gap * 0.82)) {
    tone(ctx, out, t, 72, { peak: 0.12, decay: 0.16, glideTo: 48 });
  }
  burst(ctx, out, to - dur * 0.4, {
    dur: dur * 0.4,
    peak: 0.02,
    filter: "highpass",
    freq: 3000,
    freqTo: 9000,
    attack: dur * 0.35,
  });
}

/** One symbol lighting up along a line; climbs with position and rarity. */
function pling(ctx: AudioContext, out: AudioNode, t: number, step: number, rank: number) {
  const f = note(step + rank);
  tone(ctx, out, t, f, { type: "triangle", peak: 0.05, decay: 0.24 });
  tone(ctx, out, t, f * 2, { peak: 0.016, decay: 0.34 });
  if (rank >= 3) tone(ctx, out, t + 0.03, f * 3, { peak: 0.008, decay: 0.3 });
}

/** Bell chord when a line completes; longer runs ring bigger. */
function lineChord(ctx: AudioContext, out: AudioNode, t: number, count: number, rank: number) {
  const root = 2 + rank;
  const notes =
    count >= 5
      ? [root, root + 2, root + 4, root + 5]
      : count === 4
        ? [root, root + 2, root + 4]
        : [root, root + 2];
  notes.forEach((n, i) =>
    tone(ctx, out, t + i * 0.018, note(n), {
      peak: 0.028,
      attack: 0.004,
      decay: 0.7 + count * 0.12,
    }),
  );
  burst(ctx, out, t, { dur: 0.22, peak: 0.018, filter: "highpass", freq: 4000, freqTo: 9000 });
}

function fanfare(ctx: AudioContext, out: AudioNode, t: number, level: WinLevel) {
  const run = level >= 3 ? [0, 2, 4, 5, 7, 9] : [0, 2, 4, 5];
  run.forEach((n, i) => {
    const at = t + i * 0.085;
    tone(ctx, out, at, note(n), { type: "sawtooth", peak: 0.03, decay: 0.2, lowpass: 2600 });
    tone(ctx, out, at, note(n) * 2, { type: "square", peak: 0.008, decay: 0.12, lowpass: 5000 });
  });
  const hold = t + run.length * 0.085;
  const sustain = level >= 3 ? 1.8 : 1.1;
  for (const n of [run[run.length - 1]! - 5, run[run.length - 1]! - 3, run[run.length - 1]!]) {
    for (const detune of [-7, 7])
      tone(ctx, out, hold, note(n), {
        type: "sawtooth",
        peak: 0.016,
        attack: 0.02,
        decay: sustain,
        lowpass: 3200,
        detune,
      });
  }
}

function coins(ctx: AudioContext, out: AudioNode, t: number, n: number, span: number) {
  for (let i = 0; i < n; i++) {
    const at = t + (i / n) * span + Math.random() * 0.06;
    const f = 2600 + Math.random() * 1800;
    tone(ctx, out, at, f, { peak: 0.018, decay: 0.07 });
    tone(ctx, out, at + 0.035, f * 1.5, { peak: 0.01, decay: 0.09 });
  }
}

function boom(ctx: AudioContext, out: AudioNode, t: number) {
  tone(ctx, out, t, 120, { peak: 0.24, attack: 0.004, decay: 0.8, glideTo: 30 });
  burst(ctx, out, t, { dur: 0.45, peak: 0.09, filter: "lowpass", freq: 420, freqTo: 90 });
}

function magicSweep(ctx: AudioContext, out: AudioNode, t: number) {
  tone(ctx, out, t, 380, { peak: 0.04, attack: 0.05, decay: 0.6, glideTo: 2600 });
  tone(ctx, out, t + 0.02, 570, {
    type: "triangle",
    peak: 0.02,
    attack: 0.05,
    decay: 0.6,
    glideTo: 3900,
  });
  coins(ctx, out, t + 0.1, 10, 0.6);
}

type Opts = { volume?: number; ambient?: boolean };

/** Pages currently showing P2P Slott. Audio is audible only while this is positive. */
let holders = 0;
let slotBus: GainNode | null = null;
/** The reel cue currently scheduled. A newer spin disconnects it. */
let reelBus: GainNode | null = null;

/** Keep slot cues alive while a slot screen is mounted, and mute them the moment it leaves. */
export function bindSlotAudio() {
  holders += 1;
  return () => {
    holders = Math.max(0, holders - 1);
    if (holders === 0) silenceSlotSfx();
  };
}

/** Disconnect one reel cue. A newer spin calls this before it decides it has nothing to play. */
export function releaseReelAudio<T extends { disconnect(): void }>(bus: T | null): null {
  if (bus) {
    try {
      bus.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  return null;
}

function silenceSlotSfx() {
  reelBus = releaseReelAudio(reelBus);
  const bus = slotBus;
  slotBus = null;
  if (!bus) return;
  try {
    const t = bus.context.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(0, t);
    bus.disconnect();
  } catch {
    /* context already closed */
  }
}

function slotOutput(ctx: AudioContext, master: GainNode) {
  if (!slotBus || slotBus.context !== ctx) {
    slotBus = ctx.createGain();
    slotBus.gain.value = 1;
    slotBus.connect(master);
  }
  return slotBus;
}

function playSlot(play: (ctx: AudioContext, out: GainNode) => void) {
  if (holders === 0 || slotGain <= 0) return;
  playSynth((ctx, master) => {
    if (holders === 0) return;
    play(ctx, slotOutput(ctx, master));
  });
}

/** Reel spin audio in sync with `Reels` (stops are ms after startAt). */
export function playSpinSfx(
  startAt: number,
  stops: number[],
  teaseFrom: number | null,
  { volume = 1, ambient = false, spinNo = 0 }: Opts & { spinNo?: number } = {},
) {
  if (ambient && !audioRunning()) return;
  playSlot((ctx, out) => {
    const now = ctx.currentTime;
    const base = now + (startAt - Date.now()) / 1000;
    const at = stops.map((s) => base + s / 1000);
    reelBus = releaseReelAudio(reelBus);
    if (at[at.length - 1]! <= now) return;
    const b = bus(ctx, out, scaled(volume));
    reelBus = b;
    const start = Math.max(now, base);
    if (start <= now + 0.05) spinWhoosh(ctx, b, start);
    ratchet(ctx, b, Math.max(now, base + 0.12), at);
    at.forEach((t, r) => t >= now && reelStop(ctx, b, t, r, stopVariant(spinNo, r)));
    if (teaseFrom != null)
      riser(ctx, b, Math.max(now, base + teaseFrom / 1000), at[at.length - 1]!);
  });
}

function spinNoFromKey(key: string) {
  const n = Number(key.split(":").pop());
  return Number.isFinite(n) ? n : 0;
}

export function playReelSpin(spin: ReelSpin, opts?: Opts) {
  const stops = reelStops(spin.grid, spin.durationMs);
  playSpinSfx(spin.startAt, stops, teases(spin.grid) ? stops[2]! : null, {
    ...opts,
    spinNo: spinNoFromKey(spin.key),
  });
}

/** One rising tick per reel as its points count in, then a soft "banked" chime. */
export function playTallySfx(
  values: number[],
  startMs: number,
  stepMs: number,
  { volume = 1, ambient = false }: Opts = {},
) {
  if (ambient && !audioRunning()) return;
  playSlot((ctx, out) => {
    const t0 = ctx.currentTime + startMs / 1000;
    const b = bus(ctx, out, scaled(volume * 0.8));
    values.forEach((v, i) => {
      const t = t0 + (i * stepMs) / 1000;
      tone(ctx, b, t, note(i + Math.min(4, Math.floor(v / 6))), {
        type: "triangle",
        peak: 0.028 + Math.min(0.03, v * 0.0015),
        decay: 0.16,
      });
      burst(ctx, b, t, { dur: 0.025, peak: 0.014, filter: "highpass", freq: 5200 });
    });
    const end = t0 + (values.length * stepMs) / 1000 + 0.06;
    tone(ctx, b, end, note(7), { peak: 0.03, decay: 0.38 });
    tone(ctx, b, end + 0.045, note(9), { peak: 0.022, decay: 0.5 });
  });
}

/** Short rising sting: a lead change, or the final spin crossing its target. */
export function playStingSfx(kind: "lead" | "target", { volume = 1 }: Opts = {}) {
  playSlot((ctx, out) => {
    const t = ctx.currentTime + 0.02;
    const b = bus(ctx, out, scaled(volume));
    const run = kind === "target" ? [4, 6, 8, 9] : [2, 4, 6];
    run.forEach((n, i) =>
      tone(ctx, b, t + i * 0.07, note(n), {
        type: "sawtooth",
        peak: 0.022,
        decay: 0.18,
        lowpass: 3000,
      }),
    );
    tone(ctx, b, t + run.length * 0.07, note(run[run.length - 1]! + 1), {
      type: "triangle",
      peak: 0.035,
      decay: kind === "target" ? 0.9 : 0.5,
    });
    if (kind === "target") coins(ctx, b, t + 0.3, 12, 0.7);
  });
}

/** Hit audio in sync with SpinFx / hit cells; call when the reels land. */
export function playHitSfx(
  lines: LineWin[],
  level: WinLevel,
  bonus: boolean,
  { volume = 1, ambient = false }: Opts = {},
) {
  if (level === 0) return;
  if (ambient && !audioRunning()) return;
  playSlot((ctx, out) => {
    const t0 = ctx.currentTime + 0.02;
    const b = bus(ctx, out, scaled(volume));
    const lineScore = lines.reduce((sum, line) => sum + line.score, 0);
    const tier = fxTier(lineScore, bonus);
    if (level >= 3) boom(ctx, b, t0);
    if (bonus) magicSweep(ctx, b, t0 + 0.08);
    orderLines(lines).forEach((l, i) => {
      const rank = rarityRank(l.symbol);
      for (let reel = 0; reel < l.count; reel++)
        pling(ctx, b, t0 + reachMs(i, reel, l.count) / 1000, i + reel, rank);
      lineChord(ctx, b, t0 + reachMs(i, l.count - 1, l.count) / 1000 + 0.06, l.count, rank);
    });
    if (tier === "medium") coins(ctx, b, t0 + hitsDoneMs(lines) / 1000, 6, 0.45);
    if (level >= 2) {
      const done = t0 + hitsDoneMs(lines) / 1000 + 0.12;
      fanfare(ctx, b, done, level);
      coins(ctx, b, done + 0.2, level >= 3 ? 18 : 12, level >= 3 ? 1.4 : 0.9);
    }
  });
}

/** End of the match. A loss stays quiet. A bomb already played on the spin that caused it. */
export function playMatchSfx(kind: "win" | "lose" | "draw") {
  playSlot((ctx, out) => {
    const t = ctx.currentTime + 0.05;
    const b = bus(ctx, out, scaled(kind === "win" ? 0.85 : 0.5));
    if (kind === "win") {
      fanfare(ctx, b, t, 2);
      coins(ctx, b, t + 0.28, 8, 0.7);
      return;
    }
    if (kind === "draw") {
      tone(ctx, b, t, note(4), { type: "triangle", peak: 0.028, decay: 0.35 });
      tone(ctx, b, t + 0.16, note(4), { type: "triangle", peak: 0.024, decay: 0.45 });
      return;
    }
    tone(ctx, b, t, note(5), { type: "sine", peak: 0.028, decay: 0.32, glideTo: note(1) });
    tone(ctx, b, t + 0.2, note(2), { type: "sine", peak: 0.018, decay: 0.4 });
  });
}

/** Low boom, crack, then a falling tail. Played when a bomb lands. */
export function playBombSfx({ volume = 1 }: Opts = {}) {
  playSlot((ctx, out) => {
    const t = ctx.currentTime + 0.01;
    const b = bus(ctx, out, scaled(volume));
    boom(ctx, b, t);
    boom(ctx, b, t + 0.18);
    burst(ctx, b, t + 0.02, { dur: 0.7, peak: 0.14, filter: "bandpass", freq: 1400, freqTo: 180, q: 0.6 });
    tone(ctx, b, t + 0.08, 90, { type: "sawtooth", peak: 0.07, decay: 1.1, glideTo: 28, lowpass: 320 });
  });
}
