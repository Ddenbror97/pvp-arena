import { describe, expect, it } from "vitest";
import type { Solid } from "../src/lib/fps/map";
import { compileMap, DEFAULT_MAP, getMap, MAP_IDS } from "../src/lib/fps/maps/registry";
import { GRENADES, nextGrenadeType, throwKindOf } from "../src/lib/fps/grenades/rules";
import { simStart, simTo, throwStart, type Impact } from "../src/lib/fps/grenades/physics";
import {
  extinguish,
  fireCells,
  heRawDamage,
  heVestDamage,
  inFire,
  smokeBlocks,
  smokePuffs,
} from "../src/lib/fps/grenades/effects";
import {
  burnStep,
  emptyGrenadeWorld,
  equipGrenade,
  launchGrenade,
  stepGrenadeHandling,
  stepGrenadeWorld,
  type NadeThrow,
} from "../src/lib/fps/grenades/world";
import type { Player } from "../src/lib/fps/protocol";

const box = (
  id: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): Solid => ({
  id,
  x,
  y,
  z,
  w,
  h,
  d,
  surface: "concrete",
});
/** A flat test yard: a thin wall, a crate, a raised slab (an upper floor) and stairs. */
const YARD = compileMap({
  ...DEFAULT_MAP,
  id: "grenade-yard",
  arena: { width: 60, depth: 60 },
  boxes: [
    box("thin-wall", 0, 1.5, -6, 8, 3, 0.08),
    box("crate", 6, 0.5, 0, 1, 1, 1),
    box("slab", -10, 2.5, 10, 6, 0.2, 6),
    box("step-1", 10, 0.1, 10, 1, 0.2, 2),
    box("step-2", 11, 0.2, 10, 1, 0.4, 2),
    box("step-3", 12, 0.3, 10, 1, 0.6, 2),
  ],
  walls: [
    box("n", 0, 3, -30, 60, 6, 0.4),
    box("s", 0, 3, 30, 60, 6, 0.4),
    box("w", -30, 3, 0, 0.4, 6, 60),
    box("e", 30, 3, 0, 0.4, 6, 60),
  ],
  structures: [],
  barriers: [],
});
const R = GRENADES.physics.radius;
const fly = (
  o: [number, number, number],
  v: [number, number, number],
  seconds: number,
  onImpact?: (i: Impact) => void,
) =>
  simTo(
    simStart({ x: o[0], y: o[1], z: o[2] }, { x: v[0], y: v[1], z: v[2] }),
    YARD,
    seconds,
    onImpact,
  );

describe("grenade rules", () => {
  it("maps buttons to throws and cycles the carried types", () => {
    expect(throwKindOf(1)).toBe("over");
    expect(throwKindOf(2)).toBe("under");
    expect(throwKindOf(3)).toBe("medium");
    expect(nextGrenadeType({ he: 1, smoke: 0, fire: 1 }, "he")).toBe("fire");
    expect(nextGrenadeType({ he: 1, smoke: 0, fire: 1 }, "fire")).toBe("he");
    expect(nextGrenadeType({ he: 0, smoke: 0, fire: 0 }, undefined)).toBeNull();
  });
});

