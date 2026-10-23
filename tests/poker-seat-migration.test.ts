import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const file = readFileSync(
  "supabase/migrations/20261021195500_poker_seat_presence_cards.sql",
  "utf8",
);

describe("poker seat presence migration", () => {
  it("terminates poker_table_state so the next statement is valid", () => {
    expect(file).toMatch(/end \$fn\$;\s*\n\s*drop function if exists public\.poker_heartbeat/i);
    expect(file).not.toMatch(/end \$fn\$\s*\n\s*drop function/i);
  });
});
