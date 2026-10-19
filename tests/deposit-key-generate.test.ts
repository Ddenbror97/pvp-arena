import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deriveDepositAddressV2 } from "../src/lib/crypto/addresses.server";
import { spendableAddressFromXprv } from "../src/lib/crypto/deposit-sweep";
import {
  decryptBundle,
  generateDepositKeys,
  openDepositBackup,
  repoRoot,
} from "../scripts/generate-deposit-extended-keys.mjs";
import { depositKeyCheck } from "../scripts/verify-deposit-extended-keys.mjs";

const PASSPHRASE = "disposable-test-passphrase";
const dirs: string[] = [];

function disposableSeed(mark: number) {
  const seed = new Uint8Array(32);
  seed[0] = mark;
  seed[31] = 0xa5;
  return seed;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("deposit HD generator", () => {
  it("encrypts the backup and the child key signs the version-2 address", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pvp-deposit-hd-"));
    dirs.push(dir);
    const out = join(dir, "pvp-base.deposit-hd.txt");
    const seed = disposableSeed(7);
    const created = await generateDepositKeys({ outPath: out, seed, passphrase: PASSPHRASE });
    expect(seed.every((byte) => byte === 0)).toBe(true);
    expect(created.path).toBe("m/0/8453/0");
    expect(statSync(created.paths.bundle).mode & 0o777).toBe(0o600);

    const stored = readFileSync(created.paths.bundle, "utf8");
    expect(stored.startsWith("PVP-DEPOSIT-HD-1\n")).toBe(true);
    const opened = await openDepositBackup(stored, PASSPHRASE);
    expect(stored.includes(opened.xprv)).toBe(false);
    expect(stored.includes(opened.xpub)).toBe(false);
    expect(opened.address).toBe(created.address);

    for (const index of [0, 1, 41]) {
      const checked = await depositKeyCheck(opened.xpub, opened.xprv, `m/0/8453/${index}`);
      const fromPub = deriveDepositAddressV2(opened.xpub, 8453, index);
      const fromPriv = spendableAddressFromXprv(opened.xprv, 8453, index);
      expect(checked).toEqual({ match: true, address: fromPub, path: `m/0/8453/${index}` });
      expect(fromPriv).toBe(fromPub);
    }
    expect(deriveDepositAddressV2(opened.xpub, 8453, 0)).not.toBe(
      deriveDepositAddressV2(opened.xpub, 8453, 1),
    );
    expect(() => decryptBundle(stored, "wrong-passphrase-value")).toThrow(/DECRYPT_FAILED/);
  });

  it("refuses the repository and synced Windows folders", async () => {
    await expect(
      generateDepositKeys({
        outPath: join(repoRoot(), "pvp-base.deposit-hd.txt"),
        seed: disposableSeed(8),
        passphrase: PASSPHRASE,
      }),
    ).rejects.toThrow(/REFUSING_REPO_PATH/);

    for (const folder of ["Desktop", "Downloads", "Documents", "OneDrive", "Dropbox"]) {
      const out = join(tmpdir(), folder, "pvp-base.deposit-hd.txt");
      await expect(
        generateDepositKeys({ outPath: out, seed: disposableSeed(9), passphrase: PASSPHRASE }),
      ).rejects.toThrow(/REFUSING_SYNCED_PATH/);
      expect(() => statSync(out)).toThrow();
    }
  });

  it("does not write a backup when the passphrase cannot be prompted", () => {
    const dir = mkdtempSync(join(tmpdir(), "pvp-deposit-hd-"));
    dirs.push(dir);
    const out = join(dir, "pvp-base.deposit-hd.txt");
    const run = spawnSync(process.execPath, ["scripts/generate-deposit-extended-keys.mjs", "--out", out], {
      encoding: "utf8",
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("PASSPHRASE_REQUIRED");
    expect(`${run.stdout}${run.stderr}`).not.toMatch(/\bxprv[1-9A-HJ-NP-Za-km-z]+\b/);
    expect(() => statSync(out)).toThrow();
  });

  it("checks the installed libraries without creating a key", () => {
    const run = spawnSync(process.execPath, ["scripts/generate-deposit-extended-keys.mjs", "--check-deps"], {
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("@scure/bip32: 2.4.0");
    expect(run.stdout).toContain("viem: 2.56.9");
    expect(run.stdout).toContain("public_version: 0488b21e");
    expect(run.stdout).toContain("private_version: 0488ade4");
    expect(run.stdout).toContain("prefixes: xpub xprv");
    expect(`${run.stdout}${run.stderr}`).not.toMatch(/\bxprv[1-9A-HJ-NP-Za-km-z]+\b/);
  });
});
