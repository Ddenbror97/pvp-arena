import { playSynth } from "@/lib/sound";

function tone(freq: number, dur: number, gain: number, type: OscillatorType, delay = 0) {
  playSynth((ctx, out) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + dur);
  });
}

function knock(freq: number, dur: number, gain: number, noiseGain: number) {
  playSynth((ctx, out) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + dur);

    const count = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq * 6;
    filter.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(noiseGain, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(ng);
    ng.connect(out);
    src.start(t);
  });
}

export function cueSound() {
  knock(210, 0.07, 0.07, 0.05);
}

export function ballSound(strength: number) {
  const s = Math.max(0, Math.min(1, strength));
  knock(380 + s * 520, 0.045, 0.03 + s * 0.06, 0.03 + s * 0.07);
}

export function cushionSound(strength: number) {
  const s = Math.max(0, Math.min(1, strength));
  knock(160 + s * 140, 0.06, 0.025 + s * 0.04, 0.02 + s * 0.04);
}

export function pocketSound() {
  tone(520, 0.09, 0.045, "sine");
  tone(240, 0.14, 0.03, "triangle", 0.03);
}

export function foulSound() {
  tone(140, 0.16, 0.04, "sine");
  tone(98, 0.2, 0.03, "triangle", 0.04);
}

export function tickSound() {
  tone(880, 0.03, 0.02, "sine");
}

export function resultSound(win: boolean) {
  if (win) {
    tone(494, 0.1, 0.04, "sine");
    tone(659, 0.16, 0.045, "sine", 0.09);
    return;
  }
  tone(220, 0.2, 0.035, "sine");
  tone(174, 0.24, 0.025, "triangle", 0.08);
}
