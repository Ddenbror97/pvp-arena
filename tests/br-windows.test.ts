import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { listPanes, shatterAlong, withPanes, type Pane } from "@/lib/fps/br/panes";
import { pickUp } from "@/lib/fps/br/inventory";
import {
  createBrMatch,
  seatHuman,
  stepBrMatch,
  type BrAct,
  type BrInput,
  type BrMatchState,
} from "@/lib/fps/br/match";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { TICK_MS } from "@/lib/fps/simulation";
import windowPanes from "@/lib/fps/br/window-panes.json";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Every building's window glass breakable (owner, 2026-11-23: "Add glass windows to
 * apartments/buildings … they should have the breaking window ones with the sound. also fix
 * buildings with a window but no glass, it looks like glass but there is nothing there").
 * art/blender/br/glass_panes.mjs took the glass out of the buildings' near LODs and listed it
 * (window-panes.json); here on the island's own placements: whole glass stops a player, a shot
 * breaks it, and then the window is an opening (its collision was cut away where the textured
 * kit's glass had collided as wall).
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { lods: Array<{ file: string }> }>;
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const all = listPanes(island.panes);
const models = (windowPanes as unknown as { revision: string; models: Record<string, number[][]> })
  .models;
/**
 * The manifest of revision `rev`: its file while it is published (the live revision, or one
 * being built), else the excerpt kept for these tests once a later revision replaced it
 * (tests/fixtures/br-superseded-manifests.json: the models the panes were cut from).
 */
function manifestOf(rev: string): typeof manifest {
  const file = `public/fps/br/models/models.${rev}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as typeof manifest;
  const kept = (
    JSON.parse(readFileSync("tests/fixtures/br-superseded-manifests.json", "utf8")) as Record<
      string,
      typeof manifest | undefined
    >
  )[rev];
  if (!kept?.models)
    throw new Error(
      `models.${rev}.json is not published and has no excerpt in tests/fixtures/br-superseded-manifests.json`,
    );
  return kept;
}

/** The middle of a pane, its thin axis (0: x, 2: z), and a point `d` m off it either way. */
function across(p: Pane, d: number) {
  const [x0, y0, z0, x1, y1, z1] = p.box;
  const thin = x1 - x0 < z1 - z0 ? 0 : 2;
  const mid = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] as [number, number, number];
  const off = (s: number) =>
    [mid[0] + (thin === 0 ? s * d : 0), mid[1], mid[2] + (thin === 2 ? s * d : 0)] as [
      number,
      number,
      number,
    ];
  return { mid, thin, a: off(-1), b: off(1) };
}

describe("the buildings' windows are breakable glass", () => {
  it("belong to this world revision, and the near LODs they came out of are its own", () => {
    // Cut against the revision named in the file; a later one (vehicles-v1: the parked cars) may
    // carry them on only with these models' entries exactly as they were. (But for a far LOD
    // on the far atlas, 2026-11-23: the panes came out of the near LOD, and the far one has
    // its glass in its texture.)
    const cut = (windowPanes as { revision: string }).revision;
    // Buildings whose panes were cut in a later revision, as they were built (the military
    // base's, garrison-v2, 2026-11-23).
    const cuts = (windowPanes as { cuts?: Record<string, string> }).cuts ?? {};
    for (const rev of new Set(Object.values(cuts))) {
      const then = manifestOf(rev);
      for (const [id, r] of Object.entries(cuts))
        if (r === rev) expect(manifest.models[id]!.lods[0], id).toEqual(then.models[id]!.lods[0]);
    }
    if (cut !== WORLD_ASSETS.revision) {
      const then = manifestOf(cut);
      for (const id of Object.keys(models)) {
        if (cuts[id]) continue;
        const now = manifest.models[id]! as unknown as { lods: Array<{ farFacade?: boolean }> };
        const was = then.models[id]! as unknown as { lods: unknown[] };
        expect(now.lods.length, id).toBe(was.lods.length);
        // (Or one with its last overlapping faces lifted apart, 2026-11-24: the same triangles,
        // a few moved 1.5 cm along their normal.)
        const lifted = (l: unknown) => /\.zfix-v21\.lod\d\.glb$/.test((l as { file: string }).file);
        for (const [i, l] of now.lods.entries())
          if (lifted(l))
            expect((l as { tris: number }).tris, id).toBe((was.lods[i] as { tris: number }).tris);
        const kept = now.lods.map((l) => !l.farFacade && !lifted(l));
        expect(kept[0] || lifted(now.lods[0]), id).toBe(true);
        expect({ ...now, lods: now.lods.filter((_, i) => kept[i]) }, id).toEqual({
          ...was,
          lods: was.lods.filter((_, i) => kept[i]),
        });
      }
    }
    const ids = Object.keys(models);
    // The procedural houses and blocks, the textured kit's towns and works among them.
    for (const id of [
      "apartment",
      "bungalow",
      "townhouse",
      "bauhaus-block",
      "cove-house-red",
      "rural-store-1",
      "rural-store-3",
      "rural-store-5",
      "brick-shop",
      "garage",
      "warehouse",
      "house",
      "rural-house",
      "rural-mobile-home",
      "rural-wood-1",
      "rural-wood-4",
      "rural-diner",
    ])
      expect(ids).toContain(id);
    for (const id of ids) {
      // (Or that file with its last overlapping faces lifted apart, zfix-v21.)
      expect(manifest.models[id]!.lods[0]!.file).toMatch(
        new RegExp(`\\.(${cuts[id] ?? cut}|zfix-v21)\\.lod0\\.`),
      );
      for (const [x0, x1, z0, z1, y0, y1] of models[id]!) {
        // Upright slabs, thin one way.
        expect(Math.min(x1! - x0!, z1! - z0!)).toBeLessThanOrEqual(0.081);
        expect(Math.max(x1! - x0!, z1! - z0!)).toBeGreaterThanOrEqual(0.25);
        expect(Math.max(x1! - x0!, z1! - z0!)).toBeLessThanOrEqual(1.81);
        expect(y1! - y0!).toBeGreaterThanOrEqual(0.3);
      }
    }
  });

  it("are placed with every building that has them, each knowing its building", () => {
    const windows = all.filter((p) => p.placement !== undefined);
    let expected = 0;
    for (const p of island.layout) expected += models[p.model]?.length ?? 0;
    expect(windows.length).toBe(expected);
    expect(windows.length).toBeGreaterThan(20_000);
    for (const p of windows.slice(0, 5000))
      expect(models[island.layout[p.placement!]!.model]).toBeDefined();
  });

  // (The procedural houses, the textured kit's towns and works, and the windows cut_windows.mjs
  // cut through blank walls and painted-on windows.)
  for (const model of [
    "bungalow",
    "apartment",
    "cove-house-red",
    "ew-control-house",
    "rural-store-1",
    "rural-store-3",
    "brick-shop",
    "garage",
    "house",
    "rural-house",
    "rural-wood-1",
    "rural-diner",
  ])
    it(`${model}: whole glass stops a player, a shot breaks it, then it is an opening`, () => {
      const broken = new Uint8Array(island.panes.count);
      const glazed = withPanes(island.solid, island.panes, broken);
      const at = island.layout.findIndex((p) => p.model === model);
      expect(at).toBeGreaterThanOrEqual(0);
      const panes = all.filter((p) => p.placement === at);
      expect(panes.length).toBe(models[model]!.length);
      // A pane with room for a hull (the widest at the lowest storey).
      const lowest = Math.min(...panes.map((p) => p.box[1]));
      const pane = panes
        .filter((p) => p.box[1] < lowest + 0.5)
        .sort((a, b) => {
          const w = (p: Pane) => Math.max(p.box[3] - p.box[0], p.box[5] - p.box[2]);
          return w(b) - w(a);
        })[0]!;
      const { mid, a, b } = across(pane, 0.6);
      // Whole: a body in the opening is blocked by the glass only.
      const feet = mid[1] - 0.2;
      expect(glazed.blocked(mid[0], feet, mid[2], 0.4, 0.05)).toBe(true);
      // The shot crosses it from outside: it breaks, and only it.
      const before = broken.reduce((n, v) => n + v, 0);
      shatterAlong(glazed, a[0], a[1], a[2], b[0] - a[0], 0, b[2] - a[2], 1.2);
      expect(broken[pane.id]).toBe(1);
      expect(broken.reduce((n, v) => n + v, 0)).toBe(before + 1);
      // Broken: nothing in the opening (the wall's collision was cut where the glass stood).
      expect(glazed.blocked(mid[0], feet, mid[2], 0.4, 0.05)).toBe(false);
      const ray = island.solid.raycast(a[0], a[1], a[2], b[0] - a[0], 0, b[2] - a[2], 1.2);
      expect(ray === null || ray.distance > 1.15).toBe(true);
    });
});

/**
 * Not only bullets (owner, 2026-11-23: "make the windows breakble with a knife hit and
 * granades. it only works with weapons right now"): in a match, a knife swing at a window, a
 * grenade thrown through one and an HE blast beside one each break it.
 */
describe("the windows break to a knife and to grenades", () => {
  const at = island.layout.findIndex((p) => p.model === "bungalow");
  // The bungalow's widest ground-floor pane, and the side of it a player can stand on.
  const pane = all
    .filter((p) => p.placement === at && p.box[1] - island.layout[at]!.y < 1.5)
    .sort((a, b) => {
      const w = (p: Pane) => Math.max(p.box[3] - p.box[0], p.box[5] - p.box[2]);
      return w(b) - w(a);
    })[0]!;
  const { mid, thin } = across(pane, 0);

  /** A match with seat 0 a human standing `d` m out from the pane, facing it; everyone else away. */
  function stand(d: number) {
    const state = createBrMatch(meta, 7, (x, z) => hf.heightAt(x, z));
    seatHuman(state, "u1", "One");
    state.phase = "active";
    for (const s of state.seats) {
      s.body.x = mid[0] + 400 + s.seat * 4;
      s.body.z = mid[2] + 400;
      s.body.y = island.solid.supportAt(s.body.x, s.body.z, 0.35, 1e4);
      s.body.phase = "ground";
      s.body.grounded = true;
    }
    // Outside: the side of the glass where a player standing there is free.
    let best: { x: number; z: number; y: number } | null = null;
    for (const sign of [1, -1]) {
      const x = mid[0] + (thin === 0 ? sign * d : 0),
        z = mid[2] + (thin === 2 ? sign * d : 0);
      const y = island.solid.supportAt(x, z, 0.35, mid[1] + 1);
      if (Math.abs(y - (pane.box[1] - 1)) > 1.6 || island.solid.blocked(x, y, z, 1.8, 0.4))
        continue;
      if (!best || y < best.y) best = { x, z, y };
    }
    expect(best).not.toBeNull();
    const me = state.seats[0]!;
    Object.assign(me.body, { ...best!, phase: "ground", grounded: true, velocityY: 0 });
    const eye = { x: best!.x, y: best!.y + 1.6, z: best!.z };
    const yaw = Math.atan2(-(mid[0] - eye.x), -(mid[2] - eye.z));
    const pitch = Math.atan2(mid[1] - eye.y, d);
    let t = 1000;
    const tick = (inp: Partial<BrInput> = {}, acts: BrAct[] = []) => {
      t += TICK_MS;
      stepBrMatch(
        state,
        island.solid,
        meta,
        new Map([[0, { seq: state.tick, forward: 0, strafe: 0, yaw, pitch, ...inp }]]),
        t,
        TICK_MS,
        new Map([[0, acts]]),
      );
      return state.combat;
    };
    return { state, me, yaw, pitch, tick };
  }
  const whole = (state: BrMatchState) => !state.paneBroken?.[pane.id];

  it("a knife slash at the glass breaks it", () => {
    const { state, me, tick } = stand(0.9);
    for (let i = 0; i < 12; i++) tick();
    expect(me.kit.active).toBe(-1);
    expect(whole(state)).toBe(true);
    tick({ fire: true });
    tick();
    expect(whole(state)).toBe(false);
  });

  it("a grenade thrown through the window breaks it on the way", () => {
    const { state, me, tick } = stand(3);
    pickUp(me.kit, { item: "grenade-smoke", qty: 1 });
    for (let i = 0; i < 6; i++) tick();
    tick({}, [{ act: "throw", nade: "smoke", kind: "over" }]);
    for (let i = 0; i < 30 && whole(state); i++) tick();
    expect(whole(state)).toBe(false);
  });

  it("an HE blast beside the window breaks it", () => {
    const { state, me, tick } = stand(1.5);
    pickUp(me.kit, { item: "grenade-he", qty: 1 });
    me.kit.hp = 100_000;
    for (let i = 0; i < 6; i++) tick();
    // Dropped at the feet, facing away from the window.
    tick({ pitch: -1.5, yaw: 0 }, [{ act: "throw", nade: "he", kind: "under" }]);
    let boom = false;
    for (let i = 0; i < 120 && !boom; i++) {
      const e = tick({ pitch: -1.5 });
      boom = e.some((x) => x.type === "boom");
      if (!boom) expect(whole(state)).toBe(true);
    }
    expect(boom).toBe(true);
    expect(whole(state)).toBe(false);
  });
});
