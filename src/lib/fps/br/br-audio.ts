import { grenadeSamples, GRENADE_CUES, type GrenadeCue } from "../grenades/grenade-audio";
/**
 * Battle royale sounds: the 1v1/5v5 gun recordings and the owner's battle royale shots
 * (public/fps/audio/ATTRIBUTION.md), positioned in 3D (Web Audio panner, distance rolloff to
 * the shot's hearing range), plus small synthesised cues (pickup, hit marker, armour break,
 * heal done). One AudioContext, created on the first user gesture.
 */
import { materialFootstep, STEP_RECORDINGS } from "../footsteps";
import { STEP_VARIANTS, type FootstepSurface } from "../footstep-surfaces";
type ShotKey = "ak47" | "ak47-s" | "m4" | "m4-s" | "awp" | "awp-s";
const FILES: Record<
  | ShotKey
  | "reload-ak"
  | "reload-m4"
  | "reload-awp"
  | "bolt"
  | "boom"
  | "parachute"
  | "airplane"
  | "captain",
  string
> = {
  ak47: "ak47-reference-v1.wav",
  "ak47-s": "br-ak47-silenced-v2.wav",
  m4: "br-m4-v2.wav",
  "m4-s": "m4a1-suppressed-v1.wav",
  awp: "awp-shot-v2.wav",
  "awp-s": "br-awp-silenced-v2.wav",
  "reload-ak": "ak-reload-reference-tactical-v1.wav",
  "reload-m4": "m4-reload-tactical-v2.wav",
  "reload-awp": "awp-reload-v2.wav",
  bolt: "awp-bolt-v1.wav",
  boom: "c4-explosion-v1.wav",
  parachute: "br-parachute-v1.mp3",
  airplane: "br-airplane-loop-v1.mp3",
  captain: "br-captain-v1.mp3",
};

