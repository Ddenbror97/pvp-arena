import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UsdcBalance } from "../src/components/wallet/HeaderWalletFrame";
import { paintSignedIn } from "../src/lib/auth-hint";
import {
  crownPlacement,
  reservedCrownHeadroom,
} from "../src/components/prestige/PlayerPrestigeIdentity";
import { CROWN_ASSET_KEYS, FRAME_ASSET_KEYS } from "../src/components/prestige/frames";
import {
  RAIL_DESKTOP_MIN,
  RAIL_TIGHT_MAX,
  STRIP_COIN,
  railBoxHeight,
  stripMetrics,
} from "../src/components/roulette/strip-motion";

describe("hard-refresh layout reserves", () => {
  it("reserves the tallest crown so a late identity cannot grow a chat row", () => {
    const size = 32;
    const reserved = reservedCrownHeadroom(size);
    expect(reserved).toBeGreaterThan(0);
    for (const crown of CROWN_ASSET_KEYS) {
      expect(reserved).toBeGreaterThanOrEqual(crownPlacement(size, undefined, crown).headroom);
      for (const frame of FRAME_ASSET_KEYS) {
        expect(reserved).toBeGreaterThanOrEqual(crownPlacement(size, frame, crown).headroom);
      }
    }
  });

  it("sizes the roulette rail from the same breakpoints as the stylesheet", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(RAIL_DESKTOP_MIN).toBe(464);
    expect(RAIL_TIGHT_MAX).toBe(288);
    expect(css).toContain("(max-width: 463.98px)");
    expect(css).toContain("(max-width: 287.98px)");
    expect(css).toContain("--rail-coin: 108px");
    expect(railBoxHeight(stripMetrics(800))).toBe(STRIP_COIN + 16);
    const phone = stripMetrics(400);
    expect(phone.compact).toBe(true);
    expect(phone.gap).toBe(8);
    expect(railBoxHeight(phone)).toBe(phone.coin + 28);
    expect(stripMetrics(200).gap).toBe(4);
    expect(stripMetrics(RAIL_DESKTOP_MIN).compact).toBe(false);
  });

  it("keeps the header balance in the same box as its loading pulse", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(css).toContain(".header-wallet-amount");
    expect(css).toMatch(/\.header-wallet-amount\s*\{[^}]*min-width:\s*4\.75rem/);
    expect(css).toContain('url("./fonts/unbounded-latin.woff2")');
    expect(css).toContain('url("./fonts/manrope-latin.woff2")');
    expect(css).not.toContain("fonts.gstatic.com/s/unbounded");
    expect(css).not.toContain("fonts.gstatic.com/s/manrope");
    expect(css).toMatch(/\.header-wallet-label\s*\{[^}]*width:\s*4\.5rem/);
    const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
    expect(root).toContain('document.fonts.load("16px Manrope")');
    expect(root).toContain('document.fonts.load("16px Unbounded")');
    expect(root).toContain("fonts-ready");
    const frame = readFileSync(
      new URL("../src/components/wallet/HeaderWalletFrame.tsx", import.meta.url),
      "utf8",
    );
    expect(frame).toContain("<UsdcBalance loading");
    const slip = readFileSync(
      new URL("../src/components/game/BetSlip.tsx", import.meta.url),
      "utf8",
    );
    expect(slip).toContain("text-left");
    expect(slip).toContain("min-w-16");
    const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
    expect(vite).toContain("inline-text-faces");
    for (const html of [
      renderToStaticMarkup(UsdcBalance({ loading: true, available: 0 })),
      renderToStaticMarkup(UsdcBalance({ loading: false, available: 123456 })),
    ]) {
      expect(html).toContain("header-wallet-amount");
      expect(html).not.toContain("w-[4.75rem]");
    }
  });

  it("paints signed-in chrome from the cookie until the session resolves", () => {
    expect(paintSignedIn(false, null, true)).toBe(true);
    expect(paintSignedIn(false, null, false)).toBe(false);
    expect(paintSignedIn(true, "user", false)).toBe(true);
    expect(paintSignedIn(true, null, true)).toBe(false);
    const lobby = readFileSync(
      new URL("../src/components/poker/PokerLobby.tsx", import.meta.url),
      "utf8",
    );
    expect(lobby).toContain("paintSignedIn");
    expect(lobby).not.toContain("setMounted");
  });

  it("warms both 8-ball pages the same way as the other games", () => {
    const router = readFileSync(new URL("../src/router.tsx", import.meta.url), "utf8");
    const header = readFileSync(
      new URL("../src/components/SiteHeader.tsx", import.meta.url),
      "utf8",
    );
    const lobbyRoute = readFileSync(
      new URL("../src/routes/8-ball-pool.tsx", import.meta.url),
      "utf8",
    );
    const matchRoute = readFileSync(
      new URL("../src/routes/pool.$matchId.tsx", import.meta.url),
      "utf8",
    );
    const lobby = readFileSync(
      new URL("../src/components/pool/PoolLobby.tsx", import.meta.url),
      "utf8",
    );
    for (const path of ["/8-ball-pool", "/pool", "/pool/$matchId", "/poker", "/poker/$tableId"]) {
      expect(router).toContain(`"${path}"`);
    }
    expect(header).toContain('prefetchGamePage(qc, "/8-ball-pool")');
    expect(header).toContain("warmPoolPages(router)");
    expect(lobbyRoute).not.toContain("PoolMatch");
    expect(lobbyRoute).not.toContain("@/lib/pool/physics");
    expect(lobby).not.toContain("@/lib/pool/physics");
    expect(lobby).toContain("loadRouteChunk");
    expect(lobby).toContain("matchId: table.id");
    expect(lobby).toContain("Open tables");
    expect(lobby).toContain("Create game");
    expect(lobby).not.toContain("Total pot");
    expect(lobby).not.toContain("Winner receives");
    expect(matchRoute).not.toContain("room.webp");
    expect(lobbyRoute).toContain("hero.webp");
  });
});
