import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BombMinimap } from "../src/components/fps/BombMinimap";
import { bombStepGain } from "../src/lib/fps/bomb/footstep-gain";
import { createBombMatch } from "../src/lib/fps/bomb/match";
import { bombViewFor, BombReveal } from "../src/lib/fps/bomb/snapshot";
describe("Bomb navigation and friendly footstep mix", () => {
  it("marks the dropped C4 for Terrorists, including spectators, but never Anti-Terrorists", () => {
    const s = createBombMatch(
      Array.from({ length: 10 }, (_, i) => ({ id: "p" + i, name: "P" + i, bot: true })),
      0,
      7,
    );
    s.bomb = { state: "dropped", x: 0, y: 0, z: -9 };
    const view = bombViewFor(s, 5, null, new BombReveal(), 0);
    const render = () => renderToStaticMarkup(<BombMinimap view={view} />);
    expect(render()).toContain('data-dropped-bomb="true"');
    expect(render()).toContain('transform="translate(0 -9)"');
    expect(render()).toContain('class="bomb-minimap-dropped-bomb"');
    view.self.hp = 0;
    expect(render()).toContain('data-dropped-bomb="true"');
    view.players[5]!.team = "police";
    expect(render()).not.toContain("data-dropped-bomb");
    view.players[5]!.team = "terrorist";
    view.bomb = { state: "dropped" };
    expect(render()).not.toContain("data-dropped-bomb");
    view.bomb = { state: "carried", carrier: 6 };
    expect(render()).not.toContain("data-dropped-bomb");
  });
  it("reduces only teammates while preserving own, enemy and anonymous cues", () => {
    expect(bombStepGain(0.8, false, "police", "police")).toBeCloseTo(0.32);
    expect(bombStepGain(0.8, true, "police", "police")).toBe(0.8);
    expect(bombStepGain(0.8, false, "terrorist", "police")).toBe(0.8);
    expect(bombStepGain(0.8, false, undefined, "police")).toBe(0.8);
    expect(bombStepGain(0.8, false, "police", "police", true)).toBeCloseTo(0.048);
  });
  it("shows you, teammates and both sites without plotting enemies even if their pose is revealed", () => {
    const s = createBombMatch(
      Array.from({ length: 10 }, (_, i) => ({ id: "p" + i, name: "P" + i, bot: true })),
      0,
      7,
    );
    const v = bombViewFor(s, 0, null, new BombReveal(), 0);
    v.players[9]!.pose = { x: 17, y: 0, z: 18, yaw: 0, pitch: 0 };
    const html = renderToStaticMarkup(<BombMinimap view={v} />);
    expect(html).toContain('data-you="true"');
    expect(html).toContain('data-teammate="1"');
    expect(html).not.toContain('data-teammate="9"');
    expect(html).toContain(">A</text>");
    expect(html).toContain(">B</text>");
    v.self.hp = 0;
    v.players[1]!.alive = false;
    const dead = renderToStaticMarkup(<BombMinimap view={v} />);
    expect(dead).not.toContain('data-you="true"');
    expect(dead).not.toContain('data-teammate="1"');
  });
});
