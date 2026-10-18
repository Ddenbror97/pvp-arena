import { HDKey } from "@scure/bip32";
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
 */

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

/** Reads the deposit xpub from the environment. Absent => personal addresses unavailable. */
export function depositXpub(): string | null {
  const xpub = workerEnv("CRYPTO_DEPOSIT_XPUB");
  return xpub && xpub.length > 20 ? xpub : null;
}
