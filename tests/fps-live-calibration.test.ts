import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveCalibration, type CalibrationRow } from "../workers/fps/calibration";
import type { EvidenceRow } from "../workers/fps/anticheat";
import { AimWatch, type WatchPlayer } from "../src/lib/fps/anticheat/aim-watch";

const env = {
  SUPABASE_URL: "https://db.test",
  SUPABASE_SERVICE_ROLE_KEY: "test-only",
  FPS_AC_EVIDENCE: "1",
};
const row = (shots: number): EvidenceRow => ({
  user: "human",
  match: "match",
  mode: "bomb",
  aim: 0,
  tracking: 0,
  protocol: 0,
  detail: { shots, hits: 0, heads: 0 },
});
afterEach(() => vi.unstubAllGlobals());

describe("live human calibration checkpoints", () => {
  it("coalesces rapid kills and retries cumulative samples without adding shots", async () => {
    const calls: CalibrationRow[][] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        calls.push(JSON.parse(init.body).p_rows);
        return new Response(null, { status: calls.length === 1 ? 503 : 200 });
      }),
    );
    const c = new LiveCalibration();
    c.kill("human");
    c.kill("human");
    c.capture([row(8)], c.reason, 30000);
    expect(c.due(34999)).toBe(false);
    await c.flush(env);
    expect(c.due(35000)).toBe(true);
    await c.flush(env);
    expect(calls[1]).toEqual(calls[0]);
    expect(calls[1]![0]!.detail.kills).toBe(2);
    expect(calls[1]![0]!.reason).toBe("kill");
    await c.flush(env);
    expect(calls).toHaveLength(2);
  });

  it("drains a leave captured while a request is in flight, with a newer sequence", async () => {
    const calls: CalibrationRow[][] = [];
    let finish!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init) => {
        calls.push(JSON.parse(init.body).p_rows);
        return calls.length === 1
          ? new Promise<Response>((resolve) => {
              finish = resolve;
            })
          : Promise.resolve(new Response());
      }),
    );
    const c = new LiveCalibration();
    c.capture([row(2)], "periodic", 30000);
    const saving = c.flush(env);
    c.capture([row(5)], "leave", 30100);
    await c.flush(env); // No concurrent request.
    finish(new Response());
    await saving;
    expect(calls).toHaveLength(2);
    expect(calls[1]![0]!.detail.shots).toBe(5);
    expect(calls[1]![0]!.segment).toBe(calls[0]![0]!.segment);
    expect(calls[1]![0]!.sequence).toBeGreaterThan(calls[0]![0]!.sequence);
  });

  it("keeps the departed human's pending sample separate from a return after bot takeover", async () => {
    const calls: CalibrationRow[][] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        calls.push(JSON.parse(init.body).p_rows);
        return new Response();
      }),
    );
    const c = new LiveCalibration();
    c.kill("human");
    c.capture([row(10)], "leave", 30000);
    c.forget("human");
    c.capture([row(3)], "periodic", 60000);
    await c.flush(env);
    expect(calls[0]).toHaveLength(2);
    expect(new Set(calls[0]!.map((r) => r.segment)).size).toBe(2);
    expect(calls[0]!.map((r) => r.detail.kills)).toEqual([1, 0]);
    expect(calls[0]!.every((r) => r.user === "human")).toBe(true);
  });

  it("does not send calibration when evidence collection is disabled", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const c = new LiveCalibration();
    c.capture([row(2)], "periodic", 30000);
    await c.flush({ ...env, FPS_AC_EVIDENCE: "0" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("live reads do not split a spray or change its final result", () => {
    const baseline = new AimWatch(),
      sampled = new AimWatch();
    const me: WatchPlayer = {
      id: "human",
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      pitch: 0,
      alive: true,
      recoilPitch: 0,
    };
    const enemy: WatchPlayer = { ...me, id: "enemy", z: -20 };
    for (let i = 0; i < 18; i++) {
      me.recoilPitch = i * 0.012;
      for (const watch of [baseline, sampled]) {
        watch.observe(i * 100, [me], [me, enemy], () => true);
        watch.shot(me.id, i * 100);
      }
      sampled.report(me.id, false);
    }
    expect(sampled.report(me.id)).toEqual(baseline.report(me.id));
    expect(sampled.report(me.id)!.recoil.sprays).toBe(1);
  });
});
