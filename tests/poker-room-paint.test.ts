import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("poker room paint", () => {
  const room = readFileSync(
    new URL("../src/components/poker/PokerRoom.tsx", import.meta.url),
    "utf8",
  );
  const route = readFileSync(new URL("../src/routes/poker.$tableId.tsx", import.meta.url), "utf8");
  const table = readFileSync(
    new URL("../src/components/poker/PokerTable.tsx", import.meta.url),
    "utf8",
  );
  const screen = readFileSync(
    new URL("../src/components/poker/TableScreen.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const lobby = readFileSync(new URL("../src/routes/poker.tsx", import.meta.url), "utf8");
  const assets = readFileSync(new URL("../src/lib/poker/assets.ts", import.meta.url), "utf8");

  it("decodes one penthouse and leaves it mounted behind the table", () => {
    expect(room).toContain("warmPokerRoom()");
    expect(room).toContain('decoding="sync"');
    expect(room).toContain('fetchPriority="high"');
    expect(route.indexOf("<PokerRoom />")).toBeGreaterThan(-1);
    expect(route.indexOf("<PokerRoom />")).toBeLessThan(route.indexOf("<ClientOnly"));
    expect(route.match(/<PokerRoom \/>/g)?.length).toBe(1);
    expect(table).not.toContain("PokerRoom");
    expect(screen).not.toContain("PokerRoom");
    expect(css).toContain("background: transparent;");
    expect(lobby).toContain("href: POKER_ROOM");
    expect(assets).toContain('img.fetchPriority = "high"');
    expect(assets).toContain('img.decoding = "sync"');
  });
});
