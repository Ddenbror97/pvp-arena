import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("pool cleanup", () => {
  it("drops leftover lobby art and the old leave dialog", () => {
    expect(existsSync(new URL("../src/assets/pool/hero.webp", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../src/assets/pool/room.webp", import.meta.url))).toBe(true);
    expect(existsSync(new URL("../src/assets/pool/table.webp", import.meta.url))).toBe(true);

    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(css).not.toContain("pool-confirm");
    expect(css).not.toContain("pool-leave-stay");
    expect(css).not.toContain("pool-leave-go");
    expect(css).not.toContain(".pool-create");
    expect(css).toContain(".pool-closed {");
    expect(css).toContain(".pool-closed-card a {");

    const api = readFileSync(new URL("../src/lib/pool/api.ts", import.meta.url), "utf8");
    expect(api).not.toContain("poolLeave");
    expect(api).toContain('db.rpc("pool_state"');

    const copy = readFileSync(new URL("../src/lib/pool/copy.ts", import.meta.url), "utf8");
    expect(copy).not.toContain("POCKET_LABELS");
    expect(copy).toContain("export function formatCents");

    const match = readFileSync(
      new URL("../src/components/pool/PoolMatch.tsx", import.meta.url),
      "utf8",
    );
    expect(match).not.toContain("function dollars");
    expect(match).toContain("formatCents");
    expect(match).toContain("heldRack ??");

    const leave = readFileSync(
      new URL("../supabase/migrations/20261028142221_pool_leave_forfeit.sql", import.meta.url),
      "utf8",
    );
    expect(leave).toContain("pool_leave");
  });
});
