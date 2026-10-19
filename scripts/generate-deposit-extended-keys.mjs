/**
 * Creates a new Base deposit HD master on an offline machine.
 * Uses a fresh 32-byte seed. Does not read MetaMask seeds or payout keys.
 * Writes the backup outside this repository and does not print the xprv.
 */
import { randomBytes } from "node:crypto";
import {
  closeSync,
  fchmodSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HDKey } from "@scure/bip32";
import { depositKeyCheck } from "./verify-deposit-extended-keys.mjs";

export const BITCOIN_MAINNET_PUBLIC = 0x0488b21e;
export const BITCOIN_MAINNET_PRIVATE = 0x0488ade4;
const CHECK_INDEXES = [0, 1];

export function repoRoot() {
  return resolve(fileURLToPath(new URL("..", import.meta.url)));
}

export function outputPaths(outPath) {
  const bundle = resolve(outPath);
  if (!bundle.endsWith(".deposit-hd.txt")) throw new Error("OUTPUT_NAME");
  const base = basename(bundle).slice(0, -".txt".length);
  const dir = dirname(bundle);
  return {
    bundle,
    xpub: resolve(dir, `${base}.xpub`),
    xprv: resolve(dir, `${base}.xprv`),
  };
}

export function assertOutsideRepo(paths, root = repoRoot()) {
  for (const target of Object.values(paths)) {
    const rel = relative(root, target);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
      throw new Error("REFUSING_REPO_PATH");
    }
  }
}

function missing(path) {
  try {
    lstatSync(path);
    return false;
  } catch (error) {
    if (error && error.code === "ENOENT") return true;
    throw error;
  }
}

export function masterFromSeed(seed) {
  if (!(seed instanceof Uint8Array) || seed.length !== 32) throw new Error("SEED_LENGTH");
  const master = HDKey.fromMasterSeed(seed);
  const xpub = master.publicExtendedKey;
  const xprv = master.privateExtendedKey;
  if (!xpub?.startsWith("xpub") || !xprv?.startsWith("xprv")) throw new Error("EXTENDED_KEY");
  return { xpub, xprv };
}

export function parseBundle(text) {
  let xpub;
  let xprv;
  for (const line of text.split(/\n/)) {
    if (line.startsWith("xpub ")) xpub = line.slice(5).trim();
    else if (line.startsWith("xprv ")) xprv = line.slice(5).trim();
  }
  if (!xpub || !xprv) throw new Error("BACKUP_UNREADABLE");
  return { xpub, xprv };
}

function writeExclusive(path, text) {
  const tmp = `${path}.partial`;
  if (!missing(tmp)) unlinkSync(tmp);
  const fd = openSync(tmp, "wx", 0o600);
  try {
    writeSync(fd, text);
    fsyncSync(fd);
    fchmodSync(fd, 0o600);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(tmp, path);
  } catch (error) {
    try {
      unlinkSync(tmp);
    } catch {
      /* the partial file is removed when the rename can be cleaned up */
    }
    throw error;
  }
}

function removeAll(paths) {
  for (const path of paths) {
    try {
      unlinkSync(path);
    } catch {
      /* a missing file is already gone */
    }
  }
}

