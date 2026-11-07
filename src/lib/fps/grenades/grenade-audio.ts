/** Grenade sounds, synthesized once per context (no recorded assets). */
export type GrenadeSample =
  | "nadeDraw"
  | "nadePin"
  | "nadeSpoon"
  | "nadeThrow"
  | "nadeBounce"
  | "nadeBounceCan"
  | "heBlast"
  | "smokePop"
  | "smokeHiss"
  | "fireBurst"
  | "fireCrackle"
  | "nadeFizzle";
export type GrenadeCue =
  | "draw"
  | "pin"
  | "spoon"
  | "throw"
  | "bounce"
  | "bounce-can"
  | "he"
  | "smoke"
  | "smoke-hiss"
  | "fire"
  | "fire-crackle"
  | "fizzle";
export const GRENADE_CUES: Record<GrenadeCue, { sample: GrenadeSample; gain: number }> = {
  draw: { sample: "nadeDraw", gain: 0.14 },
  pin: { sample: "nadePin", gain: 0.3 },
  spoon: { sample: "nadeSpoon", gain: 0.16 },
  throw: { sample: "nadeThrow", gain: 0.22 },
  bounce: { sample: "nadeBounce", gain: 0.4 },
  "bounce-can": { sample: "nadeBounceCan", gain: 0.4 },
  he: { sample: "heBlast", gain: 0.85 },
  smoke: { sample: "smokePop", gain: 0.5 },
  "smoke-hiss": { sample: "smokeHiss", gain: 0.22 },
  fire: { sample: "fireBurst", gain: 0.55 },
  "fire-crackle": { sample: "fireCrackle", gain: 0.3 },
  fizzle: { sample: "nadeFizzle", gain: 0.35 },
};

/** One synthesis shared by arena and island audio contexts. */
export function grenadeSamples(context: Pick<AudioContext, "createBuffer" | "sampleRate">) {
  const buffers = new Map<GrenadeSample, AudioBuffer>();
  // Grenades. Pin: the split pin dragging out of the fuse (a short scrape) and the ring's
  // jingle; spoon: the lever flying off (a bright ping); throw: a cloth whoosh; bounces: a
  // dull steel knock (RGD-5) or a hollow can (M18 / AN-M14); HE: a hard crack over a low
  // boom; smoke: a pop then a long hiss; fire: an ignition whoosh and a crackle bed.
  const make = (seconds: number, sample: (t: number) => number, name: GrenadeSample) => {
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * seconds),
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = sample(i / context.sampleRate);
    buffers.set(name, buffer);
  };
  let n1 = 0;
  make(
    0.18,
    (t) => {
      n1 += (Math.random() * 2 - 1 - n1) * 0.3;
      return Math.sin(Math.PI * Math.min(1, t / 0.18)) * n1 * 1.6;
    },
    "nadeDraw",
  );
  let n2 = 0;
  make(
    0.32,
    (t) => {
      n2 += (Math.random() * 2 - 1 - n2) * 0.55;
      const scrape = t < 0.14 ? n2 * 0.9 * Math.sin((Math.PI * t) / 0.14) : 0;
      const u = t - 0.15;
      const jingle =
        u > 0
          ? Math.exp(-u * 30) *
            (0.5 * Math.sin(2 * Math.PI * 4100 * u) + 0.35 * Math.sin(2 * Math.PI * 6300 * u))
          : 0;
      return scrape + jingle;
    },
    "nadePin",
  );
  make(
    0.35,
    (t) =>
      Math.min(1, t / 0.0006) *
      Math.exp(-t * 14) *
      (0.6 * Math.sin(2 * Math.PI * 2900 * t) + 0.4 * Math.sin(2 * Math.PI * 4470 * t)),
    "nadeSpoon",
  );
  let n3 = 0;
  make(
    0.3,
    (t) => {
      n3 += (Math.random() * 2 - 1 - n3) * (0.05 + 0.25 * Math.min(1, t / 0.12));
      return Math.sin(Math.PI * Math.min(1, t / 0.3)) * n3 * 2.2;
    },
    "nadeThrow",
  );
  make(
    0.14,
    (t) =>
      Math.min(1, t / 0.0006) *
      Math.exp(-t * 45) *
      (0.5 * Math.sin(2 * Math.PI * 820 * t) +
        0.3 * Math.sin(2 * Math.PI * 1930 * t) +
        0.2 * (Math.random() * 2 - 1)),
    "nadeBounce",
  );
  make(
    0.2,
    (t) =>
      Math.min(1, t / 0.0008) *
      Math.exp(-t * 26) *
      (0.55 * Math.sin(2 * Math.PI * 610 * t) +
        0.3 * Math.sin(2 * Math.PI * 1470 * t) +
        0.15 * (Math.random() * 2 - 1)),
    "nadeBounceCan",
  );
  let low = 0,
    mid = 0;
  make(
    2.6,
    (t) => {
      low += (Math.random() * 2 - 1 - low) * 0.03;
      mid += (Math.random() * 2 - 1 - mid) * 0.4;
      return (
        Math.min(1, t / 0.002) *
        (Math.exp(-t * 2.6) * (low * 7 + 0.6 * Math.sin(2 * Math.PI * 55 * t)) +
          mid * 1.2 * Math.exp(-t * 22))
      );
    },
    "heBlast",
  );
  let pop = 0;
  make(
    0.5,
    (t) => {
      pop += (Math.random() * 2 - 1 - pop) * 0.35;
      return (
        Math.min(1, t / 0.002) *
        Math.exp(-t * 18) *
        (pop * 1.4 + 0.5 * Math.sin(2 * Math.PI * 120 * t))
      );
    },
    "smokePop",
  );
  let hiss = 0;
  make(
    3,
    (t) => {
      hiss += (Math.random() * 2 - 1 - hiss) * 0.7;
      // Fades in and out so repeats blend into one long hiss.
      return Math.sin(Math.PI * Math.min(1, t / 3)) * hiss * 0.8;
    },
    "smokeHiss",
  );
  let whoosh = 0;
  make(
    0.9,
    (t) => {
      whoosh += (Math.random() * 2 - 1 - whoosh) * (0.08 + 0.3 * Math.exp(-t * 6));
      return Math.min(1, t / 0.01) * Math.exp(-t * 3.5) * whoosh * 2.6;
    },
    "fireBurst",
  );
  let bed = 0;
  make(
    1.6,
    (t) => {
      bed += (Math.random() * 2 - 1 - bed) * 0.1;
      const crack = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 3 : 0;
      return Math.sin(Math.PI * Math.min(1, t / 1.6)) * (bed * 1.4 + crack);
    },
    "fireCrackle",
  );
  let fizz = 0;
  make(
    0.7,
    (t) => {
      fizz += (Math.random() * 2 - 1 - fizz) * 0.8;
      return Math.min(1, t / 0.01) * Math.exp(-t * 5) * fizz;
    },
    "nadeFizzle",
  );

  return buffers;
}
