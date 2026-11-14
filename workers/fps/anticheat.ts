/**
 * The rooms' side of anti-cheat enforcement (migration 20261114030000): count the messages the
 * official client never sends, and when a match ends submit one evidence row per human player,
 * in one request, off the tick (waitUntil). Never per tick, never blocking a step or a snapshot.
 *
 * Off unless FPS_AC_EVIDENCE=1: the rows are then only logged (`fps_ac_evidence`), so the
 * evidence can be read from the logs before anything is stored.
 */
import { aimFamilies, type AimReport } from "../../src/lib/fps/anticheat/aim-watch";
import type { CanaryTally } from "../../src/lib/fps/br/canary";

/**
 * Socket closes that only a modified client causes: a message that is not one the game sends
 * (too long, not JSON, an input or action of the wrong shape). Not counted: rate limits (a
 * burst after a stall), expired sessions, outdated builds (told to reload).
 */
export type TamperReason = "oversize" | "json" | "input" | "action";

export class TamperCounts {
  private counts = new Map<string, Partial<Record<TamperReason, number>>>();
  note(sub: string, reason: TamperReason) {
    if (!sub || sub === "?") return;
    const c = this.counts.get(sub) ?? {};
    c[reason] = (c[reason] ?? 0) + 1;
    this.counts.set(sub, c);
  }
  of(sub: string) {
    const c = this.counts.get(sub);
    return {
      total: c ? Object.values(c).reduce((s, n) => s + (n ?? 0), 0) : 0,
      reasons: c ?? {},
    };
  }
  clear() {
    this.counts.clear();
  }
}

export type EvidenceRow = {
  user: string;
  match: string;
  mode: "duel" | "bomb" | "br";
  aim: 0 | 1 | 2;
  tracking: 0 | 1 | 2;
  canary?: CanaryTally;
  protocol: number;
  detail: Record<string, unknown>;
};

/** A player's row for this match, or null when there is nothing to report at all. */
export function evidenceRow(
  mode: EvidenceRow["mode"],
  match: string,
  user: string,
  report: AimReport | null,
  tamper: ReturnType<TamperCounts["of"]>,
  canary?: CanaryTally,
): EvidenceRow | null {
  const fam = report ? aimFamilies(report) : { aim: 0 as const, tracking: 0 as const };
  // Every human with any trial or shot is submitted (a clean match is evidence too: the
  // canary's record needs the trials an honest player loses as much as the ones a cheat wins).
  if (!report && !canary?.trials && !tamper.total) return null;
  return {
    user,
    match,
    mode,
    aim: fam.aim,
    tracking: fam.tracking,
    ...(canary ? { canary } : {}),
    protocol: tamper.total,
    detail: {
      ...(report
        ? {
            shots: report.shots,
            hits: report.hits,
            heads: report.heads,
            flick: report.flick,
            reaction: report.reaction,
            headShare: report.headShare,
            tracking: report.tracking,
            smoothing: report.smoothing,
            trigger: report.trigger,
          }
        : {}),
      ...(tamper.total ? { protocol: tamper.reasons } : {}),
    },
  };
}

type Env = { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; FPS_AC_EVIDENCE?: string };

/** Submit a finished match's rows (one request). Never throws: anti-cheat must not break a room. */
export async function submitEvidence(env: Env, rows: EvidenceRow[]) {
  if (!rows.length) return;
  for (const r of rows)
    if (r.aim || r.tracking || r.protocol || (r.canary?.decisive ?? 0) > 0)
      console.log(JSON.stringify({ event: "fps_ac_evidence", ...r }));
  if (env.FPS_AC_EVIDENCE !== "1") return;
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/fps_ac_submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ p_rows: rows }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      console.log(JSON.stringify({ event: "fps_ac_submit_failed", status: response.status }));
  } catch (error) {
    console.log(
      JSON.stringify({ event: "fps_ac_submit_failed", error: String(error).slice(0, 200) }),
    );
  }
}
