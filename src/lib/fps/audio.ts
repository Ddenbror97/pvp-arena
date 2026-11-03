import { STEP_VARIANTS } from "./footstep-surfaces";
import type { KnifeAttack, MatchState, Seat, Weapon } from "./protocol";
/**
 * First-person Karambit animation cues (art/blender/karambit) → sample and level. Passive idle
 * flourishes stay quiet; the swings are the loud ones.
 */
const KNIFE_CUES: Record<string, { sample: Sample; gain: number }> = {
  equip: { sample: "knifeEquip", gain: 0.3 },
  flip: { sample: "knifeFlip", gain: 0.12 },
  spin: { sample: "knifeSpin", gain: 0.13 },
  catch: { sample: "knifeCatch", gain: 0.16 },
  "catch-soft": { sample: "knifeCatchSoft", gain: 0.1 },
  cloth: { sample: "knifeCloth", gain: 0.08 },
  slash: { sample: "knifeSlash", gain: 0.42 },
  stab: { sample: "knifeStab", gain: 0.46 },
};
import { footstepPan, materialFootstep } from "./footsteps";
import { characterSide } from "./sides";
import { consumeShotPrediction } from "./trigger-feedback";
import { AWP, primaryOf, type Primary } from "./primary";
const SAMPLES = {
  rifleA: "ak47-reference-v1.wav",
  reloadEmpty: "ak-reload-reference-empty-v1.wav",
  reloadTactical: "ak-reload-reference-tactical-v1.wav",
  /** Police (seat A) suppressed M4A1 and its reloads (scripts/fps/build-m4-audio.mjs). */
  rifleM4: "m4a1-suppressed-v1.wav",
  m4ReloadEmpty: "m4-reload-empty-v2.wav",
  m4ReloadTactical: "m4-reload-tactical-v2.wav",
  /** Karambit (scripts/fps/build-knife-audio.mjs): original procedural effects. */
  knifeEquip: "knife-equip-v1.wav",
  knifeFlip: "knife-flip-v1.wav",
  knifeSpin: "knife-spin-v1.wav",
  knifeCatch: "knife-catch-v1.wav",
  knifeCatchSoft: "knife-catch-soft-v1.wav",
  knifeCloth: "knife-cloth-v1.wav",
  knifeSlash: "knife-slash-v1.wav",
  knifeStab: "knife-stab-v1.wav",
  knifeHit: "knife-hit-v1.wav",
  knifeWall: "knife-wall-v1.wav",
  step0: "step-0-v1.wav",
  step1: "step-1-v1.wav",
  step2: "step-2-v1.wav",
  step3: "step-3-v1.wav",
  /** AWP: the owner-supplied shot; the rest procedural (scripts/fps/build-awp-audio.mjs). */
  awpShot: "awp-shot-v2.wav",
  awpBolt: "awp-bolt-v1.wav",
  awpReload: "awp-reload-tactical-v3.wav",
  awpReloadEmpty: "awp-reload-empty-v3.wav",
  awpZoomIn: "awp-zoom-in-v1.wav",
  awpZoomOut: "awp-zoom-out-v1.wav",
  awpDraw: "awp-draw-v1.wav",
} as const;
/**
 * Bomb Defusal voice lines (owner-supplied recordings, loudness-matched). Loaded only by the
 * Bomb Defusal match (`createCombatAudio(…, { bomb: true })`), never by the 1v1.
 */
const BOMB_SAMPLES = {
  c4KeyRecorded0: "c4-keypad-0-v1.wav",
  c4KeyRecorded1: "c4-keypad-1-v1.wav",
  c4KeyRecorded2: "c4-keypad-2-v1.wav",
  c4Explosion: "c4-explosion-v1.wav",
  voiceTPlanting: "voice-t-planting-v1.wav",
  voicePDefuse: "voice-p-defuse-v1.wav",
  voiceTerroristWin: "voice-terrorist-win-v1.mp3",
  voicePoliceWin: "voice-police-win-v1.mp3",
  voiceBombPlanted: "voice-bomb-planted-v1.mp3",
  voiceBombDefused: "voice-bomb-defused-v1.wav",
} as const;
type Sample =
  | keyof typeof SAMPLES
  | keyof typeof BOMB_SAMPLES
  | `step${number}-${(typeof STEP_VARIANTS)[number]}`
  | "hurt"
  | "elimination"
  | "casing"
  | "beep"
  | "explosion"
  | "c4Key"
  | "c4Confirm"
  | "c4Handle"
  | "c4Place"
  | GrenadeSample;
