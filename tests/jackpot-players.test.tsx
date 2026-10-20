import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlayerAvatar } from "../src/components/jackpot/Avatar";
import { PlayerList } from "../src/components/jackpot/PlayerList";
import { reservedCrownHeadroom } from "../src/components/prestige/PlayerPrestigeIdentity";
import type { PlayerRow } from "../src/lib/jackpot/api";
import { jackpotPlayerLinks } from "../src/lib/jackpot/player-paint";
import type { JackpotPaint } from "../src/lib/first-paint";

const FACE = "https://api.dicebear.com/9.x/shapes/svg?seed=Jimmy";

function player(name: string, amount: number): PlayerRow {
  return {
    game_id: 1,
    user_id: name,
    total_amount: amount,
    entry_count: 1,
    first_entry_at: "2026-10-20T17:00:00.000Z",
    profiles: { username: name, avatar_url: FACE },
  };
}

describe("jackpot players paint with the page", () => {
  it("puts the face in the document instead of hiding it until hydration", () => {
    const html = renderToStaticMarkup(<PlayerAvatar src={FACE} name="Jimmy" priority />);
    expect(html).toContain("<img");
    expect(html).not.toContain("opacity-0");
    expect(html).toContain('loading="eager"');
    expect(html.toLowerCase()).toContain('fetchpriority="high"');
  });

  it("reserves crown headroom on every player row before the identity arrives", () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <PlayerList players={[player("Jimmy", 1000)]} pot={1000} meId={null} />
      </QueryClientProvider>,
    );
    expect(html).toContain(`padding-top:${reservedCrownHeadroom(32)}px`);
    expect(html).toContain("Jimmy");
    expect(html).not.toContain("opacity-0");
  });

  it("holds the list open at the seated count while players are still loading", () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <PlayerList players={[]} pot={0} meId={null} pending reserveCount={3} />
      </QueryClientProvider>,
    );
    expect(html.match(/aria-hidden="true"/g)?.length).toBe(3);
    expect(html).toContain(`padding-top:${reservedCrownHeadroom(32)}px`);
    expect(html).not.toContain("No players yet");
  });

  it("preloads the faces and cosmetics already in the document", () => {
    const paint = {
      game: null,
      players: {
        data: [player("Ada", 500), player("Bea", 1500)],
        at: 1,
      },
      recent: null,
      chat: null,
      identities: {
        ids: ["Bea"],
        rows: [{ user_id: "Bea", level: 4, tier: "Bronze", frame: "bronze", crown: "crown-gold" }],
      },
    } satisfies JackpotPaint;
    const links = jackpotPlayerLinks(paint);
    expect(links[0]?.href).toBe(FACE);
    expect(links.map((link) => link.href).some((href) => href.includes("frame-bronze"))).toBe(true);
    expect(links.map((link) => link.href).some((href) => href.includes("crown-gold"))).toBe(true);
    expect(links.every((link) => link.rel === "preload" && link.fetchPriority === "high")).toBe(
      true,
    );
  });
});
