import { HDKey } from "@scure/bip32";
import { publicKeyToAddress } from "viem/accounts";

/**
 * Personal deposit addresses are derived from an HD wallet EXTENDED PUBLIC KEY
 * (xpub) only. The server never holds the HD seed or any per-player private
 * key: this module can derive addresses, never spend from them. Sweeping funds
 * out of these addresses is a separate custody concern (HSM/multisig), and a
 * deposit address is never used as a withdrawal signer.
 *
 * Derivation path: m/0/<chainId>/<index> — fully non-hardened so an xpub
 * suffices (hardened derivation would require the private key).
 */

export function deriveDepositAddress(xpub: string, chainId: number, index: number): `0x${string}` {
  if (!/^(xpub|ypub|zpub|tpub)/.test(xpub)) throw new Error("XPUB_INVALID");
  if (!Number.isInteger(chainId) || chainId <= 0 || !Number.isInteger(index) || index < 0) {
    throw new Error("DERIVATION_PARAMS_INVALID");
  }
  const key = HDKey.fromExtendedKey(xpub).derive(`m/0/${chainId}/${index}`);
  if (!key.publicKey) throw new Error("XPUB_INVALID");
  const hex = `0x${Buffer.from(key.publicKey).toString("hex")}` as const;
  return publicKeyToAddress(hex);
}

/** Reads the deposit xpub from the environment. Absent => personal addresses unavailable. */
export function depositXpub(): string | null {
  const xpub = process.env["CRYPTO_DEPOSIT_XPUB"];
  return xpub && xpub.length > 20 ? xpub : null;
}
