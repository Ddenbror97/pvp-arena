/**
 * MetaMask and Coinbase Wallet are both offered (owner, 2026-11-11: "remember coinbase also").
 * Each button must open its own extension, also when both are installed.
 */
import { describe, expect, it } from "vitest";
import {
  discoverInjectedWallet,
  discoverInstalledWallets,
  type Eip1193,
} from "../src/lib/web3/metamask";

const provider = (flags: Partial<Eip1193>) =>
  ({ request: async () => null, on: () => {}, removeListener: () => {}, ...flags }) as Eip1193;
const metamask = provider({ isMetaMask: true });
// Coinbase Wallet also sets isMetaMask on some builds.
const coinbase = provider({ isMetaMask: true, isCoinbaseWallet: true });

function host(ethereum: Eip1193 | undefined, announced: Array<{ rdns?: string; p: Eip1193 }> = []) {
  const target = new EventTarget();
  target.addEventListener("eip6963:requestProvider", () => {
    for (const a of announced)
      target.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: { info: a.rdns ? { rdns: a.rdns } : undefined, provider: a.p },
        }),
      );
  });
  return Object.assign(target, { ethereum }) as unknown as Parameters<
    typeof discoverInjectedWallet
  >[0];
}

describe("wallet kinds", () => {
  it("tells the two apart by their own flags", async () => {
    expect(await discoverInjectedWallet(host(metamask), "metamask", 5)).toBe(metamask);
    expect(await discoverInjectedWallet(host(metamask), "coinbase", 5)).toBeNull();
    expect(await discoverInjectedWallet(host(coinbase), "coinbase", 5)).toBe(coinbase);
    // Coinbase passing as MetaMask is not MetaMask.
    expect(await discoverInjectedWallet(host(coinbase), "metamask", 5)).toBeNull();
  });

  it("finds each when both are installed", async () => {
    const both = provider({ providers: [coinbase, metamask] });
    expect(await discoverInjectedWallet(host(both), "metamask", 5)).toBe(metamask);
    expect(await discoverInjectedWallet(host(both), "coinbase", 5)).toBe(coinbase);
    expect(await discoverInstalledWallets(host(both), 5)).toEqual(
      new Set(["metamask", "coinbase"]),
    );
  });

  it("finds an announced wallet (EIP-6963) by its identifier, not its flags", async () => {
    const announced = [
      { rdns: "com.coinbase.wallet", p: coinbase },
      { rdns: "io.metamask", p: metamask },
    ];
    expect(await discoverInjectedWallet(host(undefined, announced), "metamask", 50)).toBe(metamask);
    expect(await discoverInjectedWallet(host(undefined, announced), "coinbase", 50)).toBe(coinbase);
    // Another wallet claiming MetaMask's flag under its own identifier is neither.
    const other = [{ rdns: "com.example.wallet", p: metamask }];
    expect(await discoverInjectedWallet(host(undefined, other), "metamask", 5)).toBeNull();
  });
});
