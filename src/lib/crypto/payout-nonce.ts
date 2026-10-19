/**
 * Payout-wallet nonce lease shared by withdrawals and gas stipends.
 *
 * The production lease is the SQL function crypto_reserve_nonce, which takes
 * the same decisions under pg_advisory_xact_lock. This module is the tested
 * specification: one nonce is given to one owner, a retry reuses that owner's
 * unsigned reservation, and a different owner cannot take it.
 *
 * Deposit-address ETH and USDC sweeps use the deposit address nonce. They
 * do not take a payout-wallet lease.
 */

export type NoncePurpose = "withdrawal" | "gas_stipend";
export type NonceLeaseStatus = "reserved" | "used" | "released";

export interface NonceLease {
  chainId: number;
  payer: string;
  nonce: number;
  purpose: NoncePurpose;
  ownerId: string;
  status: NonceLeaseStatus;
  signed: boolean;
}

export interface ReserveNonceInput {
  chainId: number;
  payer: string;
  purpose: NoncePurpose;
  ownerId: string;
  chainPending: number;
  /** Nonces already stored on in-flight withdrawals or gas stipends. */
  occupied: readonly number[];
}

export class MemoryNonceBook {
  leases: NonceLease[] = [];
  private tail: Promise<void> = Promise.resolve();

  /** Serializes leases the way the database advisory lock does. */
  run<T>(fn: () => T): Promise<T> {
    const run = this.tail.then(fn, fn);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

export function reservePayoutNonce(
  book: MemoryNonceBook,
  input: ReserveNonceInput,
): { nonce: number; reused: boolean } {
  if (!Number.isInteger(input.chainPending) || input.chainPending < 0) {
    throw new Error("NONCE_LEASE");
  }
  const payer = input.payer.toLowerCase();
  const open = book.leases.filter((row) => row.chainId === input.chainId && row.payer === payer);
  const mine = open.find(
    (row) => row.ownerId === input.ownerId && row.status === "reserved" && !row.signed,
  );
  if (mine) return { nonce: mine.nonce, reused: true };

  const floor = (values: readonly number[]) =>
    values.reduce((max, nonce) => Math.max(max, nonce + 1), 0);
  const leaseFloor = floor(
    open
      .filter((row) => row.status === "reserved" || row.status === "used")
      .map((row) => row.nonce),
  );
  let nonce = Math.max(input.chainPending, leaseFloor, floor(input.occupied));
  while (open.some((row) => row.nonce === nonce && row.status !== "released")) nonce += 1;
  book.leases.push({
    chainId: input.chainId,
    payer,
    nonce,
    purpose: input.purpose,
    ownerId: input.ownerId,
    status: "reserved",
    signed: false,
  });
  return { nonce, reused: false };
}

export function markPayoutNonceSigned(
  book: MemoryNonceBook,
  input: { chainId: number; payer: string; nonce: number; ownerId: string },
): void {
  const row = findOpen(book, input);
  if (!row || row.status !== "reserved") throw new Error("NONCE_LEASE");
  row.signed = true;
  row.status = "used";
}

/**
 * Releases an unsigned reservation for the same owner when the chain nonce
 * has not moved past it. A different owner cannot release or reuse it.
 */
export function releasePayoutNonce(
  book: MemoryNonceBook,
  input: { chainId: number; payer: string; nonce: number; ownerId: string; chainPending: number },
): boolean {
  const row = findOpen(book, input);
  if (!row || row.ownerId !== input.ownerId) return false;
  if (row.status !== "reserved" || row.signed) return false;
  if (input.chainPending > row.nonce) return false;
  row.status = "released";
  return true;
}

function findOpen(
  book: MemoryNonceBook,
  input: { chainId: number; payer: string; nonce: number },
): NonceLease | undefined {
  return book.leases.find(
    (row) =>
      row.chainId === input.chainId &&
      row.payer === input.payer.toLowerCase() &&
      row.nonce === input.nonce &&
      row.status !== "released",
  );
}
