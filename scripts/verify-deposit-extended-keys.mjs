/**
 * Confirms a deposit xpub/xprv pair before it is stored as a Worker secret.
 * Reads CRYPTO_DEPOSIT_XPUB and CRYPTO_DEPOSIT_XPRV from the environment.
 * Prints the match result and the version-2 address at m/0/8453/0 only.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { HDKey } from "@scure/bip32";
import { getAddress, keccak256, recoverMessageAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const CHECK_PATH = "m/0/8453/0";

/** Parent match, version-2 address at m/0/8453/<index>, and a signature from that child key. */
export async function depositKeyCheck(xpub, xprv, path = CHECK_PATH) {
  if (!xpub?.startsWith("xpub") || !xprv?.startsWith("xprv")) return { match: false };
  if (!/^m\/0\/8453\/(?:0|[1-9]\d*)$/.test(path)) return { match: false };
  const pub = HDKey.fromExtendedKey(xpub);
  const priv = HDKey.fromExtendedKey(xprv);
  if (!pub.publicKey || !priv.publicKey || !pub.chainCode || !priv.chainCode || !priv.privateKey) {
    return { match: false };
  }
  const sameNode =
    Buffer.from(pub.publicKey).toString("hex") === Buffer.from(priv.publicKey).toString("hex") &&
    Buffer.from(pub.chainCode).toString("hex") === Buffer.from(priv.chainCode).toString("hex");
  if (!sameNode) return { match: false };
  const childPub = pub.derive(path);
  const childPriv = priv.derive(path);
  if (!childPub.publicKey || !childPriv.privateKey) return { match: false };
  const uncompressed = secp256k1.Point.fromHex(Buffer.from(childPub.publicKey).toString("hex")).toBytes(
    false,
  );
  const hash = keccak256(`0x${Buffer.from(uncompressed.subarray(1)).toString("hex")}`);
  const fromPub = getAddress(`0x${hash.slice(-40)}`);
  const account = privateKeyToAccount(`0x${Buffer.from(childPriv.privateKey).toString("hex")}`);
  if (fromPub !== account.address) return { match: false };
  const message = `pvp-deposit-key-check:${path}`;
  const signature = await account.signMessage({ message });
  const recovered = await recoverMessageAddress({ message, signature });
  if (recovered !== account.address) return { match: false };
  return { match: true, address: fromPub, path };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const xpub = process.env.CRYPTO_DEPOSIT_XPUB;
  const xprv = process.env.CRYPTO_DEPOSIT_XPRV;
  if (!xpub || !xprv) {
    console.error("Set CRYPTO_DEPOSIT_XPUB and CRYPTO_DEPOSIT_XPRV in the environment.");
    process.exit(1);
  }
  try {
    const result = await depositKeyCheck(xpub, xprv);
    if (!result.match || !result.address) {
      console.log("match: false");
      process.exit(1);
    }
    console.log("match: true");
    console.log("path: m/0/8453/0");
    console.log(`address: ${result.address}`);
  } catch {
    console.error("The extended keys could not be checked. Use Bitcoin mainnet xpub and xprv.");
    process.exit(1);
  }
}
