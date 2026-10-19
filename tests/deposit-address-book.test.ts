import { readFileSync } from "node:fs";
import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";
import { deriveDepositAddress, deriveDepositAddressV2 } from "../src/lib/crypto/addresses.server";
import {
  allocateDepositAddress,
  MemoryAddressBook,
  migrateDepositAddresses,
  recoverAddressBook,
  rollbackDepositAddresses,
  type AddressBookRow,
  type LegacyAddressRow,
} from "../src/lib/crypto/deposit-address-book";

function throwawayXpub(seedByte: number): string {
  const seed = new Uint8Array(32);
  seed[0] = seedByte;
  const xpub = HDKey.fromMasterSeed(seed).publicExtendedKey;
  if (!xpub) throw new Error("TEST_KEY");
  return xpub;
}

const USER_A = "user-a";
const USER_B = "user-b";

describe("versioned deposit address allocation", () => {
  it("keeps a version 1 row and allocates version 2 from its own index sequence", async () => {
    const xpub = throwawayXpub(3);
    const legacy: LegacyAddressRow = {
      userId: USER_A,
      chainId: 8453,
      derivationIndex: 41,
      address: deriveDepositAddress(xpub, 8453, 41).toLowerCase(),
    };
    const book = new MemoryAddressBook();
    book.rows = migrateDepositAddresses([legacy]);
    const before = book.rows[0]!.address;
    const allocated = await allocateDepositAddress({
      book,
      userId: USER_A,
      chainId: 8453,
      xpub,
    });
    expect(book.rows[0]!.address).toBe(before);
    expect(book.rows[0]!.derivationIndex).toBe(41);
    expect(book.rows[0]!.derivationVersion).toBe(1);
    expect(allocated.current?.derivationVersion).toBe(2);
    expect(allocated.current?.derivationIndex).toBe(0);
    expect(allocated.current?.address).toBe(deriveDepositAddressV2(xpub, 8453, 0).toLowerCase());
    expect(allocated.current?.address).not.toBe(before);
    expect(allocated.previous.map((row) => row.address)).toEqual([before]);
    expect(deriveDepositAddressV2(xpub, 8453, 41).toLowerCase()).not.toBe(before);
  });

  it("gives a new user only a version 2 address", async () => {
    const xpub = throwawayXpub(4);
    const book = new MemoryAddressBook();
    const allocated = await allocateDepositAddress({
      book,
      userId: USER_B,
      chainId: 8453,
      xpub,
    });
    expect(book.rows).toHaveLength(1);
    expect(allocated.previous).toEqual([]);
    expect(allocated.current?.derivationVersion).toBe(2);
    expect(allocated.current?.derivationIndex).toBe(0);
  });

  it("allocates distinct version 2 indexes under concurrent requests", async () => {
    const xpub = throwawayXpub(5);
    const book = new MemoryAddressBook();
    book.rows = migrateDepositAddresses([
      {
        userId: USER_A,
        chainId: 8453,
        derivationIndex: 41,
        address: deriveDepositAddress(xpub, 8453, 41).toLowerCase(),
      },
    ]);
    const results = await Promise.all([
      allocateDepositAddress({ book, userId: USER_A, chainId: 8453, xpub }),
      allocateDepositAddress({ book, userId: USER_A, chainId: 8453, xpub }),
      allocateDepositAddress({ book, userId: USER_B, chainId: 8453, xpub }),
      allocateDepositAddress({ book, userId: USER_B, chainId: 8453, xpub }),
    ]);
    const version2 = book.rows.filter((row) => row.derivationVersion === 2);
    expect(version2).toHaveLength(2);
    expect(new Set(version2.map((row) => row.derivationIndex)).size).toBe(2);
    expect(version2.map((row) => row.derivationIndex).sort()).toEqual([0, 1]);
    const currentA = results
      .map((row) => row.current)
      .filter((row): row is AddressBookRow => row?.userId === USER_A);
    expect(new Set(currentA.map((row) => row.address)).size).toBe(1);
    expect(
      book.rows.filter((row) => row.userId === USER_A && row.derivationVersion === 1),
    ).toHaveLength(1);
  });

  it("rejects a duplicate user version and a duplicate version index", async () => {
    const book = new MemoryAddressBook();
    const row: AddressBookRow = {
      userId: USER_A,
      chainId: 8453,
      derivationIndex: 0,
      derivationVersion: 2,
      address: `0x${"ab".repeat(20)}`,
    };
    expect(await book.insert(row)).toBe("ok");
    expect(await book.insert(row)).toBe("unique");
    expect(await book.insert({ ...row, userId: USER_B, address: `0x${"cd".repeat(20)}` })).toBe(
      "unique",
    );
    expect(
      await book.insert({
        ...row,
        userId: USER_B,
        derivationIndex: 1,
        address: row.address,
      }),
    ).toBe("unique");
  });

  it("rolls a versioned book back only while every row is still version 1", () => {
    const legacy: LegacyAddressRow[] = [
      {
        userId: USER_A,
        chainId: 8453,
        derivationIndex: 41,
        address: `0x${"11".repeat(20)}`,
      },
    ];
    const migrated = migrateDepositAddresses(legacy);
    expect(migrated[0]!.address).toBe(legacy[0]!.address);
    const rolled = rollbackDepositAddresses(migrated);
    expect(rolled.ok).toBe(true);
    if (rolled.ok) expect(rolled.legacy).toEqual(legacy);
    const withVersion2 = [
      ...migrated,
      {
        userId: USER_A,
        chainId: 8453,
        derivationIndex: 0,
        derivationVersion: 2 as const,
        address: `0x${"22".repeat(20)}`,
      },
    ];
    expect(rollbackDepositAddresses(withVersion2).ok).toBe(false);
    const recovered = recoverAddressBook(withVersion2, []);
    expect(recovered.ok).toBe(true);
    if (recovered.ok) {
      expect(recovered.rows).toEqual(migrated);
      expect(recovered.rows[0]!.address).toBe(legacy[0]!.address);
    }
    expect(recoverAddressBook(withVersion2, [`0x${"22".repeat(20)}`]).ok).toBe(false);
  });

  it("keeps the migration from rewriting stored addresses", () => {
    const sql = readFileSync(
      "supabase/migrations/20261019010000_deposit_address_version.sql",
      "utf8",
    );
    expect(sql).toContain("add column derivation_version smallint not null default 1");
    expect(sql).toContain("unique (chain_id, user_id, derivation_version)");
    expect(sql).toContain("unique (chain_id, derivation_version, derivation_index)");
    expect(sql).toContain("derivation_version in (1, 2)");
    expect(sql).not.toMatch(/update\s+public\.crypto_deposit_addresses\s+set\s+address/i);
    expect(sql).toContain("SWEEP_NOT_VERSION_2");
    expect(sql).toContain("SWEEP_TREASURY_MISMATCH");
  });
});
