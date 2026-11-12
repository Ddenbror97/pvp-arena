import { describe, expect, it } from "vitest";
import { BOMB_MAPS } from "@/lib/fps/bomb/maps";
import { bombNav, navClear, navPath, nearestNode } from "@/lib/fps/bomb/nav";
import { measure } from "../scripts/fps/bot-motion/entry";

/**
 * The 5v5 bots as a group (owner, 2026-11-12: "bots … run on each other and take same path, they
 * run laggy when you run together"). Before the fix a moving bot stood inside a teammate
 * (within 0.6 m) 4–9 % of the time and its direction of travel swung at 7–9 rad/s, the route's
 * half-metre steps in eight directions followed one by one.
 */
describe("5v5 bots move as a group", () => {
  it.each(["sandgate", "iron-district"] as const)(
    "on %s they keep apart, run in lines and still play the round",
    (map) => {
      const m = measure(map, 3, 0.37);
      expect(m.rounds).toBe(3);
      expect(m.movingSamples).toBeGreaterThan(8000);
      expect(m.stackedWithin06Pct).toBeLessThan(3);
      expect(m.turnRadPerS).toBeLessThan(2);
      expect(m.zigzagPct).toBeLessThan(8);
      // Slowing behind a teammate is rare, not a stop-and-go.
      expect(m.slowPct).toBeLessThan(6);
      // They still fight and reach the sites.
      expect(m.kills).toBeGreaterThan(8);
      expect(m.plants).toBeGreaterThan(0);
    },
    60_000,
  );

  it("a straight line over the walk graph never crosses what a route cannot", () => {
    for (const id of ["sandgate", "iron-district"] as const) {
      const map = BOMB_MAPS[id].map;
      const g = bombNav(map);
      let s = 9,
        clear = 0,
        blocked = 0;
      const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
      for (let k = 0; k < 3000; k++) {
        // A node, and another within a few metres of it (on any level).
        const a = Math.floor(r() * g.x.length);
        const b = nearestNode(g, { x: g.x[a]! + (r() - 0.5) * 9, z: g.z[a]! + (r() - 0.5) * 9 });
        if (b < 0 || b === a) continue;
        const from = { x: g.x[a]!, y: g.y[a]!, z: g.z[a]! },
          to = { x: g.x[b]!, y: g.y[b]!, z: g.z[b]! };
        if (!navClear(map, from, to)) {
          blocked++;
          continue;
        }
        clear++;
        // A clear line is itself a route: the graph's shortest one is no longer than walking
        // the line cell by cell (one step per cell of the longer axis).
        const steps = Math.max(
          Math.abs(Math.round(to.x / 0.5) - Math.round(from.x / 0.5)),
          Math.abs(Math.round(to.z / 0.5) - Math.round(from.z / 0.5)),
        );
        expect(navPath(map, from, to).length).toBeLessThanOrEqual(steps);
      }
      expect(clear).toBeGreaterThan(200);
      expect(blocked).toBeGreaterThan(200);
    }
  });
});
