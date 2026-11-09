import { describe, expect, it, vi } from "vitest";
import { newFlight, sweepFlight, flightPoint, BALLISTICS } from "@/lib/fps/br/ballistics";
import {
  BrProjectiles,
  PoseHistory,
  brSpread,
  fire,
  newHands,
  type Fighter,
} from "@/lib/fps/br/combat";
import { newDropBody } from "@/lib/fps/br/drop";
import { newLoadout, pickUp } from "@/lib/fps/br/inventory";
import { ITEMS, type WeaponId } from "@/lib/fps/br/items";
import { Heightfield } from "@/lib/fps/br/heightfield";
import { StaticWorld } from "@/lib/fps/br/static-world";
import { rayBox } from "@/lib/fps/collision";

const emptyWorld = (boxes: number[][] = []) =>
  new StaticWorld(
    new Heightfield(2, 2, 10000, new Float32Array(4)),
    [],
    { voxel: 1, models: {} },
    null,
    boxes,
  );
function fighter(seat: number, z = 0, gun: WeaponId = "ak47"): Fighter {
  const f: Fighter = {
    seat,
    body: { ...newDropBody(), x: 0, y: 10, z, grounded: true, phase: "ground" },
    kit: newLoadout(),
    hands: newHands(),
    dead: false,
    kills: 0,
    damage: 0,
    kitVersion: 0,
  };
  pickUp(f.kit, { item: gun, qty: 1, mag: 30 });
  f.hands.aimSince = 1;
  return f;
}
function setup(distance = 100, gun: WeaponId = "ak47") {
  const a = fighter(0, 0, gun),
    b = fighter(1, -distance);
  const fighters = [a, b],
    history = new PoseHistory(),
    pool = new BrProjectiles();
  history.record(1000, fighters);
  const shoot = (world = emptyWorld(), playbackMs = 0) =>
    fire(
      a,
      { yaw: 0, pitch: Math.atan2(-0.43, distance), forward: 0, strafe: 0, playbackMs },
      fighters,
      world,
      history,
      1000,
      1,
      () => {},
      undefined,
      pool,
    );
  const advance = (now: number, world = emptyWorld()) => {
    history.record(now, fighters);
    return pool.advance(fighters, world, history, now, () => {});
  };
  return { a, b, fighters, history, pool, shoot, advance };
}

/** Time for a level shot to cover `x` metres under linear drag k (s(t) = v(1 − e^(−kt))/k). */
const timeTo = (x: number, v: number, k: number) => (k ? -Math.log(1 - (x * k) / v) / k : x / v);

