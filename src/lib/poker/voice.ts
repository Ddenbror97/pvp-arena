/**
 * Dealer voice: a replaceable provider behind a small priority queue.
 *
 * The default provider is the browser's speech synthesis, using the most natural English
 * voice the device offers. A server TTS or prerecorded-clip provider can replace it with
 * `setVoiceProvider` without touching the table code. Game flow never waits on speech.
 */

export interface VoiceProvider {
  readonly name: string;
  available(): boolean;
  /** Resolves when the line ends or is cancelled; never rejects. */
  speak(text: string, o: { volume: number }): Promise<void>;
  cancel(): void;
}

export enum VoicePriority {
  Ambient = 0,
  Normal = 1,
  Important = 2,
}

export interface VoiceLine {
  /** Stable id (usually the game event id); a key is spoken at most once. */
  key: string;
  text: string;
  priority: VoicePriority;
  /** Drop the line if it could not start within this window, so speech never lags the table. */
  ttlMs?: number;
}

type Queued = VoiceLine & { at: number };

const PREFERRED = [
  /natural/i,
  /neural/i,
  /online/i,
  /aria|jenny|ava|emma|sonia|libby|michelle|samantha|serena|karen|moira|tessa/i,
  /google (uk|us) english/i,
  /female/i,
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = en.length ? en : voices;
  for (const re of PREFERRED) {
    const v = pool.find((x) => re.test(x.name));
    if (v) return v;
  }
  return pool.find((v) => v.default) ?? pool[0] ?? null;
}

export class WebSpeechProvider implements VoiceProvider {
  readonly name = "browser";
  private voice: SpeechSynthesisVoice | null = null;
  private resolve: (() => void) | null = null;

  available() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  private ensureVoice() {
    if (this.voice || !this.available()) return;
    this.voice = pickVoice(window.speechSynthesis.getVoices());
    if (!this.voice)
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        () => (this.voice = pickVoice(window.speechSynthesis.getVoices())),
        { once: true },
      );
  }

  speak(text: string, o: { volume: number }) {
    if (!this.available()) return Promise.resolve();
    this.ensureVoice();
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.lang = this.voice?.lang ?? "en-US";
      u.volume = o.volume;
      u.rate = 0.97;
      u.pitch = 1.02;
      const done = () => {
        if (this.resolve === resolve) this.resolve = null;
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      this.resolve = resolve;
      try {
        window.speechSynthesis.speak(u);
      } catch {
        done();
      }
      // Some engines never fire onend; never hold the queue longer than the line needs.
      setTimeout(done, 1200 + text.length * 90);
    });
  }

  cancel() {
    if (!this.available()) return;
    window.speechSynthesis.cancel();
    this.resolve?.();
    this.resolve = null;
  }
}

export class VoiceService {
  private queue: Queued[] = [];
  private speaking: Queued | null = null;
  private spoken = new Set<string>();
  private spokenOrder: string[] = [];

  constructor(
    private provider: VoiceProvider,
    private opts: {
      enabled: () => boolean;
      volume: () => number;
      /** Browsers block speech until the page has had a user gesture. */
      unlocked: () => boolean;
      now?: () => number;
    },
  ) {}

  setProvider(p: VoiceProvider) {
    this.cancelAll();
    this.provider = p;
  }

  private now() {
    return this.opts.now?.() ?? Date.now();
  }

  private remember(key: string) {
    this.spoken.add(key);
    this.spokenOrder.push(key);
    if (this.spokenOrder.length > 300) this.spoken.delete(this.spokenOrder.shift()!);
  }

  get current() {
    return this.speaking;
  }
  get pending() {
    return this.queue.slice();
  }

  /** Queues a line. Returns false when it was dropped (disabled, locked, duplicate). */
  say(line: VoiceLine): boolean {
    if (this.spoken.has(line.key) || this.queue.some((q) => q.key === line.key)) return false;
    if (!this.opts.enabled() || !this.opts.unlocked() || !this.provider.available()) {
      this.remember(line.key);
      return false;
    }
    const q: Queued = { ...line, at: this.now() };
    if (this.speaking && q.priority > this.speaking.priority) {
      this.queue = this.queue.filter((x) => x.priority >= q.priority);
      this.queue.unshift(q);
      this.provider.cancel();
      return true;
    }
    this.queue.push(q);
    this.queue.sort((a, b) => b.priority - a.priority || a.at - b.at);
    // Never build a backlog: keep at most two waiting lines.
    while (this.queue.length > 2) this.remember(this.queue.pop()!.key);
    if (!this.speaking) void this.next();
    return true;
  }

  private async next(): Promise<void> {
    while (this.queue.length) {
      const q = this.queue.shift()!;
      if (q.ttlMs != null && this.now() - q.at > q.ttlMs) {
        this.remember(q.key);
        continue;
      }
      this.speaking = q;
      this.remember(q.key);
      try {
        await this.provider.speak(q.text, { volume: this.opts.volume() });
      } catch {
        /* a failed line never blocks the next one */
      }
      if (this.speaking === q) this.speaking = null;
    }
  }

  /** Drops waiting lines below `priority` (a new hand makes old chatter stale). */
  dropBelow(priority: VoicePriority) {
    for (const q of this.queue.filter((x) => x.priority < priority)) this.remember(q.key);
    this.queue = this.queue.filter((x) => x.priority >= priority);
    if (this.speaking && this.speaking.priority < priority) this.provider.cancel();
  }

  cancelAll() {
    for (const q of this.queue) this.remember(q.key);
    this.queue = [];
    this.provider.cancel();
    this.speaking = null;
  }
}