/** Grenade sounds, synthesized once per context (no recorded assets). */
type GrenadeSample =
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
type Sides = Pick<MatchState, "round" | "bestOf" | "sideVersion">;
export type CombatAudio = ReturnType<typeof createCombatAudio>;
/** Recorded, normalized samples; one shared decode per sample and a bounded voice budget. */
export function createCombatAudio(
  presentation?: () => { yaw: number; poseAt: number } | undefined,
  options: { bomb?: boolean } = {},
) {
  const bombMode = !!options.bomb;
  const context = new AudioContext({ latencyHint: "interactive" }),
    master = context.createGain(),
    compressor = context.createDynamicsCompressor();
  master.gain.value = 0.55;
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;
  master.connect(compressor);
  compressor.connect(context.destination);
  const echo = context.createDelay(0.3),
    echoGain = context.createGain(),
    echoFilter = context.createBiquadFilter();
  echo.delayTime.value = 0.105;
  echoGain.gain.value = 0.13;
  echoFilter.type = "lowpass";
  echoFilter.frequency.value = 1800;
  echo.connect(echoFilter);
  echoFilter.connect(echoGain);
  echoGain.connect(master);
  const buffers = new Map<Sample, AudioBuffer>(),
    voices = new Set<AudioBufferSourceNode>(),
    played = { shots: 0, steps: 0, hits: 0, reloads: 0 };
  const pendingSteps: Array<{
    at: number;
    queued: number;
    sample: Sample;
    gain: number;
    pan: number;
    bearing?: number | undefined;
    occluded: boolean;
  }> = [];
  const spatialVoices = new Map<
    AudioBufferSourceNode,
    { panner: StereoPannerNode; bearing: number }
  >();
  let stepAnimation = 0;
  function updateSteps() {
    stepAnimation = 0;
    if (disposed) return;
    const view = presentation?.(),
      now = performance.now();
    for (let i = 0; i < pendingSteps.length;) {
      const step = pendingSteps[i]!;
      // Never play a reconnect/background backlog as a burst of footsteps.
      if (now - step.queued > 300 || (view && view.poseAt - step.at > 250)) {
        pendingSteps.splice(i, 1);
        continue;
      }
      if (view && view.poseAt > 0 && step.at > view.poseAt) {
        i++;
        continue;
      }
      pendingSteps.splice(i, 1);
      play(step.sample, step.gain, step.pan, step.occluded, 1, 0, 0, step.bearing);
    }
    if (view)
      for (const voice of spatialVoices.values())
        voice.panner.pan.setTargetAtTime(
          footstepPan(voice.bearing, view.yaw),
          context.currentTime,
          0.01,
        );
    if (pendingSteps.length || spatialVoices.size)
      stepAnimation = requestAnimationFrame(updateSteps);
  }
  function scheduleSteps() {
    if (!stepAnimation) stepAnimation = requestAnimationFrame(updateSteps);
  }
  let reloadVoice: AudioBufferSourceNode | undefined;
  let reloadEnd = 0;
  const predicted = new Map<number, number>();
  // Short, quiet body-impact and elimination cues, generated once per context.
  // Use the same bounded voice pool and mute controls as recorded samples.
  for (const name of ["hurt", "elimination"] as const) {
    const duration = name === "hurt" ? 0.12 : 0.3;
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * duration),
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      const t = i / context.sampleRate;
      const envelope = Math.min(1, t / 0.004) * Math.exp(-t * (name === "hurt" ? 38 : 15));
      samples[i] =
        envelope *
        (0.7 * Math.sin(2 * Math.PI * (name === "hurt" ? 125 : 330) * t) +
          0.3 * (Math.random() * 2 - 1));
    }
    buffers.set(name, buffer);
  }
  {
    // Bomb Defusal: the planted bomb's beep (a short 2.1 kHz chirp) and its detonation (a
    // low-passed noise burst with a long tail). Generated once, like the cues above.
    const beep = context.createBuffer(1, Math.ceil(context.sampleRate * 0.11), context.sampleRate),
      b = beep.getChannelData(0);
    for (let i = 0; i < b.length; i++) {
      const t = i / context.sampleRate;
      b[i] = Math.min(1, t / 0.003) * Math.exp(-t * 30) * Math.sin(2 * Math.PI * 2100 * t);
    }
    buffers.set("beep", beep);
    const boom = context.createBuffer(1, Math.ceil(context.sampleRate * 2.2), context.sampleRate),
      e = boom.getChannelData(0);
    let low = 0;
    for (let i = 0; i < e.length; i++) {
      const t = i / context.sampleRate;
      low += (Math.random() * 2 - 1 - low) * 0.035;
      e[i] =
        Math.min(1, t / 0.01) *
        Math.exp(-t * 2.2) *
        (low * 6 + 0.5 * Math.sin(2 * Math.PI * 48 * t));
    }
    buffers.set("explosion", boom);
    // First-person C4 plant: a rubber keypad click (soft membrane snap over a short low
    // thump), the confirmation tone (two rising chirps), a glove-on-casing handling rustle and
    // the device set down on the ground. All synthesized here; no recorded assets.
    const make = (seconds: number, sample: (t: number, i: number) => number, name: Sample) => {
      const buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * seconds),
        context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = sample(i / context.sampleRate, i);
      buffers.set(name, buffer);
    };
    let click = 0;
    make(
      0.05,
      (t) => {
        click += (Math.random() * 2 - 1 - click) * 0.45;
        return (
          Math.min(1, t / 0.0008) *
          (0.55 * click * Math.exp(-t * 260) +
            0.45 * Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 90))
        );
      },
      "c4Key",
    );
    make(
      0.32,
      (t) => {
        const second = t >= 0.14;
        const u = second ? t - 0.14 : t;
        const f = second ? 2350 : 1750;
        return (
          Math.min(1, u / 0.003) *
          Math.exp(-u * 22) *
          Math.sin(2 * Math.PI * f * u) *
          (u < 0.13 ? 1 : 0)
        );
      },
      "c4Confirm",
    );
    let rustle = 0;
    make(
      0.22,
      (t) => {
        rustle += (Math.random() * 2 - 1 - rustle) * 0.08;
        return Math.sin(Math.PI * Math.min(1, t / 0.22)) * rustle * 2.2;
      },
      "c4Handle",
    );
    let scrape = 0;
    make(
      0.4,
      (t) => {
        scrape += (Math.random() * 2 - 1 - scrape) * 0.12;
        return (
          Math.min(1, t / 0.004) *
          (0.9 * Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t * 28) +
            scrape * 1.4 * Math.exp(-t * 9))
        );
      },
      "c4Place",
    );
  }
  {
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
  }
  {
    // Brass casing landing: a short inharmonic tink (5.56 case on a hard floor).
    const duration = 0.09,
      buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * duration),
        context.sampleRate,
      ),
      samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      const t = i / context.sampleRate,
        envelope = Math.min(1, t / 0.0005) * Math.exp(-t * 55);
      samples[i] =
        envelope *
        (0.5 * Math.sin(2 * Math.PI * 3900 * t) +
          0.3 * Math.sin(2 * Math.PI * 6150 * t) +
          0.2 * Math.sin(2 * Math.PI * 8800 * t));
    }
    buffers.set("casing", buffer);
  }
  let localSeat: Seat | null = null,
    sides: Sides | null = null;
  /** The Police side carries the suppressed M4A1 (sides swap at halftime); Terrorists the AK. */
  const m4Seat = (seat: Seat | null | undefined) =>
    !!seat && (sides ? characterSide(sides, seat) : seat) === "A";
  const shot = (
    weapon: Weapon,
    gain = 0.62,
    pan = 0,
    occluded = false,
    seat?: Seat | null,
    attack?: KnifeAttack,
    primary?: Primary,
  ) => {
    played.shots++;
    if (weapon === "knife") {
      play(attack === "stab" ? "knifeStab" : "knifeSlash", gain * 0.6, pan, occluded);
      return;
    }
    if (primary === "awp") {
      // The report, then the bolt cycle on the same timeline (heard only up close).
      // The supplied recording is ~4 dB louder (LUFS) than the AK reference: about 2 dB over
      // the AK at the same gain, played as recorded (no pitch variation).
      play("awpShot", Math.min(0.75, gain * 1.08), pan, occluded, 1);
      if (seat === localSeat || gain > 0.3)
        play("awpBolt", gain * (seat === localSeat ? 0.75 : 0.4), pan, occluded);
      return;
    }
    const m4 = weapon === "rifle" && m4Seat(seat);
    play(m4 ? "rifleM4" : "rifleA", gain, pan, occluded, 1);
    // Own rifle: the ejected case lands a moment later, just right of the player (the AK's
    // bigger 7.62×39 case rings lower than the M4's 5.56).
    if (weapon === "rifle" && seat === localSeat && gain > 0.3)
      play(
        "casing",
        m4 ? 0.05 : 0.045,
        0.35,
        false,
        (m4 ? 0.94 : 0.8) + (played.shots % 5) * 0.03,
        0,
        0.32 + (played.shots % 4) * 0.05,
      );
  };
  let loading: Promise<void> | undefined,
    muted = false,
    volume = 1,
    disposed = false,
    lastEvent = -1,
    lastTick = -1,
    lastRound = 0;
  const load = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (loading) return loading;
    loading = Promise.all(
      (
        Object.entries(options.bomb ? { ...SAMPLES, ...BOMB_SAMPLES } : SAMPLES) as [
          Sample,
          string,
        ][]
      )
        .filter(([name]) => !buffers.has(name))
        .map(async ([name, file]) => {
          try {
            const response = await fetch("/fps/audio/" + file);
            if (!response.ok) throw Error("AUDIO_UNAVAILABLE");
            const buffer = await context.decodeAudioData(await response.arrayBuffer());
            if (!disposed) buffers.set(name, buffer);
          } catch {
            /* A failed sample can retry on the next resume/unmute; never interrupt the match. */
          }
        }),
    )
      .then(() => {
        for (let n = 0; n < 4; n++)
          for (const surface of STEP_VARIANTS) {
            const key = ("step" + n + "-" + surface) as Sample;
            const source = buffers.get(("step" + n) as Sample);
            if (!source || buffers.has(key) || disposed) continue;
            const buffer = context.createBuffer(1, source.length, source.sampleRate);
            buffer.copyToChannel(
              materialFootstep(source.getChannelData(0), source.sampleRate, surface),
              0,
            );
            buffers.set(key, buffer);
          }
      })
      .finally(() => {
        loading = undefined;
      });
    return loading;
  };
  function play(
    name: Sample,
    gain: number,
    pan: number,
    occluded: boolean,
    rate = 1,
    offset = 0,
    delay = 0,
    bearing?: number,
  ) {
    if (disposed || muted || context.state !== "running" || gain <= 0) return;
    const buffer = buffers.get(name);
    if (!buffer) return;
    if (offset >= buffer.duration) return;
    if (voices.size >= 24) {
      const oldest = voices.values().next().value;
      oldest?.stop();
      if (oldest) voices.delete(oldest);
    }
    const source = context.createBufferSource(),
      level = context.createGain(),
      panner = context.createStereoPanner(),
      filter = context.createBiquadFilter();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    level.gain.value = Math.min(0.85, gain);
    const view = presentation?.();
    panner.pan.value =
      bearing !== undefined && view
        ? footstepPan(bearing, view.yaw)
        : Math.max(-1, Math.min(1, pan));
    if (bearing !== undefined) {
      spatialVoices.set(source, { panner, bearing });
      scheduleSteps();
    }
    filter.type = "lowpass";
    filter.frequency.value = occluded ? 1600 : 18000;
    source.connect(filter);
    filter.connect(level);
    level.connect(panner);
    panner.connect(master);
    voices.add(source);
    source.onended = () => {
      voices.delete(source);
      spatialVoices.delete(source);
      source.disconnect();
      filter.disconnect();
      level.disconnect();
      panner.disconnect();
    };
    source.start(delay > 0 ? context.currentTime + delay : 0, Math.max(0, offset));
    return source;
  }
  return {
    setVolume(value: number) {
      volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
      master.gain.setTargetAtTime(muted ? 0 : 0.55 * volume, context.currentTime, 0.015);
    },
    /** A first-person Karambit animation cue (equip, flip, spin, catch, slash, stab, …). */
    knifeCue(name: string) {
      const cue = KNIFE_CUES[name];
      if (cue) play(cue.sample, cue.gain, 0.12, false, 0.97 + Math.random() * 0.06);
    },
    cancelReload() {
      reloadVoice?.stop();
      reloadVoice = undefined;
      reloadEnd = 0;
    },
    localShot(weapon: Weapon, seq: number, primary?: Primary) {
      for (const [key, at] of predicted) if (performance.now() - at > 2000) predicted.delete(key);
      predicted.set(seq, performance.now());
      shot(weapon, 0.62, 0, false, localSeat, undefined, primary);
    },
    /** AWP zoom in / out click (own, quiet, centred). */
    zoom(entering: boolean) {
      play(entering ? "awpZoomIn" : "awpZoomOut", 0.22, 0, false);
    },
    /** AWP drawn (bought, or switched back from the knife). */
    awpDraw() {
      play("awpDraw", 0.3, 0.1, false);
    },
    async unlock() {
      if (disposed) return;
      await context.resume();
      void load();
    },
    setMuted(value: boolean) {
      if (disposed) return;
      muted = value;
      if (!value && context.state === "running") void load();
      master.gain.setTargetAtTime(value ? 0 : 0.55 * volume, context.currentTime, 0.015);
    },
    snapshot(state: MatchState, seat: Seat | null, serverNow = Date.now()) {
      localSeat = seat;
      sides = {
        round: state.round,
        bestOf: state.bestOf,
        ...(state.sideVersion === undefined ? {} : { sideVersion: state.sideVersion }),
      };
      if (state.round !== lastRound) {
        pendingSteps.length = 0;
        for (const source of spatialVoices.keys()) source.stop();
        spatialVoices.clear();
        reloadVoice?.stop();
        reloadVoice = undefined;
        reloadEnd = 0;
        // Audio may be created after the initial game snapshot. Preserve a
        // trigger already presented before audio receives its first frame.
        if (lastRound !== 0) predicted.clear();
        lastRound = state.round;
        lastTick = -1;
      }
      if (state.tick === lastTick) return;
      lastTick = state.tick;
      const player = seat ? state.players[seat] : null;
      const reloading =
        player &&
        player.hp > 0 &&
        state.phase === "live" &&
        player.weapon === "rifle" &&
        player.reloadUntil > serverNow;
      if (!reloading) {
        reloadVoice?.stop();
        reloadVoice = undefined;
        reloadEnd = 0;
      } else if (player.reloadUntil !== reloadEnd) {
        reloadVoice?.stop();
        reloadEnd = player.reloadUntil;
        // Join the confirmed reload timeline, including after reconnect; never
        // replay the opening clicks over an animation already halfway through.
        const awp = primaryOf(player) === "awp";
        const offset = Math.max(0, (serverNow - (reloadEnd - (awp ? AWP.reloadMs : 1800))) / 1000);
        reloadVoice = play(
          awp
            ? player.ammo === 0
              ? "awpReloadEmpty"
              : "awpReload"
            : m4Seat(seat)
              ? player.ammo === 0
                ? "m4ReloadEmpty"
                : "m4ReloadTactical"
              : player.ammo === 0
                ? "reloadEmpty"
                : "reloadTactical",
          0.48,
          0,
          false,
          1,
          offset,
        );
        if (reloadVoice) played.reloads++;
      }
      for (const event of state.events) {
        if (event.id !== undefined) {
          if (event.id <= lastEvent) continue;
          lastEvent = event.id;
        }
        const cue = event.audio,
          own = event.seat === seat,
          gain = cue?.gain ?? (own ? 1 : 0.35),
          pan = cue?.pan ?? 0;
        if (event.type === "shot") {
          const weapon = event.weapon ?? (event.seat ? state.players[event.seat].weapon : "rifle");
          // Own swings are voiced by the first-person animation's cues.
          if (own && weapon === "knife") continue;
          if (own && consumeShotPrediction(predicted, event.shotSeq)) continue;
          shot(
            weapon,
            gain * (own ? 0.62 : 0.48),
            pan,
            !!cue?.occluded,
            event.seat,
            event.attack,
            event.primary,
          );
        } else if (event.type === "impact" && event.weapon === "knife") {
          play("knifeWall", (own ? 0.3 : 0.2) * gain, pan, !!cue?.occluded);
        } else if (event.type === "step" && cue) {
          played.steps++;
          const surface =
            cue.surface && STEP_VARIANTS.some((surface) => surface === cue.surface)
              ? "-" + cue.surface
              : "";
          const sample = ("step" + (played.steps % 4) + surface) as Sample;
          const level = gain * 0.75 * (cue.soft ? 0.1 : own ? 0.34 : 0.62);
          if (own || !event.at || !presentation) play(sample, level, pan, !!cue.occluded);
          else {
            if (pendingSteps.length >= 12) pendingSteps.shift();
            pendingSteps.push({
              at: event.at,
              queued: performance.now(),
              sample,
              gain: level,
              pan,
              bearing: cue.bearing,
              occluded: !!cue.occluded,
            });
            scheduleSteps();
          }
        } else if (event.hit?.victim === seat) {
          played.hits++;
          play("hurt", 0.25, 0, false);
          if (event.weapon === "knife") play("knifeHit", 0.32, 0, false);
        } else if (event.hit && own && event.weapon === "knife") {
          // Hit confirmation for a landed swing.
          played.hits++;
          play("knifeHit", 0.4, 0, false);
        }
        if (event.type === "round-end" || event.type === "draw") {
          play("elimination", 0.2, 0, false);
        }
      }
    },
    /**
     * Bomb Defusal cues. The room never sends an enemy position: enemy sounds arrive as a world
     * bearing (footstepPan's convention) and a 0–1 gain, and play panned and, below half
     * gain, muffled. Own and teammate sounds may omit the bearing (centred).
     */
    cue(
      kind:
        | "shot"
        | "step"
        | "reload"
        | "knife"
        | "hurt"
        | "kill"
        | "beep"
        | "explosion"
        | "c4-key"
        | "c4-confirm"
        | "c4-handle"
        | "c4-place"
        | "voice-t-planting"
        | "voice-p-defuse"
        | "voice-terrorist-win"
        | "voice-police-win"
        | "voice-bomb-planted"
        | "voice-bomb-defused",
      options: {
        gain?: number;
        bearing?: number | undefined;
        own?: boolean;
        m4?: boolean;
        awp?: boolean;
        empty?: boolean;
        surface?: string;
        afterDefused?: boolean;
        attack?: KnifeAttack;
        offset?: number;
      } = {},
    ) {
      const gain = Math.max(0, Math.min(1, options.gain ?? 1)),
        far = !options.own && gain < 0.5;
      if (kind === "knife") {
        play(
          options.attack === "stab" ? "knifeStab" : "knifeSlash",
          0.36 * gain,
          0,
          far,
          1,
          0,
          0,
          options.bearing,
        );
      } else if (kind === "shot" && options.awp) {
        played.shots++;
        play("awpShot", options.own ? 0.67 : 0.56 * gain, 0, far, 1, 0, 0, options.bearing);
        if (options.own || gain > 0.6)
          play("awpBolt", options.own ? 0.55 : 0.3 * gain, 0, far, 1, 0, 0, options.bearing);
      } else if (kind === "shot") {
        played.shots++;
        play(
          options.m4 ? "rifleM4" : "rifleA",
          options.own ? 0.62 : 0.5 * gain,
          0,
          far,
          1,
          0,
          0,
          options.bearing,
        );
        if (options.own)
          play("casing", options.m4 ? 0.05 : 0.045, 0.35, false, options.m4 ? 0.94 : 0.8, 0, 0.34);
      } else if (kind === "step") {
        played.steps++;
        const surface =
          options.surface && STEP_VARIANTS.some((s) => s === options.surface)
            ? "-" + options.surface
            : "";
        play(
          ("step" + (played.steps % 4) + surface) as Sample,
          (options.own ? 0.26 : 0.5) * gain,
          0,
          far,
          1,
          0,
          0,
          options.bearing,
        );
      } else if (kind === "reload") {
        reloadVoice?.stop();
        reloadVoice = play(
          options.awp
            ? options.empty
              ? "awpReloadEmpty"
              : "awpReload"
            : options.m4
              ? options.empty
                ? "m4ReloadEmpty"
                : "m4ReloadTactical"
              : options.empty
                ? "reloadEmpty"
                : "reloadTactical",
          options.own ? 0.48 : 0.35 * gain,
          0,
          far,
          1,
          Math.max(0, options.offset ?? 0),
          0,
          options.bearing,
        );
        if (reloadVoice) played.reloads++;
      } else if (kind === "hurt") {
        played.hits++;
        play("hurt", 0.25, 0, false);
      } else if (kind === "kill") play("elimination", 0.2, 0, false);
      else if (kind === "beep") play("beep", 0.32 * gain, 0, far, 1, 0, 0, options.bearing);
      else if (kind === "explosion")
        play(
          bombMode && buffers.has("c4Explosion") ? "c4Explosion" : "explosion",
          (bombMode ? 0.95 : 0.85) * Math.max(0.35, gain),
          0,
          false,
          1,
          0,
          0,
          options.bearing,
        );
      // Own first-person C4 plant: quiet, centred, a little pitch variation per key.
      else if (kind === "c4-key") {
        const recorded = `c4KeyRecorded${Math.floor(Math.random() * 3)}` as Sample;
        // One recorded press per animation cue: interruption stops future presses immediately.
        play(bombMode && buffers.has(recorded) ? recorded : "c4Key", 0.26, 0, false, 1);
      } else if (kind === "c4-confirm") play("c4Confirm", 0.16, 0, false);
      else if (kind === "c4-handle") play("c4Handle", 0.12, 0, false, 0.9 + Math.random() * 0.2);
      else if (kind === "c4-place") play("c4Place", 0.28, 0, false);
      // Team radio: centred, no distance or occlusion (it is heard over the radio).
      else if (kind === "voice-t-planting") play("voiceTPlanting", 0.62, 0, false);
      else if (kind === "voice-p-defuse") play("voicePDefuse", 0.55, 0, false);
      // Round announcement: everyone, centred.
      else if (kind === "voice-terrorist-win") play("voiceTerroristWin", 0.6, 0, false);
      else if (kind === "voice-police-win")
        play(
          "voicePoliceWin",
          0.6,
          0,
          false,
          1,
          0,
          options.afterDefused ? (buffers.get("voiceBombDefused")?.duration ?? 0) + 0.12 : 0,
        );
      else if (kind === "voice-bomb-planted") play("voiceBombPlanted", 0.6, 0, false);
      else if (kind === "voice-bomb-defused") play("voiceBombDefused", 0.6, 0, false);
    },
    /**
     * Grenade sounds. Own handling (draw, pin, spoon, throw) is centred; world sounds (bounces,
     * detonations, fire) take a world bearing (atan2(dx, −dz) from the listener) and a 0–1 gain
     * from distance, muffled when far.
     */
    grenade(kind: GrenadeCue, options: { gain?: number; bearing?: number; rate?: number } = {}) {
      const gain = Math.max(0, Math.min(1, options.gain ?? 1)),
        far = gain < 0.35,
        b = options.bearing,
        rate = options.rate ?? 1;
      const at = (name: GrenadeSample, level: number) =>
        play(name, level * gain, 0, far, rate, 0, 0, b);
      if (kind === "draw") at("nadeDraw", 0.14);
      else if (kind === "pin") at("nadePin", 0.3);
      else if (kind === "spoon") at("nadeSpoon", 0.16);
      else if (kind === "throw") at("nadeThrow", 0.22);
      else if (kind === "bounce") at("nadeBounce", 0.4);
      else if (kind === "bounce-can") at("nadeBounceCan", 0.4);
      else if (kind === "he") at("heBlast", 0.85);
      else if (kind === "smoke") at("smokePop", 0.5);
      else if (kind === "smoke-hiss") at("smokeHiss", 0.22);
      else if (kind === "fire") at("fireBurst", 0.55);
      else if (kind === "fire-crackle") at("fireCrackle", 0.3);
      else if (kind === "fizzle") at("nadeFizzle", 0.35);
    },
    get diagnostics() {
      return { decoded: buffers.size, voices: voices.size, ...played, muted };
    },
    async ready() {
      await load();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(stepAnimation);
      pendingSteps.length = 0;
      spatialVoices.clear();
      for (const source of voices) source.stop();
      voices.clear();
      buffers.clear();
      master.disconnect();
      echo.disconnect();
      echoGain.disconnect();
      echoFilter.disconnect();
      compressor.disconnect();
      void context.close();
    },
  };
}
