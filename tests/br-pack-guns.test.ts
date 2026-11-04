import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { BrAct } from "@/lib/fps/br/actions";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { pickUp } from "@/lib/fps/br/inventory";
import { gunTakes, ITEMS, PACK_GUNS, type WeaponDef } from "@/lib/fps/br/items";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  createBrMatch,
  seatHuman,
  stepBrMatch,
  type BrInput,
  type BrMatchState,
} from "@/lib/fps/br/match";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
let hf: Heightfield, world: StaticWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  world = buildIsland(hf, cover, meta, collision).solid;
}, 60_000);

/** Two players on the main runway, `gap` m apart (default 20); seat 0 shoots. */
function duel(gap = 20) {
  const state = createBrMatch(meta, 7, (x, z) => hf.heightAt(x, z));
  seatHuman(state, "u1", "One");
  seatHuman(state, "u2", "Two"); // seat 1: a human with no input stands still
  state.phase = "active";
  const [ax, az] = meta.runways[0]!.a,
    [bx, bz] = meta.runways[0]!.b;
  const len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const put = (seat: number, t: number, side = 0) => {
    const b = state.seats[seat]!.body;
    b.x = ax + ux * t - uz * side;
    b.z = az + uz * t + ux * side;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    b.phase = "ground";
    b.grounded = true;
    b.velocityY = 0;
  };
  // Everyone else well off the line of fire.
  for (const s of state.seats) put(s.seat, 300 + s.seat * 6, 25);
  put(0, 400);
  put(1, 400 + gap);
  // Facing seat 1: direction (−sin yaw, −cos yaw).
  const yaw = Math.atan2(-ux, -uz);
  const pitch = Math.atan2(1.17 - 1.6, gap);
  return { state, yaw, pitch };
}

let t = 0;
function tick(state: BrMatchState, inp: Partial<BrInput> | null, acts: BrAct[] = []) {
  t += TICK_MS;
  const inputs = new Map<number, BrInput>();
  if (inp) inputs.set(0, { seq: t, forward: 0, strafe: 0, yaw: 0, ...inp });
  stepBrMatch(state, world, meta, inputs, t, TICK_MS, new Map([[0, acts]]));
  return state.combat;
}
/** Fire `ticks` times with the given pattern; the events of every tick. */
function shoot(
  state: BrMatchState,
  yaw: number,
  pitch: number,
  ticks: number,
  fire: (i: number) => boolean,
) {
  const out: BrMatchState["combat"] = [];
  for (let i = 0; i < ticks; i++) out.push(...tick(state, { yaw, pitch, fire: fire(i) }));
  return out;
}

describe("battle royale: the owner's weapon pack", () => {
  it("defines the eight guns with their ammunition, and appends them (wire codes unchanged)", () => {
    const ids = Object.keys(ITEMS);
    expect(ids.indexOf("ak47")).toBe(0);
    for (const id of PACK_GUNS) {
      const d = ITEMS[id] as WeaponDef;
      expect(d.category).toBe("weapon");
      expect(ITEMS[d.ammo].category).toBe("ammo");
      expect(ids.indexOf(id)).toBeGreaterThan(ids.indexOf("data-drive"));
    }
  });

  it("semi-automatic guns fire once per trigger pull", () => {
    const { state, yaw, pitch } = duel();
    const me = state.seats[0]!;
    pickUp(me.kit, { item: "pistol", qty: 1, mag: 8 });
    const held = shoot(state, yaw, pitch, 60, () => true).filter((e) => e.type === "shot");
    expect(held.length).toBe(1);
    // Pull, let go, pull: one shot each.
    const taps = shoot(state, yaw, pitch, 60, (i) => i % 8 === 0).filter((e) => e.type === "shot");
    expect(taps.length).toBe(Math.min(7, Math.ceil(60 / 8)));
  });

  it("shotguns fire pellets that add up into one hit, much harder close than far", () => {
    const close = duel(4);
    pickUp(close.state.seats[0]!.kit, { item: "pump", qty: 1, mag: 6 });
    const near = shoot(close.state, close.yaw, close.pitch, 1, () => true);
    expect(near.filter((e) => e.type === "shot").length).toBe(1);
    const nearHits = near.filter((e) => e.type === "hit");
    expect(nearHits.length).toBe(1);
    const far = duel(26);
    pickUp(far.state.seats[0]!.kit, { item: "pump", qty: 1, mag: 6 });
    const farHits = shoot(far.state, far.yaw, far.pitch, 1, () => true).filter(
      (e) => e.type === "hit",
    );
    const dmg = (h: typeof nearHits) =>
      h.reduce((a, e) => a + (e.type === "hit" ? e.damage : 0), 0);
    // Several pellets land at 4 m (one pellet is 14 at most); at 26 m few land, and weakly.
    expect(dmg(nearHits)).toBeGreaterThan(40);
    expect(dmg(farHits)).toBeLessThan(dmg(nearHits) / 2);
  });

  it("the MP5 hits for its full damage inside its fall-off range", () => {
    const { state, yaw, pitch } = duel();
    pickUp(state.seats[0]!.kit, { item: "mp5", qty: 1, mag: 30 });
    const hit = shoot(state, yaw, pitch, 1, () => true).find((e) => e.type === "hit");
    expect(hit && hit.type === "hit" && [26, 27, 23, 16]).toContain(
      hit && hit.type === "hit" ? hit.damage : -1,
    );
  });

  it("attachments fit by gun: the revolver takes none, shotguns sights but no scopes or muzzles", () => {
    expect(gunTakes("ak47", "scope-6x")).toBe(true);
    expect(gunTakes("svd", "silencer")).toBe(true);
    expect(gunTakes("revolver", "sight-red")).toBe(false);
    expect(gunTakes("revolver", "silencer")).toBe(false);
    expect(gunTakes("pump", "sight-holo")).toBe(true);
    expect(gunTakes("pump", "scope-4x")).toBe(false);
    expect(gunTakes("pump", "silencer")).toBe(false);
    expect(gunTakes("pistol", "silencer")).toBe(true);
    expect(gunTakes("pistol", "scope-4x")).toBe(false);
    const { state } = duel();
    const kit = state.seats[0]!.kit;
    pickUp(kit, { item: "revolver", qty: 1, mag: 6 });
    pickUp(kit, { item: "silencer", qty: 1 });
    expect(kit.guns[0]!.muzzle).toBeNull();
    expect(kit.bag.some((b) => b.item === "silencer")).toBe(true);
  });
});
