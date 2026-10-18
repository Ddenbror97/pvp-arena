import { HDKey } from "@scure/bip32";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { getAddress, keccak256, recoverMessageAddress, type Hex } from "viem";
import { privateKeyToAccount, publicKeyToAddress } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { deriveDepositAddress } from "../src/lib/crypto/addresses.server";
import {
  deriveDepositAddressFromXprv,
  spendableAddressFromXprv,
  xprvMatchesXpub,
} from "../src/lib/crypto/deposit-sweep";

/**
 * Reference Ethereum address: keccak256 of the uncompressed public key with
 * the 0x04 prefix removed, last 20 bytes. This is independent of
 * deriveDepositAddress. Throwaway keys only.
 */
function ethereumAddressFromCompressedPublicKey(compressed: Hex): `0x${string}` {
  const uncompressed = secp256k1.Point.fromHex(compressed.slice(2)).toBytes(false);
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) throw new Error("UNCOMPRESSED_KEY");
  const xy = `0x${Buffer.from(uncompressed.subarray(1)).toString("hex")}` as Hex;
  if ((xy.length - 2) / 2 !== 64) throw new Error("XY_LENGTH");
  return getAddress(`0x${keccak256(xy).slice(-40)}`);
}

/** What viem's publicKeyToAddress does with a compressed key: hash the X coordinate only. */
function xCoordinateAddress(compressed: Hex): `0x${string}` {
  if ((compressed.length - 2) / 2 !== 33) throw new Error("COMPRESSED_LENGTH");
  const prefix = compressed.slice(2, 4);
  if (prefix !== "02" && prefix !== "03") throw new Error("COMPRESSED_PREFIX");
  const x = `0x${compressed.slice(4)}` as Hex;
  if ((x.length - 2) / 2 !== 32) throw new Error("X_LENGTH");
  return getAddress(`0x${keccak256(x).slice(-40)}`);
}

function throwawayNode(seedByte: number, index: number) {
  const seed = new Uint8Array(32);
  seed[0] = seedByte;
  seed[1] = (seedByte * 17) & 0xff;
  const master = HDKey.fromMasterSeed(seed);
  const xprv = master.privateExtendedKey;
  const xpub = master.publicExtendedKey;
  if (!xprv) throw new Error("TEST_KEY");
  const child = master.derive(`m/0/8453/${index}`);
  if (!child.publicKey || !child.privateKey) throw new Error("TEST_KEY");
  const compressed = `0x${Buffer.from(child.publicKey).toString("hex")}` as Hex;
  const privateKey = `0x${Buffer.from(child.privateKey).toString("hex")}` as Hex;
  return { master, xprv, xpub, compressed, privateKey };
}

const INDEXES = [0, 3, 41, 57];

describe("Base deposit address derivation", () => {
  it("hashes only the X coordinate when the production converter is given a compressed key", () => {
    const { compressed, xpub } = throwawayNode(1, 3);
    const published = deriveDepositAddress(xpub, 8453, 3);
    expect(publicKeyToAddress(compressed)).toBe(xCoordinateAddress(compressed));
    expect(published.toLowerCase()).toBe(xCoordinateAddress(compressed).toLowerCase());
    expect((compressed.length - 2) / 2).toBe(33);
  });

  it("matches an uncompressed public key to the private key that can spend it", () => {
    for (const index of INDEXES) {
      const { compressed, privateKey } = throwawayNode(2, index);
      const uncompressed = secp256k1.Point.fromHex(compressed.slice(2)).toBytes(false);
      const uncompressedHex = `0x${Buffer.from(uncompressed).toString("hex")}` as Hex;
      const spendable = privateKeyToAccount(privateKey).address;
      const nobleUncompressed = secp256k1.getPublicKey(
        Buffer.from(privateKey.slice(2), "hex"),
        false,
      );
      expect(nobleUncompressed.length).toBe(65);
      expect(ethereumAddressFromCompressedPublicKey(compressed)).toBe(spendable);
      expect(publicKeyToAddress(uncompressedHex)).toBe(spendable);
      expect(Buffer.from(nobleUncompressed).toString("hex")).toBe(uncompressedHex.slice(2));
    }
  });

  it("shows the production deposit address is not the address controlled by the derived private key", async () => {
    for (let seedByte = 1; seedByte <= 8; seedByte += 1) {
      for (const index of INDEXES) {
        const { xprv, xpub, compressed, privateKey } = throwawayNode(seedByte, index);
        const published = deriveDepositAddress(xpub, 8453, index);
        const fromXprv = deriveDepositAddressFromXprv(xprv, 8453, index);
        const spendable = privateKeyToAccount(privateKey).address;
        expect(xprvMatchesXpub(xprv, xpub)).toBe(true);
        expect(fromXprv.toLowerCase()).toBe(published.toLowerCase());
        expect(spendableAddressFromXprv(xprv, 8453, index)).toBe(spendable);
        expect(ethereumAddressFromCompressedPublicKey(compressed)).toBe(spendable);
        expect(published.toLowerCase()).not.toBe(spendable.toLowerCase());
        expect(xCoordinateAddress(compressed).toLowerCase()).toBe(published.toLowerCase());

        const account = privateKeyToAccount(privateKey);
        const signature = await account.signMessage({ message: `proof:${seedByte}:${index}` });
        const recovered = await recoverMessageAddress({
          message: `proof:${seedByte}:${index}`,
          signature,
        });
        expect(recovered).toBe(spendable);
        expect(recovered.toLowerCase()).not.toBe(published.toLowerCase());
      }
    }
  });

  it("keeps the xpub and xprv on the same node while their published address stays unspendable", () => {
    const { master, xprv, xpub } = throwawayNode(9, 0);
    const pubOnly = HDKey.fromExtendedKey(xpub);
    expect(pubOnly.privateKey).toBeNull();
    expect(Buffer.from(pubOnly.publicKey!).toString("hex")).toBe(
      Buffer.from(master.publicKey!).toString("hex"),
    );
    expect(Buffer.from(pubOnly.chainCode!).toString("hex")).toBe(
      Buffer.from(master.chainCode!).toString("hex"),
    );
    expect(deriveDepositAddress(xpub, 8453, 41).toLowerCase()).not.toBe(
      spendableAddressFromXprv(xprv, 8453, 41).toLowerCase(),
    );
  });
});
