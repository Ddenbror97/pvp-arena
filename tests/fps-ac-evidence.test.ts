import { afterEach, describe, expect, it, vi } from "vitest";
import { evidenceRow, submitEvidence, TamperCounts } from "../workers/fps/anticheat";
import type { AimReport } from "@/lib/fps/anticheat/aim-watch";

const report = (
  levels: Partial<
    Record<"flick" | "reaction" | "heads" | "smoothing" | "trigger" | "tracking", 0 | 1 | 2>
  >,
): AimReport => ({
  id: "u",
  shots: 100,
  hits: 40,
  heads: 10,
  flick: { shots: 10, hits: 5, lower: 0.2, level: levels.flick ?? 0 },
  reaction: { seen: 10, fast: 0, share: 0, level: levels.reaction ?? 0 },
  headShare: { lower: 0.1, level: levels.heads ?? 0 },
  tracking: { samples: 100, r: 0, z: 0, level: levels.tracking ?? 0 },
  smoothing: { acquisitions: 20, smooth: 0, lower: 0, level: levels.smoothing ?? 0 },
  trigger: { shots: 20, onset: 0, lower: 0, level: levels.trigger ?? 0 },
  recoil: { sprays: 10, perfect: 0, lower: 0, level: levels.recoil ?? 0 },
  silent: { shots: 10, back: 0, lower: 0, level: 0 },
  score: 0,
  review: false,
});
afterEach(() => vi.unstubAllGlobals());

describe("FPS anti-cheat evidence rows", () => {
  it("counts the aim signs as one family, a head share alone at most suspicious", () => {
    const none = new TamperCounts().of("u");
    expect(evidenceRow("duel", "m", "u", report({ heads: 2 }), none)!.aim).toBe(1);
    expect(evidenceRow("duel", "m", "u", report({ smoothing: 2 }), none)!.aim).toBe(1);
    expect(evidenceRow("duel", "m", "u", report({ smoothing: 2, trigger: 1 }), none)!.aim).toBe(2);
    expect(
      evidenceRow(
        "duel",
        "m",
        "u",
        report({ flick: 2, reaction: 2, smoothing: 2, trigger: 2, heads: 2 }),
        none,
      )!.aim,
    ).toBe(2);
    expect(evidenceRow("duel", "m", "u", report({ tracking: 2 }), none)!.tracking).toBe(2);
  });
  it("counts only the closes a modified client causes, per user", () => {
    const t = new TamperCounts();
    t.note("a", "json");
    t.note("a", "input");
    t.note("b", "oversize");
    t.note("?", "input");
    expect(t.of("a")).toEqual({ total: 2, reasons: { json: 1, input: 1 } });
    expect(t.of("b").total).toBe(1);
    expect(t.of("c").total).toBe(0);
    const row = evidenceRow("bomb", "m", "a", null, t.of("a"))!;
    expect(row.protocol).toBe(2);
    expect(row.detail).toEqual({ protocol: { json: 1, input: 1 } });
    // Nothing at all to say: no row.
    expect(evidenceRow("bomb", "m", "c", null, t.of("c"))).toBeNull();
    // A clean canary record is still evidence (honest losses count as much as wins).
    expect(
      evidenceRow("br", "m", "c", null, t.of("c"), { trials: 3, decisive: 1, won: 0 }),
    ).not.toBeNull();
  });
  it("submits once per match only when FPS_AC_EVIDENCE=1, and never throws", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const env = { SUPABASE_URL: "https://staging.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-only" };
    const rows = [evidenceRow("duel", "m", "u", report({ flick: 1 }), new TamperCounts().of("u"))!];
    vi.spyOn(console, "log").mockImplementation(() => {});
    await submitEvidence(env, rows);
    expect(fetch).not.toHaveBeenCalled();
    await submitEvidence({ ...env, FPS_AC_EVIDENCE: "1" }, rows);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toMatch(/rpc\/fps_ac_submit$/);
    expect(JSON.parse(fetch.mock.calls[0][1].body).p_rows).toHaveLength(1);
    fetch.mockRejectedValueOnce(new Error("down"));
    await expect(submitEvidence({ ...env, FPS_AC_EVIDENCE: "1" }, rows)).resolves.toBeUndefined();
  });
});
