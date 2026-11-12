import { grenadeSamples, GRENADE_CUES, type GrenadeCue } from "../grenades/grenade-audio";
/**
 * Battle royale sounds: the 1v1/5v5 gun recordings and the owner's battle royale shots
 * (public/fps/audio/ATTRIBUTION.md), positioned in 3D (Web Audio panner, distance rolloff to
 * the shot's hearing range), the owner's door and pickup recordings, plus small synthesised
 * cues (hit marker, armour break, heal done). One AudioContext, created on the first user gesture.
 */
import { STEP_RECORDINGS } from "../footsteps";
import { fetchSample, footstepVariants, masterChain } from "../audio-core";
import { STEP_VARIANTS, type FootstepSurface } from "../footstep-surfaces";
import { createVehicleAudio, VEHICLE_SAMPLES, type VehicleSound } from "./vehicle-audio";
type ShotKey = "ak47" | "ak47-s" | "m4" | "m4-s" | "awp" | "awp-s" | "mp5" | "mp5-s" | "deagle";
const FILES: Record<
  | ShotKey
  | "reload-ak"
  | "reload-m4"
  | "reload-awp"
  | "reload-awp-empty"
  | "awpZoomIn"
  | "awpZoomOut"
  | "reload-mp5"
  | "reload-mp5-empty"
  | "reload-deagle"
  | "reload-deagle-empty"
  | "bolt"
  | "boom"
  | "parachute"
  | "wind"
  | "airplane"
  | "captain"
  | "zipEnter"
  | "zipGlide"
  | "ladderSteps"
  | "ropeGrabs"
  | "door"
  | "pickup"
  | "hitMarker"
  | "shotAt"
  | "swim"
  | "forest"
  | "snow"
  | keyof typeof VEHICLE_SAMPLES,
  string
> = {
  // Vehicle buffers share the loading/decode cache with weapons and footsteps.
  ...VEHICLE_SAMPLES,
  ak47: "ak47-reference-v1.wav",
  "ak47-s": "br-ak47-silenced-v3.wav",
  m4: "br-m4-v2.wav",
  "m4-s": "m4a1-suppressed-v1.wav",
  awp: "awp-shot-v2.wav",
  "awp-s": "br-awp-silenced-v3.wav",
  // scripts/fps/build-br-smg-pistol-audio.mjs
  mp5: "br-mp5-v2.wav",
  "mp5-s": "br-mp5-silenced-v2.wav",
  deagle: "br-deagle-v2.wav",
  "reload-mp5": "br-mp5-reload-tactical-v2.wav",
  "reload-mp5-empty": "br-mp5-reload-empty-v2.wav",
  "reload-deagle": "br-deagle-reload-tactical-v2.wav",
  "reload-deagle-empty": "br-deagle-reload-empty-v2.wav",
  "reload-ak": "ak-reload-reference-tactical-v1.wav",
  "reload-m4": "m4-reload-tactical-v2.wav",
  // The AWP as in 1v1/5v5 (owner, 2026-11-10): the same reloads, bolt and zoom clicks.
  "reload-awp": "awp-reload-tactical-v3.wav",
  "reload-awp-empty": "awp-reload-empty-v3.wav",
  awpZoomIn: "awp-zoom-in-v1.wav",
  awpZoomOut: "awp-zoom-out-v1.wav",
  bolt: "awp-bolt-v1.wav",
  boom: "c4-explosion-v1.wav",
  parachute: "br-parachute-v1.mp3",
  wind: "br-wind-loop-v1.wav",
  airplane: "br-airplane-loop-v1.mp3",
  captain: "br-captain-v1.mp3",
  // The owner's recordings (2026-11-10), trimmed to the sound and made mono (ATTRIBUTION.md).
  door: "br-door-v1.wav",
  pickup: "br-pickup-v1.wav",
  hitMarker: "hit-marker-v1.wav",
  shotAt: "shot-at-v1.wav",
  // The owner's swimming recording, made a seamless 8.4 s loop (ATTRIBUTION.md).
  swim: "br-swim-loop-v1.wav",
  // The owner's ambience recordings, made seamless loops (ATTRIBUTION.md): forests, the snow
  // mountain.
  forest: "br-forest-loop-v1.mp3",
  snow: "br-snow-loop-v1.mp3",
  // The owner's zip-line recordings (2026-11-11, ATTRIBUTION.md): taking hold, and the glide.
  zipEnter: "br-zip-enter-v1.mp3",
  zipGlide: "br-zip-glide-loop-v1.mp3",
  // The owner's ladder recording (2026-11-11, ATTRIBUTION.md): ten of its hand and boot contacts
  // on the rungs, each levelled, in 0.35 s slots after a 0.1 s lead-in (LADDER_STEPS).
  ladderSteps: "br-ladder-steps-v1.mp3",
  // The owner's rope-climbing recording (2026-11-12, ATTRIBUTION.md): seven of its grabs (a
  // hand closing on the rope and the rope's creak under the pull), each levelled, in 0.45 s
  // slots after a 0.1 s lead-in (ROPE_GRABS).
  ropeGrabs: "br-rope-grabs-v1.mp3",
};

