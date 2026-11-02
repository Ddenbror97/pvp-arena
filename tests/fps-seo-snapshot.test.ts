import { describe, it, expect } from "vitest";
import { parseFpsSeoSnapshot, fpsSeoCacheKey } from "@/lib/fps/seo-snapshot";
const sample = () => ({
  generatedAt: "2026-10-31T12:00:00Z",
  windowDays: 30,
  sampleLimit: 100,
  matches: 1,
  potCents: "200",
  config: {
    enabled: true,
    cashEnabled: true,
    practiceAllowed: true,
    feeBps: 500,
    stakes: [100, 2500],
  },
  recent: [
    {
      stake: 100,
      bestOf: 5,
      scoreA: 3,
      scoreB: 1,
      payout: 190,
      fee: 10,
      completedAt: "2026-10-31T11:00:00Z",
    },
  ],
});
describe("public FPS data boundary", () => {
  it("isolates production and staging cache keys without credentials", () => {
    const prod = fpsSeoCacheKey("https://production.supabase.co");
    const stage = fpsSeoCacheKey("https://staging.supabase.co");
    expect(prod).not.toBe(stage);
    expect(fpsSeoCacheKey("https://user:secret@production.supabase.co")).toBe(prod);
    expect(prod).not.toContain("secret");
  });
  it("accepts completed BO13 series and rejects premature 6-win results", () => {
    const raw = sample();
    Object.assign(raw.recent[0]!, { bestOf: 13, scoreA: 7, scoreB: 6 });
    expect(parseFpsSeoSnapshot(raw)?.recent[0]?.scoreA).toBe(7);
    raw.recent[0]!.scoreA = 6;
    raw.recent[0]!.scoreB = 5;
    expect(parseFpsSeoSnapshot(raw)).toBeNull();
  });
  it("copies only public primitive fields, dropping identifiers and RPC extras", () => {
    const raw = {
      ...sample(),
      playerEmail: "private@example.invalid",
      recent: [{ ...sample().recent[0], creator_id: "private", invite: "secret" }],
    };
    const parsed = parseFpsSeoSnapshot(raw);
    expect(parsed?.recent[0].payout).toBe(190);
    expect(JSON.stringify(parsed)).not.toMatch(/private|invite|playerEmail/);
  });
  it("rejects contradictory fees, incomplete scores, or malformed amounts", () => {
    for (const change of [
      { payout: 200 },
      { fee: 11 },
      { scoreA: 2 },
      { stake: 0 },
      { bestOf: 7 },
      { completedAt: "invalid" },
    ]) {
      const raw = sample();
      Object.assign(raw.recent[0], change);
      expect(parseFpsSeoSnapshot(raw)).toBeNull();
    }
  });
  it("keeps an honest empty result and rejects a fake count", () => {
    const empty = { ...sample(), matches: 0, potCents: "0", recent: [] };
    expect(parseFpsSeoSnapshot(empty)?.matches).toBe(0);
    expect(parseFpsSeoSnapshot({ ...empty, matches: 5 })).toBeNull();
  });
  it("rejects a changed fee configuration rather than publishing stale arithmetic", () => {
    const raw = sample();
    raw.config.feeBps = 1000;
    expect(parseFpsSeoSnapshot(raw)).toBeNull();
  });
});
