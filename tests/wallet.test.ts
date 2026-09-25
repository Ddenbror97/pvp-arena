import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  buildWalletMessage,
  isValidEvmAddress,
  normalizeAddress,
  shortAddress,
  signatureMatches,
} from "../src/lib/web3/message";
import { WALLET_MESSAGES, serverCodeToError, toWalletError } from "../src/lib/web3/errors";
import {
  discoverInjectedMetaMask,
  connectInjectedProvider,
  guardedRequest,
  resetInjectedProviderConnection,
  sessionFor,
  type Eip1193,
} from "../src/lib/web3/metamask";
import { buildDepositTransaction } from "../src/lib/crypto/deposit";
import { TESTNET } from "../src/lib/crypto/allowlist";
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
    const bad =
      acct.address.slice(0, 2) +
      [...acct.address.slice(2)]
        .map((c) => (/[a-f]/.test(c) ? c.toUpperCase() : /[A-F]/.test(c) ? c.toLowerCase() : c))
        .join("");
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
    expect(await signatureMatches(m, await acct.signMessage({ message: m }), acct.address)).toBe(
      true,
    );
  });
  it("wrong signature fails", async () => {
    const m = buildWalletMessage(fields());
    expect(await signatureMatches(m, "0x" + "1".repeat(130), acct.address)).toBe(false);
    expect(await signatureMatches(m, "0xdead", acct.address)).toBe(false);
  });
  it("modified message fails", async () => {
    const m = buildWalletMessage(fields());
    const sig = await acct.signMessage({ message: m });
    expect(await signatureMatches(m.replace("Version: 1", "Version: 2"), sig, acct.address)).toBe(
      false,
    );
    expect(
      await signatureMatches(
        buildWalletMessage({ ...fields(), nonce: "b".repeat(64) }),
        sig,
        acct.address,
      ),
    ).toBe(false);
  });
  it("modified wallet address / wrong wallet fails", async () => {
    const m = buildWalletMessage(fields());
    const sig = await acct.signMessage({ message: m });
    expect(await signatureMatches(m, sig, other.address)).toBe(false);
    const m2 = buildWalletMessage(fields(other.address));
    expect(await signatureMatches(m2, await acct.signMessage({ message: m2 }), other.address)).toBe(
      false,
    );
  });
  it("a signature for an older (expired) challenge does not match a new one", async () => {
    const old = buildWalletMessage(fields());
    const sig = await acct.signMessage({ message: old });
    const fresh = buildWalletMessage({
      ...fields(),
      issuedAt: "2026-09-24T01:00:00.000Z",
      expiresAt: "2026-09-24T01:10:00.000Z",
    });
    expect(await signatureMatches(fresh, sig, acct.address)).toBe(false);
  });
});

