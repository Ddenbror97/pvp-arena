import { readFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { BASE_MAINNET } from "../src/lib/crypto/allowlist";
import { buildDepositTransaction, publishedDepositAddress } from "../src/lib/crypto/deposit";
import { redactOpsValue } from "../src/lib/crypto/ops-log";
import { buildWalletMessage, signatureMatches } from "../src/lib/web3/message";

const TREASURY = "0x9EAff85db9A2559eC958740A6a3b523751237987";
const PAYOUT = "0xd29370ca973E85B7EC7E52c0cff267B0FB63dA24";
const FAKE_USDC = "0x1111111111111111111111111111111111111111";

describe("linked wallet deposits", () => {
  it("rejects a reused nonce, another signer, and a different domain binding", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const other = privateKeyToAccount(generatePrivateKey());
    const fields = {
      address: account.address,
      nonce: "c".repeat(64),
      issuedAt: "2026-10-19T00:00:00.000Z",
      expiresAt: "2026-10-19T00:10:00.000Z",
      version: 1 as const,
    };
    const message = buildWalletMessage(fields);
    const signature = await account.signMessage({ message });
    expect(message).toContain("Domain: pvpspinarena.com");
    expect(message).toContain(`Nonce: ${fields.nonce}`);
    expect(await signatureMatches(message, signature, account.address)).toBe(true);
    expect(
      await signatureMatches(
        buildWalletMessage({ ...fields, nonce: "d".repeat(64) }),
        signature,
        account.address,
      ),
    ).toBe(false);
    expect(await signatureMatches(message, signature, other.address)).toBe(false);
    expect(
      await signatureMatches(message, await other.signMessage({ message }), account.address),
    ).toBe(false);
  });

  it("accepts only the treasury on Base and only the official USDC contract in the transfer", () => {
    expect(publishedDepositAddress(8453, TREASURY).ok).toBe(true);
    expect(publishedDepositAddress(84532, TREASURY).ok).toBe(false);
    expect(publishedDepositAddress(8453, PAYOUT).ok).toBe(false);
    const good = buildDepositTransaction({
      asset: "USDC",
      chainId: 8453,
      treasury: TREASURY,
      token: BASE_MAINNET.usdc,
      units: "1950000",
    });
    expect(good.to).toBe(BASE_MAINNET.usdc);
    expect(good.data?.toLowerCase()).toContain(TREASURY.slice(2).toLowerCase());
    const fake = buildDepositTransaction({
      asset: "USDC",
      chainId: 8453,
      treasury: TREASURY,
      token: FAKE_USDC,
      units: "1950000",
    });
    expect(fake.to).not.toBe(BASE_MAINNET.usdc);
    expect(() =>
      buildDepositTransaction({
        asset: "USDC",
        chainId: 8453,
        treasury: TREASURY,
        token: null,
        units: "1",
      }),
    ).toThrow("INVALID_ASSET_CONFIG");
  });

  it("credits from chain evidence, retires sweeps, and keeps the historical address out of new code", () => {
    const watcher = readFileSync("src/lib/crypto/chain.server.ts", "utf8");
    const jobs = readFileSync("src/lib/crypto/jobs.server.ts", "utf8");
    const payments = readFileSync("src/lib/crypto/crypto.functions.ts", "utf8");
    expect(watcher).toContain("providersAgree");
    expect(watcher).toContain('receipt.status !== "success"');
    expect(watcher).toContain("crypto_credit_deposit");
    expect(watcher).toContain("crypto_observe_deposit");
    expect(watcher).not.toContain("0xd990b82e2da31461b046e79debc4abced05909e7");
    expect(jobs).toContain('mode: "retired"');
    expect(jobs).not.toContain("CRYPTO_DEPOSIT_XPRV");
    expect(payments).toContain("publishedDepositAddress");
    expect(payments).toContain("Cash out to the wallet you linked.");
    expect(payments).not.toContain("0x9EAff85db9A2559eC958740A6a3b523751237987");
    expect(redactOpsValue("https://rpc.example/secret xprv123456789012345678901234")).toContain(
      "[rpc]",
    );
  });
});
