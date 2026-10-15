/**
 * Dealer voice from recorded clips (see `dealer-lines.ts`), played on the site's shared
 * audio output so it follows the global mute. A faint room reverb places the voice at the
 * table instead of in the listener's ear. Lines without a clip, or devices that can't
 * decode one, fall back to the given provider (browser speech).
 */
import { playSynth } from "@/lib/sound";
import { DEALER_CLIP_DIR, DEALER_LINES, dealerLineId, spokenForm } from "./dealer-lines";
import type { DealerLineId } from "./dealer-lines";
import type { VoiceProvider } from "./voice";

const ROOM_MIX = 0.14;
/** Clips are recorded at different levels; play each at the same peak so no line is quiet. */
const TARGET_PEAK = 0.9;

const gainFor = new WeakMap<AudioBuffer, number>();
function normalize(buf: AudioBuffer) {
  let g = gainFor.get(buf);
  if (g === undefined) {
    let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]!));
    }
    g = peak > 0.01 ? Math.min(3, TARGET_PEAK / peak) : 1;
    gainFor.set(buf, g);
  }
  return g;
}

const roomCache = new WeakMap<BaseAudioContext, AudioBuffer>();
/** A short, dark decay: a quiet card room, not a hall. Deterministic noise, not game randomness. */
function room(ctx: BaseAudioContext) {
  let b = roomCache.get(ctx);
  if (!b) {
    const len = Math.floor(ctx.sampleRate * 0.45);
    b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let x = 0x9e3779b9 ^ (ch * 0x85ebca6b);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        const n = ((x >>> 0) / 4294967296) * 2 - 1;
        lp += 0.35 * (n - lp);
        d[i] = lp * Math.pow(1 - i / len, 3.2);
      }
    }
    roomCache.set(ctx, b);
  }
  return b;
}

export class ClipVoiceProvider implements VoiceProvider {
  readonly name = "clips";
  private raw = new Map<DealerLineId, Promise<ArrayBuffer | null>>();
  private decoded = new WeakMap<BaseAudioContext, Map<DealerLineId, Promise<AudioBuffer | null>>>();
  private failed = new Set<DealerLineId>();
  private stop: (() => void) | null = null;

  constructor(private fallback: VoiceProvider) {}

  available() {
    return (typeof window !== "undefined" && "AudioContext" in window) || this.fallback.available();
  }

  /** Fetches every clip in the background (about 130 KB) so the first line starts on cue. */
  preload() {
    for (const id of Object.keys(DEALER_LINES) as DealerLineId[]) void this.fetchRaw(id);
  }

  private fetchRaw(id: DealerLineId) {
    let p = this.raw.get(id);
    if (!p) {
      p = fetch(`${DEALER_CLIP_DIR}/${id}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
      this.raw.set(id, p);
    }
    return p;
  }

  private buffer(ctx: BaseAudioContext, id: DealerLineId) {
    let m = this.decoded.get(ctx);
    if (!m) this.decoded.set(ctx, (m = new Map()));
    let p = m.get(id);
    if (!p) {
      // decodeAudioData detaches its input, so decode a copy and keep the fetched bytes.
      p = this.fetchRaw(id).then((raw) =>
        raw ? ctx.decodeAudioData(raw.slice(0)).catch(() => null) : null,
      );
      m.set(id, p);
    }
    return p;
  }

  speak(text: string, o: { volume: number }): Promise<void> {
    const id = dealerLineId(text);
    if (!id || this.failed.has(id)) return this.fallback.speak(spokenForm(text), o);
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (this.stop === stop) this.stop = null;
        resolve();
      };
      let source: AudioBufferSourceNode | null = null;
      const stop = () => {
        try {
          source?.stop();
        } catch {
          /* already stopped */
        }
        done();
      };
      this.stop = stop;
      // Muted, hidden tab or no output: playSynth never calls back, so never hold the queue.
      const guard = setTimeout(done, 1500 + text.length * 90);
      playSynth((ctx, out) => {
        void this.buffer(ctx, id).then((buf) => {
          if (settled) return;
          if (!buf) {
            this.failed.add(id);
            clearTimeout(guard);
            void this.fallback.speak(spokenForm(text), o).then(done);
            return;
          }
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const level = ctx.createGain();
          level.gain.value = Math.min(1, Math.max(0, o.volume)) * normalize(buf);
          const wet = ctx.createGain();
          wet.gain.value = ROOM_MIX;
          const verb = ctx.createConvolver();
          verb.buffer = room(ctx);
          src.connect(level);
          level.connect(out);
          level.connect(verb).connect(wet).connect(out);
          src.onended = () => {
            clearTimeout(guard);
            setTimeout(() => {
              level.disconnect();
              wet.disconnect();
            }, 500);
            done();
          };
          source = src;
          clearTimeout(guard);
          setTimeout(done, buf.duration * 1000 + 800);
          src.start();
        });
      });
    });
  }

  cancel() {
    this.stop?.();
    this.stop = null;
    this.fallback.cancel();
  }
}
