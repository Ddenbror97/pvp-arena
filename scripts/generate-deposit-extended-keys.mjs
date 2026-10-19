/**
 * Creates a new Base deposit HD master.
 * Uses a fresh 32-byte seed. Does not read MetaMask seeds or payout keys.
 * The backup file is encrypted. The xprv is not printed and is not written in plaintext.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
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
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HDKey } from "@scure/bip32";
import { depositKeyCheck } from "./verify-deposit-extended-keys.mjs";

export const BITCOIN_MAINNET_PUBLIC = 0x0488b21e;
export const BITCOIN_MAINNET_PRIVATE = 0x0488ade4;
const CHECK_INDEXES = [0, 1];
const SCRYPT = { cost: 32768, blockSize: 8, parallelization: 1, maxmem: 64 * 1024 * 1024 };
const BLOCKED_SEGMENTS = new Set([
  "downloads",
  "desktop",
  "documents",
  "onedrive",
  "dropbox",
  "google drive",
  "googledrive",
  "my drive",
  "iclouddrive",
  "icloud drive",
]);

export function repoRoot() {
  return resolve(fileURLToPath(new URL("..", import.meta.url)));
}

export function outputPaths(outPath) {
  const bundle = resolve(outPath);
  if (!bundle.endsWith(".deposit-hd.txt")) throw new Error("OUTPUT_NAME");
  return { bundle };
}

export function assertOutsideRepo(paths, root = repoRoot()) {
  for (const target of Object.values(paths)) {
    const rel = relative(root, target);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
      throw new Error("REFUSING_REPO_PATH");
    }
  }
}

export function assertSafeOutputPath(paths, root = repoRoot()) {
  assertOutsideRepo(paths, root);
  for (const target of Object.values(paths)) {
    for (const part of target.split(/[\\/]/)) {
      const name = part.toLowerCase();
      if (BLOCKED_SEGMENTS.has(name) || name.includes("onedrive") || name.includes("dropbox")) {
        throw new Error("REFUSING_SYNCED_PATH");
      }
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
    try {
      fchmodSync(fd, 0o600);
    } catch {
      /* Windows keeps the file private with the passphrase, not a Unix mode. */
    }
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

function encryptPlaintext(plain, passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < 16) throw new Error("PASSPHRASE_TOO_SHORT");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32, SCRYPT);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  key.fill(0);
  return [
    "PVP-DEPOSIT-HD-1",
    "kdf scrypt",
    `n ${SCRYPT.cost}`,
    `r ${SCRYPT.blockSize}`,
    `p ${SCRYPT.parallelization}`,
    `salt ${salt.toString("base64")}`,
    `iv ${iv.toString("base64")}`,
    `tag ${tag.toString("base64")}`,
    `data ${data.toString("base64")}`,
    "",
  ].join("\n");
}

export function decryptBundle(fileText, passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < 16) throw new Error("PASSPHRASE_TOO_SHORT");
  const fields = new Map();
  for (const line of fileText.split(/\n/)) {
    const space = line.indexOf(" ");
    if (space > 0) fields.set(line.slice(0, space), line.slice(space + 1).trim());
  }
  if (!fileText.startsWith("PVP-DEPOSIT-HD-1\n")) throw new Error("BACKUP_UNREADABLE");
  if (fields.get("kdf") !== "scrypt") throw new Error("BACKUP_UNREADABLE");
  const salt = Buffer.from(fields.get("salt") ?? "", "base64");
  const iv = Buffer.from(fields.get("iv") ?? "", "base64");
  const tag = Buffer.from(fields.get("tag") ?? "", "base64");
  const data = Buffer.from(fields.get("data") ?? "", "base64");
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || data.length === 0) {
    throw new Error("BACKUP_UNREADABLE");
  }
  const key = scryptSync(passphrase, salt, 32, {
    cost: Number(fields.get("n")),
    blockSize: Number(fields.get("r")),
    parallelization: Number(fields.get("p")),
    maxmem: SCRYPT.maxmem,
  });
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return parseBundle(plain);
  } catch {
    throw new Error("DECRYPT_FAILED");
  } finally {
    key.fill(0);
  }
}