describe("grenade physics", () => {
  it("is deterministic and independent of how the time is chunked (frame rate)", () => {
    const one = fly([0, 1.6, 4], [3, 6, -9], 2.5);
    const s = simStart({ x: 0, y: 1.6, z: 4 }, { x: 3, y: 6, z: -9 });
    for (let t = 0; t <= 2.5; t += 1 / 37) simTo(s, YARD, t);
    simTo(s, YARD, 2.5);
    expect([s.x, s.y, s.z, s.vx, s.vy, s.vz, s.n]).toEqual([
      one.x,
      one.y,
      one.z,
      one.vx,
      one.vy,
      one.vz,
      one.n,
    ]);
  });

  it("never tunnels through a thin wall, even at full speed", () => {
    for (const speed of [8, 17, 30]) {
      const s = fly([0, 1.5, -2], [0, 0, -speed], 1.5);
      expect(s.z).toBeGreaterThan(-6 + 0.04);
    }
  });

  it("never falls through the floor and comes to rest", () => {
    let lowest = Infinity;
    const s = simStart({ x: -3, y: 1.6, z: 3 }, { x: 2, y: 4, z: 3 });
    for (let t = 0; t < 6; t += 0.01) {
      simTo(s, YARD, t);
      lowest = Math.min(lowest, s.y);
    }
    expect(lowest).toBeGreaterThan(R - 0.01);
    expect(s.rest).toBe(true);
  });

  it("bounces off walls and loses speed each bounce", () => {
    const impacts: Impact[] = [];
    fly([0, 1.5, -3], [0, 0, -10], 1.0, (i) => impacts.push(i));
    expect(impacts.length).toBeGreaterThan(0);
    const s = fly([0, 1.5, -3], [0, 0, -10], 0.6);
    expect(s.vz).toBeGreaterThan(0); // came back off the wall
    expect(Math.abs(s.vz)).toBeLessThanOrEqual(10 * GRENADES.physics.restitution + 1e-9);
  });

  it("throws carry: overhand > medium > underhand, and running or jumping adds", () => {
    const far = (kind: "over" | "medium" | "under") => {
      const start = throwStart(
        { x: 20, y: 1.6, z: -25 },
        Math.PI,
        0.2,
        { x: 0, y: 0, z: 0 },
        kind,
        YARD,
      );
      let landed = 0;
      simTo(simStart(start.origin, start.velocity), YARD, 4, (i) => {
        if (i.floor && !landed) landed = i.z + 25;
      });
      return landed;
    };
    const over = far("over"),
      medium = far("medium"),
      under = far("under");
    expect(over).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(under);
    expect(under).toBeGreaterThan(2);
    expect(over).toBeGreaterThan(18);
    const jump = throwStart(
      { x: 0, y: 2.2, z: -25 },
      Math.PI,
      0.2,
      { x: 0, y: 5, z: 0 },
      "over",
      YARD,
    );
    const stand = throwStart(
      { x: 0, y: 2.2, z: -25 },
      Math.PI,
      0.2,
      { x: 0, y: 0, z: 0 },
      "over",
      YARD,
    );
    expect(jump.velocity.y - stand.velocity.y).toBeCloseTo(5 * GRENADES.physics.inherit, 6);
  });

  it("starts in front of the eye but never inside a wall", () => {
    const start = throwStart({ x: 0, y: 1.6, z: -5.85 }, 0, 0, { x: 0, y: 0, z: 0 }, "over", YARD);
    expect(start.origin.z).toBeGreaterThan(-6 + 0.04);
  });

  it("stays in every registered map's playable space", () => {
    for (const id of MAP_IDS) {
      const map = getMap(id);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const spawn = map.spawns.A;
        const start = throwStart(
          { x: spawn.x, y: 1.6, z: spawn.z },
          a,
          0.5,
          { x: 0, y: 0, z: 0 },
          "over",
          map,
        );
        const s = simTo(simStart(start.origin, start.velocity), map, 8);
        expect(s.y, `${id} throw ${i}`).toBeGreaterThan(-0.05);
        expect(Math.abs(s.x), `${id} throw ${i}`).toBeLessThan(map.arena.width / 2 + 1);
        expect(Math.abs(s.z), `${id} throw ${i}`).toBeLessThan(map.arena.depth / 2 + 1);
        expect(s.rest, `${id} throw ${i} settles`).toBe(true);
      }
    }
  });
});

describe("every registered map", () => {
  it("smoke fills and fire spreads from each spawn on the map's gameplay floor", () => {
    for (const id of MAP_IDS) {
      const map = getMap(id);
      for (const spawn of [map.spawns.A, map.spawns.B]) {
        const at = { x: spawn.x, y: R, z: spawn.z };
        const puffs = smokePuffs(at, map);
        expect(puffs.length / 3, `${id} smoke`).toBeGreaterThan(10);
        for (let i = 0; i < puffs.length; i += 3) {
          expect(Math.abs(puffs[i]!), id).toBeLessThan(map.arena.width / 2 + 0.5);
          expect(puffs[i + 1]!, id).toBeGreaterThan(0);
        }
        const cells = fireCells(at, map, [], 0);
        expect(cells.length / 4, `${id} fire`).toBeGreaterThan(4);
        for (let i = 0; i < cells.length; i += 4) expect(cells[i + 1]!, id).toBeGreaterThan(-0.01);
      }
    }
  });
});

