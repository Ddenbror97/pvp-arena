import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const consumers = [
  ["connect-evm utils", require.resolve("@metamask/connect-evm")],
  ["mobile-client utils", require.resolve("@metamask/mobile-wallet-protocol-dapp-client")],
] as const;

describe.each(consumers)("patched UUID contract: %s", (_, entry) => {
  const utilsPackage = createRequire(entry).resolve("@metamask/utils/package.json");
  const fromUtils = createRequire(utilsPackage);
  const uuidPackage = fromUtils.resolve("uuid/package.json");
  const uuid = fromUtils("uuid") as typeof import("uuid");

  it("resolves the patched upstream package through the actual consumer", () => {
    expect(JSON.parse(readFileSync(uuidPackage, "utf8")).version).toBe("11.1.1");
  });

  it.each(["cjs", "mjs"])(
    "loads the actual %s filesystem caller and generates unique v4 paths",
    async (mode) => {
      const file = join(dirname(utilsPackage), "dist", `fs.${mode}`);
      const helper = mode === "cjs" ? fromUtils(file) : await import(pathToFileURL(file).href);
      const names = Array.from({ length: 32 }, () =>
        basename(helper.createSandbox("pvp-uuid-contract").directoryPath),
      );
      expect(new Set(names).size).toBe(32);
      for (const name of names) {
        expect(uuid.validate(name)).toBe(true);
        expect(uuid.version(name)).toBe(4);
      }
    },
  );

  it("preserves v4 random and caller-buffer behavior used by the SDK ecosystem", () => {
    const random = Uint8Array.from({ length: 16 }, (_, i) => i);
    const expected = "00010203-0405-4607-8809-0a0b0c0d0e0f";
    expect(uuid.v4({ random: new Uint8Array(random) })).toBe(expected);
    const buffer = new Uint8Array(24).fill(0x5a);
    expect(uuid.v4({ random: new Uint8Array(random) }, buffer, 4)).toBe(buffer);
    expect(uuid.stringify(buffer, 4)).toBe(expected);
    expect([...buffer.slice(0, 4), ...buffer.slice(20)]).toEqual(Array(8).fill(0x5a));
  });

  it.each(["v3", "v5", "v6"] as const)(
    "%s rejects advisory buffer cases without partial writes",
    (method) => {
      for (const [size, offset] of [
        [8, 0],
        [32, -1],
        [32, 20],
      ]) {
        const buffer = new Uint8Array(size).fill(0x5a);
        const before = new Uint8Array(buffer);
        const invoke = () =>
          method === "v6"
            ? uuid.v6({}, buffer, offset)
            : uuid[method]("pvp-uuid-contract", uuid[method].DNS, buffer, offset);
        expect(invoke).toThrow(RangeError);
        expect(buffer).toEqual(before);
      }
    },
  );
});
