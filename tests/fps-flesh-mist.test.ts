import { describe, expect, it } from "vitest";
import {
  FLESH_DENSE_MS,
  FLESH_LIGHT,
  FLESH_MS,
  FLESH_PARTICLES,
  MIST,
  MIST_ATLAS,
  anchorHit,
  fleshBurst,
  mistAtlas,
  type FleshParticle,
} from "@/lib/fps/flesh-mist";

/** A repeatable random. */
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hit = (zone: string, direction = { x: 0, y: 0, z: -1 }) => ({
  point: { x: 0, y: 1.3, z: 0 },
  direction,
  zone,
});

describe("the blood cloud's burst (1v1, 5v5 and the battle royale share it)", () => {
  it("is a fixed number of particles, and reuses its buffer", () => {
    const out: FleshParticle[] = [];
    expect(fleshBurst(hit("chest"), seeded(1), out)).toBe(FLESH_PARTICLES);
    const first = [...out];
    // A following pellet takes a few, and leaves the buffer its length.
    expect(fleshBurst({ ...hit("chest"), light: true }, seeded(2), out)).toBe(FLESH_LIGHT);
    expect(out).toHaveLength(FLESH_PARTICLES);
    // A thousand hits later the same objects are still being written to: nothing allocated.
    for (let i = 0; i < 1000; i++) fleshBurst(hit("head"), seeded(i + 3), out);
    expect(out).toHaveLength(FLESH_PARTICLES);
    out.forEach((q, i) => expect(q).toBe(first[i]));
  });

  it("is a cloud of unlike parts, not one sprite: a splash, veils, billows and drops", () => {
    const out: FleshParticle[] = [];
    const n = fleshBurst(hit("chest"), seeded(7), out);
    const parts = out.slice(0, n);
    const mist = parts.filter((q) => q.cell > 0),
      drops = parts.filter((q) => q.cell === 0);
    expect(parts.filter((q) => q.cell === 1 + MIST.splash)).toHaveLength(1);
    expect(mist.length).toBe(9);
    expect(drops.length).toBe(12);
    // Every picture is used, and no two billows share an angle.
    expect(new Set(mist.map((q) => q.cell)).size).toBe(4);
    expect(new Set(mist.map((q) => q.turn.toFixed(3))).size).toBe(mist.length);
    // The cloud is head-and-shoulders wide (sizes: 1 ≈ 0.73 m), not the old 2.5 cm points.
    const widest = Math.max(...mist.map((q) => q.size * (1 + q.grow)));
    expect(widest).toBeGreaterThan(1.1);
    expect(widest).toBeLessThan(2.2);
    // Mist floats and is drawn over the body it surrounds; drops fall.
    for (const q of mist) {
      expect(q.fall).toBeLessThan(1);
      expect(q.pull).toBeGreaterThan(0);
      expect(q.minPx).toBeGreaterThan(0);
    }
    for (const q of drops) expect(q.fall).toBeGreaterThan(9);
  });

  it("goes both ways from the wound, so it is seen from the shooter's side and from behind", () => {
    const out: FleshParticle[] = [];
    for (const direction of [
      { x: 0, y: 0, z: -1 },
      { x: 1, y: 0, z: 0 },
      { x: 0.6, y: -0.2, z: 0.77 },
    ]) {
      const n = fleshBurst(hit("chest", direction), seeded(11), out);
      const len = Math.hypot(direction.x, direction.y, direction.z);
      const along = out
        .slice(0, n)
        .filter((q) => q.cell > 0 && q.cell !== 1 + MIST.splash)
        .map((q) => (q.v[0] * direction.x + q.v[2] * direction.z) / len);
      expect(along.filter((a) => a < -0.1).length).toBeGreaterThanOrEqual(3);
      expect(along.filter((a) => a > 0.1).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("is larger for a headshot and smaller for a leg", () => {
    const size = (zone: string) => {
      const out: FleshParticle[] = [];
      const n = fleshBurst(hit(zone), seeded(5), out);
      return out.slice(0, n).reduce((s, q) => s + q.size, 0);
    };
    expect(size("head")).toBeCloseTo(size("chest") * 1.25, 5);
    expect(size("legs")).toBeCloseTo(size("chest") * 0.85, 5);
    expect(size("stomach")).toBeCloseTo(size("chest"), 5);
  });

  it("does not outstay its welcome, and survives a hit with no direction", () => {
    const out: FleshParticle[] = [];
    for (let seed = 1; seed < 200; seed++) {
      const n = fleshBurst(hit("head", { x: 0, y: 0, z: 0 }), seeded(seed), out);
      for (const q of out.slice(0, n)) {
        expect(q.life).toBeGreaterThan(0);
        expect(q.life).toBeLessThanOrEqual(FLESH_MS);
        for (const v of [...q.o, ...q.v, q.size, q.alpha, q.turn])
          expect(Number.isFinite(v)).toBe(true);
        expect(q.alpha).toBeLessThanOrEqual(1);
      }
    }
    // (The cloud is at its densest for about a quarter of a second: see the shader's wear.)
    expect(FLESH_DENSE_MS).toBeLessThan(FLESH_MS / 2);
  });
});

describe("the blood cloud's pictures", () => {
  const atlas = mistAtlas(),
    C = MIST_ATLAS / 2;
  const density = (cell: number, x: number, y: number) =>
    atlas[((Math.floor(cell / 2) * C + y) * MIST_ATLAS + (cell % 2) * C + x) * 4]! / 255;

  it("is computed once", () => {
    expect(atlas).toHaveLength(MIST_ATLAS * MIST_ATLAS * 4);
    expect(mistAtlas()).toBe(atlas);
  });

  it("is empty at every picture's rim (a turned sprite shows no edge of its square)", () => {
    for (let cell = 0; cell < 4; cell++)
      for (let i = 0; i < C; i++)
        for (const [x, y] of [
          [i, 0],
          [i, C - 1],
          [0, i],
          [C - 1, i],
        ] as const)
          expect(density(cell, x, y)).toBe(0);
  });

  it("is ragged, not a disc: the density round a ring varies widely with the angle", () => {
    for (const cell of [MIST.billowA, MIST.billowB, MIST.wisp, MIST.splash]) {
      const ring: number[] = [];
      for (let a = 0; a < 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        ring.push(
          density(
            cell,
            Math.round(C / 2 + Math.cos(t) * C * 0.18),
            Math.round(C / 2 + Math.sin(t) * C * 0.18),
          ),
        );
      }
      // (A soft disc, as the effect first was, is the same all the way round: a spread of 0.)
      expect(Math.max(...ring) - Math.min(...ring)).toBeGreaterThan(0.35);
      // And there is a cloud there at all: thick somewhere, thin somewhere.
      let thick = 0,
        thin = 0;
      for (let y = 0; y < C; y++)
        for (let x = 0; x < C; x++) {
          const d = density(cell, x, y);
          if (d > 0.7) thick++;
          else if (d > 0.05 && d < 0.4) thin++;
        }
      // (The splash is a spray of beads round a small middle: far less of it.)
      const spray = cell === MIST.splash;
      expect(thick).toBeGreaterThan(C * C * (spray ? 0.001 : 0.01));
      expect(thin).toBeGreaterThan(C * C * (spray ? 0.005 : 0.05));
    }
  });
});

describe("where a hit is drawn on a body that is shown behind the server", () => {
  const out = { x: 0, y: 0, z: 0 };
  it("leaves a wound on the drawn body where the server put it", () => {
    expect(anchorHit({ x: 10.2, y: 1.4, z: 5.1 }, { x: 10, y: 0, z: 5 }, out)).toEqual({
      x: 10.2,
      y: 1.4,
      z: 5.1,
    });
    // (No body drawn: as recorded.)
    expect(anchorHit({ x: 3, y: 1, z: 4 }, null, out)).toEqual({ x: 3, y: 1, z: 4 });
  });
  it("brings a wound the body has run on from back to the body, on the same side", () => {
    // The target ran 1.2 m along +x after the shot was resolved.
    anchorHit({ x: 10, y: 1.4, z: 5.15 }, { x: 11.2, y: 0, z: 5 }, out);
    expect(Math.hypot(out.x - 11.2, out.z - 5)).toBeCloseTo(0.28, 5);
    expect(out.x).toBeLessThan(11.2);
    expect(out.y).toBe(1.4);
    // Its height stays within the body's.
    anchorHit({ x: 0, y: 9, z: 0 }, { x: 3, y: 2, z: 0 }, out);
    expect(out.y).toBe(3.95);
  });
  it("may write over the point it reads", () => {
    const p = { x: 10, y: 1.4, z: 5 };
    anchorHit(p, { x: 12, y: 0, z: 5 }, p);
    expect(p).toEqual({ x: 12 - 0.28, y: 1.4, z: 5 });
  });
});
