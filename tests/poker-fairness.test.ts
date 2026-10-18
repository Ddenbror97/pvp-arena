import { describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";
import {
  buildChain,
  chainStep,
  entropyMessage,
  pokerEntropy,
  pokerShuffle,
  verifyPokerHand,
} from "@/lib/fairness/poker";
import { observedCommitment, rememberCommitment } from "@/lib/poker/commitments";

const SEED = "a1".repeat(32);

/** Independent re-implementation with Node crypto, written from the spec in docs/POKER.md. */
function referenceShuffle(seedHex: string, handId: number, entropy: string) {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i >= 1; i--) {
    const n = i + 1;
    const lim = Math.floor(2 ** 32 / n) * n;
    for (let counter = 0; ; counter++) {
      const h = createHmac("sha256", Buffer.from(seedHex, "hex"))
        .update(`PVPCasino:poker:v1:${handId}:${entropy}:${i}:${counter}`)
        .digest();
      const r = h.readUInt32BE(0);
      if (r < lim) {
        const j = r % n;
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
        break;
      }
    }
  }
  return deck;
}

describe("poker fairness", () => {
  it("shuffles to a permutation that matches an independent implementation", async () => {
    const entropy = await pokerEntropy(42, [
      { seat: 3, value: "bb".repeat(32) },
      { seat: 1, value: "cc".repeat(32) },
    ]);
    const { deck } = await pokerShuffle(SEED, 42, entropy);
    expect([...deck].sort((a, b) => a - b)).toEqual(Array.from({ length: 52 }, (_, i) => i));
    expect(deck).toEqual(referenceShuffle(SEED, 42, entropy));
  });

  it("orders reveals by seat in the entropy message", () => {
    expect(
      entropyMessage(9, [
        { seat: 4, value: "AA" },
        { seat: 0, value: "bb" },
      ]),
    ).toBe("PVPCasino:poker:v1:entropy:9:0=bb|4=aa");
  });

  it("changes the deck when any one player's reveal changes", async () => {
    const a = await pokerEntropy(5, [
      { seat: 0, value: "01".repeat(32) },
      { seat: 1, value: "02".repeat(32) },
    ]);
    const b = await pokerEntropy(5, [
      { seat: 0, value: "01".repeat(32) },
      { seat: 1, value: "03".repeat(32) },
    ]);
    expect((await pokerShuffle(SEED, 5, a)).deck).not.toEqual(
      (await pokerShuffle(SEED, 5, b)).deck,
    );
  });

  it("builds a verifiable hash chain", async () => {
    const secret = "5f".repeat(32);
    const links = await buildChain(secret, 8);
    expect(links[8]).toBe(secret);
    for (let k = 1; k <= 8; k++) expect(await chainStep(links[k]!)).toBe(links[k - 1]);
    expect(links[0]).toBe(
      (() => {
        let v = Buffer.from(secret, "hex");
        for (let i = 0; i < 8; i++) v = createHash("sha256").update(v).digest();
        return v.toString("hex");
      })(),
    );
  });

  it("verifies a full hand proof and rejects a forged reveal", async () => {
    const c1 = await buildChain("11".repeat(32), 4);
    const c2 = await buildChain("22".repeat(32), 4);
    const reveals = [
      { seat: 0, value: c1[1]! },
      { seat: 2, value: c2[1]! },
    ];
    const entropy = await pokerEntropy(77, reveals);
    const hash = createHash("sha256").update(Buffer.from(SEED, "hex")).digest("hex");
    const ok = await verifyPokerHand({
      id: 77,
      server_seed: SEED,
      server_seed_hash: hash,
      entropy,
      reveals,
      links: { 0: c1[0]!, 2: c2[0]! },
    });
    expect(ok).toMatchObject({ hashOk: true, revealsOk: true, entropyOk: true });
    const bad = await verifyPokerHand({
      id: 77,
      server_seed: SEED,
      server_seed_hash: hash,
      entropy,
      reveals: [reveals[0]!, { seat: 2, value: c2[2]! }],
      links: { 0: c1[0]!, 2: c2[0]! },
    });
    expect(bad.revealsOk).toBe(false);
  });

  it("compares the published commitment with the one seen before the deal", async () => {
    const c1 = await buildChain("33".repeat(32), 2);
    const reveals = [{ seat: 0, value: c1[1]! }];
    const entropy = await pokerEntropy(78, reveals);
    const hash = createHash("sha256").update(Buffer.from(SEED, "hex")).digest("hex");
    const proof = {
      id: 78,
      server_seed: SEED,
      server_seed_hash: hash,
      entropy,
      reveals,
      links: { 0: c1[0]! },
    };
    expect((await verifyPokerHand(proof)).commitmentOk).toBeNull();
    expect(
      (await verifyPokerHand({ ...proof, observed_seed_hash: hash.toUpperCase() })).commitmentOk,
    ).toBe(true);
    // A seed and hash swapped after the deal still match each other, but not what the player saw.
    const swapped = await verifyPokerHand({ ...proof, observed_seed_hash: "ab".repeat(32) });
    expect([swapped.hashOk, swapped.commitmentOk]).toEqual([true, false]);
  });

  it("keeps the first commitment seen for a hand", () => {
    rememberCommitment(91, "aa".repeat(32));
    rememberCommitment(91, "bb".repeat(32));
    expect(observedCommitment(91)).toBe("aa".repeat(32));
    expect(observedCommitment(92)).toBeNull();
  });

  it("is close to uniform: each card lands in position 0 about equally often", async () => {
    const counts = new Array<number>(52).fill(0);
    const N = 2600;
    for (let n = 0; n < N; n++) {
      const { deck } = await pokerShuffle(SEED, n, "00".repeat(32));
      counts[deck[0]!]!++;
    }
    const expected = N / 52;
    const chi = counts.reduce((a, c) => a + (c - expected) ** 2 / expected, 0);
    // 51 degrees of freedom: p = 0.001 critical value is about 87.
    expect(chi).toBeLessThan(87);
  });
});