describe("HE", () => {
  const center = { x: 0, y: 0.15, z: 5 };
  it("falls off with distance, never exceeds the maximum and is 0 out of range", () => {
    const at = (d: number) => heRawDamage(center, { x: d, y: 0, z: 5 }, YARD);
    expect(at(0.5)).toBeLessThanOrEqual(GRENADES.he.damage);
    expect(at(0.5)).toBeGreaterThan(at(2));
    expect(at(2)).toBeGreaterThan(at(4));
    expect(at(GRENADES.he.radius + 0.5)).toBe(0);
  });
  it("is blocked by cover and reduced by a vest", () => {
    const behind = heRawDamage({ x: 0, y: 0.15, z: -4.5 }, { x: 0, y: 0, z: -7.5 }, YARD);
    expect(behind).toBe(0);
    const open = heRawDamage({ x: 0, y: 0.15, z: -4.5 }, { x: 0, y: 0, z: -2.5 }, YARD);
    expect(open).toBeGreaterThan(10);
    const armoured = { armor: 100 };
    expect(heVestDamage(open, armoured)).toBeLessThan(heVestDamage(open, {}));
    expect(armoured.armor).toBeLessThan(100);
  });
});

describe("smoke", () => {
  const puffs = smokePuffs({ x: 0, y: R, z: -4 }, YARD);
  const smoke = { id: 1, at: 0, puffs };
  const live = GRENADES.smoke.expandMs + 1000;
  it("fills open space but never crosses a wall", () => {
    expect(puffs.length / 3).toBeGreaterThan(40);
    for (let i = 0; i < puffs.length; i += 3) expect(puffs[i + 2]!).toBeGreaterThan(-6);
  });
  it("blocks sight through it and not past it", () => {
    expect(smokeBlocks({ x: -8, y: 1.6, z: -3.5 }, { x: 8, y: 1.6, z: -3.5 }, [smoke], live)).toBe(
      true,
    );
    expect(smokeBlocks({ x: -8, y: 1.6, z: 6 }, { x: 8, y: 1.6, z: 6 }, [smoke], live)).toBe(false);
    // Not yet popped, and long gone.
    expect(smokeBlocks({ x: -8, y: 1.6, z: -3.5 }, { x: 8, y: 1.6, z: -3.5 }, [smoke], -10)).toBe(
      false,
    );
    expect(
      smokeBlocks(
        { x: -8, y: 1.6, z: -3.5 },
        { x: 8, y: 1.6, z: -3.5 },
        [smoke],
        GRENADES.smoke.durationMs + 1,
      ),
    ).toBe(false);
  });
});

describe("fire", () => {
  it("spreads over the floor, stops at walls, climbs steps, never reaches a floor above or below", () => {
    const cells = fireCells({ x: 0, y: R, z: -5 }, YARD, [], 0);
    expect(cells.length / 4).toBeGreaterThan(10);
    for (let i = 0; i < cells.length; i += 4) {
      expect(cells[i + 2]!).toBeGreaterThan(-6); // the wall's near side only
      expect(cells[i + 1]!).toBeCloseTo(0, 5);
    }
    const stairs = fireCells({ x: 9.4, y: R, z: 10 }, YARD, [], 0);
    expect(Math.max(...stairs.filter((_, i) => i % 4 === 1))).toBeGreaterThan(0.35);
    const under = fireCells({ x: -10, y: R, z: 10 }, YARD, [], 0);
    for (let i = 0; i < under.length; i += 4) expect(under[i + 1]!).toBeLessThan(0.1);
    const above = fireCells({ x: -10, y: 2.6 + R, z: 10 }, YARD, [], 0);
    for (let i = 0; i < above.length; i += 4) expect(above[i + 1]!).toBeCloseTo(2.6, 5);
  });

  it("burns while standing in it, rising, and stops after leaving", () => {
    const fire = { id: 2, at: 0, owner: 0, cells: fireCells({ x: 0, y: R, z: 5 }, YARD, [], 0) };
    let burn;
    let dealt = 0;
    for (let now = 1000; now < 3000; now += 33) {
      const r = burnStep({ x: 0, y: 0, z: 5 }, burn, [fire], now);
      burn = r.burn;
      dealt += r.damage;
    }
    expect(dealt).toBeGreaterThan(16);
    let after = 0;
    for (let now = 3000; now < 4000; now += 33) {
      const r = burnStep({ x: 8, y: 0, z: 5 }, burn, [fire], now);
      burn = r.burn;
      after += r.damage;
    }
    expect(after).toBe(0);
    expect(inFire({ x: 0, y: 0, z: 5 }, [fire], GRENADES.fire.durationMs + 1)).toBeNull();
  });

  it("is put out by smoke", () => {
    const fire = { id: 3, at: 0, cells: fireCells({ x: 0, y: R, z: 5 }, YARD, [], 0) };
    const smoke = { id: 4, at: 500, puffs: smokePuffs({ x: 0, y: R, z: 5 }, YARD) };
    expect(extinguish(fire, smoke, 600)).toBeGreaterThan(fire.cells.length / 4 / 2);
  });
});

