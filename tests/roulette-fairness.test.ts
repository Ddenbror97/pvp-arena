import { describe, expect, it } from "vitest";
import { rouletteMessage, rouletteSlot, verifyRoulette } from "../src/lib/fairness/roulette";

describe("roulette fairness verifier", () => {
  it("uses the canonical message", () => {
    expect(rouletteMessage(12, 1, 0)).toBe("PVPCasino:roulette:v1:12:1:0");
  });
  it("rejection limit for 15 slots is 2^64 - 1 (only the top value is rejected)", () => {
    const two64 = 1n << 64n;
    expect(two64 - (two64 / 15n) * 15n).toBe(1n);
  });
  it("is deterministic and in range", async () => {
    const seed = "11".repeat(32);
    const a = await rouletteSlot(seed, 5, 1, 15);
    expect(a).toEqual(await rouletteSlot(seed, 5, 1, 15));
    expect(a.slot).toBeGreaterThanOrEqual(0);
    expect(a.slot).toBeLessThan(15);
  });
  it("detects a wrong commitment", async () => {
    const r = await verifyRoulette({ id: 1, server_seed: "22".repeat(32), server_seed_hash: "00".repeat(32), draw_version: 1, layout: Array(15).fill("RED") });
    expect(r.hashOk).toBe(false);
  });
});
