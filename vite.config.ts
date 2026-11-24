// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { emitGuideAssets } from "./scripts/emit-guide-assets";
import { emitBrAssetHashes, emitFpsAssetHashes } from "./scripts/emit-br-asset-hashes";

const DEV_WASM = "\0dev-wasm-module:";
// One id per build (src/lib/build-freshness.ts): baked into the client and published at
// /build.json, so a page left open across a deploy can tell and reload itself. Made once per
// process, so every build in it (client and server) agrees with the file.
const BUILD_ID = `${Date.now().toString(36)}-${createHash("sha256").update(String(Math.random())).digest("hex").slice(0, 8)}`;
let serving = false;

export default defineConfig({
  vite: {
    // This repo also has historical Bun locks. Tie npm's development optimizer
    // to the lockfile used by npm ci so stale Router exports cannot survive updates.
    cacheDir:
      ".wrangler/vite-" +
      createHash("sha256")
        .update(readFileSync(new URL("./package-lock.json", import.meta.url)))
        .digest("hex")
        .slice(0, 12),
    server: { watch: { ignored: ["**/.wrangler/**", "**/test-results/**", "**/.output/**"] } },
    plugins: [
      {
        name: "require-browser-supabase-config",
        configResolved(config) {
          if (config.command !== "build") return;
          const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter(
            (name) => !config.env[name]?.trim(),
          );
          if (missing.length)
            throw new Error(
              `Browser build requires ${missing.join(", ")}. Load the intended environment before building; Worker runtime variables cannot configure an already-built browser bundle.`,
            );
        },
      },
      {
        name: "build-id",
        config(_config, { command }) {
          const file = new URL("./public/build.json", import.meta.url);
          if (command !== "build") {
            rmSync(file, { force: true });
            return undefined;
          }
          writeFileSync(file, JSON.stringify({ id: BUILD_ID }));
          return { define: { __APP_BUILD__: JSON.stringify(BUILD_ID) } };
        },
      },
      {
        name: "guide-bodies",
        async config() {
          await emitGuideAssets();
        },
      },
      {
        // What is deployed under public/fps/br, by content: a Battle Royale match then reuses
        // the browser's stored copy of every file that is still the deployed one, instead of
        // asking the server about each of ~2,900 files (src/lib/fps/br/asset-download.ts).
        // Builds only (which also tells the game there is a list to ask for); a development
        // server removes a leftover list.
        name: "br-asset-hashes",
        config(_config, { command }) {
          emitBrAssetHashes(command === "build");
          // And the other modes' files (src/lib/fps/asset-cache.ts), the same way.
          emitFpsAssetHashes(command === "build");
          return command === "build"
            ? { define: { __BR_ASSET_HASHES__: "true", __FPS_ASSET_HASHES__: "true" } }
            : undefined;
        },
      },
      {
        // Avatar codecs import precompiled WebAssembly (`*.wasm?module`). In builds Vite
        // leaves them as imports and Nitro's WASM support turns them into Worker wasm
        // modules; the Node dev server compiles them from disk instead.
        name: "wasm-modules",
        enforce: "pre",
        configResolved(config) {
          serving = config.command === "serve";
        },
        async resolveId(id, importer) {
          if (!/\.wasm\?module$/.test(id)) return null;
          const file = await this.resolve(id.slice(0, -"?module".length), importer, {
            skipSelf: true,
          });
          if (!file) return null;
          const path = file.id.replace(/\\/g, "/");
          return serving ? DEV_WASM + path : { id: `${path}?module`, external: true };
        },
        load(id) {
          if (!id.startsWith(DEV_WASM)) return null;
          const path = JSON.stringify(id.slice(DEV_WASM.length));
          return `import { readFileSync, rmSync, writeFileSync } from "node:fs";\nexport default new WebAssembly.Module(readFileSync(${path}));`;
        },
      },
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