describe("grenade handling", () => {
  const holder = (): Player =>
    ({
      id: "p",
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      pitch: 0,
      hp: 100,
      ammo: 30,
      reserve: 90,
      weapon: "rifle",
      reloadUntil: 0,
      lastShotAt: 0,
      lastSeq: 0,
      kills: 0,
      headshots: 0,
      grenades: { he: 1, smoke: 1, fire: 0 },
    }) as Player;
  const run = (p: Player, plan: [number, boolean, boolean][]) => {
    const thrown: NadeThrow[] = [];
    let id = 1;
    for (const [now, fire, alt] of plan)
      stepGrenadeHandling(p, { fire, alt }, now, (_p, t) => {
        thrown.push({ ...t });
        return id++;
      });
    return thrown;
  };

  it("only equips carried types, draws first, pulls the pin on press and throws on release", () => {
    const p = holder();
    expect(equipGrenade(p, "fire", 0)).toBe(false);
    expect(equipGrenade(p, "he", 0)).toBe(true);
    const plan: [number, boolean, boolean][] = [];
    for (let t = 0; t <= 3000; t += 33) plan.push([t, t >= 600 && t < 1500, false]);
    const thrown = run(p, plan);
    expect(thrown).toHaveLength(1);
    expect(thrown[0]!.kind).toBe("over");
    expect(p.grenades!.he).toBe(0);
    // Back on the rifle after the follow-through, and the HE is not selectable any more.
    expect(p.weapon).toBe("rifle");
    expect(equipGrenade(p, "he", 3100)).toBe(false);
  });

  it("right only throws underhand; both at any point throws medium; a tap waits for the pin", () => {
    const under = holder();
    equipGrenade(under, "smoke", 0);
    const t1 = run(under, [
      [500, false, true],
      [700, false, true],
      [1300, false, false],
      [1500, false, false],
      [2500, false, false],
    ]);
    expect(t1[0]!.kind).toBe("under");
    const medium = holder();
    equipGrenade(medium, "he", 0);
    const t2 = run(medium, [
      [500, true, false],
      [560, true, true],
      [600, true, false],
      [700, false, false],
      [2000, false, false],
    ]);
    expect(t2[0]!.kind).toBe("medium");
    // Released at 700 but the pin needs primeMs from 500: the throw starts at 1120.
    expect(t2[0]!.release).toBe(500 + GRENADES.primeMs);
    expect(t2[0]!.spawn).toBe(500 + GRENADES.primeMs + GRENADES.releaseMs.medium);
  });

  it("never throws twice from one hold and refuses to throw what is not carried", () => {
    const p = holder();
    equipGrenade(p, "he", 0);
    const plan: [number, boolean, boolean][] = [];
    for (let t = 450; t < 5000; t += 33) plan.push([t, Math.floor(t / 400) % 2 === 0, false]);
    expect(run(p, plan)).toHaveLength(1);
  });

  it("holding waits for release without charging extra power; mouse buttons select long, medium and short", () => {
    const speeds: number[] = [];
    for (const [fire, alt] of [
      [true, false],
      [true, true],
      [false, true],
    ]) {
      const heldSpeeds: number[] = [];
      for (const holdMs of [700, 3000]) {
        const p = holder();
        equipGrenade(p, "he", 0);
        expect(
          run(p, [
            [500, fire!, alt!],
            [500 + holdMs, fire!, alt!],
          ]),
        ).toHaveLength(0);
        expect(p.grenades!.he).toBe(1);
        const thrown = run(p, [
          [501 + holdMs, false, false],
          [1501 + holdMs, false, false],
        ]);
        expect(thrown).toHaveLength(1);
        const start = throwStart(
          { x: 0, y: 1.6, z: 5 },
          0,
          0,
          { x: 0, y: 0, z: 0 },
          thrown[0]!.kind,
          YARD,
        );
        heldSpeeds.push(Math.hypot(start.velocity.x, start.velocity.y, start.velocity.z));
      }
      expect(heldSpeeds[1]).toBe(heldSpeeds[0]);
      speeds.push(heldSpeeds[0]!);
    }
    expect(speeds[0]).toBeGreaterThan(speeds[1]!);
    expect(speeds[1]).toBeGreaterThan(speeds[2]!);
  });

  it("launches from the eye and detonates on the fuse; smoke pops at rest and blocks", () => {
    const world = emptyGrenadeWorld();
    const p = { ...holder(), x: 0, z: 10, y: 0, yaw: Math.PI, pitch: 0.3 } as Player;
    const he = launchGrenade(
      world,
      YARD,
      0,
      p,
      { type: "he", kind: "over", release: 0, spawn: 0 },
      { x: 0, y: 0, z: 0 },
      0,
    );
    const smoke = launchGrenade(
      world,
      YARD,
      0,
      p,
      { type: "smoke", kind: "under", release: 0, spawn: 0 },
      { x: 0, y: 0, z: 0 },
      0,
    );
    const seen: { id: number; at: number; type: string }[] = [];
    for (let now = 0; now < 6000; now += 33.333) seen.push(...stepGrenadeWorld(world, YARD, now));
    const heBoom = seen.find((d) => d.id === he.id)!;
    expect(heBoom.at).toBe(GRENADES.he.fuseMs);
    const pop = seen.find((d) => d.id === smoke.id)!;
    expect(pop.at).toBeGreaterThanOrEqual(GRENADES.smoke.minMs);
    expect(world.smokes).toHaveLength(1);
  });

  it("an incendiary that lands in smoke fizzles; on open floor it burns", () => {
    const world = emptyGrenadeWorld();
    world.smokes.push({
      id: 90,
      owner: 1,
      at: -3000,
      puffs: smokePuffs({ x: 0, y: R, z: 14 }, YARD),
    });
    const p = { ...holder(), x: 0, z: 10, y: 0, yaw: Math.PI, pitch: -0.2 } as Player;
    launchGrenade(
      world,
      YARD,
      0,
      p,
      { type: "fire", kind: "under", release: 0, spawn: 0 },
      { x: 0, y: 0, z: 0 },
      0,
    );
    const out = [];
    for (let now = 0; now < 3000; now += 33.333) out.push(...stepGrenadeWorld(world, YARD, now));
    expect(out[0]!.dud).toBe("smoke");
    const open = emptyGrenadeWorld();
    const q = { ...p, z: -12, yaw: 0 } as Player;
    launchGrenade(
      open,
      YARD,
      0,
      q,
      { type: "fire", kind: "under", release: 0, spawn: 0 },
      { x: 0, y: 0, z: 0 },
      0,
    );
    const burst = [];
    for (let now = 0; now < 3000; now += 33.333) burst.push(...stepGrenadeWorld(open, YARD, now));
    expect(burst[0]!.dud).toBeUndefined();
    expect(open.fires).toHaveLength(1);
  });
});

