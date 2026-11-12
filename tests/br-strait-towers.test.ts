import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  climbAt,
  climbPoint,
  ladderHeight,
  ladderReachable,
  ladders,
  startClimb,
  stepLadder,
} from "@/lib/fps/br/ladders";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

/**
 * The strait bridgeheads' towers (owner, 2026-11-11: "ensure new buildings/houses/stairs is
 * optimized like the rest, enterable/door/etc"): the island watchtowers' drawn ladders climb
 * like the Iron Peaks ladder, from the ground to the deck; the mainland guard towers' cabins have
 * their door (their flights: br-building-audit's tower walks).
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, island: Island;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  island = buildIsland(hf, cover, meta, collision);
}, 120_000);

describe("the strait's bridgehead towers", () => {
  it("give each island watchtower a ladder from the ground to its deck", () => {
    const towers = island.layout.filter((p) => p.model === "bridge-watchtower");
    expect(towers).toHaveLength(2);
    const list = ladders(hf);
    expect(list).toHaveLength(1 + towers.length);
    list.forEach((l, i) => expect(l.id).toBe(i));
    for (const [k, p] of towers.entries()) {
      const l = list[1 + k]!;
      expect(Math.hypot(l.x - p.x, l.z - p.z)).toBeLessThan(3);
      expect(l.top).toBeCloseTo(p.y + 7.71, 3);
      // The foot on the ground (or the tower's footing), free to stand at.
      const foot = climbPoint(l, 0);
      expect(island.solid.supportAt(foot.x, foot.z, 0.3, foot.y + 0.3)).toBeLessThan(
        l.bottom + 0.35,
      );
      expect(island.solid.blocked(foot.x, l.bottom + 0.4, foot.z, 1.4, 0.3)).toBe(false);
      // The exit on the deck, free to stand on.
      expect(island.solid.supportAt(l.exit.x, l.exit.z, 0.35, l.top + 0.3)).toBeCloseTo(l.top, 2);
      expect(island.solid.blocked(l.exit.x, l.top + 0.05, l.exit.z, 1.75, 0.35)).toBe(false);
      expect(ladderHeight(l)).toBeGreaterThan(7);
      // Reachable with E at the foot (standing on the ground beside it) and at the exit.
      expect(ladderReachable(hf, foot.x, l.bottom, foot.z)?.ladder.id).toBe(l.id);
      expect(ladderReachable(hf, l.exit.x, l.top, l.exit.z)).toMatchObject({
        ladder: { id: l.id },
        end: "top",
      });
    }
  });

  it("climbs a watchtower's ladder up onto the deck and back down", () => {
    const l = ladders(hf)[1]!;
    const foot = climbPoint(l, 0);
    const body = { x: foot.x, y: l.bottom, z: foot.z, velocityY: 0, vx: 0, vz: 0, grounded: true };
    startClimb(body, l, "bottom");
    let ticks = 0,
      done = null as string | null;
    for (; ticks < 600 && !done; ticks++) {
      done = stepLadder(hf, body, 1, false, TICK_MS);
      if (body.ladder?.stage === "climb")
        expect(climbAt(hf, body.x, body.y, body.z)?.ladder.id).toBe(l.id);
    }
    expect(done).toBe("ground");
    expect(body.y).toBeCloseTo(l.top, 3);
    expect(Math.hypot(body.x - l.exit.x, body.z - l.exit.z)).toBeLessThan(0.01);
    // About 7.8 m at 1.25 m/s, plus stepping on and off.
    expect((ticks * TICK_MS) / 1000).toBeGreaterThan(6);
    expect((ticks * TICK_MS) / 1000).toBeLessThan(8);
    startClimb(body, l, "top");
    done = null;
    for (ticks = 0; ticks < 600 && !done; ticks++) done = stepLadder(hf, body, -1, false, TICK_MS);
    expect(done).toBe("ground");
    expect(body.y).toBeCloseTo(l.bottom, 3);
  });

  it("hang a door in each guard tower's cabin doorway", () => {
    const towers = island.layout.filter((p) => p.model === "bridge-guardtower");
    expect(towers).toHaveLength(2);
    for (const p of towers) {
      const door = island.doors.doors.filter(
        (d) => d.model === "bridge-guardtower" && Math.hypot(d.x - p.x, d.z - p.z) < 3,
      );
      expect(door).toHaveLength(1);
      expect(door[0]!.y0).toBeCloseTo(p.y + 6.82, 2);
    }
  });
});
