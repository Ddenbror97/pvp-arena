import type { MatchState, Seat, Weapon } from "./protocol";
import { consumeShotPrediction } from "./trigger-feedback";
const SAMPLES = {
  rifleA: "ak47-reference-v1.wav",
  reloadEmpty: "ak-reload-reference-empty-v1.wav",
  reloadTactical: "ak-reload-reference-tactical-v1.wav",
  /** Police (seat A) suppressed M4A1 and its reloads (scripts/fps/build-m4-audio.mjs). */
  rifleM4: "m4a1-suppressed-v1.wav",
  m4ReloadEmpty: "m4-reload-empty-v1.wav",
  m4ReloadTactical: "m4-reload-tactical-v1.wav",
  pistol: "pistol-v1.wav",
  step0: "step-0-v1.wav",
  step1: "step-1-v1.wav",
  step2: "step-2-v1.wav",
  step3: "step-3-v1.wav",
} as const;
type Sample = keyof typeof SAMPLES | "hurt" | "elimination" | "casing";
/** Seat A is the Police side and carries the M4A1; seat B keeps the AK. */
const m4Seat = (seat: Seat | null | undefined) => seat === "A";
export type CombatAudio = ReturnType<typeof createCombatAudio>;
/** Recorded, normalized samples; one shared decode per sample and a bounded voice budget. */
export function createCombatAudio() {
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
  let localSeat: Seat | null = null;
  const shot = (weapon: Weapon, gain = 0.62, pan = 0, occluded = false, seat?: Seat | null) => {
    played.shots++;
    const m4 = weapon === "rifle" && m4Seat(seat);
    play(
      weapon === "rifle" ? (m4 ? "rifleM4" : "rifleA") : "pistol",
      gain,
      pan,
      occluded,
      weapon === "rifle" ? 1 : 0.985 + (played.shots % 3) * 0.015,
    );
    // Own M4 only: the ejected case lands a moment later, just right of the player.
    if (m4 && seat === localSeat && gain > 0.3)
      play(
        "casing",
        0.05,
        0.35,
        false,
        0.94 + (played.shots % 5) * 0.03,
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
      (Object.entries(SAMPLES) as [Sample, string][])
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
      .then(() => {})
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
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    filter.type = "lowpass";
    filter.frequency.value = occluded ? 1600 : 18000;
    source.connect(filter);
    filter.connect(level);
    level.connect(panner);
    panner.connect(master);
    // The reference rifle already includes its recorded report and decay.
    if (name === "pistol") panner.connect(echo);
    voices.add(source);
    source.onended = () => {
      voices.delete(source);
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
    localShot(weapon: Weapon, seq: number) {
      for (const [key, at] of predicted) if (performance.now() - at > 2000) predicted.delete(key);
      predicted.set(seq, performance.now());
      shot(weapon, 0.62, 0, false, localSeat);
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
      if (state.round !== lastRound) {
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
        const offset = Math.max(0, (serverNow - (reloadEnd - 1800)) / 1000);
        reloadVoice = play(
          m4Seat(seat)
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
          if (own && consumeShotPrediction(predicted, event.shotSeq)) continue;
          const weapon = event.weapon ?? (event.seat ? state.players[event.seat].weapon : "rifle");
          shot(weapon, gain * (own ? 0.62 : 0.48), pan, !!cue?.occluded, event.seat);
        } else if (event.type === "step" && cue) {
          played.steps++;
          const sample = ("step" + (played.steps % 4)) as Sample;
          play(
            sample,
            gain * 0.75 * (cue.soft ? 0.1 : own ? 0.34 : 0.48),
            pan,
            !!cue.occluded,
            cue.surface === "metal" ? 1.16 : 1,
          );
        } else if (event.hit?.victim === seat) {
          played.hits++;
          play("hurt", 0.25, 0, false);
        }
        if (event.type === "round-end" || event.type === "draw") {
          play("elimination", 0.2, 0, false);
        }
      }
    },
    get diagnostics() {
      return { decoded: buffers.size, voices: voices.size, ...played, muted };
    },
    async ready() {
      await load();
    },
    dispose() {
      disposed = true;
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
