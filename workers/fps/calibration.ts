import type { EvidenceRow } from "./anticheat";

export type CalibrationRow = EvidenceRow & {
  segment: string;
  sequence: number;
  reason: "kill" | "periodic" | "leave" | "completed";
};
type Env = { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; FPS_AC_EVIDENCE?: string };

/** Cumulative human-only samples, separate from match-based enforcement votes. */
export class LiveCalibration {
  private players = new Map<string, { segment: string; sequence: number; kills: number }>();
  private pending = new Map<string, CalibrationRow>();
  private last = 0;
  private urgent = false;
  private sending = false;

  kill(user: string) {
    this.player(user).kills++;
    this.urgent = true;
  }
  private player(user: string) {
    let p = this.players.get(user);
    if (!p) {
      p = { segment: crypto.randomUUID(), sequence: 0, kills: 0 };
      this.players.set(user, p);
    }
    return p;
  }
  get reason(): "kill" | "periodic" {
    return this.urgent ? "kill" : "periodic";
  }
  due(now: number) {
    return now - this.last >= (this.urgent || this.pending.size ? 5000 : 30000);
  }
  capture(rows: EvidenceRow[], reason: CalibrationRow["reason"], now: number) {
    this.last = now;
    this.urgent = false;
    for (const row of rows) {
      const p = this.player(row.user);
      const sample = {
        ...row,
        ...(row.canary ? { canary: { ...row.canary } } : {}),
        segment: p.segment,
        sequence: ++p.sequence,
        reason,
        detail: { ...row.detail, kills: p.kills },
      };
      this.pending.set(p.segment, sample);
    }
  }
  /** A bot taking over starts no sample; a returning human gets a new segment. */
  forget(user: string) {
    this.players.delete(user);
  }
  finish() {
    this.players.clear();
    this.last = 0;
    this.urgent = false;
  }
  async flush(env: Env) {
    if (env.FPS_AC_EVIDENCE !== "1" || this.sending || !this.pending.size) return;
    this.sending = true;
    try {
      // Drain a newer leave/final sample captured while the previous request was in flight.
      for (let attempt = 0; this.pending.size && attempt < 4; attempt++) {
        const rows = [...this.pending.values()].slice(0, 120);
        const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/fps_ac_checkpoint`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ p_rows: rows }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        for (const row of rows)
          if (this.pending.get(row.segment)?.sequence === row.sequence)
            this.pending.delete(row.segment);
      }
    } catch (error) {
      // Retain the latest sample for the next bounded retry, without pausing gameplay.
      console.log(
        JSON.stringify({ event: "fps_ac_checkpoint_failed", error: String(error).slice(0, 160) }),
      );
    } finally {
      this.sending = false;
    }
  }
}
