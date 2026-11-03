import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BombScoreboard } from "../src/components/fps/BombScoreboard";
import { WeaponIcon, type FeedWeapon } from "../src/components/fps/WeaponIcon";
import { createBombMatch, startBombMatch } from "../src/lib/fps/bomb/match";
import { bombViewFor, BombReveal } from "../src/lib/fps/bomb/snapshot";

describe("Bomb scoreboard and weapon icons", () => {
  it("shows accessible status icons alongside the actual player statistics", () => {
    const s = createBombMatch(
      Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}`, bot: i !== 0 })),
      0,
      7,
    );
    startBombMatch(s, 0);
    s.phase = "halftime";
    s.players[5]!.hp = 0;
    s.players[0]!.kills = 12;
    s.players[0]!.headshots = 6;
    const html = renderToStaticMarkup(
      <BombScoreboard view={bombViewFor(s, 0, null, new BombReveal(), 0)} />,
    );
    expect(html).toContain('aria-label="Alive"');
    expect(html).toContain('aria-label="Dead"');
    expect(html).not.toContain(">Alive<");
    expect(html).not.toContain(">Dead<");
    expect(html).toContain(">12</td>");
    expect(html).toContain(">50</td>");
    expect(html).toContain("Halftime");
    expect(html).toContain("Player 0");
  });
  it("provides distinct, labelled silhouettes without loading model assets", () => {
    const icons: FeedWeapon[] = ["ak", "m4", "awp", "knife", "he", "fire", "bomb"];
    const markup = icons.map((weapon) => renderToStaticMarkup(<WeaponIcon weapon={weapon} />));
    expect(new Set(markup).size).toBe(icons.length);
    for (const html of markup) {
      expect(html).toContain('role="img"');
      expect(html).toContain("aria-label=");
      expect(html).not.toContain("<image");
    }
  });
});
