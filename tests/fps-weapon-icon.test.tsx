import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { FeedWeaponIcon, HeldWeapon } from "../src/components/fps/WeaponIcon";

/** The 1v1 and 5v5 kill feeds and weapon panels draw our guns' renders, as the battle royale's. */
describe("arena weapon icons", () => {
  it("draw each gun's render and the drawn silhouettes for the rest", () => {
    for (const [weapon, file] of [
      ["ak", "ak47"],
      ["m4", "m4"],
      ["awp", "awp"],
      ["mp5", "mp5"],
      ["deagle", "deagle"],
    ] as const) {
      const html = renderToStaticMarkup(<FeedWeaponIcon weapon={weapon} />);
      expect(html).toContain(`src="/fps/br/icons/${file}.webp"`);
      expect(html).toContain("weapon-glyph");
      expect(existsSync(`public/fps/br/icons/${file}.webp`)).toBe(true);
    }
    expect(renderToStaticMarkup(<FeedWeaponIcon weapon="deagle" />)).toContain("is-pistol");
    for (const weapon of ["knife", "he", "fire", "bomb"] as const) {
      const html = renderToStaticMarkup(<FeedWeaponIcon weapon={weapon} />);
      expect(html).toContain("<svg");
      expect(html).not.toContain("<img");
    }
  });
  it("show the weapon in hand over its name, nothing for a grenade", () => {
    expect(renderToStaticMarkup(<HeldWeapon weapon="m4" />)).toContain("duel-held-weapon");
    expect(renderToStaticMarkup(<HeldWeapon weapon={null} />)).toBe("");
  });
});
