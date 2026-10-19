import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  markPayoutNonceSigned,
  MemoryNonceBook,
  releasePayoutNonce,
  reservePayoutNonce,
} from "../src/lib/crypto/payout-nonce";

const PAYER = "0xd29370ca973e85b7ec7e52c0cff267b0fb63da24";

function reserve(
  book: MemoryNonceBook,
  ownerId: string,
  chainPending: number,
  purpose: "withdrawal" | "gas_stipend" = "withdrawal",
  occupied: number[] = [],
) {
  return book.run(() =>
    reservePayoutNonce(book, {
      chainId: 8453,
      payer: PAYER,
      purpose,
      ownerId,
      chainPending,
      occupied,
    }),
  );
}

describe("payout nonce lease", () => {
  it("gives concurrent withdrawals and a gas stipend different nonces", async () => {
    const book = new MemoryNonceBook();
    const reserved = await Promise.all([
      reserve(book, "withdrawal-a", 5),
      reserve(book, "withdrawal-b", 5),
      reserve(book, "gas:0xabc", 5, "gas_stipend"),
    ]);
    expect(reserved.map((row) => row.nonce).sort()).toEqual([5, 6, 7]);
    expect(new Set(reserved.map((row) => row.nonce)).size).toBe(3);
  });

  it("reuses the same owner's unsigned nonce after a crash", async () => {
    const book = new MemoryNonceBook();
    const first = await reserve(book, "withdrawal-a", 4);
    const again = await reserve(book, "withdrawal-a", 9);
    expect(again).toEqual({ nonce: first.nonce, reused: true });
    expect(book.leases.filter((row) => row.status === "reserved")).toHaveLength(1);
  });

  it("does not let another owner take a reserved nonce", async () => {
    const book = new MemoryNonceBook();
    const first = await reserve(book, "withdrawal-a", 4);
    const other = await reserve(book, "gas:0xabc", 4, "gas_stipend");
    expect(other.nonce).toBe(first.nonce + 1);
    expect(
      releasePayoutNonce(book, {
        chainId: 8453,
        payer: PAYER,
        nonce: first.nonce,
        ownerId: "gas:0xabc",
        chainPending: 4,
      }),
    ).toBe(false);
    expect(book.leases[0]!.status).toBe("reserved");
  });

  it("releases an unsigned nonce only for its owner before the chain consumes it", () => {
    const book = new MemoryNonceBook();
    book.leases.push({
      chainId: 8453,
      payer: PAYER,
      nonce: 3,
      purpose: "withdrawal",
      ownerId: "withdrawal-a",
      status: "reserved",
      signed: false,
    });
    expect(
      releasePayoutNonce(book, {
        chainId: 8453,
        payer: PAYER,
        nonce: 3,
        ownerId: "withdrawal-a",
        chainPending: 4,
      }),
    ).toBe(false);
    expect(
      releasePayoutNonce(book, {
        chainId: 8453,
        payer: PAYER,
        nonce: 3,
        ownerId: "withdrawal-a",
        chainPending: 3,
      }),
    ).toBe(true);
    expect(book.leases[0]!.status).toBe("released");
  });

  it("keeps a signed nonce after a retry and moves the next owner forward", async () => {
    const book = new MemoryNonceBook();
    const first = await reserve(book, "withdrawal-a", 2);
    markPayoutNonceSigned(book, {
      chainId: 8453,
      payer: PAYER,
      nonce: first.nonce,
      ownerId: "withdrawal-a",
    });
    const retry = await reserve(book, "withdrawal-a", 2);
    expect(retry.nonce).not.toBe(first.nonce);
    expect(retry.reused).toBe(false);
    const next = await reserve(book, "withdrawal-b", 2, "withdrawal", [first.nonce]);
    expect(next.nonce).toBeGreaterThan(first.nonce);
    expect(next.nonce).not.toBe(retry.nonce);
  });

  it("matches the database lease to the same payer rules", () => {
    const sql = readFileSync(
      "supabase/migrations/20261019010000_deposit_address_version.sql",
      "utf8",
    );
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("signed = false");
    expect(sql).toContain("crypto_withdrawals");
    expect(sql).toContain("crypto_deposit_sweeps");
    expect(sql).toContain("purpose in ('withdrawal', 'gas_stipend')");
    const worker = readFileSync("src/lib/crypto/chain.server.ts", "utf8");
    expect(worker).toContain('p_purpose: "withdrawal"');
    expect(worker).toContain("crypto_reserve_nonce");
    const sweep = readFileSync("src/lib/crypto/deposit-sweep.ts", "utf8");
    expect(sweep).toContain('purpose: "gas_stipend"');
    expect(readFileSync("src/lib/crypto/deposit-sweep.server.ts", "utf8")).toContain(
      "crypto_reserve_nonce",
    );
  });
});