/** The rope grabs' slots in their file (s). */
const ROPE_GRABS = { pad: 0.1, slot: 0.45, count: 7 } as const;
/** The ladder contacts' slots in their file (s). */
const LADDER_STEPS = { pad: 0.1, slot: 0.35, count: 10 } as const;

/**
 * Ambience loops encoded as MP3 (a tenth of the WAV size): the loop is stored between copies of
 * its own last and first `pad` seconds, so the encoder's priming and padding never fall inside
 * it, and played from `pad` to `pad + length` (s).
 */
const AMBIENCE_LOOPS = {
  forest: { pad: 0.25, length: 34 },
  snow: { pad: 0.25, length: 30 },
  zipGlide: { pad: 0.25, length: 5.45 },
} as const;
/** Ambience levels at full presence: under the footsteps and the guns, felt more than heard. */
const AMBIENCE_GAIN = { forest: 0.2, snow: 0.17 } as const;

/**
 * The Karambit (the 1v1/5v5 knife samples, scripts/fps/build-knife-audio.mjs): first-person
 * animation cues at the 1v1 levels, and others' swings in 3D.
 */
const KNIFE_FILES = {
  knifeEquip: "knife-equip-v2.wav",
  knifeFlip: "knife-flip-v1.wav",
  knifeSpin: "knife-spin-v1.wav",
  knifeCatch: "knife-catch-v1.wav",
  knifeCatchSoft: "knife-catch-soft-v1.wav",
  knifeCloth: "knife-cloth-v1.wav",
  knifeSlash: "knife-slash-v1.wav",
  knifeStab: "knife-stab-v1.wav",
  knifeHit: "knife-hit-v1.wav",
} as const;
const KNIFE_CUES: Record<string, [keyof typeof KNIFE_FILES, number]> = {
  equip: ["knifeEquip", 0.3],
  flip: ["knifeFlip", 0.12],
  spin: ["knifeSpin", 0.13],
  catch: ["knifeCatch", 0.16],
  "catch-soft": ["knifeCatchSoft", 0.1],
  cloth: ["knifeCloth", 0.08],
  slash: ["knifeSlash", 0.42],
  stab: ["knifeStab", 0.46],
};

