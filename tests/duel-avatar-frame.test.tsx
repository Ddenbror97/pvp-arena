import { QueryClient } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvatarFrame } from "../src/components/prestige/frames";
import { identityRowsOnHand } from "../src/components/prestige/PrestigeProvider";
import type { PrestigeIdentity } from "../src/lib/prestige/api";

const gold: PrestigeIdentity = {
  user_id: "player-a",
  level: 4,
  tier: "Rookie",
  frame: "gold",
  crown: null,
};

describe("coinflip duel avatar frame", () => {
  it("reuses a frame stored under the lobby's wider identity key", () => {
    const qc = new QueryClient();
    qc.setQueryData(["prestige-identities", ["player-a", "player-b"]], [gold]);
    expect(identityRowsOnHand(qc, ["player-a"])).toEqual([gold]);
    expect(identityRowsOnHand(qc, ["missing"])).toBeUndefined();
  });

  it("loads a priority frame with the portrait instead of lazily", () => {
    const html = renderToStaticMarkup(<AvatarFrame assetKey="gold" priority />);
    expect(html).toContain('loading="eager"');
    expect(html).toContain('decoding="sync"');
    expect(html.toLowerCase()).toContain('fetchpriority="high"');
    const lazy = renderToStaticMarkup(<AvatarFrame assetKey="gold" />);
    expect(lazy).toContain('loading="lazy"');
  });

  it("keeps the duel portrait behind its frame", () => {
    const room = readFileSync(
      new URL("../src/components/coinflip/CoinflipRoom.tsx", import.meta.url),
      "utf8",
    );
    const lobby = readFileSync(new URL("../src/routes/coinflip.tsx", import.meta.url), "utf8");
    expect(room).toContain("priority");
    expect(room).toContain("warmCosmeticArt");
    expect(room).toContain("cosmeticArtReady");
    expect(lobby).toContain("warmCosmeticArt");
  });
});
