import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HDKey } from "@scure/bip32";
import { afterEach, describe, expect, it } from "vitest";
import { deriveDepositAddressV2 } from "../src/lib/crypto/addresses.server";
import { spendableAddressFromXprv } from "../src/lib/crypto/deposit-sweep";
import {
  generateDepositKeys,
  outputPaths,
  repoRoot,
} from "../scripts/generate-deposit-extended-keys.mjs";
import { depositKeyCheck } from "../scripts/verify-deposit-extended-keys.mjs";

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

describe("offline deposit HD generator", () => {
  it("writes a mode-600 backup outside the repo and the child key signs that address", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pvp-deposit-hd-"));
    dirs.push(dir);
    const out = join(dir, "pvp-base.deposit-hd.txt");
    const seed = disposableSeed(7);
    const created = await generateDepositKeys({ outPath: out, seed });
    expect(seed.every((byte) => byte === 0)).toBe(true);
    expect(created.path).toBe("m/0/8453/0");
    expect(created.address).toMatch(/^0x[0-9a-fA-F]{40}$/);

    for (const path of [created.paths.bundle, created.paths.xpub, created.paths.xprv]) {
      expect(statSync(path).mode & 0o777).toBe(0o600);
    }
    const bundle = readFileSync(created.paths.bundle, "utf8");
    const xpub = readFileSync(created.paths.xpub, "utf8").trim();
    const xprv = readFileSync(created.paths.xprv, "utf8").trim();
    expect(bundle.includes(xprv)).toBe(true);
    expect(xpub.startsWith("xpub")).toBe(true);
    expect(xprv.startsWith("xprv")).toBe(true);

    for (const index of [0, 1, 41]) {
      const checked = await depositKeyCheck(xpub, xprv, `m/0/8453/${index}`);
      const fromPub = deriveDepositAddressV2(xpub, 8453, index);
      const fromPriv = spendableAddressFromXprv(xprv, 8453, index);
      expect(checked).toEqual({ match: true, address: fromPub, path: `m/0/8453/${index}` });
      expect(fromPriv).toBe(fromPub);
    }
    expect(deriveDepositAddressV2(xpub, 8453, 0)).not.toBe(deriveDepositAddressV2(xpub, 8453, 1));
  });

  it("refuses to write inside the repository", async () => {
    const inside = join(repoRoot(), "pvp-base.deposit-hd.txt");
    await expect(generateDepositKeys({ outPath: inside, seed: disposableSeed(8) })).rejects.toThrow(
      /REFUSING_REPO_PATH/,
    );
    expect(() => statSync(inside)).toThrow();
  });

  it("the command prints the address and does not print the extended keys", () => {
    const dir = mkdtempSync(join(tmpdir(), "pvp-deposit-hd-"));
    dirs.push(dir);
    const out = join(dir, "pvp-base.deposit-hd.txt");
    const run = spawnSync(process.execPath, ["scripts/generate-deposit-extended-keys.mjs", "--out", out], {
      encoding: "utf8",
    });
    const output = `${run.stdout}${run.stderr}`;
    expect(run.status).toBe(0);
    expect(output).toMatch(/match: true\npath: m\/0\/8453\/0\naddress: 0x[0-9a-fA-F]{40}\n/);
    expect(output).toContain("mode: 600");
    expect(output).not.toMatch(/\bxprv[1-9A-HJ-NP-Za-km-z]+\b/);
    expect(output).not.toMatch(/\bxpub[1-9A-HJ-NP-Za-km-z]+\b/);

    const paths = outputPaths(out);
    const xpub = readFileSync(paths.xpub, "utf8").trim();
    const xprv = readFileSync(paths.xprv, "utf8").trim();
    const shown = spawnSync(
      process.execPath,
      ["scripts/generate-deposit-extended-keys.mjs", "--show-public", paths.bundle],
      { encoding: "utf8" },
    );
    const shownOut = `${shown.stdout}${shown.stderr}`;
    expect(shown.status).toBe(0);
    expect(shownOut).toContain(`address: ${deriveDepositAddressV2(xpub, 8453, 0)}`);
    expect(shownOut).not.toContain(xprv);
    expect(shownOut).not.toContain(xpub);
    expect(HDKey.fromExtendedKey(xpub).publicExtendedKey).toBe(xpub);
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
