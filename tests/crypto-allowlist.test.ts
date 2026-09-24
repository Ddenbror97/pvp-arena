import { describe, expect, it } from "vitest";
import { TESTNET, centsToWei, checkRpcUrl, checkStaticConfig, usdcUnitsToCents, weiToCents } from "@/lib/crypto/allowlist";

const good = { environment: "testnet", mainnetEnabled: false, chainId: 84532, usdc: TESTNET.usdc, feed: TESTNET.ethUsdFeed };

describe("no-mainnet guards", () => {
  it("accepts the Base Sepolia config", () => expect(checkStaticConfig(good).ok).toBe(true));
  it("rejects mainnet chain 8453", () => expect(checkStaticConfig({ ...good, chainId: 8453 })).toEqual({ ok: false, reason: "MAINNET_CHAIN" }));
  it("rejects mainnet USDC", () =>
    expect(checkStaticConfig({ ...good, usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" })).toEqual({ ok: false, reason: "MAINNET_USDC" }));
  it("rejects MAINNET_ENABLED flip", () => expect(checkStaticConfig({ ...good, mainnetEnabled: true }).ok).toBe(false));
  it("rejects non-testnet environment", () => expect(checkStaticConfig({ ...good, environment: "mainnet" }).ok).toBe(false));
  it("rejects wrong feed", () => expect(checkStaticConfig({ ...good, feed: "0x" + "1".repeat(40) }).ok).toBe(false));
  it("rejects mainnet RPC hosts", () => {
    expect(checkRpcUrl("https://mainnet.base.org").ok).toBe(false);
    expect(checkRpcUrl("https://base-mainnet.g.alchemy.com/v2/x").ok).toBe(false);
    expect(checkRpcUrl("http://sepolia.base.org").ok).toBe(false);
    expect(checkRpcUrl("https://sepolia.base.org").ok).toBe(true);
  });
});

describe("valuation math", () => {
  it("rounds USDC down to cents", () => expect(usdcUnitsToCents(1_239_999n)).toBe(123n));
  it("round-trips ETH quotes without overpaying", () => {
    const price = 2_688_015_886n; // $2688.015886
    const wei = centsToWei(10_000n, price);
    expect(weiToCents(wei, price) <= 10_000n).toBe(true);
    expect(weiToCents(wei + 10n ** 12n, price) >= 9_999n).toBe(true);
  });
});
