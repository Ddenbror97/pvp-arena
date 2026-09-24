import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { buildWalletMessage, isValidEvmAddress, normalizeAddress, shortAddress, signatureMatches } from "../src/lib/web3/message";
import { WALLET_MESSAGES, serverCodeToError, toWalletError } from "../src/lib/web3/errors";
import { guardedRequest } from "../src/lib/web3/metamask";
import { ALLOWED_WALLET_METHODS } from "../src/lib/web3/config";

const acct = privateKeyToAccount(generatePrivateKey());
const other = privateKeyToAccount(generatePrivateKey());
const fields = (address = acct.address) => ({
  address,
  nonce: "a".repeat(64),
  issuedAt: "2026-09-24T00:00:00.000Z",
  expiresAt: "2026-09-24T00:10:00.000Z",
  version: 1,
});

describe("addresses", () => {
  it("accepts valid and rejects invalid EVM addresses", () => {
    expect(isValidEvmAddress(acct.address)).toBe(true);
    expect(isValidEvmAddress(acct.address.toLowerCase())).toBe(true);
    expect(isValidEvmAddress("0x123")).toBe(false);
    expect(isValidEvmAddress("0x" + "g".repeat(40))).toBe(false);
    expect(isValidEvmAddress(null)).toBe(false);
    // Mixed case with a broken checksum is rejected.
    const bad = acct.address.slice(0, 2) + [...acct.address.slice(2)].map((c) => (/[a-f]/.test(c) ? c.toUpperCase() : /[A-F]/.test(c) ? c.toLowerCase() : c)).join("");
    if (bad !== acct.address && /[a-fA-F]/.test(bad)) expect(isValidEvmAddress(bad)).toBe(false);
  });
  it("normalises upper, lower and checksummed forms to one identity", () => {
    const a = normalizeAddress(acct.address.toLowerCase());
    const b = normalizeAddress("0x" + acct.address.slice(2).toUpperCase());
    expect(a.normalized).toBe(b.normalized);
    expect(a.checksummed).toBe(acct.address);
    expect(a.normalized).toBe(acct.address.toLowerCase());
    expect(() => normalizeAddress("nope")).toThrow();
  });
  it("shortens for display", () => {
    expect(shortAddress("0x71A4000000000000000000000000000000A92F")).toBe("0x71A4...A92F");
  });
});

describe("message", () => {
  it("is deterministic and exact", () => {
    const m = buildWalletMessage(fields());
    expect(m).toBe(buildWalletMessage(fields(acct.address.toLowerCase() as `0x${string}`)));
    expect(m).toBe(
      `PVPspinArena Wallet Verification\n\nDomain: pvpspinarena.com\nAddress: ${acct.address}\nNonce: ${"a".repeat(64)}\nIssued At: 2026-09-24T00:00:00.000Z\nExpiration: 2026-09-24T00:10:00.000Z\nPurpose: wallet_verification\nVersion: 1`,
    );
    expect(() => buildWalletMessage({ ...fields(), version: 2 })).toThrow();
  });
});

describe("signatures", () => {
  it("valid signature succeeds", async () => {
    const m = buildWalletMessage(fields());
    expect(await signatureMatches(m, await acct.signMessage({ message: m }), acct.address)).toBe(true);
  });
  it("wrong signature fails", async () => {
    const m = buildWalletMessage(fields());
    expect(await signatureMatches(m, "0x" + "1".repeat(130), acct.address)).toBe(false);
    expect(await signatureMatches(m, "0xdead", acct.address)).toBe(false);
  });
  it("modified message fails", async () => {
    const m = buildWalletMessage(fields());
    const sig = await acct.signMessage({ message: m });
    expect(await signatureMatches(m.replace("Version: 1", "Version: 2"), sig, acct.address)).toBe(false);
    expect(await signatureMatches(buildWalletMessage({ ...fields(), nonce: "b".repeat(64) }), sig, acct.address)).toBe(false);
  });
  it("modified wallet address / wrong wallet fails", async () => {
    const m = buildWalletMessage(fields());
    const sig = await acct.signMessage({ message: m });
    expect(await signatureMatches(m, sig, other.address)).toBe(false);
    const m2 = buildWalletMessage(fields(other.address));
    expect(await signatureMatches(m2, await acct.signMessage({ message: m2 }), other.address)).toBe(false);
  });
  it("a signature for an older (expired) challenge does not match a new one", async () => {
    const old = buildWalletMessage(fields());
    const sig = await acct.signMessage({ message: old });
    const fresh = buildWalletMessage({ ...fields(), issuedAt: "2026-09-24T01:00:00.000Z", expiresAt: "2026-09-24T01:10:00.000Z" });
    expect(await signatureMatches(fresh, sig, acct.address)).toBe(false);
  });
});

describe("provider safety", () => {
  it("maps provider errors to safe Portuguese messages", () => {
    expect(toWalletError({ code: 4001 }, "connect").message).toBe(WALLET_MESSAGES.CONNECT_REJECTED);
    expect(toWalletError({ code: 4001 }, "sign").message).toBe(WALLET_MESSAGES.SIGN_REJECTED);
    expect(toWalletError(new Error("RPC internal at 0xabc stack"), "connect").message).toBe(WALLET_MESSAGES.GENERIC);
    expect(WALLET_MESSAGES[serverCodeToError("EXPIRED")]).toBe("A solicitação expirou. Tente novamente.");
    expect(WALLET_MESSAGES[serverCodeToError("ALREADY_LINKED")]).toBe("Esta carteira já está vinculada a outra conta.");
    expect(WALLET_MESSAGES[serverCodeToError("INVALID_SIGNATURE")]).toBe("Não foi possível verificar a propriedade desta carteira.");
  });
  it("blocks every transaction / approval method", async () => {
    const calls: string[] = [];
    const p = { request: async ({ method }: { method: string }) => (calls.push(method), "ok") };
    for (const m of ["eth_sendTransaction", "eth_signTransaction", "eth_sign", "eth_signTypedData_v4", "wallet_switchEthereumChain", "wallet_addEthereumChain", "wallet_requestPermissions"]) {
      await expect(guardedRequest(p, m)).rejects.toThrow();
    }
    expect(calls).toEqual([]);
    expect([...ALLOWED_WALLET_METHODS].sort()).toEqual(["eth_accounts", "eth_chainId", "eth_requestAccounts", "personal_sign"]);
  });
});