describe("first-person prediction", () => {
  it("the hands release and let go exactly when the server does, for every button pattern", async () => {
    const { LocalGrenadeHands, clipFor } = await import("../src/lib/fps/grenades/grenade-timeline");
    const patterns: [boolean, boolean][][] = [
      Array.from({ length: 40 }, (_, i) => [i >= 16 && i < 36, false]),
      Array.from({ length: 40 }, (_, i) => [false, i >= 16 && i < 18]),
      Array.from({ length: 40 }, (_, i) => [i >= 16 && i < 30, i >= 20 && i < 25]),
    ];
    for (const pattern of patterns) {
      const hands = new LocalGrenadeHands();
      hands.equip("he", 0);
      const p = {
        weapon: "rifle",
        grenades: { he: 1, smoke: 0, fire: 0 },
        hp: 100,
        x: 0,
        y: 0,
        z: 0,
      } as unknown as Player;
      equipGrenade(p, "he", 0);
      let server: NadeThrow | null = null,
        local: number | null = null;
      for (let i = 0; i < 120; i++) {
        const now = i * 33;
        const [fire, alt] = pattern[i] ?? [false, false];
        stepGrenadeHandling(p, { fire, alt }, now, (_p, t) => {
          server = { ...t };
          return 1;
        });
        if (hands.step(fire, alt, now, false) === "spawn") local = now;
      }
      expect(server).not.toBeNull();
      expect(local).toBe(Math.ceil(server!.spawn / 33) * 33);
    }
    // Clip timing: the throw clip's release frame is the server's releaseMs.
    const meta = { pinSeconds: 0.45, primeSeconds: 0.62, throwSeconds: 0.52 } as never;
    expect(
      clipFor(meta, { kind: "throw", type: "he", t: 0.1, throw: "over", air: true }).clip,
    ).toBe("he_jump_throw");
    expect(clipFor(meta, { kind: "hold", type: "fire", t: 0.5, throw: "under" }).clip).toBe(
      "fire_cock_under",
    );
  });
});
