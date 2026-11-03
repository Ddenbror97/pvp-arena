import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BombMinimap } from "../src/components/fps/BombMinimap";
import { bombStepGain } from "../src/lib/fps/bomb/footstep-gain";
import { createBombMatch } from "../src/lib/fps/bomb/match";
import { bombViewFor, BombReveal } from "../src/lib/fps/bomb/snapshot";
describe("Bomb navigation and friendly footstep mix", () => {
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
