/** Shared presentation delay, included in the server's bounded shot lookback. */
// The 20 Hz snapshot deadline is serviced by a 30 Hz simulation: normal gaps
// alternate between ~34 and ~67 ms. Cover the longer delivery interval so rendering
// does not exhaust its next pose every other packet. Shot rewind shares this.
export const REMOTE_DELAY_MS = 75;
export const MAX_REWIND_MS = 200;
export type NetworkReport = {
  rttMs: number;
  rttP95Ms: number;
  jitterMs: number;
  tickHz: number;
  authMs: number;
  processingMs: number;
};
export function readNetworkReport(raw: unknown): NetworkReport | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    !Object.keys({
      rttMs: 0,
      rttP95Ms: 0,
      jitterMs: 0,
      tickHz: 0,
      authMs: 0,
      processingMs: 0,
    }).every(
      (key) =>
        typeof value[key] === "number" &&
        Number.isFinite(value[key]) &&
        value[key] >= 0 &&
        value[key] <= 10000,
    )
  )
    return null;
  return value as NetworkReport;
}

/** Server-issued, single-use challenges. No client timestamps or claimed ping. */
export class ConnectionTiming {
  private pending: { id: string; at: number } | null = null;
  private sentAt = -Infinity;
  private samples: number[] = [];
  challenge(now: number) {
    if (now - this.sentAt < 1000) return null;
    this.sentAt = now;
    return (this.pending = { id: crypto.randomUUID(), at: now });
  }
  pong(id: string, now: number) {
    if (!this.pending || id !== this.pending.id) return false;
    const rtt = now - this.pending.at;
    this.pending = null;
    if (!Number.isFinite(rtt) || rtt < 0 || rtt > 2000) return false;
    this.samples.push(rtt);
    if (this.samples.length > 16) this.samples.shift();
    return true;
  }
  get calibrated() {
    return this.samples.length >= 3;
  }
  /** The lowest recent RTT resists transient jitter and selectively delayed pongs. */
  get lookbackMs() {
    return this.calibrated
      ? // The target snapshot travels outward and the shot travels back. Include
        // the complete measured trip and the shared interpolation buffer.
        Math.min(MAX_REWIND_MS, Math.min(...this.samples) + REMOTE_DELAY_MS)
      : 0;
  }
  report() {
    if (!this.samples.length) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const jitter =
      this.samples.slice(1).reduce((n, v, i) => n + Math.abs(v - this.samples[i]!), 0) /
      Math.max(1, this.samples.length - 1);
    return {
      rttMs: sorted[Math.floor((sorted.length - 1) * 0.5)]!,
      rttP95Ms: sorted[Math.ceil((sorted.length - 1) * 0.95)]!,
      jitterMs: jitter,
    };
  }
}

/** Client observations use only the local monotonic clock. WebSocket delivery
 * gaps are measurable; TCP packet loss is not exposed and is never invented. */
export class NetworkObservations {
  private snapshots: number[] = [];
  private pending = new Map<number, number>();
  private acknowledgements: number[] = [];
  reset() {
    this.snapshots = [];
    this.pending.clear();
    this.acknowledgements = [];
  }
  snapshot(now: number) {
    this.snapshots.push(now);
    if (this.snapshots.length > 64) this.snapshots.shift();
  }
  shot(seq: number, now: number) {
    this.pending.set(seq, now);
    if (this.pending.size > 64) this.pending.delete(this.pending.keys().next().value!);
  }
  acknowledge(seq: number, now: number) {
    let key: number | undefined;
    for (const n of this.pending.keys())
      if (n <= seq + 1 && (key === undefined || n > key)) key = n;
    if (key === undefined) return;
    const age = now - this.pending.get(key)!;
    for (const n of this.pending.keys()) if (n <= key) this.pending.delete(n);
    if (age < 0 || age > 5000) return;
    this.acknowledgements.push(age);
    if (this.acknowledgements.length > 64) this.acknowledgements.shift();
  }
  summary() {
    const percentile = (values: number[], q: number) =>
      values.length
        ? [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * q) - 1)]!
        : null;
    const duration = this.snapshots.length > 1 ? this.snapshots.at(-1)! - this.snapshots[0]! : 0;
    const gaps = this.snapshots.slice(1).map((v, i) => v - this.snapshots[i]!);
    return {
      snapshotHz: duration > 0 ? ((this.snapshots.length - 1) * 1000) / duration : 0,
      snapshotGapP95: percentile(gaps, 0.95),
      shotAckP50: percentile(this.acknowledgements, 0.5),
      shotAckP95: percentile(this.acknowledgements, 0.95),
    };
  }
}
