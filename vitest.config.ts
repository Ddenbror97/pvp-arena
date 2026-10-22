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
    testTimeout: 15000,
    // Every database file rebuilds the same pvp_test schema. Those files must
    // run one at a time. Frontend and unit tests do not share that schema, so
    // they keep the default worker pool.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
          exclude: ["tests/db/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          fileParallelism: false,
          maxWorkers: 1,
        },
      },
    ],
  },
});
