import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("coinflip room plate", () => {
  const route = readFileSync(new URL("../src/routes/coinflip.tsx", import.meta.url), "utf8");
  const game = readFileSync(new URL("../src/routes/coinflip.$gameId.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const open = readFileSync(
    new URL("../src/components/coinflip/OpenGames.tsx", import.meta.url),
    "utf8",
  );
  const room = readFileSync(
    new URL("../src/components/coinflip/CoinflipRoom.tsx", import.meta.url),
    "utf8",
  );
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  const paint = readFileSync(new URL("../src/lib/first-paint.ts", import.meta.url), "utf8");

  it("keeps the lobby on screen and opens a match in a popup", () => {
    expect(route).toContain("<Lobby />");
    expect(route).toContain("<Dialog");
    expect(route).toContain("cf-duel-card");
    expect(route).toContain('to: "/coinflip"');
    expect(route).not.toContain("cf-home-match");
    expect(route).toContain("cf-room");
    expect(route).toContain('rel: "preload"');
    expect(route).toContain("xl:h-[34rem]");
    expect(game).toContain('rel: "preload"');
    expect(game).toContain("@/assets/coinflip/room.webp");
    expect(css).toContain("html:has(.jp-home)::before");
    expect(css).toContain("html:has(.cf-home)::before");
    expect(css).toContain(".cf-duel-card .cf-game-window");
    expect(css).not.toContain(".cf-match-screen");
    expect(css).not.toContain("cf-home-match");
    expect(root).not.toContain("cf-match-screen");
    expect(root).not.toContain("coinflipMatch");
    expect(paint).toContain("/^\\/coinflip\\/[^/]+\\/?$/");
  });

  it("leaves the open-game row and the match stage clear of the room", () => {
    expect(open.match(/cf-game-window/g)?.length).toBe(2);
    expect(room).toContain("cf-game-window");
    const rule = css.slice(css.indexOf(".cf-home .cf-game-window"));
    expect(rule).toMatch(/background-color:\s*transparent/);
    expect(rule).toMatch(/backdrop-filter:\s*none/);
  });
});