export async function generateDepositKeys({ outPath, seed, passphrase, root = repoRoot() }) {
  const paths = outputPaths(outPath);
  assertSafeOutputPath(paths, root);
  if (!missing(paths.bundle)) throw new Error("OUTPUT_EXISTS");
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
  const plain = [
    "# Base deposit HD backup",
    "# Bitcoin mainnet BIP32 from a new 32-byte seed. This is not a MetaMask wallet.",
    "# Child path: m/0/8453/<index>",
    `# address_m_0_8453_0 ${address}`,
    `xpub ${created.xpub}`,
    `xprv ${created.xprv}`,
    "",
  ].join("\n");
  const encrypted = `${encryptPlaintext(plain, passphrase)}address_m_0_8453_0 ${address}\n`;
  try {
    writeExclusive(paths.bundle, encrypted);
    const stored = readFileSync(paths.bundle, "utf8");
    if (stored.includes(created.xprv) || stored.includes(created.xpub)) throw new Error("REREAD_FAILED");
    const again = decryptBundle(stored, passphrase);
    for (const index of CHECK_INDEXES) {
      const checked = await depositKeyCheck(again.xpub, again.xprv, `m/0/8453/${index}`);
      if (!checked.match) throw new Error("REREAD_FAILED");
      if (index === 0 && checked.address !== address) throw new Error("REREAD_FAILED");
    }
  } catch (error) {
    try {
      unlinkSync(paths.bundle);
    } catch {
      /* a missing file is already gone */
    }
    throw error;
  }
  return { address, path: "m/0/8453/0", paths };
}

export async function openDepositBackup(fileText, passphrase) {
  const opened = decryptBundle(fileText, passphrase);
  const checked = await depositKeyCheck(opened.xpub, opened.xprv, "m/0/8453/0");
  if (!checked.match || !checked.address) throw new Error("CHECK_FAILED");
  const recorded = fileText
    .split(/\n/)
    .find((line) => line.startsWith("address_m_0_8453_0 "));
  if (recorded && recorded.slice("address_m_0_8453_0 ".length).trim() !== checked.address) {
    throw new Error("CHECK_FAILED");
  }
  return { xpub: opened.xpub, xprv: opened.xprv, address: checked.address, path: checked.path };
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

function readHidden(prompt) {
  return new Promise((resolvePrompt, rejectPrompt) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      rejectPrompt(new Error("PASSPHRASE_REQUIRED"));
      return;
    }
    process.stderr.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          input.setRawMode(false);
          input.pause();
          input.removeListener("data", onData);
          rejectPrompt(new Error("ABORTED"));
          return;
        }
        if (char === "\r" || char === "\n") {
          input.setRawMode(false);
          input.pause();
          input.removeListener("data", onData);
          process.stderr.write("\n");
          resolvePrompt(value);
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    input.on("data", onData);
  });
}

async function promptPassphrase(confirm) {
  const first = await readHidden("Passphrase: ");
  if (first.length < 16) throw new Error("PASSPHRASE_TOO_SHORT");
  if (!confirm) return first;
  const second = await readHidden("Passphrase again: ");
  if (first !== second) throw new Error("PASSPHRASE_MISMATCH");
  return first;
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
    "REFUSING_SYNCED_PATH",
    "OUTPUT_EXISTS",
    "OUTPUT_DIR_MISSING",
    "SEED_LENGTH",
    "EXTENDED_KEY",
    "CHECK_FAILED",
    "REREAD_FAILED",
    "BACKUP_UNREADABLE",
    "LIBRARY_MISMATCH",
    "PASSPHRASE_REQUIRED",
    "PASSPHRASE_TOO_SHORT",
    "PASSPHRASE_MISMATCH",
    "DECRYPT_FAILED",
    "ABORTED",
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
      const passphrase = await promptPassphrase(false);
      const opened = await openDepositBackup(readFileSync(args[1], "utf8"), passphrase);
      printPublic(opened);
    } else if (args.length === 4 && args[0] === "--emit" && args[2] === "--in") {
      const which = args[1];
      if (which !== "xpub" && which !== "xprv") throw new Error("BACKUP_UNREADABLE");
      const passphrase = await promptPassphrase(false);
      const opened = await openDepositBackup(readFileSync(args[3], "utf8"), passphrase);
      process.stdout.write(opened[which]);
    } else if (args.length === 2 && args[0] === "--out") {
      const passphrase = await promptPassphrase(true);
      const seed = randomBytes(32);
      const created = await generateDepositKeys({ outPath: args[1], seed, passphrase });
      printPublic(created);
      console.log(`backup: ${created.paths.bundle}`);
      console.log("encrypted: aes-256-gcm");
    } else {
      console.error(
        "Usage: node scripts/generate-deposit-extended-keys.mjs --check-deps | --out <outside-synced-folders>\\pvp-base.deposit-hd.txt | --show-public <file> | --emit xpub|xprv --in <file>",
      );
      process.exit(1);
    }
  } catch (error) {
    fail(error);
  }
}