export function createBrAudio(base: string) {
  let ctx: AudioContext | null = null;
  let disposed = false;
  let master: GainNode | null = null;
  /** The player's volume setting (0..1) on top of the mix level. */
  let volume = 1;
  let stepVariant = 0;
  let ladderVariant = 0;
  let ropeVariant = 0;
  const buffers = new Map<string, AudioBuffer>();
  const loading = new Map<string, Promise<void>>();
  const url = (f: string) => new URL(`fps/audio/${f}`, base).href;
  function context() {
    if (disposed) return null;
    if (ctx) return ctx;
    try {
      ctx = new AudioContext({ latencyHint: "interactive" });
    } catch {
      return null;
    }
    master = masterChain(ctx, { gain: 0.6 * volume, threshold: -14, ratio: 4 }).master;
    for (const [key, buffer] of grenadeSamples(ctx)) buffers.set(key, buffer);
    for (const [key, file] of Object.entries({ ...FILES, ...KNIFE_FILES, ...STEP_RECORDINGS }))
      loading.set(
        key,
        fetchSample(ctx, url(file))
          .then((buf) => {
            buffers.set(key, buf);
            if (key.startsWith("step"))
              for (const [surface, variant] of footstepVariants(ctx!, buf))
                buffers.set(key + "-" + surface, variant);
          })
          .catch(() => {}),
      );
    return ctx;
  }
  const listener = { x: 0, y: 0, z: 0, yaw: 0 };
  let vehicleAudio: ReturnType<typeof createVehicleAudio> | undefined;
  let parachuteOpen = false;
  let parachuteSound: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  let windSound: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  let swimSound: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  let airplaneSound: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  /** The zip-line's glide (looped for the ride) and the wind with the speed. */
  let zipGlide: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  let zipWind: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  const ambience: Partial<
    Record<keyof typeof AMBIENCE_LOOPS, { src: AudioBufferSourceNode; gain: GainNode }>
  > = {};
  let captainPlayed = false;
  let captainSound: { src: AudioBufferSourceNode; gain: GainNode } | undefined;
  function play(
    key: string,
    at: [number, number, number] | null,
    range: number,
    gain = 1,
    loop = false,
    /** Play only this part of the file (s): a one-shot out of a set of them. */
    part?: { offset: number; duration: number },
  ) {
    const c = context();
    const buf = buffers.get(key);
    if (!c || !master || !buf) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const region = loop ? AMBIENCE_LOOPS[key as keyof typeof AMBIENCE_LOOPS] : undefined;
    if (region) {
      src.loopStart = region.pad;
      src.loopEnd = region.pad + region.length;
    }
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
    if (part) src.start(0, part.offset, part.duration);
    else src.start(0, region ? region.pad : 0);
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
      gun: "ak47" | "m4a1s" | "awp" | "mp5" | "deagle",
      silenced: boolean,
      at: [number, number, number] | null,
      hearM: number,
    ) {
      // The Deagle takes no muzzle device.
      const quiet = silenced && gun !== "deagle";
      const k = (gun === "m4a1s" ? "m4" : gun) + (quiet ? "-s" : "");
      const gain = at ? 0.9 : gun === "deagle" ? 0.85 : 0.75;
      // A silenced shot is quieter and carries less than half as far (as match.ts sends it).
      play(k, at, quiet ? hearM * 0.4 : hearM, quiet ? gain * 0.8 : gain);
      // The AWP: the report, then the bolt cycle on the same timeline (as in 1v1/5v5: own at
      // 0.75 of the shot, others' heard up close).
      if (gun === "awp") play("bolt", at, 30, at ? 0.4 * 0.9 : 0.75 * 0.75);
    },
    /** AWP zoom in / out click (own, quiet, centred; as in 1v1/5v5). */
    zoom(entering: boolean) {
      play(entering ? "awpZoomIn" : "awpZoomOut", null, 0, 0.22);
    },
    reload(gun: "ak47" | "m4" | "awp" | "mp5" | "deagle", empty = false) {
      const key =
        gun === "awp"
          ? (`reload-awp${empty ? "-empty" : ""}` as const)
          : gun === "m4"
            ? "reload-m4"
            : gun === "mp5" || gun === "deagle"
              ? (`reload-${gun}${empty ? "-empty" : ""}` as const)
              : "reload-ak";
      play(key, null, 10, 0.6);
    },
    step(surface: FootstepSurface, at: [number, number, number] | null) {
      const key = "step" + (stepVariant++ % 4) + (surface === "concrete" ? "" : "-" + surface);
      play(key, at, 36, at ? 0.5 : 0.26);
    },
    /**
     * A hand or boot on a ladder's rung (own: centred; others': at them), a different contact
     * each time; hands (every other one) a little louder than boots.
     */
    ladderStep(at: [number, number, number] | null) {
      const i = ladderVariant++;
      const slot = (i * 7) % LADDER_STEPS.count;
      play("ladderSteps", at, 30, (at ? 0.6 : 0.42) * (i % 2 ? 0.7 : 1), false, {
        offset: LADDER_STEPS.pad + slot * LADDER_STEPS.slot,
        duration: LADDER_STEPS.slot,
      });
    },
    /**
     * A hand taking the climbing rope (own: centred; others': at them): the grab and the
     * rope's creak as the pull goes on to the next grab, a different one each time. Played as
     * each hand closes on the rope (rope-climb.ts: twice a cycle, 0.75 m of rope apart), so it
     * keeps the climb's own pace at any speed, up or down, and stops when the climber does.
     * `pace` 0 … 1 of the full climbing speed: a slow climb is quieter.
     */
    ropeGrab(at: [number, number, number] | null, pace = 1) {
      const i = ropeVariant++;
      const slot = (i * 3) % ROPE_GRABS.count;
      const level = 0.55 + 0.45 * Math.max(0, Math.min(1, pace));
      play("ropeGrabs", at, 34, (at ? 0.75 : 0.5) * level * (i % 2 ? 0.88 : 1), false, {
        offset: ROPE_GRABS.pad + slot * ROPE_GRABS.slot,
        duration: ROPE_GRABS.slot,
      });
    },
    /** Taking hold of the zip-line's handle (own: centred; others': at them). */
    zipEnter(at: [number, number, number] | null) {
      play("zipEnter", at, 40, at ? 0.55 : 0.7);
    },
    /**
     * The ride's sound, every frame while on the zip-line (null: off it): the glide loop for the
     * whole ride, louder and a little higher with the speed (0..1 of cruise), and the wind
     * rising with it. Fades out as the rider drops off at the end.
     */
    zipRide(speed: number | null) {
      const c = ctx;
      if (speed === null) {
        for (const s of [zipGlide, zipWind])
          if (s && c) {
            s.gain.gain.setTargetAtTime(0, c.currentTime, 0.12);
            s.src.stop(c.currentTime + 0.6);
          }
        zipGlide = zipWind = undefined;
        return;
      }
      if (context()?.state !== "running") return;
      zipGlide ??= play("zipGlide", null, 0, 0.0001, true);
      zipWind ??= play("wind", null, 0, 0.0001, true);
      if (!ctx) return;
      const v = Math.max(0, Math.min(1.2, speed));
      zipGlide?.gain.gain.setTargetAtTime(0.25 + 0.45 * Math.min(1, v), ctx.currentTime, 0.15);
      zipGlide?.src.playbackRate.setTargetAtTime(0.88 + 0.16 * v, ctx.currentTime, 0.2);
      zipWind?.gain.gain.setTargetAtTime(0.32 * v * v, ctx.currentTime, 0.25);
    },
    /** One opening per deployment, including auto-deploy; corrections never restart it. */
    setParachuteOpen(open: boolean) {
      if (open) {
        // Do not queue an opening behind autoplay; retry on a frame after a user unlocks it.
        if (context()?.state !== "running") return;
        // Retry while the buffer is loading, but never replay a completed opening.
        if (!parachuteOpen || !parachuteSound) parachuteSound = play("parachute", null, 0, 0.42);
        windSound ??= play("wind", null, 0, 0.18, true);
        parachuteOpen = true;
      } else {
        parachuteOpen = false;
        if (parachuteSound && ctx) {
          parachuteSound.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
          parachuteSound.src.stop(ctx.currentTime + 0.2);
          parachuteSound = undefined;
        }
        if (windSound && ctx) {
          windSound.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
          windSound.src.stop(ctx.currentTime + 0.2);
          windSound = undefined;
        }
      }
    },
    /**
     * Swimming (own): the water loop while in the water, quiet treading water and fuller with
     * the stroke (`stroke` 0..1, the speed over swimming speed); fades out on leaving it.
     */
    setSwimming(swimming: boolean, stroke: number, base = 0.12) {
      const c = ctx;
      if (swimming) {
        if (context()?.state !== "running") return;
        const level = base + 0.28 * stroke;
        // The first splash is heard at once (the level used to fade in from silence).
        const fresh = !swimSound;
        swimSound ??= play("swim", null, 0, level, true);
        if (swimSound && c)
          swimSound.gain.gain.setTargetAtTime(level, c.currentTime, fresh ? 0.02 : 0.1);
      } else if (swimSound && c) {
        swimSound.gain.gain.setTargetAtTime(0, c.currentTime, 0.12);
        swimSound.src.stop(c.currentTime + 0.6);
        swimSound = undefined;
      }
    },
    /**
     * Where you are (each 0..1): among trees (`forest`), up on the snow mountain (`snow`). Each
     * loop starts once it is wanted and drifts to its level over a couple of seconds, so walking
     * into a wood or up the mountain fades it in rather than switching it on.
     */
    setAmbience(forest: number, snow: number) {
      const c = ctx;
      if (!c || c.state !== "running") return;
      for (const [key, amount] of [
        ["forest", forest],
        ["snow", snow],
      ] as const) {
        const level = AMBIENCE_GAIN[key] * Math.max(0, Math.min(1, amount));
        if (!ambience[key] && level <= 0.001) continue;
        let sound = ambience[key];
        if (!sound) {
          sound = play(key, null, 0, 0, true);
          if (!sound) continue; // Still loading: try again on the next measurement.
          ambience[key] = sound;
        }
        sound.gain.gain.setTargetAtTime(level, c.currentTime, 1.2);
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
    /** Recorded ignition/idle/driving, keyed by the confirmed driver's vehicle id. */
    engine(vehicle: VehicleSound | null, throttle = 0) {
      const c = context();
      if (!c || !master) return;
      vehicleAudio ??= createVehicleAudio(c, master, (key) => buffers.get(key));
      vehicleAudio.update(vehicle, throttle);
    },
    grenade(kind: GrenadeCue, at: [number, number, number] | null = null) {
      context();
      const cue = GRENADE_CUES[kind];
      const range = kind === "he" ? 120 : kind === "smoke" || kind === "fire" ? 60 : 35;
      play(cue.sample, at, range, cue.gain);
    },
    /** Own first-person Karambit cue (the animator's), centred. */
    knifeCue(name: string) {
      const cue = KNIFE_CUES[name];
      if (cue) play(cue[0], null, 0, cue[1]);
    },
    /** Someone else's swing, in 3D within its hearing range. */
    knifeSwing(attack: "slash" | "stab", at: [number, number, number], hearM: number) {
      const cue = KNIFE_CUES[attack]!;
      play(cue[0], at, hearM, cue[1] * 1.4);
    },
    /** The blade connecting (own hits, centred). */
    knifeHit() {
      play("knifeHit", null, 0, 0.32);
    },
    boom(at: [number, number, number]) {
      play("boom", at, 220, 0.8);
    },
    /** Picking an item up (own, centred). */
    pickup() {
      play("pickup", null, 0, 0.55);
    },
    /** A door opening or closing, in 3D at the door. */
    door(at: [number, number, number]) {
      play("door", at, 35, 0.7);
    },
    denied() {
      beep(220, 120, 0.1, "square");
    },
    /** Own hit on an enemy: the owner's hit-marker recording (a little brighter on the head). */
    hit(head: boolean) {
      play("hitMarker", null, 0, head ? 0.42 : 0.35);
    },
    /** An enemy's bullet went close by (shot-awareness.ts): kept quiet, as awareness. */
    shotAt() {
      play("shotAt", null, 0, 0.25);
    },
    armourBreak() {
      beep(420, 160, 0.14, "sawtooth");
    },
    healed() {
      beep(523, 90, 0.1);
      setTimeout(() => beep(784, 120, 0.1), 80);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      vehicleAudio?.dispose();
      parachuteSound?.src.stop();
      windSound?.src.stop();
      parachuteSound = windSound = undefined;
      zipGlide?.src.stop();
      zipWind?.src.stop();
      zipGlide = zipWind = undefined;
      for (const a of Object.values(ambience)) a?.src.stop();
      void ctx?.close();
    },
  };
}
