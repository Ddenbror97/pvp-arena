import { JACKPOT_SPIN_MS } from "@/lib/jackpot/reveal";
import { playLandCue, playWheelCue } from "@/lib/sound-cues";

/**
 * Sound hooks. Register handlers to attach real audio.
 * `wheel_spin` and `roulette_land` are the only cues that make noise.
 * `spin_start` stays silent here because coinflip uses it for the coin, not the wheel.
 */
export type SoundEvent =
  | "entry"
  | "player_join"
  | "spin_start"
  | "spin_stop"
  | "wheel_spin"
  | "roulette_land"
  | "win"
  | "lose";

const MUTE_KEY = "pvp-sound-muted";
export type SoundDetail = { elapsedMs?: number };

const handlers = new Set<(e: SoundEvent, detail?: SoundDetail) => void>();
const muteListeners = new Set<() => void>();

let muted = false;
let installed = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wheel: { setProgress: (progress: number) => void; stop: () => void } | null = null;
let wheelCueOn = false;
let lastLandAt = 0;

export function onSound(fn: (e: SoundEvent, detail?: SoundDetail) => void) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

export function emitSound(e: SoundEvent, detail?: SoundDetail) {
  handlers.forEach((h) => {
    try {
      h(e, detail);
    } catch {
      /* sound must never break the game */
    }
  });
}

export function soundMuted() {
  return muted;
}

export function subscribeSound(listener: () => void) {
  muteListeners.add(listener);
  return () => muteListeners.delete(listener);
}

export function setSoundMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* private mode */
  }
  applyMute();
  muteListeners.forEach((listener) => listener());
}

export function toggleSoundMuted() {
  setSoundMuted(!muted);
}

function applyMute() {
  if (!ctx || !master) return;
  master.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
}

function audio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) {
    try {
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      master = null;
      return null;
    }
  }
  return master ? { ctx, master } : null;
}

function unlock() {
  const graph = audio();
  if (!graph) return;
  if (graph.ctx.state === "suspended") void graph.ctx.resume().catch(() => {});
}

function withLiveAudio(play: (graph: { ctx: AudioContext; master: GainNode }) => void) {
  const graph = audio();
  if (!graph) return;
  const run = () => {
    if (muted || document.visibilityState === "hidden") return;
    play(graph);
  };
  if (graph.ctx.state === "suspended") {
    void graph.ctx
      .resume()
      .then(run)
      .catch(() => {});
    return;
  }
  run();
}

/** True once a user gesture has unlocked audio; ambient cues use this to never queue. */
export function audioRunning() {
  return ctx?.state === "running" && !muted;
}

/** Plays a synthesized cue on the shared output; silent when muted or the tab is hidden. */
export function playSynth(play: (ctx: AudioContext, out: GainNode) => void) {
  withLiveAudio((graph) => {
    try {
      play(graph.ctx, graph.master);
    } catch {
      /* unavailable output */
    }
  });
}

function stopWheelNow() {
  wheel?.stop();
  wheel = null;
}

/** The ratchet may play only while the jackpot page is the one on screen. */
export function setWheelCueEnabled(on: boolean) {
  wheelCueOn = on;
  if (!on) stopWheelNow();
}

/** Keep one ratchet on the wheel's current progress. A later frame corrects speed and level. */
function followWheel(elapsedMs: number) {
  if (!wheelCueOn || muted || document.visibilityState === "hidden") {
    stopWheelNow();
    return;
  }
  const graph = audio();
  if (!graph || graph.ctx.state !== "running") return;
  const progress = Math.min(1, Math.max(0, elapsedMs / JACKPOT_SPIN_MS));
  if (progress >= 1) {
    stopWheelNow();
    return;
  }
  if (!wheel) {
    try {
      wheel = playWheelCue(graph.ctx, graph.master, progress);
    } catch {
      wheel = null;
      return;
    }
  }
  wheel.setProgress(progress);
}

function landBeep() {
  const now = performance.now();
  if (now - lastLandAt < 400) return;
  lastLandAt = now;
  if (muted || document.visibilityState === "hidden") return;
  withLiveAudio((graph) => {
    try {
      playLandCue(graph.ctx, graph.master);
    } catch {
      /* unavailable output */
    }
  });
}

/** Attach the two game cues once. Safe to call again. */
export function installGameSounds() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
  onSound((event, detail) => {
    if (event === "wheel_spin") followWheel(detail?.elapsedMs ?? 0);
    else if (event === "spin_stop") stopWheelNow();
    else if (event === "roulette_land") landBeep();
  });
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stopWheelNow();
  });
}
