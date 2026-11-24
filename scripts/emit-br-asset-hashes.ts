import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The fingerprints of everything deployed under public/fps/br, for the game's downloads
 * (src/lib/fps/br/asset-download.ts: a stored copy of a file is used without asking the server
 * only if its content has the fingerprint listed here).
 *
 * Written by the production build (vite.config.ts) from the very files it deploys, never
 * committed: a list that did not match the deployed files would only cost a second request
 * for each file that differs, but it would cost it on every match. A development server
 * removes it, so a file edited while it runs is never judged by an older list.
 *
 *   node --experimental-strip-types scripts/emit-br-asset-hashes.ts            write it
 *   node --experimental-strip-types scripts/emit-br-asset-hashes.ts --remove   remove it
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** As in asset-download.ts (BR_ASSET_HASHES, BR_ASSET_HASH_HEX); a test holds the two together. */
export const BR_ASSET_DIR = "public/fps/br";
export const BR_ASSET_HASHES_FILE = "asset-hashes.json";
const HASH_HEX = 12;

/** Each file under `dir` (but the list itself and the attribution notes) → its fingerprint. */
export function brAssetHashes(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (at: string, prefix: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) walk(join(at, entry.name), name + "/");
      else if (name !== BR_ASSET_HASHES_FILE && !name.endsWith(".md"))
        files[name] = createHash("sha1")
          .update(readFileSync(join(at, entry.name)))
          .digest("hex")
          .slice(0, HASH_HEX);
    }
  };
  walk(dir, "");
  return files;
}

/** Write the list for a build (`build`), or remove a leftover one; returns the files listed. */
export function emitBrAssetHashes(build: boolean, dir = resolve(root, BR_ASSET_DIR)): number {
  const out = join(dir, BR_ASSET_HASHES_FILE);
  if (!build) {
    rmSync(out, { force: true });
    return 0;
  }
  if (!existsSync(dir)) return 0;
  const files = brAssetHashes(dir);
  writeFileSync(out, JSON.stringify({ v: 1, files }) + "\n");
  return Object.keys(files).length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const listed = emitBrAssetHashes(!process.argv.includes("--remove"));
  console.log(
    listed
      ? `${BR_ASSET_DIR}/${BR_ASSET_HASHES_FILE}: ${listed} files`
      : `${BR_ASSET_DIR}/${BR_ASSET_HASHES_FILE} removed`,
  );
}
