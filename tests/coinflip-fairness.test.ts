import { describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { coinflipMessage, coinflipOutcome, verifyCoinflip } from "../src/lib/fairness/coinflip";
import { hexToBytes, sha256Hex } from "../src/lib/fairness/core";
import VECTORS from "../src/lib/fairness/coinflip-v1-vectors.json";

// Published fixed vectors for PVPCasino Coinflip v1. The Postgres implementation is
// checked against the same file in tests/db/coinflip.integration.test.ts. Neither calls the other.

describe("coinflip v1 published test vectors (Web Crypto verifier)", () => {
  it("has at least 32 vectors covering both sides", () => {
    expect(VECTORS.length).toBeGreaterThanOrEqual(32);
    expect(VECTORS.some((v) => v.side === "HEADS")).toBe(true);
    expect(VECTORS.some((v) => v.side === "TAILS")).toBe(true);
  });
  for (const v of VECTORS) {
    it(`game ${v.game_id} seed ${v.server_seed.slice(0, 8)} -> ${v.side}`, async () => {
      expect(v.protocol_version).toBe("v1");
      expect(await sha256Hex(hexToBytes(v.server_seed))).toBe(v.server_seed_hash);
      const o = await coinflipOutcome(v.server_seed, v.game_id, v.draw_version);
      expect(o.hmacHex).toBe(v.hmac);
      expect(o.firstByte).toBe(v.first_byte);
      expect(o.side).toBe(v.side);
    });
  }
});

describe("coinflip v1 protocol details", () => {
  it("message format is fixed and handles ids beyond 2^53 exactly", () => {
    expect(coinflipMessage(1, 1)).toBe("PVPCasino:coinflip:v1:1:1");
    expect(coinflipMessage("9007199254740993", 1)).toBe("PVPCasino:coinflip:v1:9007199254740993:1");
  });
  it("is domain-separated from the jackpot protocol", async () => {
    const seed = "ab".repeat(32);
    const jp = createHmac("sha256", Buffer.from(seed, "hex")).update("PVPCasino:jackpot:v1:5:1:0").digest("hex");
    expect((await coinflipOutcome(seed, 5, 1)).hmacHex).not.toBe(jp);
  });
  it("matches Node's crypto for random seeds (HMAC key/data order, UTF-8, first-byte bit)", async () => {
    for (let i = 0; i < 300; i++) {
      const seed = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
      const h = createHmac("sha256", Buffer.from(seed, "hex")).update(`PVPCasino:coinflip:v1:${i}:1`, "utf8").digest();
      const o = await coinflipOutcome(seed, i, 1);
      expect(o.hmacHex).toBe(h.toString("hex"));
      expect(o.side).toBe((h[0]! & 1) === 0 ? "HEADS" : "TAILS");
    }
  });
  it("is close to 50/50 over many games (binomial 4-sigma bound)", async () => {
    let heads = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if ((await coinflipOutcome("11".repeat(32), i, 1)).side === "HEADS") heads++;
    expect(Math.abs(heads - n / 2)).toBeLessThan(4 * Math.sqrt(n / 4));
  });
  it("rejects seeds that are not 32 bytes", async () => {
    await expect(coinflipOutcome("00", 1, 1)).rejects.toThrow();
  });
  it("verifyCoinflip accepts a correct record and rejects tampering", async () => {
    const v = VECTORS[0]!;
    const good = { id: v.game_id, draw_version: 1, server_seed_hash: v.server_seed_hash, server_seed: v.server_seed, winning_side: v.side as "HEADS" | "TAILS" };
    expect((await verifyCoinflip(good)).ok).toBe(true);
    expect((await verifyCoinflip({ ...good, winning_side: v.side === "HEADS" ? "TAILS" : "HEADS" })).ok).toBe(false);
    expect((await verifyCoinflip({ ...good, server_seed_hash: createHash("sha256").update("x").digest("hex") })).ok).toBe(false);
    expect((await verifyCoinflip({ ...good, server_seed: null })).ok).toBe(false);
  });
});
