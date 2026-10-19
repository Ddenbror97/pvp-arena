import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BASE_DEPOSIT_TREASURY, DEPOSIT_FEE_ALLOWANCE_CENTS } from "../src/lib/crypto/allowlist";
import { publishedDepositAddress } from "../src/lib/crypto/deposit";
import { SWEEP_TREASURY } from "../src/lib/crypto/deposit-sweep";

const TREASURY = "0x9EAff85db9A2559eC958740A6a3b523751237987";
const PERSONAL = "0xd990b82e2da31461b046e79debc4abced05909e7";

describe("published Base deposit address", () => {
  it("publishes only the PVPspinArena wallet", () => {
    expect(BASE_DEPOSIT_TREASURY).toBe(TREASURY);
    expect(SWEEP_TREASURY).toBe(TREASURY);
    expect(publishedDepositAddress(8453, TREASURY.toLowerCase())).toEqual({
      ok: true,
      address: TREASURY,
    });
    expect(publishedDepositAddress(8453, TREASURY)).toEqual({ ok: true, address: TREASURY });
  });

  it("refuses a personal deposit address, another treasury, or another chain", () => {
    expect(publishedDepositAddress(8453, PERSONAL).ok).toBe(false);
    expect(publishedDepositAddress(8453, "0xd29370ca973e85b7ec7e52c0cff267b0fb63da24").ok).toBe(
      false,
    );
    expect(publishedDepositAddress(8453, null)).toEqual({ ok: false, reason: "TREASURY_MISSING" });
    expect(publishedDepositAddress(1, TREASURY)).toEqual({
      ok: false,
      reason: "CHAIN_NOT_VERIFIED",
    });
  });

  it("does not allocate or display a personal deposit address", () => {
    const server = readFileSync("src/lib/crypto/crypto.functions.ts", "utf8");
    const panel = readFileSync("src/components/wallet/CryptoRails.tsx", "utf8");
    expect(server).not.toContain("allocateDepositAddress");
    expect(server).toContain("publishedDepositAddress");
    expect(panel).not.toContain("Previous address");
    expect(panel).toContain("PVPspinArena's wallet");
    expect(panel).toContain("wallet linked on your account");
    expect(panel).toContain("few cents short");
    expect(panel).not.toContain("still monitored");
  });

  it("retires personal deposit addresses and accepts a five-cent fee shortfall", () => {
    const sql = readFileSync(
      "supabase/migrations/20261019033000_retire_personal_deposit_addresses.sql",
      "utf8",
    );
    expect(DEPOSIT_FEE_ALLOWANCE_CENTS).toBe(5);
    expect(sql).toContain("if cents + 5 < net.min_deposit_cents then");
    expect(sql).toContain("min_deposit_units = 1950000");
    expect(sql).toContain("delete from public.crypto_deposit_addresses");
    expect(sql).not.toContain("if cents < net.min_deposit_cents then");
  });
});