describe("BR gravity sweeps", () => {
  it.each(["ak47", "m4", "awp", "mp5", "deagle"] as const)(
    "flies %s at its own speed with analytic gravity and drag",
    (gun) => {
      const d = ITEMS[gun],
        f = newFlight(
          { x: 0, y: 10, z: 0 },
          { x: 0, y: 0, z: -1 },
          d.muzzleVelocityMps,
          d.gravityMps2,
          d.rangeM,
          d.dragPerS,
        );
      const x = Math.min(150, d.rangeM * 0.75),
        k = d.dragPerS,
        time = timeTo(x, d.muzzleVelocityMps, k);
      const p = flightPoint(f, time);
      expect(p.z).toBeCloseTo(-x, 6);
      // Gravity with drag: (g / k)·(t − (1 − e^(−kt)) / k), below the vacuum ½gt².
      const drop = (d.gravityMps2 / k) * (time - (1 - Math.exp(-k * time)) / k);
      expect(10 - p.y).toBeCloseTo(drop, 6);
      expect(drop).toBeLessThan(4.905 * time * time);
      // The lifetime ends exactly at the gun's range.
      expect(flightPoint(f, f.lifetime).z).toBeCloseTo(-d.rangeM, 6);
    },
  );
  it("drops enough to need a hold-over at range, the flattest gun the AWP", () => {
    const dropAt = (gun: "ak47" | "m4" | "awp" | "mp5" | "deagle", x: number) => {
      const d = ITEMS[gun];
      const f = newFlight(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: -1 },
        d.muzzleVelocityMps,
        9.81,
        d.rangeM,
        d.dragPerS,
      );
      return -flightPoint(f, timeTo(x, d.muzzleVelocityMps, d.dragPerS)).y;
    };
    // Close fights are unaffected; 200–300 m shots need a visible hold-over (2026-11-09).
    expect(dropAt("ak47", 50)).toBeLessThan(0.05);
    expect(dropAt("ak47", 200)).toBeGreaterThan(0.5);
    expect(dropAt("ak47", 300)).toBeGreaterThan(1.2);
    expect(dropAt("m4", 300)).toBeLessThan(dropAt("ak47", 300));
    expect(dropAt("awp", 300)).toBeLessThan(dropAt("m4", 300));
    // The MP5 and Deagle are close-range guns: their slow rounds fall away past 100 m.
    expect(dropAt("mp5", 100)).toBeGreaterThan(0.3);
    expect(dropAt("deagle", 150)).toBeGreaterThan(0.7);
  });
  it("refuses a range the bullet could never coast to", () => {
    expect(() =>
      newFlight({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, 400, 9.81, 400, 1),
    ).toThrow();
  });
  it("sweeps every bounded segment and the partial end, with partition-independent gravity", () => {
    const f = newFlight({ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: -1 }, 715, 9.81, 350);
    let n = 0;
    sweepFlight(f, 10, (_from, _dir, len, start, end) => {
      n++;
      expect(len).toBeLessThanOrEqual(BALLISTICS.segmentM + 0.00001);
      expect(end - start).toBeLessThanOrEqual(BALLISTICS.segmentSeconds + 0.00000001);
      return null;
    });
    expect(n).toBeLessThan(BALLISTICS.maxSegments);
    expect(f.age).toBe(f.lifetime);
    const g = newFlight(f.origin, { x: 0, y: 0, z: -1 }, 715, 9.81, 350);
    for (let i = 0; i < 30; i++) sweepFlight(g, 0.02, () => null);
    expect(flightPoint(g, g.age)).toEqual(flightPoint(f, f.age));
  });
  it("does not tunnel through a 1 cm wall or ignore a zero-distance blocker", () => {
    for (const z of [-73, 0]) {
      const f = newFlight({ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: -1 }, 900, 9.81, 1000);
      const hit = sweepFlight(f, 2, (from, dir, length) => {
        const d = rayBox(from, dir, { x: 0, y: 10, z }, { x: 10, y: 20, z: 0.01 });
        return d <= length ? { distance: d, value: "wall" } : null;
      });
      expect(hit?.value).toBe("wall");
      expect(hit?.point.z).toBeCloseTo(z === 0 ? 0 : z + 0.005, 5);
    }
  });
  it("rejects invalid/unbounded configurations and ignores invalid elapsed time", () => {
    expect(() => newFlight({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 715, 9.81, 350)).toThrow();
    expect(() =>
      newFlight({ x: NaN, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, 715, 9.81, 350),
    ).toThrow();
    const f = newFlight({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, 715, 9.81, 350);
    sweepFlight(f, Infinity, () => {
      throw Error("visited");
    });
    expect(f.age).toBe(0);
  });
});

describe("BR authoritative projectile combat", () => {
  it("emits shot/audio immediately and hits only when physical flight reaches the victim", () => {
    const s = setup();
    expect(s.shoot()).toMatchObject([{ type: "shot", gun: "ak47", hearM: 140, flash: true }]);
    expect(s.b.kit.hp).toBe(100);
    expect(s.pool.size).toBe(1);
    expect(s.advance(1150)).toEqual([]);
    expect(s.b.kit.hp).toBe(100);
    expect(s.advance(1200)).toMatchObject([{ type: "hit", victim: 1 }]);
    expect(s.b.kit.hp).toBeLessThan(100);
    expect(s.pool.size).toBe(0);
  });
  it("does not store a snapshot hit when a target moves out of the flight path", () => {
    const s = setup();
    s.shoot();
    s.b.body.x = 4;
    expect(s.advance(1200)).toEqual([]);
    expect(s.b.kit.hp).toBe(100);
  });
  it("hits a target that moves into the flight path after firing", () => {
    const s = setup();
    s.b.body.x = 3;
    s.history.record(1000, s.fighters);
    s.shoot();
    s.b.body.x = 0;
    s.advance(1100);
    expect(s.advance(1200)).toMatchObject([{ type: "hit", victim: 1 }]);
  });
  it("chooses the nearest player regardless of seat/list order", () => {
    const s = setup(),
      near = fighter(2, -30);
    s.fighters.push(near);
    s.shoot();
    expect(s.advance(1200)).toMatchObject([{ type: "hit", victim: 2 }]);
    expect(s.b.kit.hp).toBe(100);
  });
  it("stops on actual wall cover and terrain before any victim", () => {
    for (const world of [emptyWorld([[-5, 0, -50, 5, 30, -49.99]]), emptyWorld()]) {
      const s = setup();
      if (!world.boxCount) {
        s.a.body.y = -2;
        s.b.body.y = -2;
      }
      s.shoot(world);
      expect(s.advance(1200, world)).toEqual([]);
      expect(s.b.kit.hp).toBe(100);
      expect(s.pool.size).toBe(0);
    }
  });
  it("respects cover introduced after firing and damages a blocking vehicle once", () => {
    const s = setup();
    s.shoot();
    const world = emptyWorld();
    world.raycast = () => ({ distance: 0, kind: "box", vehicle: 7 });
    const damage: number[] = [];
    expect(
      s.pool.advance(
        s.fighters,
        world,
        s.history,
        1200,
        () => {},
        (id, amount) => damage.push(id, amount),
      ),
    ).toEqual([]);
    expect(damage).toEqual([7, ITEMS.ak47.damage.chest]);
    expect(s.pool.size).toBe(0);
    expect(s.b.kit.hp).toBe(100);
  });
  it("applies drop at long range rather than using the initial straight ray", () => {
    const run = (holdover: boolean) => {
      const s = setup(340),
        d = ITEMS.ak47;
      // Isolate trajectory from dispersion/recoil: an exact chest-directed launch, held over by
      // the drop at that range (gravity and drag).
      const level = newFlight(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: -1 },
        d.muzzleVelocityMps,
        d.gravityMps2,
        d.rangeM,
        d.dragPerS,
      );
      const drop = -flightPoint(level, timeTo(340, d.muzzleVelocityMps, d.dragPerS)).y;
      const pitch = Math.atan2(-0.43 + (holdover ? drop : 0), 340);
      s.pool.add({
        shooter: s.a,
        weapon: d,
        firedAt: 1000,
        rewindMs: 0,
        damageScale: 1,
        flight: newFlight(
          { x: 0, y: 11.6, z: 0 },
          { x: 0, y: Math.sin(pitch), z: -Math.cos(pitch) },
          d.muzzleVelocityMps,
          d.gravityMps2,
          d.rangeM,
          d.dragPerS,
        ),
      });
      expect(s.advance(1300)).toEqual([]); // Has not reached 340 m yet.
      return s.advance(1800);
    };
    expect(run(false)).toEqual([]); // Falls below the victim's feet.
    expect(run(true)).toMatchObject([{ type: "hit", victim: 1, zone: "chest", damage: 34 }]);
  });
  it("sweeps a moving target that crosses the path between server poses", () => {
    const s = setup();
    s.history.clear();
    s.b.body.x = 3;
    s.history.record(1000, s.fighters);
    s.shoot();
    expect(s.advance(1160)).toEqual([]);
    s.b.body.x = -3;
    expect(s.advance(1180)).toMatchObject([{ type: "hit", victim: 1 }]);
  });
  it("clamps lag compensation and still checks current cover", () => {
    const s = setup();
    s.history.clear();
    s.b.body.x = 0;
    s.history.record(800, s.fighters);
    s.b.body.x = 5;
    s.history.record(1000, s.fighters);
    const samples = vi.spyOn(s.history, "at");
    s.shoot(emptyWorld(), 999999);
    expect(s.advance(1200)).toEqual([]);
    expect(s.b.kit.hp).toBe(100);
    expect(samples.mock.calls.length).toBeGreaterThan(0);
    for (const [, time] of samples.mock.calls) {
      expect(time).toBeGreaterThanOrEqual(800);
      expect(time).toBeLessThanOrEqual(1200);
    }
    samples.mockRestore();
  });
  it("clears flight on reset, refuses invalid aim without spending ammo, and expires range", () => {
    const s = setup(500);
    const mag = s.a.kit.guns[0]!.mag;
    expect(
      fire(
        s.a,
        { yaw: NaN, pitch: 0, forward: 0, strafe: 0 },
        s.fighters,
        emptyWorld(),
        s.history,
        1000,
        0,
        () => {},
        undefined,
        s.pool,
      ),
    ).toEqual([]);
    expect(s.a.kit.guns[0]!.mag).toBe(mag);
    s.shoot();
    s.pool.clear();
    expect(s.advance(2000)).toEqual([]);
    expect(s.b.kit.hp).toBe(100);
    s.a.hands.lastShotAt = 0;
    s.shoot();
    s.advance(2000);
    expect(s.pool.size).toBe(0);
  });
});

describe("BR hipfire and ADS", () => {
  it.each(["ak47", "m4", "awp"] as const)(
    "settles %s iron sights in 180 ms; moving/crouch/air/spray retain penalties",
    (gun) => {
      const f = fighter(0, 0, gun),
        input = { yaw: 0, pitch: 0, forward: 0, strafe: 0 },
        d = ITEMS[gun];
      f.hands.aimSince = 0;
      const spread = (now = 1000) => brSpread(d, f.hands, f.body, input, now);
      expect(spread()).toBeCloseTo((d.hipSpreadDeg * Math.PI) / 180);
      const hip = spread();
      f.hands.aimSince = 1000;
      expect(spread()).toBe(hip);
      expect(spread(1090)).toBeLessThan(hip);
      const ads = spread(1180);
      expect(ads).toBeCloseTo((d.adsSpreadDeg * Math.PI) / 180);
      input.forward = 1;
      expect(spread(1180)).toBeGreaterThan(ads);
      const running = spread(1180);
      expect(brSpread(d, f.hands, f.body, { ...input, walk: true }, 1180)).toBeLessThan(running);
      input.forward = 0;
      f.body.crouched = true;
      expect(spread(1180)).toBeLessThan(ads);
      f.body.grounded = false;
      expect(spread(1180)).toBeGreaterThan(ads);
      f.body.grounded = true;
      f.body.crouched = false;
      f.hands.sprayCount = 20;
      expect(spread(1180)).toBeGreaterThan(ads);
    },
  );
});
