import { readFileSync } from "node:fs";
import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";
import { BASE_DEPOSIT_TREASURY, DEPOSIT_FEE_ALLOWANCE_CENTS } from "../src/lib/crypto/allowlist";
import { deriveDepositAddressV2 } from "../src/lib/crypto/addresses.server";
import { allocateDepositAddress, MemoryAddressBook } from "../src/lib/crypto/deposit-address-book";
import { publishedDepositAddress } from "../src/lib/crypto/deposit";
import {
  deriveDepositAddressV2FromXprv,
  SWEEP_TREASURY,
  xpubForNewDepositAddress,
} from "../src/lib/crypto/deposit-sweep";

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

  it("publishes a personal address only when the deposit key can spend it", async () => {
    const seed = new Uint8Array(32);
    seed[0] = 9;
    const master = HDKey.fromMasterSeed(seed);
    const xpub = master.publicExtendedKey;
    const xprv = master.privateExtendedKey;
    if (!xpub || !xprv) throw new Error("TEST_KEY");
    const other = HDKey.fromMasterSeed(Uint8Array.from([8, ...seed.slice(1)])).privateExtendedKey;
    expect(xpubForNewDepositAddress(xpub, xprv)).toBe(xpub);
    expect(xpubForNewDepositAddress(xpub, null)).toBeNull();
    expect(xpubForNewDepositAddress(null, xprv)).toBeNull();
    expect(xpubForNewDepositAddress(xpub, other)).toBeNull();

    const book = new MemoryAddressBook();
    const first = await allocateDepositAddress({
      book,
      userId: "user-a",
      chainId: 8453,
      xpub: xpubForNewDepositAddress(xpub, xprv),
    });
    const second = await allocateDepositAddress({
      book,
      userId: "user-b",
      chainId: 8453,
      xpub: xpubForNewDepositAddress(xpub, xprv),
    });
    const repeat = await allocateDepositAddress({
      book,
      userId: "user-a",
      chainId: 8453,
      xpub: xpubForNewDepositAddress(xpub, xprv),
    });
    expect(first.current?.address).not.toBe(second.current?.address);
    expect(repeat.current?.address).toBe(first.current?.address);
    expect(first.current?.address).toBe(deriveDepositAddressV2(xpub, 8453, 0).toLowerCase());
    expect(deriveDepositAddressV2FromXprv(xprv, 8453, 0).toLowerCase()).toBe(first.current?.address);
    expect(first.current?.address).not.toBe(TREASURY.toLowerCase());

    const blocked = new MemoryAddressBook();
    const refused = await allocateDepositAddress({
      book: blocked,
      userId: "user-a",
      chainId: 8453,
      xpub: xpubForNewDepositAddress(xpub, null),
    });
    expect(refused.current).toBeNull();
    expect(blocked.rows).toHaveLength(0);
  });

  it("shows the personal address and credits by destination, not by the sending wallet", () => {
    const server = readFileSync("src/lib/crypto/crypto.functions.ts", "utf8");
    const panel = readFileSync("src/components/wallet/CryptoRails.tsx", "utf8");
    const observe = readFileSync(
      "supabase/migrations/20260926203000_eth-oracle-heartbeat-and-inventory.sql",
      "utf8",
    );
    const sweep = readFileSync("src/lib/crypto/deposit-sweep.server.ts", "utf8");
    expect(server).toContain("allocateDepositAddress");
    expect(server).toContain("xpubForNewDepositAddress");
    expect(server).not.toContain("Link the wallet you will send from");
    expect(panel).not.toContain("Previous address");
    expect(panel).not.toContain("still monitored");
    expect(panel).toContain("any wallet or exchange");
    expect(panel).toContain("do not need to connect that wallet");
    expect(observe).toContain(
      "select user_id into uid from crypto_deposit_addresses where chain_id = p_chain and lower(address) = lower(p_to)",
    );
    expect(sweep).toContain("requireKnownAnchors: book.some((row) => row.derivationVersion === 1)");
    expect(sweep).toContain('resolveSweepMode');
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
