import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { watch: null },
  test: {
    // `vitest run` still inherits Vitest's TTY default of watch: true, which
    // leaves the file watcher open after a passing run. A single run must exit.
    watch: false,
    // Database files call testDatabaseUrl() and refuse SUPABASE_DB_URL.
    // Point TEST_DATABASE_URL at an isolated Postgres before running them.
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15000,
  },
});
