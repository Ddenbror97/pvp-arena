/**
 * Server-side latency telemetry for cross-region play (US / EU / LatAm), reported as
 * p50 / p95 / p99 so tail latency is visible, not just averages.
 *
 * - command: a player command's server-side delay from WebSocket arrival until the
 *   simulation applies it (strict session gate + queue + clock alignment).
 * - rtt: measured WebSocket round trips (server-issued challenges), per continent.
 * - sessionRead: duration of each strict session-validation read (room-wide).
 *
 * Continents come from Cloudflare's edge (`request.cf.continent`) at connection time:
 * NA, SA, EU, AS, OC, AF, AN, or "XX" when unknown. Bounded memory, no user identifiers.
 */
const RING = 512;

class Ring {
  private values = new Float64Array(RING);
  private next = 0;
  private size = 0;
  add(value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 60_000) return;
    this.values[this.next] = value;
    this.next = (this.next + 1) % RING;
    this.size = Math.min(RING, this.size + 1);
  }
  get count() {
    return this.size;
  }
  summary() {
    if (!this.size) return null;
    const sorted = Array.from(this.values.subarray(0, this.size)).sort((a, b) => a - b);
    const at = (q: number) =>
      sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1)]!;
    return {
      n: this.size,
      p50: Math.round(at(0.5)),
      p95: Math.round(at(0.95)),
      p99: Math.round(at(0.99)),
      max: Math.round(sorted.at(-1)!),
    };
  }
  clear() {
    this.next = this.size = 0;
  }
}

export function continentOf(request: Request): string {
  const continent = (request as Request & { cf?: { continent?: unknown } }).cf?.continent;
  return typeof continent === "string" && /^[A-Z]{2}$/.test(continent) ? continent : "XX";
}

export class LatencyTelemetry {
  private commands = new Map<string, Ring>();
  private rtts = new Map<string, Ring>();
  private reads = new Ring();
  private ring(map: Map<string, Ring>, key: string) {
    let ring = map.get(key);
    if (!ring) map.set(key, (ring = new Ring()));
    return ring;
  }
  command(continent: string | undefined, ms: number) {
    this.ring(this.commands, continent ?? "XX").add(ms);
  }
  rtt(continent: string | undefined, ms: number) {
    this.ring(this.rtts, continent ?? "XX").add(ms);
  }
  sessionRead(ms: number) {
    this.reads.add(ms);
  }
  /** One record per continent seen since the previous report; resets the windows. */
  report() {
    const continents = new Set([...this.commands.keys(), ...this.rtts.keys()]);
    const rows = [...continents].map((continent) => ({
      continent,
      commandDelayMs: this.commands.get(continent)?.summary() ?? null,
      rttMs: this.rtts.get(continent)?.summary() ?? null,
    }));
    const sessionReadMs = this.reads.summary();
    for (const ring of [...this.commands.values(), ...this.rtts.values(), this.reads]) ring.clear();
    return { rows, sessionReadMs };
  }
  /** Current window for one continent, for the player's own network report. */
  commandSummary(continent: string | undefined) {
    return this.commands.get(continent ?? "XX")?.summary() ?? null;
  }
}
