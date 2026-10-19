import {
  CURRENT_DEPOSIT_DERIVATION_VERSION,
  deriveDepositAddressV2,
  type DepositDerivationVersion,
} from "./addresses.server";

/**
 * Versioned deposit-address book.
 *
 * Version 1 rows are stored addresses and are never rewritten. Version 2
 * indexes start at 0 on their own sequence. The same numeric index under
 * version 1 and version 2 is a different address.
 */
export interface AddressBookRow {
  userId: string;
  chainId: number;
  derivationIndex: number;
  derivationVersion: DepositDerivationVersion;
  address: string;
}

export interface LegacyAddressRow {
  userId: string;
  chainId: number;
  derivationIndex: number;
  address: string;
}

export interface DepositAddressBook {
  list(chainId: number): Promise<AddressBookRow[]>;
  insert(row: AddressBookRow): Promise<"ok" | "unique" | "error">;
}

export interface AllocatedDepositAddress {
  current: AddressBookRow | null;
  previous: AddressBookRow[];
  assigned: boolean;
}

/** Existing rows become version 1. Stored addresses and indexes are copied. */
export function migrateDepositAddresses(rows: readonly LegacyAddressRow[]): AddressBookRow[] {
  return rows.map((row) => ({
    userId: row.userId,
    chainId: row.chainId,
    derivationIndex: row.derivationIndex,
    derivationVersion: 1,
    address: row.address.toLowerCase(),
  }));
}

/**
 * Roll the versioned book back to the legacy shape only when every row is
 * still version 1. Version 2 rows have to be recovered explicitly.
 */
export function rollbackDepositAddresses(
  rows: readonly AddressBookRow[],
): { ok: true; legacy: LegacyAddressRow[] } | { ok: false; reason: "VERSION_2_PRESENT" } {
  if (rows.some((row) => row.derivationVersion !== 1)) {
    return { ok: false, reason: "VERSION_2_PRESENT" };
  }
  return {
    ok: true,
    legacy: rows.map((row) => ({
      userId: row.userId,
      chainId: row.chainId,
      derivationIndex: row.derivationIndex,
      address: row.address,
    })),
  };
}

/**
 * Drop version 2 rows that have no deposit yet. Version 1 rows stay.
 * A version 2 address that already received a deposit is left in place so
 * the watcher can keep matching it.
 */
export function recoverAddressBook(
  rows: readonly AddressBookRow[],
  depositedAddresses: readonly string[],
): { ok: true; rows: AddressBookRow[] } | { ok: false; reason: "VERSION_2_HAS_DEPOSITS" } {
  const deposited = new Set(depositedAddresses.map((address) => address.toLowerCase()));
  const version2 = rows.filter((row) => row.derivationVersion === 2);
  if (version2.some((row) => deposited.has(row.address.toLowerCase()))) {
    return { ok: false, reason: "VERSION_2_HAS_DEPOSITS" };
  }
  return { ok: true, rows: rows.filter((row) => row.derivationVersion === 1) };
}

export function assertBookConstraints(rows: readonly AddressBookRow[]): void {
  const addresses = new Set<string>();
  const users = new Set<string>();
  const indexes = new Set<string>();
  for (const row of rows) {
    if (row.derivationVersion !== 1 && row.derivationVersion !== 2) {
      throw new Error("DERIVATION_VERSION");
    }
    const address = `${row.chainId}:${row.address.toLowerCase()}`;
    const user = `${row.chainId}:${row.userId}:${row.derivationVersion}`;
    const index = `${row.chainId}:${row.derivationVersion}:${row.derivationIndex}`;
    if (addresses.has(address) || users.has(user) || indexes.has(index)) {
      throw new Error("UNIQUE");
    }
    addresses.add(address);
    users.add(user);
    indexes.add(index);
  }
}

export async function allocateDepositAddress(input: {
  book: DepositAddressBook;
  userId: string;
  chainId: number;
  xpub: string | null;
  attempts?: number;
}): Promise<AllocatedDepositAddress> {
  const attempts = input.attempts ?? 5;
  const read = async () => {
    const rows = (await input.book.list(input.chainId)).filter(
      (row) => row.chainId === input.chainId,
    );
    const mine = rows.filter((row) => row.userId === input.userId);
    const previous = mine.filter((row) => row.derivationVersion === 1);
    const current =
      mine.find((row) => row.derivationVersion === CURRENT_DEPOSIT_DERIVATION_VERSION) ?? null;
    return { rows, previous, current };
  };

  const first = await read();
  if (first.current) return { current: first.current, previous: first.previous, assigned: false };
  if (!input.xpub) return { current: null, previous: first.previous, assigned: false };

  for (let attempt = 0; attempt < attempts; attempt++) {
    const snap = await read();
    if (snap.current) return { current: snap.current, previous: snap.previous, assigned: false };
    const version2 = snap.rows.filter((row) => row.derivationVersion === 2);
    const index =
      version2.length === 0 ? 0 : Math.max(...version2.map((row) => row.derivationIndex)) + 1;
    const address = deriveDepositAddressV2(input.xpub, input.chainId, index).toLowerCase();
    const row: AddressBookRow = {
      userId: input.userId,
      chainId: input.chainId,
      derivationIndex: index,
      derivationVersion: 2,
      address,
    };
    const inserted = await input.book.insert(row);
    if (inserted === "ok") {
      const after = await read();
      return { current: after.current ?? row, previous: after.previous, assigned: true };
    }
    if (inserted === "unique") continue;
    break;
  }
  throw new Error("ASSIGN_FAILED");
}

/** In-memory book with the same uniqueness rules as the migration. */
export class MemoryAddressBook implements DepositAddressBook {
  rows: AddressBookRow[] = [];

  async list(chainId: number): Promise<AddressBookRow[]> {
    return this.rows.filter((row) => row.chainId === chainId).map((row) => ({ ...row }));
  }

  async insert(row: AddressBookRow): Promise<"ok" | "unique" | "error"> {
    if (row.derivationVersion !== 1 && row.derivationVersion !== 2) return "error";
    if (!/^0x[0-9a-f]{40}$/.test(row.address)) return "error";
    const next = [...this.rows, { ...row, address: row.address.toLowerCase() }];
    try {
      assertBookConstraints(next);
    } catch (error) {
      if (error instanceof Error && error.message === "UNIQUE") return "unique";
      return "error";
    }
    this.rows = next;
    return "ok";
  }
}
