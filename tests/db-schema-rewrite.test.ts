import { expect, it } from "vitest";
import { buildTestSchemaSql } from "./db/schema";

it("keeps compact and spaced migration search paths inside the isolated schema", () => {
  const sql = buildTestSchemaSql();
  expect(sql).not.toMatch(/\bsearch_path\s*=\s*public\b/i);
  const start = sql.indexOf("create function pvp_test.fps_practice_start");
  expect(start).toBeGreaterThan(0);
  expect(sql.slice(start, start + 200)).toContain("search_path = pvp_test");
  expect(sql).toContain("alter function pvp_test.fps_view(uuid) set schema pvp_test_fps_private");
  // The recovered production-only schema cleanup must not erase the test schema.
  // The harness legitimately drops it once before CREATE, never afterward.
  const afterCreation = sql.slice(sql.indexOf("create schema pvp_test;"));
  expect(/drop\s+schema\s+if\s+exists\s+pvp_test\s+cascade/i.test(afterCreation)).toBe(false);
});