export function createBrAudio(base: string) {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  /** The player's volume setting (0..1) on top of the mix level. */
  let volume = 1;
  let stepVariant = 0;
  const buffers = new Map<string, AudioBuffer>();
  const loading = new Map<string, Promise<void>>();
  const url = (f: string) => new URL(`fps/audio/${f}`, base).href;
  function context() {
    if (ctx) return ctx;
    try {
      ctx = new AudioContext({ latencyHint: "interactive" });
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.6 * volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);
    for (const [key, buffer] of grenadeSamples(ctx)) buffers.set(key, buffer);
    for (const [key, file] of Object.entries({ ...FILES, ...STEP_RECORDINGS }))
      loading.set(
        key,
        fetch(url(file))
          .then((r) => r.arrayBuffer())
          .then((b) => ctx!.decodeAudioData(b))
          .then((buf) => {
            buffers.set(key, buf);
            if (key.startsWith("step"))
              for (const surface of STEP_VARIANTS) {
                const samples = materialFootstep(buf.getChannelData(0), buf.sampleRate, surface);
                const variant = ctx!.createBuffer(1, samples.length, buf.sampleRate);
                variant.copyToChannel(samples, 0);
                buffers.set(key + "-" + surface, variant);
              }
          })
          .catch(() => {}),
      );
    return ctx;
  }
  const listener = { x: 0, y: 0, z: 0, yaw: 0 };
  let engineOsc: OscillatorNode | null = null,
    engineGain: GainNode | null = null;
  let parachuteOpen = false;
  let parachuteSound: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  let airplaneSound: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  let captainPlayed = false;
  let captainSound: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  function play(
    key: string,
    at: [number, number, number] | null,
    range: number,
    gain = 1,
    loop = false,
  ) {
    const c = context();
    const buf = buffers.get(key);
    if (!c || !master || !buf) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const g = c.createGain();
    g.gain.value = loop ? 0 : gain;
    if (loop) g.gain.setTargetAtTime(gain, c.currentTime, 0.15);
    src.connect(g);
    if (at) {
      const p = c.createPanner();
      p.panningModel = "equalpower";
      p.distanceModel = "linear";
      p.refDistance = 4;
      p.maxDistance = Math.max(10, range);
      p.rolloffFactor = 1;
      // Listener-relative: rotate the source into the listener's frame (yaw only).
      const dx = at[0] - listener.x,
        dy = at[1] - listener.y,
        dz = at[2] - listener.z;
      const cos = Math.cos(listener.yaw),
        sin = Math.sin(listener.yaw);
      p.positionX.value = dx * cos - dz * sin;
      p.positionY.value = dy;
      p.positionZ.value = dx * sin + dz * cos;
      g.connect(p);
      p.connect(master);
    } else g.connect(master);
    src.start();
    return { src, gain: g };
  }
  function beep(freq: number, ms: number, gain: number, type: OscillatorType = "triangle") {
    const c = context();
    if (!c || !master) return;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + ms / 1000 + 0.02);
  }
  return {
    /** Decode during loading so the first shot never waits for a recording. */
    async prepare() {
      if (context()) await Promise.all(loading.values());
    },
    setVolume(value: number) {
      volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
      if (master) master.gain.value = 0.6 * volume;
    },
    /** Call on a user gesture (click to play) so the browser allows audio. */
    unlock() {
      const c = context();
      if (c && c.state === "suspended") void c.resume();
    },
    setListener(x: number, y: number, z: number, yaw: number) {
      Object.assign(listener, { x, y, z, yaw });
    },
    shot(
      gun: "ak47" | "m4a1s" | "awp",
      silenced: boolean,
      at: [number, number, number] | null,
      hearM: number,
    ) {
      const k = (gun === "m4a1s" ? "m4" : gun) + (silenced ? "-s" : "");
      play(k, at, hearM, at ? 0.9 : 0.75);
    },
    reload(gun: "ak47" | "m4" | "awp") {
      play(gun === "awp" ? "reload-awp" : gun === "m4" ? "reload-m4" : "reload-ak", null, 10, 0.6);
    },
    step(surface: FootstepSurface, at: [number, number, number] | null) {
      const key = "step" + (stepVariant++ % 4) + (surface === "concrete" ? "" : "-" + surface);
      play(key, at, 36, at ? 0.5 : 0.26);
    },
    /** One opening per deployment, including auto-deploy; corrections never restart it. */
    setParachuteOpen(open: boolean) {
      if (open) {
        // Retry while the buffer is loading, but never replay a completed opening.
        if (!parachuteOpen || !parachuteSound) parachuteSound = play("parachute", null, 0, 0.65);
        parachuteOpen = true;
      } else {
        parachuteOpen = false;
        if (parachuteSound && ctx) {
          parachuteSound.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
          parachuteSound.src.stop(ctx.currentTime + 0.2);
          parachuteSound = undefined;
        }
      }
    },
    /** Cabin ambience exists only while this player is aboard, never during freefall. */
    setPlaneAboard(aboard: boolean) {
      if (aboard) {
        airplaneSound ??= play("airplane", null, 0, captainSound ? 0.2 : 0.5, true);
      } else if (airplaneSound && ctx) {
        airplaneSound.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
        airplaneSound.src.stop(ctx.currentTime + 0.3);
        airplaneSound = undefined;
      }
    },
    /** Called after an unobscured plane frame. Never queue speech behind loading/autoplay. */
    captain(planePresented: boolean) {
      if (!planePresented) {
        if (captainSound && ctx) {
          captainSound.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
          captainSound.src.stop(ctx.currentTime + 0.2);
          captainSound = undefined;
          airplaneSound?.gain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.15);
        }
        return;
      }
      if (captainPlayed || context()?.state !== "running") return;
      const speech = play("captain", null, 0, 0.9);
      if (!speech || !ctx) return; // Buffer still loading: retry on the next visible frame.
      captainPlayed = true;
      captainSound = speech;
      airplaneSound?.gain.gain.setTargetAtTime(0.2, ctx.currentTime, 0.1);
      speech.src.onended = () => {
        if (captainSound !== speech) return;
        captainSound = undefined;
        if (ctx) airplaneSound?.gain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.15);
      };
    },
    /** Engine note while driving: pitch and level follow the speed; 0 stops it. */
    engine(speed: number, bike: boolean) {
      const c = context();
      if (!c || !master) return;
      if (!engineOsc && speed > 0) {
        engineOsc = c.createOscillator();
        engineOsc.type = "sawtooth";
        engineGain = c.createGain();
        engineGain.gain.value = 0;
        const lp = c.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 700;
        engineOsc.connect(lp);
        lp.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      if (!engineOsc || !engineGain) return;
      const base = bike ? 70 : 42;
      engineOsc.frequency.setTargetAtTime(
        base + Math.abs(speed) * (bike ? 6 : 3.4),
        c.currentTime,
        0.08,
      );
      engineGain.gain.setTargetAtTime(
        speed > 0 ? 0.05 + Math.min(0.06, Math.abs(speed) / 500) : 0,
        c.currentTime,
        0.1,
      );
    },
    grenade(kind: GrenadeCue, at: [number, number, number] | null = null) {
      context();
      const cue = GRENADE_CUES[kind];
      const range = kind === "he" ? 120 : kind === "smoke" || kind === "fire" ? 60 : 35;
      play(cue.sample, at, range, cue.gain);
    },
    boom(at: [number, number, number]) {
      play("boom", at, 220, 0.8);
    },
    pickup() {
      beep(660, 70, 0.12);
      setTimeout(() => beep(990, 60, 0.08), 45);
    },
    denied() {
      beep(220, 120, 0.1, "square");
    },
    hit(head: boolean) {
      beep(head ? 1700 : 1250, 50, 0.13, "sine");
    },
    armourBreak() {
      beep(420, 160, 0.14, "sawtooth");
    },
    healed() {
      beep(523, 90, 0.1);
      setTimeout(() => beep(784, 120, 0.1), 80);
    },
    dispose() {
      void ctx?.close();
    },
  };
}
