// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const DEV_WASM = "\0dev-wasm-module:";
let serving = false;

export default defineConfig({
  vite: {
    plugins: [
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
          return `import { readFileSync } from "node:fs";\nexport default new WebAssembly.Module(readFileSync(${path}));`;
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
