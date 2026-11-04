/**
 * Battle royale sounds: the 1v1/5v5 gun recordings and the owner's battle royale shots
 * (public/fps/audio/ATTRIBUTION.md), positioned in 3D (Web Audio panner, distance rolloff to
 * the shot's hearing range), plus small synthesised cues (pickup, hit marker, armour break,
 * heal done). One AudioContext, created on the first user gesture.
 */
import { ITEMS, PACK_GUNS, type WeaponDef, type WeaponId } from "./items";

/** Pack guns' shot sound: a recording and a pitch (items.ts `sound`). */
const SOUND_OF = new Map(
  PACK_GUNS.map((id) => [
    id as string,
    (ITEMS[id] as WeaponDef).sound ?? { base: "ak47", pitch: 1 },
  ]),
);
type ShotKey = "ak47" | "ak47-s" | "m4" | "m4-s" | "awp" | "awp-s";
const FILES: Record<ShotKey | "reload-ak" | "reload-m4" | "reload-awp" | "bolt" | "boom", string> =
  {
    ak47: "ak47-reference-v1.wav",
    "ak47-s": "br-ak47-silenced-v1.wav",
    m4: "br-m4-v1.wav",
    "m4-s": "m4a1-suppressed-v1.wav",
    awp: "awp-shot-v2.wav",
    "awp-s": "br-awp-silenced-v1.wav",
    "reload-ak": "ak-reload-reference-tactical-v1.wav",
    "reload-m4": "m4-reload-tactical-v2.wav",
    "reload-awp": "awp-reload-v2.wav",
    bolt: "awp-bolt-v1.wav",
    boom: "c4-explosion-v1.wav",
  };

export function createBrAudio(base: string) {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
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
    master.gain.value = 0.6;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);
    for (const [key, file] of Object.entries(FILES))
      loading.set(
        key,
        fetch(url(file))
          .then((r) => r.arrayBuffer())
          .then((b) => ctx!.decodeAudioData(b))
          .then((buf) => void buffers.set(key, buf))
          .catch(() => {}),
      );
    return ctx;
  }
  const listener = { x: 0, y: 0, z: 0, yaw: 0 };
  let engineOsc: OscillatorNode | null = null,
    engineGain: GainNode | null = null;
  function play(
    key: string,
    at: [number, number, number] | null,
    range: number,
    gain = 1,
    rate = 1,
  ) {
    const c = context();
    const buf = buffers.get(key);
    if (!c || !master || !buf) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = gain;
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
    /** Call on a user gesture (click to play) so the browser allows audio. */
    unlock() {
      const c = context();
      if (c && c.state === "suspended") void c.resume();
    },
    setListener(x: number, y: number, z: number, yaw: number) {
      Object.assign(listener, { x, y, z, yaw });
    },
    /** A shot by gun model: the pack guns play one of the recordings at their own pitch. */
    shot(
      gun: WeaponDef["model"],
      silenced: boolean,
      at: [number, number, number] | null,
      hearM: number,
    ) {
      const sound = SOUND_OF.get(gun) ?? { base: gun as "ak47" | "m4a1s" | "awp", pitch: 1 };
      const k = (sound.base === "m4a1s" ? "m4" : sound.base) + (silenced ? "-s" : "");
      play(k, at, hearM, at ? 0.9 : 0.75, sound.pitch);
    },
    /** Reload by item: the AK/M4/AWP recordings (pack guns: the nearest kind, re-pitched). */
    reload(gun: WeaponId) {
      const d = ITEMS[gun] as WeaponDef;
      const base = d.sound?.base ?? d.model;
      const key = base === "awp" ? "reload-awp" : base === "m4a1s" ? "reload-m4" : "reload-ak";
      play(key, null, 10, 0.6, d.sound ? Math.min(1.2, Math.max(0.9, d.sound.pitch)) : 1);
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
export type BrAudio = ReturnType<typeof createBrAudio>;
