import { secp256k1 } from "@noble/curves/secp256k1.js";
import { HDKey } from "@scure/bip32";
import { getAddress, keccak256, type Hex } from "viem";
import { publicKeyToAddress } from "viem/accounts";
import { workerEnv } from "@/lib/worker-env";

/**
 * Personal deposit addresses are derived from an HD extended public key.
 * This module can derive addresses and does not sign, and it does not read
 * the deposit xprv. Sweeping is a separate worker that stays off unless
 * CRYPTO_DEPOSIT_SWEEP_ENABLED is exactly "true". A deposit address is never
 * the withdrawal hot wallet.
 *
 * Derivation path: m/0/<chainId>/<index> — fully non-hardened, so an xpub
 * is enough. Hardened derivation would require the private key.
 *
 * Version 1 is the historical address already stored for existing users.
 * It hashes the 32-byte X coordinate of the compressed key. Those rows stay
 * unchanged. Version 2 decompresses that key and hashes the 64-byte X || Y
 * public key, which is the standard Ethereum address. A version 1 index is
 * never reused as if the version 2 address were the same.
 */

export const DEPOSIT_DERIVATION_V1 = 1;
export const DEPOSIT_DERIVATION_V2 = 2;
export const CURRENT_DEPOSIT_DERIVATION_VERSION = DEPOSIT_DERIVATION_V2;

export type DepositDerivationVersion = typeof DEPOSIT_DERIVATION_V1 | typeof DEPOSIT_DERIVATION_V2;

export function depositDerivationPath(chainId: number, index: number): string {
  if (!Number.isInteger(chainId) || chainId <= 0 || !Number.isInteger(index) || index < 0) {
    throw new Error("DERIVATION_PARAMS_INVALID");
  }
  return `m/0/${chainId}/${index}`;
}

export function deriveDepositAddress(xpub: string, chainId: number, index: number): `0x${string}` {
  if (!/^(xpub|ypub|zpub|tpub)/.test(xpub)) throw new Error("XPUB_INVALID");
  const key = HDKey.fromExtendedKey(xpub).derive(depositDerivationPath(chainId, index));
  if (!key.publicKey) throw new Error("XPUB_INVALID");
  const hex = `0x${Buffer.from(key.publicKey).toString("hex")}` as const;
  return publicKeyToAddress(hex);
}

/** Standard Ethereum address from a 33-byte compressed secp256k1 public key. */
export function ethereumAddressFromCompressedPublicKey(compressed: Uint8Array): `0x${string}` {
  if (compressed.length !== 33 || (compressed[0] !== 0x02 && compressed[0] !== 0x03)) {
    throw new Error("COMPRESSED_PUBLIC_KEY");
  }
  const uncompressed = secp256k1.Point.fromHex(Buffer.from(compressed).toString("hex")).toBytes(
    false,
  );
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) {
    throw new Error("UNCOMPRESSED_PUBLIC_KEY");
  }
  const xy = uncompressed.subarray(1);
  if (xy.length !== 64) throw new Error("XY_LENGTH");
  const hash = keccak256(`0x${Buffer.from(xy).toString("hex")}` as Hex);
  return getAddress(`0x${hash.slice(-40)}`);
}

/** Version 2 deposit address. Does not replace version 1 rows. */
export function deriveDepositAddressV2(
  xpub: string,
  chainId: number,
  index: number,
): `0x${string}` {
  if (!/^(xpub|ypub|zpub|tpub)/.test(xpub)) throw new Error("XPUB_INVALID");
  const key = HDKey.fromExtendedKey(xpub).derive(depositDerivationPath(chainId, index));
  if (!key.publicKey) throw new Error("XPUB_INVALID");
  return ethereumAddressFromCompressedPublicKey(key.publicKey);
}

/** Reads the deposit xpub from the environment. Absent => personal addresses unavailable. */
export function depositXpub(): string | null {
  const xpub = workerEnv("CRYPTO_DEPOSIT_XPUB");
  return xpub && xpub.length > 20 ? xpub : null;
}
