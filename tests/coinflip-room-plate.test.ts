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

  it("keeps one preloaded room behind the lobby and a match", () => {
    expect(route).not.toContain("if (child) return <Outlet />");
    expect(route).toContain("cf-home-match");
    expect(route).toContain("cf-room");
    expect(route).toContain('rel: "preload"');
    expect(route).toContain("xl:h-[34rem]");
    expect(game).toContain('rel: "preload"');
    expect(game).toContain("@/assets/coinflip/room.webp");
    expect(css).toContain("html:has(.jp-home)::before");
    expect(css).toContain("html:has(.cf-home)::before");
    expect(css).toContain("calc(34rem + 0.85rem + 1.25rem)");
  });

  it("leaves the open-game row and the match stage clear of the room", () => {
    expect(open.match(/cf-game-window/g)?.length).toBe(2);
    expect(room).toContain("cf-game-window");
    const rule = css.slice(css.indexOf(".cf-home .cf-game-window"));
    expect(rule).toMatch(/background-color:\s*transparent/);
    expect(rule).toMatch(/backdrop-filter:\s*none/);
  });
});
