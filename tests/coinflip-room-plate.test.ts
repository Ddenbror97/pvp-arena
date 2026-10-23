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
    expect(route).toContain('role="dialog"');
    expect(route).toContain("cf-duel-pop");
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

  it("uses the roulette live-chat window on coinflip and jackpot", () => {
    const roulette = readFileSync(new URL("../src/routes/roulette.tsx", import.meta.url), "utf8");
    const jackpot = readFileSync(
      new URL("../src/components/jackpot/JackpotStage.tsx", import.meta.url),
      "utf8",
    );
    expect(roulette).toContain('className="order-2 h-64 xl:order-1 xl:h-[34rem]"');
    expect(roulette).toContain("xl:grid-cols-[280px_minmax(0,1fr)]");
    expect(route).toContain(
      'className="order-3 h-64 lg:col-span-2 xl:order-1 xl:col-span-1 xl:h-[34rem] xl:min-h-0"',
    );
    expect(route).toContain("xl:grid-cols-[280px_minmax(0,1fr)_300px]");
    expect(route).not.toContain("h-72");
    expect(jackpot).toContain('className="order-4 h-64 xl:order-1 xl:h-[34rem] xl:min-h-0"');
    expect(jackpot).toContain("xl:grid-cols-[280px_minmax(0,1fr)_300px]");
    expect(jackpot).not.toContain("260px");
    expect(jackpot).not.toContain("h-72");
  });

  it("leaves the open-game row and the match stage clear of the room", () => {
    expect(open.match(/cf-game-window/g)?.length).toBe(2);
    expect(room).toContain("cf-game-window");
    const rule = css.slice(css.indexOf(".cf-home .cf-game-window"));
    expect(rule).toMatch(/background-color:\s*transparent/);
    expect(rule).toMatch(/backdrop-filter:\s*none/);
  });
});
