import { describe, expect, it } from "vitest";
import { BASE_MAINNET, centsToWei, checkMainnetRegistry, checkRpcUrl, usdcUnitsToCents, weiToCents } from "@/lib/crypto/allowlist";

const good = { chainId: 8453, networkMode: "mainnet", usdc: BASE_MAINNET.usdc, usdcDecimals: 6, feed: BASE_MAINNET.ethUsdFeed };

describe("mainnet-only guards", () => {
  it("accepts the Base Mainnet registry", () => expect(checkMainnetRegistry(good).ok).toBe(true));
  it("rejects testnet mode", () => expect(checkMainnetRegistry({ ...good, networkMode: "testnet" }).ok).toBe(false));
  it("rejects Base Sepolia chain", () => expect(checkMainnetRegistry({ ...good, chainId: 84532 }).ok).toBe(false));
  it("rejects wrong USDC", () => expect(checkMainnetRegistry({ ...good, usdc: "0x036cbd53842c5426634e7929541ec2318f3dcf7e" }).ok).toBe(false));
  it("rejects wrong feed", () => expect(checkMainnetRegistry({ ...good, feed: "0x" + "1".repeat(40) }).ok).toBe(false));
  it("rejects testnet and non-HTTPS RPCs", () => {
    expect(checkRpcUrl("https://sepolia.base.org").ok).toBe(false);
    expect(checkRpcUrl("http://mainnet.base.org").ok).toBe(false);
    expect(checkRpcUrl("https://mainnet.base.org").ok).toBe(true);
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
