import { playSynth } from "@/lib/sound";

/**
 * Physical ball impacts only. A short noise click plus a fast pitch drop
 * reads as a hit. No tones, chimes, or result stingers.
 */
function impact(opts: {
  bodyHz: number;
  clickHz: number;
  dur: number;
  bodyGain: number;
  clickGain: number;
  low?: boolean;
  delay?: number;
}) {
  playSynth((ctx, out) => {
    const t = ctx.currentTime + (opts.delay ?? 0);
    const dur = opts.dur;
    const body = opts.bodyHz * (0.94 + Math.random() * 0.1);
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(body, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(28, body * 0.32), t + dur);
    og.gain.setValueAtTime(opts.bodyGain, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.62);
    osc.connect(og);
    og.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);

    const samples = Math.max(1, Math.floor(ctx.sampleRate * Math.min(0.026, dur)));
    const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = (1 - i / data.length) ** 3.4;
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.low ? "lowpass" : "highpass";
    filter.frequency.value = opts.clickHz;
    filter.Q.value = opts.low ? 0.6 : 0.45;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(opts.clickGain, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.022, dur));
    src.connect(filter);
    filter.connect(ng);
    ng.connect(out);
    src.start(t);
  });
}

/** Cue tip striking the cue ball. Harder pulls are louder and a little longer. */
export function cueSound(power = 8000) {
  const s = Math.max(0.12, Math.min(1, power / 10000));
  impact({
    bodyHz: 150 + s * 120,
    clickHz: 1600 + s * 1800,
    dur: 0.045 + s * 0.04,
    bodyGain: 0.04 + s * 0.08,
    clickGain: 0.07 + s * 0.1,
  });
}

/** Ball against ball. Strength is the speed change of the collision, 0 to 1. */
export function ballSound(strength: number) {
  const s = Math.max(0, Math.min(1, strength));
  impact({
    bodyHz: 380 + s * 520,
    clickHz: 2400 + s * 3200,
    dur: 0.018 + s * 0.016,
    bodyGain: 0.015 + s * 0.04,
    clickGain: 0.045 + s * 0.11,
  });
}

/** Ball into the cushion. Dull, short, and low. */
export function cushionSound(strength: number) {
  const s = Math.max(0, Math.min(1, strength));
  impact({
    bodyHz: 78 + s * 70,
    clickHz: 520 + s * 380,
    dur: 0.04 + s * 0.028,
    bodyGain: 0.03 + s * 0.045,
    clickGain: 0.018 + s * 0.03,
    low: true,
  });
}

/** Ball dropping through the pocket mouth, then a short settle. */
export function pocketSound() {
  impact({
    bodyHz: 96,
    clickHz: 420,
    dur: 0.07,
    bodyGain: 0.055,
    clickGain: 0.028,
    low: true,
  });
  impact({
    bodyHz: 140,
    clickHz: 900,
    dur: 0.02,
    bodyGain: 0.012,
    clickGain: 0.035,
    delay: 0.042,
  });
}
