import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The slot, poker and pool styles load with their own pages (site cleanup, 2026-11-13). The
 * global stylesheet blocks the first paint of every page; with them in it, it was 244 kB
 * (38 kB compressed), and 2,100 of its 3,000 lines were for three games.
 */
const read = (path: string) => readFileSync(path, "utf8");
const global = read("src/styles.css");

const games = [
  {
    css: "src/components/slott/slott.css",
    prefix: "slott-",
    importers: ["src/components/slott/SlotCabinet.tsx"],
  },
  {
    css: "src/components/poker/poker.css",
    prefix: "poker-",
    importers: [
      "src/components/poker/PokerLobby.tsx",
      "src/components/poker/PokerRoom.tsx",
      "src/components/poker/TableScreen.tsx",
      "src/components/poker/DealerGallery.tsx",
    ],
  },
  {
    css: "src/components/pool/pool.css",
    prefix: "pool-",
    importers: ["src/components/pool/PoolTable.tsx"],
  },
];

/** Every selector's classes, comments and declarations stripped. */
function selectors(css: string): string[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...bare.matchAll(/([^{};]+)\{/g)]
    .map((m) => m[1]!.trim())
    .filter((s) => !s.startsWith("@") && !/^(from|to|[\d.%,\s]+)$/.test(s));
}

describe("route stylesheets", () => {
  for (const game of games)
    it(`${game.css} is loaded by its game and scoped to it`, () => {
      const css = read(game.css);
      for (const file of game.importers)
        expect(read(file), file).toMatch(new RegExp(`import "\\./${game.css.split("/").pop()}";`));
      for (const sel of selectors(css))
        expect(sel, `${game.css}: ${sel}`).toMatch(
          /\.(slott-|poker-|pool-|dealer-gallery)|\[data-/,
        );
    });

  it("leaves only the shared hooks in the global stylesheet", () => {
    const rules = selectors(global).join("\n");
    // The dark scope the slot cabinet inherits and the noscroll class the root sets before
    // the slot route's styles arrive.
    expect(rules.match(/\.slott-[\w-]+/g)?.sort()).toEqual(
      [".slott-cabinet", ".slott-cabinet", ".slott-fx", ".slott-fx", ".slott-noscroll"].sort(),
    );
    // The buy-in dialog opens from the lobby and the table.
    expect(new Set(rules.match(/\.poker-[\w-]+/g))).toEqual(
      new Set([".poker-buyin", ".poker-slider"]),
    );
    expect(rules).not.toMatch(/\.pool-/);
    expect(global.length).toBeLessThan(80_000);
  });
});