export async function generateDepositKeys({ outPath, seed, root = repoRoot() }) {
  const paths = outputPaths(outPath);
  assertOutsideRepo(paths, root);
  if (![paths.bundle, paths.xpub, paths.xprv].every(missing)) throw new Error("OUTPUT_EXISTS");
  if (missing(dirname(paths.bundle))) throw new Error("OUTPUT_DIR_MISSING");
  const created = masterFromSeed(seed);
  seed.fill(0);
  const checks = [];
  for (const index of CHECK_INDEXES) {
    const checked = await depositKeyCheck(created.xpub, created.xprv, `m/0/8453/${index}`);
    if (!checked.match || !checked.address) throw new Error("CHECK_FAILED");
    checks.push(checked);
  }
  const address = checks[0].address;
  const bundle = [
    "# Base deposit HD backup",
    "# Bitcoin mainnet BIP32 from a new 32-byte seed. This is not a MetaMask wallet.",
    "# Child path: m/0/8453/<index>",
    "# Keep two offline copies. Do not email this file or put it in a synced folder.",
    `# address_m_0_8453_0 ${address}`,
    `xpub ${created.xpub}`,
    `xprv ${created.xprv}`,
    "",
  ].join("\n");
  const written = [];
  try {
    writeExclusive(paths.bundle, bundle);
    written.push(paths.bundle);
    writeExclusive(paths.xpub, `${created.xpub}\n`);
    written.push(paths.xpub);
    writeExclusive(paths.xprv, `${created.xprv}\n`);
    written.push(paths.xprv);
    const again = parseBundle(readFileSync(paths.bundle, "utf8"));
    const xpubLine = readFileSync(paths.xpub, "utf8").trim();
    const xprvLine = readFileSync(paths.xprv, "utf8").trim();
    if (again.xpub !== xpubLine || again.xprv !== xprvLine) throw new Error("REREAD_FAILED");
    for (const index of CHECK_INDEXES) {
      const checked = await depositKeyCheck(again.xpub, again.xprv, `m/0/8453/${index}`);
      if (!checked.match) throw new Error("REREAD_FAILED");
      if (index === 0 && checked.address !== address) throw new Error("REREAD_FAILED");
    }
  } catch (error) {
    removeAll(written);
    throw error;
  }
  return { address, path: "m/0/8453/0", paths };
}

export function dependencyReport() {
  const bip32 = JSON.parse(
    readFileSync(fileURLToPath(new URL("../node_modules/@scure/bip32/package.json", import.meta.url)), "utf8"),
  );
  const viem = JSON.parse(
    readFileSync(fileURLToPath(new URL("../node_modules/viem/package.json", import.meta.url)), "utf8"),
  );
  const seed = randomBytes(32);
  const master = HDKey.fromMasterSeed(seed);
  const prefixes =
    master.publicExtendedKey.startsWith("xpub") && master.privateExtendedKey.startsWith("xprv");
  seed.fill(0);
  if (!prefixes) throw new Error("LIBRARY_MISMATCH");
  return {
    node: process.version,
    bip32: bip32.version,
    viem: viem.version,
    publicVersion: BITCOIN_MAINNET_PUBLIC.toString(16).padStart(8, "0"),
    privateVersion: BITCOIN_MAINNET_PRIVATE.toString(16).padStart(8, "0"),
  };
}

function printPublic(result) {
  console.log("match: true");
  console.log(`path: ${result.path}`);
  console.log(`address: ${result.address}`);
}

function fail(error) {
  const code = error instanceof Error ? error.message : "FAILED";
  const known = new Set([
    "OUTPUT_NAME",
    "REFUSING_REPO_PATH",
    "OUTPUT_EXISTS",
    "OUTPUT_DIR_MISSING",
    "SEED_LENGTH",
    "EXTENDED_KEY",
    "CHECK_FAILED",
    "REREAD_FAILED",
    "BACKUP_UNREADABLE",
    "LIBRARY_MISMATCH",
  ]);
  console.error(known.has(code) ? code : "FAILED");
  process.exit(1);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const args = process.argv.slice(2);
  try {
    if (args.length === 1 && args[0] === "--check-deps") {
      const report = dependencyReport();
      console.log(`node: ${report.node}`);
      console.log(`@scure/bip32: ${report.bip32}`);
      console.log(`viem: ${report.viem}`);
      console.log(`public_version: ${report.publicVersion}`);
      console.log(`private_version: ${report.privateVersion}`);
      console.log("prefixes: xpub xprv");
    } else if (args.length === 2 && args[0] === "--show-public") {
      const parsed = parseBundle(readFileSync(args[1], "utf8"));
      const checked = await depositKeyCheck(parsed.xpub, parsed.xprv);
      if (!checked.match || !checked.address) throw new Error("CHECK_FAILED");
      printPublic({ path: checked.path, address: checked.address });
    } else if (args.length === 2 && args[0] === "--out") {
      const seed = randomBytes(32);
      const created = await generateDepositKeys({ outPath: args[1], seed });
      printPublic(created);
      console.log(`backup: ${created.paths.bundle}`);
      console.log("mode: 600");
    } else {
      console.error(
        "Usage: node scripts/generate-deposit-extended-keys.mjs --check-deps | --out /media/usb/pvp-base.deposit-hd.txt | --show-public /media/usb/pvp-base.deposit-hd.txt",
      );
      process.exit(1);
    }
  } catch (error) {
    fail(error);
  }
}
