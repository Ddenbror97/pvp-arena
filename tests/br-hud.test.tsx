import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrCentre } from "../src/components/fps/BrHud";
import type { BrHud } from "../src/lib/fps/br/br-arena";
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
    const html = renderToStaticMarkup(<BrCentre hud={hud} hit={null} />);
    expect(html).toContain("br-cross");
    expect(html).not.toContain("br-progress");
    expect(html).not.toContain("Reloading");
    expect(html).not.toContain("1.4");
  });
  it("retains healing progress while the player is using a medkit", () => {
    const html = renderToStaticMarkup(
      <BrCentre hud={{ ...hud, heal: { item: "medkit", progress: 0.4, left: 4.2 } }} hit={null} />,
    );
    expect(html).toContain("br-progress");
    expect(html).toContain("medkit");
    expect(html).toContain("4.2");
  });
});
