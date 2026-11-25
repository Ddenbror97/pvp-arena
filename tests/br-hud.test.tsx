import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrCentre, BrInventory } from "../src/components/fps/BrHud";
import type { BrKitView } from "../src/lib/fps/br/match";
import type { BrHud } from "../src/lib/fps/br/br-arena";
import { DEFAULT_STRIKE_SETTINGS } from "../src/lib/fps/settings";
const crosshair = DEFAULT_STRIKE_SETTINGS;
const hud = {
  scope: false,
  onFoot: true,
  aim: 0,
  reload: { progress: 0.5, left: 1.4 },
  heal: null,
  prompt: null,
} as unknown as BrHud;
describe("BR action feedback", () => {
  it("keeps the crosshair without adding a reload countdown", () => {
    const html = renderToStaticMarkup(<BrCentre hud={hud} hit={null} crosshair={crosshair} />);
    expect(html).toContain("duel-crosshair crosshair-0");
    expect(html).not.toContain("br-progress");
    expect(html).not.toContain("Reloading");
    expect(html).not.toContain("1.4");
  });
  it("retains healing progress while the player is using a medkit", () => {
    const html = renderToStaticMarkup(
      <BrCentre
        hud={{ ...hud, heal: { item: "medkit", progress: 0.4, left: 4.2 } }}
        hit={null}
        crosshair={crosshair}
      />,
    );
    expect(html).toContain("br-progress");
    expect(html).toContain("medkit");
    expect(html).toContain("4.2");
  });
});

describe("BR crosshair", () => {
  // The Settings → Crosshair choice (style and colour) was ignored in the battle royale: it
  // drew its own white dot. It now draws the player's crosshair, as 1v1 and 5v5 do.
  it("draws the chosen style and colour", () => {
    for (let style = 0; style < 5; style++) {
      const html = renderToStaticMarkup(
        <BrCentre
          hud={hud}
          hit={null}
          crosshair={{ ...crosshair, crosshair: style, color: "#ff3355" }}
        />,
      );
      expect(html).toContain(`duel-crosshair crosshair-${style}`);
      expect(html).toContain("--crosshair-color:#ff3355");
      expect(html).not.toContain("br-cross");
    }
  });
  it("hides it while scoped or aiming down sights", () => {
    expect(
      renderToStaticMarkup(<BrCentre hud={{ ...hud, aim: 1 }} hit={null} crosshair={crosshair} />),
    ).not.toContain("duel-crosshair");
    expect(
      renderToStaticMarkup(
        <BrCentre
          hud={{ ...hud, scope: { zoom: 4, reticle: "awp" } } as BrHud}
          hit={null}
          crosshair={crosshair}
        />,
      ),
    ).not.toContain("duel-crosshair");
  });
});

describe("BR inventory: Extended Magazine slot", () => {
  const kit = {
    hp: 100,
    active: 0,
    guns: [
      { item: "ak47", mag: 40, optic: "sight-red", muzzle: null, extMag: "mag-ext" },
      { item: "mp5", mag: 30, optic: null, muzzle: null },
      { item: "deagle", mag: 7, optic: null, muzzle: null },
    ],
    helmet: null,
    vest: null,
    plates: [null, null, null],
    backpack: null,
    capacity: 6,
    bag: [
      { item: "ammo-rifle", qty: 60 },
      { item: "mag-ext", qty: 1 },
    ],
    heal: null,
    reloadUntil: 0,
    drawUntil: 0,
    kills: 0,
    dead: false,
    tablet: null,
  } as unknown as BrKitView;
  it("shows a magazine tile on every gun card, filled where one is fitted", () => {
    const html = renderToStaticMarkup(
      <BrInventory kit={kit} nearby={[]} act={() => {}} close={() => {}} />,
    );
    // Three gun cards, each with a magazine tile (AK filled, MP5 and Deagle empty ghosts).
    expect(html.match(/icons\/mag-ext\.webp/g)?.length).toBe(4); // 3 tiles + 1 in the bag
    expect(html.match(/br-inv-icon ghost" src="\/fps\/br\/icons\/mag-ext/g)?.length).toBe(2);
  });
});
