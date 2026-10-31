import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Parallel staging/browser servers must not share dependency-optimizer state.
const server = await createServer({
  // Renderer tests import production modules directly; they do not require
  // TanStack's SSR middleware or the casino's route dependency scanner.
  configFile: false,
  optimizeDeps: {
    entries: ["tests/e2e/helpers/translation-fixture.tsx"],
    include: ["react", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
    exclude: ["three"],
  },
  resolve: {
    alias: { "@": new URL("../../src/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1") },
  },
  cacheDir:
    ".wrangler/preprod-fixture-vite-" +
    createHash("sha256").update(readFileSync("package-lock.json")).digest("hex").slice(0, 12),
  server: { host: "127.0.0.1", port: 4173, strictPort: true, watch: null },
});
await server.listen();
server.printUrls();
