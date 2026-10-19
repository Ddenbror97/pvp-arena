import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BASE_DEPOSIT_TREASURY, DEPOSIT_FEE_ALLOWANCE_CENTS } from "../src/lib/crypto/allowlist";
import { buildDepositTransaction, publishedDepositAddress } from "../src/lib/crypto/deposit";

const TREASURY = "0x9EAff85db9A2559eC958740A6a3b523751237987";
const PAYOUT = "0xd29370ca973E85B7EC7E52c0cff267B0FB63dA24";
const PERSONAL = "0xd990b82e2da31461b046e79debc4abced05909e7";
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

describe("published Base deposit address", () => {
  it("publishes only the PVPspinArena treasury", () => {
    expect(BASE_DEPOSIT_TREASURY).toBe(TREASURY);
    expect(publishedDepositAddress(8453, TREASURY.toLowerCase())).toEqual({
      ok: true,
      address: TREASURY,
    });
    expect(publishedDepositAddress(8453, TREASURY)).toEqual({ ok: true, address: TREASURY });
  });

  it("refuses a personal deposit address, the payout wallet, or another chain", () => {
    expect(publishedDepositAddress(8453, PERSONAL).ok).toBe(false);
    expect(publishedDepositAddress(8453, PAYOUT).ok).toBe(false);
    expect(publishedDepositAddress(8453, null)).toEqual({ ok: false, reason: "TREASURY_MISSING" });
    expect(publishedDepositAddress(1, TREASURY)).toEqual({
      ok: false,
      reason: "CHAIN_NOT_VERIFIED",
    });
  });

  it("builds an ETH or USDC transfer only to the address in the server instruction", () => {
    expect(
      buildDepositTransaction({
        asset: "ETH",
        chainId: 8453,
        treasury: TREASURY,
        token: null,
        units: "1000",
      }),
    ).toEqual({ to: TREASURY, value: "0x3e8" });
    const usdc = buildDepositTransaction({
      asset: "USDC",
      chainId: 8453,
      treasury: TREASURY,
      token: USDC,
      units: "2000000",
    });
    expect(usdc.to).toBe(USDC);
    expect(usdc.value).toBe("0x0");
    expect(usdc.data?.toLowerCase()).toContain(TREASURY.slice(2).toLowerCase());
    expect(usdc.data?.toLowerCase()).not.toContain(PAYOUT.slice(2).toLowerCase());
  });

  it("sends Base deposits from a linked wallet and does not publish a copy address", () => {
    const server = readFileSync("src/lib/crypto/crypto.functions.ts", "utf8");
    const panel = readFileSync("src/components/wallet/CryptoRails.tsx", "utf8");
    const watcher = readFileSync("src/lib/crypto/chain.server.ts", "utf8");
    expect(server).toContain("publishedDepositAddress");
    expect(server).toContain("Link the wallet you will send from.");
    expect(server).toContain("Cash out to the wallet you linked.");
    expect(server).not.toContain("allocateDepositAddress");
    expect(server).not.toContain("getDepositAddress");
    expect(panel).toContain("Connect MetaMask");
    expect(panel).toContain("To your linked wallet");
    expect(panel).not.toContain("any wallet or exchange");
    expect(panel).not.toContain("do not need to connect that wallet");
    expect(watcher).toContain("depositAddresses: new Set()");
    expect(watcher).not.toContain("crypto_deposit_addresses");
  });

  it("keeps the historical credit rule and does not add a migration that deletes deposits", () => {
    const sql = readFileSync(
      "supabase/migrations/20261019033000_retire_personal_deposit_addresses.sql",
      "utf8",
    );
    expect(DEPOSIT_FEE_ALLOWANCE_CENTS).toBe(5);
    expect(sql).toContain("if cents + 5 < net.min_deposit_cents then");
    expect(sql).toContain("delete from public.crypto_deposit_addresses");
    expect(sql).not.toContain("delete from public.crypto_deposits");
    expect(sql).not.toContain(PERSONAL);
  });
});