describe("provider safety", () => {
  it("maps provider errors to safe English messages", () => {
    expect(toWalletError({ code: 4001 }, "connect").message).toBe(WALLET_MESSAGES.CONNECT_REJECTED);
    expect(toWalletError({ code: 4001 }, "sign").message).toBe(WALLET_MESSAGES.SIGN_REJECTED);
    expect(toWalletError(new Error("RPC internal at 0xabc stack"), "connect").message).toBe(
      WALLET_MESSAGES.GENERIC,
    );
    expect(WALLET_MESSAGES[serverCodeToError("EXPIRED")]).toBe(
      "The request expired. Please try again.",
    );
    expect(WALLET_MESSAGES[serverCodeToError("ALREADY_LINKED")]).toBe(
      "This wallet is already linked to another account.",
    );
    expect(WALLET_MESSAGES[serverCodeToError("INVALID_SIGNATURE")]).toBe(
      "Could not verify ownership of this wallet.",
    );
    // Provider shapes seen from the MetaMask Connect SDK / extension.
    expect(toWalletError({ data: { code: 4001 }, message: "Rejected" }, "connect").code).toBe(
      "CONNECT_REJECTED",
    );
    expect(toWalletError(new Error("MetaMask not detected"), "connect").code).toBe("UNAVAILABLE");
    expect(toWalletError(new Error("Unrecognized chain 0x1"), "connect").code).toBe(
      "UNSUPPORTED_NETWORK",
    );
    expect(toWalletError(new Error("Request timed out"), "connect").code).toBe("TIMEOUT");
    expect(toWalletError({ code: -32002 }, "connect").code).toBe("CONNECT_PENDING");
    expect(toWalletError(new Error("Wallet is locked"), "connect").code).toBe("WALLET_LOCKED");
  });
  it("uses an installed MetaMask provider immediately", async () => {
    const provider: Eip1193 = { isMetaMask: true, request: async () => [] };
    const target = new EventTarget() as EventTarget & { ethereum?: Eip1193 };
    target.ethereum = provider;
    await expect(discoverInjectedMetaMask(target, 1)).resolves.toBe(provider);
  });
  it("selects MetaMask when several injected wallets are present", async () => {
    const otherProvider: Eip1193 = { request: async () => [] };
    const metaMask: Eip1193 = { isMetaMask: true, request: async () => [] };
    const target = new EventTarget() as EventTarget & { ethereum?: Eip1193 };
    target.ethereum = { request: async () => [], providers: [otherProvider, metaMask] };
    await expect(discoverInjectedMetaMask(target, 1)).resolves.toBe(metaMask);
  });
  it("discovers MetaMask through EIP-6963 after a delayed announcement", async () => {
    const provider: Eip1193 = { isMetaMask: true, request: async () => [] };
    const target = new EventTarget();
    target.addEventListener("eip6963:requestProvider", () => {
      setTimeout(
        () =>
          target.dispatchEvent(
            new CustomEvent("eip6963:announceProvider", {
              detail: { info: { rdns: "io.metamask" }, provider },
            }),
          ),
        10,
      );
    });
    await expect(discoverInjectedMetaMask(target, 50)).resolves.toBe(provider);
  });
  it("reports an empty account response as an unlock or account-selection action", async () => {
    const session = sessionFor(
      { request: async () => "0x1" },
      async () => ({ accounts: [], chainId: "0x1" }),
      async () => {},
    );
    await expect(session.connect()).rejects.toThrow(WALLET_MESSAGES.WALLET_LOCKED);
  });
  it("reuses an already-authorized account without opening a prompt", async () => {
    const calls: string[] = [];
    const provider: Eip1193 = {
      request: async ({ method }) => {
        calls.push(method);
        if (method === "eth_accounts") return [acct.address];
        if (method === "eth_chainId") return "0x14a34";
        throw new Error("unexpected request");
      },
    };
    await expect(connectInjectedProvider(provider)).resolves.toEqual({
      accounts: [acct.address],
      chainId: "0x14a34",
    });
    expect(calls).toEqual(["eth_accounts", "eth_chainId"]);
  });
  it("shares one pending account request across concurrent callers", async () => {
    let requests = 0;
    let approve: ((accounts: string[]) => void) | undefined;
    const provider: Eip1193 = {
      request: async ({ method }) => {
        if (method === "eth_accounts") return [];
        if (method === "eth_chainId") return "0x14a34";
        if (method === "eth_requestAccounts") {
          requests += 1;
          return new Promise<string[]>((resolve) => {
            approve = resolve;
          });
        }
        throw new Error("unexpected request");
      },
    };
    const first = connectInjectedProvider(provider);
    await Promise.resolve();
    const second = connectInjectedProvider(provider);
    await Promise.resolve();
    expect(requests).toBe(1);
    if (!approve) throw new Error("account request was not started");
    approve([acct.address]);
    await expect(Promise.all([first, second])).resolves.toEqual([
      { accounts: [acct.address], chainId: "0x14a34" },
      { accounts: [acct.address], chainId: "0x14a34" },
    ]);
  });
  it("recovers from -32002 when the older request has just authorized an account", async () => {
    let accountReads = 0;
    const provider: Eip1193 = {
      request: async ({ method }) => {
        if (method === "eth_accounts") {
          accountReads += 1;
          return accountReads === 1 ? [] : [acct.address];
        }
        if (method === "eth_requestAccounts") throw { code: -32002 };
        if (method === "eth_chainId") return "0x14a34";
        throw new Error("unexpected request");
      },
    };
    await expect(connectInjectedProvider(provider)).resolves.toEqual({
      accounts: [acct.address],
      chainId: "0x14a34",
    });
  });
  it("does not create repeated requests after MetaMask reports an external pending request", async () => {
    let accountRequests = 0;
    const provider: Eip1193 = {
      request: async ({ method }) => {
        if (method === "eth_accounts") return [];
        if (method === "eth_requestAccounts") {
          accountRequests += 1;
          throw { code: -32002 };
        }
        throw new Error("unexpected request");
      },
    };
    await expect(connectInjectedProvider(provider)).rejects.toThrow(WALLET_MESSAGES.CONNECT_PENDING);
    await expect(connectInjectedProvider(provider)).rejects.toThrow(WALLET_MESSAGES.CONNECT_PENDING);
    expect(accountRequests).toBe(1);
  });
  it("revokes only this site's account permission when resetting a stale connection", async () => {
    const calls: { method: string; params?: unknown[] }[] = [];
    const provider: Eip1193 = {
      request: async (args) => {
        calls.push(args);
        return null;
      },
    };
    await resetInjectedProviderConnection(provider);
    expect(calls).toEqual([
      { method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] },
    ]);
  });
  it("does not hide a still-pending MetaMask request during reset", async () => {
    const provider: Eip1193 = {
      request: async () => {
        throw { code: -32002 };
      },
    };
    await expect(resetInjectedProviderConnection(provider)).rejects.toThrow(
      WALLET_MESSAGES.CONNECT_PENDING,
    );
  });
  it("drops a stale connection and retries once when the first attempt fails", async () => {
    let attempts = 0;
    let disconnected = 0;
    const session = sessionFor(
      { request: async () => "0x1" },
      async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("A connection for this origin already exists");
        return { accounts: [acct.address], chainId: "0x14a34" };
      },
      async () => {
        disconnected += 1;
      },
    );
    const r = await session.connect();
    expect(r).toEqual({ address: acct.address, chainId: "0x14a34" });
    expect(attempts).toBe(2);
    expect(disconnected).toBe(1);
  });
  it("never retries after the user dismisses the prompt", async () => {
    let attempts = 0;
    const session = sessionFor(
      { request: async () => "0x1" },
      async () => {
        attempts += 1;
        throw { code: 4001, message: "User rejected the request." };
      },
      async () => {},
    );
    await expect(session.connect()).rejects.toThrow(WALLET_MESSAGES.CONNECT_REJECTED);
    expect(attempts).toBe(1);
  });
  it("reports a repeated failure as a safe message", async () => {
    const session = sessionFor(
      { request: async () => "0x1" },
      async () => {
        throw new Error("boom");
      },
      async () => {},
    );
    await expect(session.connect()).rejects.toThrow(WALLET_MESSAGES.GENERIC);
  });
  it("allows only verification and narrowly used deposit methods", async () => {
    const calls: string[] = [];
    const p = { request: async ({ method }: { method: string }) => (calls.push(method), "ok") };
    for (const m of [
      "eth_signTransaction",
      "eth_sign",
      "eth_signTypedData_v4",
      "wallet_requestPermissions",
    ]) {
      await expect(guardedRequest(p, m)).rejects.toThrow();
    }
    expect(calls).toEqual([]);
    expect([...ALLOWED_WALLET_METHODS].sort()).toEqual([
      "eth_accounts",
      "eth_chainId",
      "eth_requestAccounts",
      "eth_sendTransaction",
      "personal_sign",
      "wallet_addEthereumChain",
      "wallet_revokePermissions",
      "wallet_switchEthereumChain",
    ]);
  });
  it("builds deposit transactions from server-supplied registry values", () => {
    const treasury = acct.address;
    expect(buildDepositTransaction({ asset: "ETH", chainId: TESTNET.chainId, treasury, token: null, units: "1000" })).toEqual({ to: treasury, value: "0x3e8" });
    const usdc = buildDepositTransaction({ asset: "USDC", chainId: TESTNET.chainId, treasury, token: TESTNET.usdc, units: "10000000" });
    expect(usdc.to).toBe(TESTNET.usdc);
    expect(usdc.value).toBe("0x0");
    expect(usdc.data).toMatch(/^0xa9059cbb/);
    // Chain allowlisting is server-side (registry-driven); the builder validates shape only.
    expect(buildDepositTransaction({ asset: "ETH", chainId: 8453, treasury, token: null, units: "1" })).toEqual({ to: treasury, value: "0x1" });
    expect(() => buildDepositTransaction({ asset: "ETH", chainId: 0, treasury, token: null, units: "1" })).toThrow("UNSUPPORTED_NETWORK");
    expect(() => buildDepositTransaction({ asset: "USDC", chainId: TESTNET.chainId, treasury, token: "0x123", units: "1" })).toThrow("INVALID_ASSET_CONFIG");
    expect(() => buildDepositTransaction({ asset: "ETH", chainId: TESTNET.chainId, treasury, token: null, units: "0" })).toThrow("INVALID_AMOUNT");
  });
});

describe("personal deposit address derivation", () => {
  it("derives deterministic addresses from an xpub and never needs private keys", async () => {
    const { mnemonicToSeedSync } = await import("@scure/bip39");
    const { HDKey } = await import("@scure/bip32");
    const { deriveDepositAddress } = await import("../src/lib/crypto/addresses.server");
    const seed = mnemonicToSeedSync("test test test test test test test test test test test junk");
    const xpub = HDKey.fromMasterSeed(seed).wipePrivateData().publicExtendedKey;
    const a0 = deriveDepositAddress(xpub, 8453, 0);
    expect(a0).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(deriveDepositAddress(xpub, 8453, 0)).toBe(a0); // deterministic
    expect(deriveDepositAddress(xpub, 8453, 1)).not.toBe(a0); // per-player index
    expect(deriveDepositAddress(xpub, 1, 0)).not.toBe(a0); // per-chain path
    expect(() => deriveDepositAddress("not-an-xpub", 8453, 0)).toThrow("XPUB_INVALID");
  });
});
