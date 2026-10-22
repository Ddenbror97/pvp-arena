import { playSynth } from "@/lib/sound";

function tone(freq: number, dur: number, gain: number, type: OscillatorType) {
  playSynth((ctx, out) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(out);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  });
}

export function cueSound() {
  tone(180, 0.08, 0.08, "triangle");
}

export function pocketSound() {
  tone(420, 0.16, 0.06, "sine");
}

export function foulSound() {
  tone(110, 0.2, 0.05, "sawtooth");
}
