/**
 * Loot client check (LOOT-SPEC): the real client and the real HUD/inventory against the
 * in-page match (as scripts/br/client-sim), starting on the ground with the match's rolled
 * loot plus a test layout in front of the player and a standing target. Driven by
 * capture.mjs: pick up with E, open the inventory, aim through the red dot, shoot the target.
 */
import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { validateBrAct, type BrAct } from "../../../src/lib/fps/br/actions";
import { createBrArena, type BrHud, type BrView } from "../../../src/lib/fps/br/br-arena";
import { decodeHeightfield } from "../../../src/lib/fps/br/heightfield";
import { buildIsland } from "../../../src/lib/fps/br/island";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
import { rollLoot } from "../../../src/lib/fps/br/loot";
import { spec, spawnVehicles, type Vehicle } from "../../../src/lib/fps/br/vehicles";
import {
  BrSeatSync,
  BrSight,
  brViewFor,
  createBrMatch,
  seatHuman,
  stepBrMatch,
  validateBrInput,
  type BrInput,
} from "../../../src/lib/fps/br/match";
import type { CollisionData } from "../../../src/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "../../../src/lib/fps/br/world";
import { TICK_MS } from "../../../src/lib/fps/simulation";
import {
  BrCentre,
  BrFeedView,
  BrInventory,
  BrStatus,
  BrTablet,
  BrZone,
  useBrFeed,
} from "../../../src/components/fps/BrHud";

(globalThis as { __brAssumeLock?: boolean }).__brAssumeLock = true;
const base = new URL(".", location.href).href;
const get = (p: string) => fetch(new URL(p.replace(/^\//, ""), base));
const host = document.getElementById("game")!;
const arena = createBrArena(host, base, () => {});
const control = {
  inventory: false,
  setInventory: (_: boolean) => {},
  setTablet: (_: boolean) => {},
};

function Hud() {
  const [hud, setHud] = useState<BrHud | null>(null);
  const [inv, setInv] = useState(false);
  const [tab, setTab] = useState(false);
  const feed = useBrFeed();
  const f = useRef(feed.onFeed);
  f.current = feed.onFeed;
  useEffect(() => {
    arena.onHud(setHud);
    arena.onFeed((e) => f.current(e));
    control.setInventory = (open) => {
      setInv(open);
      arena.setInventoryOpen(open);
    };
    control.setTablet = (open) => {
      setTab(open);
      arena.setInventoryOpen(open);
    };
  }, []);
  if (!hud) return null;
  return (
    <div className="br-game" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <BrCentre hud={hud} hit={feed.hit} />
      <BrStatus hud={hud} />
      <BrFeedView feed={feed} />
      <BrZone hud={hud} map={arena.mapImage()} />
      {tab && hud.kit?.tablet && (
        <div style={{ pointerEvents: "auto" }}>
          <BrTablet
            kit={hud.kit}
            act={(a) => arena.act(a)}
            close={() => control.setTablet(false)}
          />
        </div>
      )}
      {inv && hud.kit && (
        <div style={{ pointerEvents: "auto" }}>
          <BrInventory
            kit={hud.kit}
            act={(a) => arena.act(a)}
            close={() => control.setInventory(false)}
          />
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("hud")!).render(<Hud />);

declare global {
  interface Window {
    sim: Record<string, unknown>;
  }
}
window.sim = {};
window.sim.ready = (async () => {
  const [hfBuf, lcBuf, meta, collision] = await Promise.all([
    get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    get("/fps/br/models/collision.json").then((r) => r.json() as Promise<CollisionData>),
  ]);
  const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
  const island = buildIsland(hf, cover, meta, collision);
  const world = island.solid;
  const loot = rollLoot(20261103, island.layout, collision, world, meta);
  const vehicles = spawnVehicles(meta, world, 20261103);
  const state = createBrMatch(meta, 20261103, (x, z) => hf.heightAt(x, z), loot, { vehicles });
  const me = seatHuman(state, "local", "Me");
  const target = seatHuman(state, "target", "Target");
  // On the main runway, facing along it; the target 15 m ahead; bots far away.
  const [ax, az] = meta.runways[0]!.a,
    [bx, bz] = meta.runways[0]!.b;
  const len = Math.hypot(bx - ax, bz - az),
    ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const put = (seat: number, t: number, side = 0) => {
    const b = state.seats[seat]!.body;
    b.x = ax + ux * t - uz * side;
    b.z = az + uz * t + ux * side;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    Object.assign(b, { phase: "ground", grounded: true, velocityY: 0, vx: 0, vz: 0 });
  };
  // Bots well away (they fight now): this check is about loot, not bots.
  for (const s of state.seats) put(s.seat, 200 + s.seat * 7, 900);
  put(me, 400);
  put(target, 415);
  state.phase = "active";
  const yaw = Math.atan2(-ux, -uz);
  // A car and a motorbike parked beside the runway, 30 m ahead to the left.
  const park = (kind: Vehicle["kind"], t: number, side: number) => {
    const x = ax + ux * t + uz * side,
      z = az + uz * t - ux * side;
    const v: Vehicle = {
      id: state.vehicles.length,
      kind,
      condition: "used",
      x,
      y: world.supportAt(x, z, 0.2, 1e4),
      z,
      yaw,
      speed: 0,
      pitch: 0,
      roll: 0,
      health: spec(kind).health,
      maxHealth: spec(kind).health,
      driver: -1,
      destroyed: false,
    };
    state.vehicles.push(v);
    return v;
  };
  const car = park("sedan", 430, 12),
    bike = park("bike", 440, -12);
  const meB = state.seats[me]!.body;
  // Test loot in a fan in front of the feet.
  const items: Array<[string, Record<string, unknown>]> = [
    ["ak47", { mag: 30, optic: null, muzzle: null }],
    ["ammo-rifle", { qty: 30 }],
    ["sight-red", {}],
    ["helmet-2", { durability: 150 }],
    ["vest-1", { durability: 100 }],
    ["plate-2", { durability: 75 }],
    ["bandage", { qty: 5 }],
    ["silencer", {}],
    ["grenade-he", { qty: 1 }],
    ["grenade-smoke", { qty: 1 }],
    ["backpack-2", {}],
    ["tablet", {}],
    ["data-drive", { qty: 3 }],
  ];
  const testIds: number[] = [];
  items.forEach(([item, extra], i) => {
    const a = (i - (items.length - 1) / 2) * 0.22;
    const fx = -Math.sin(yaw + a),
      fz = -Math.cos(yaw + a);
    const placed = state.loot.add(
      { item: item as never, qty: 1, ...extra } as never,
      meB.x + fx * 1.3,
      meB.y,
      meB.z + fz * 1.3,
    );
    testIds.push(placed.id);
  });
  state.seats[target]!.kit.armour.vest = { item: "vest-1", durability: 100 };
  const queue: BrInput[] = [];
  const acts: BrAct[] = [];
  arena.setSender((message) => {
    const raw = JSON.parse(message);
    if (raw.type === "br-act") {
      const a = validateBrAct(raw);
      if (!a) throw new Error("invalid action " + message);
      acts.push(a);
      return;
    }
    const input = validateBrInput(raw);
    if (!input) throw new Error("client sent an invalid input " + message);
    queue.push(input);
    while (queue.length > 8) queue.shift();
  });
  await arena.ready;
  arena.look(yaw, -0.5);
  const sight = new BrSight(),
    sync = new BrSeatSync();
  let clock = 0;
  const actLog: string[] = [];
  const pendingCombat: typeof state.combat = [];
  setInterval(() => {
    const input = queue.shift();
    const inputs = new Map<number, BrInput>();
    if (input) inputs.set(me, input);
    clock += TICK_MS;
    stepBrMatch(state, world, meta, inputs, clock, TICK_MS, new Map([[me, acts.splice(0, 4)]]));
    pendingCombat.push(...state.combat);
    for (const e of state.combat)
      if (e.type === "act") actLog.push(`${e.act}:${e.ok}:${e.item ?? ""}:${e.reason ?? ""}`);
    state.combat = pendingCombat.splice(0);
    arena.snapshot(brViewFor(state, world, sight, me, clock, sync) as unknown as BrView);
    state.loot.flush();
  }, TICK_MS);
  window.sim.status = () => ({
    kit: state.seats[me]!.kit,
    target: { hp: state.seats[target]!.kit.hp, dead: state.seats[target]!.dead },
    lootNear: arena.debug().loot,
    acts: actLog,
  });
  window.sim.inventory = (open: boolean) => control.setInventory(open);
  window.sim.tablet = (open: boolean) => control.setTablet(open);
  window.sim.look = (y: number, p: number) => arena.look(y, p);
  window.sim.yaw = yaw;
  // Stand inside a town building next to rolled loot and look at it (placement check).
  window.sim.visitTown = (n: number) => {
    const houses = island.layout.filter(
      (p) => p.poi === "northstar-town" && /house|store|shop|diner/.test(p.model),
    );
    const inside = [...state.loot.items.values()].filter((i) =>
      houses.some((p) => Math.hypot(p.x - i.x, p.z - i.z) < 6),
    );
    const it = inside[n % inside.length]!;
    for (const ang of [0, 1.57, 3.14, 4.71]) {
      const x = it.x + Math.sin(ang) * 1.8,
        z = it.z + Math.cos(ang) * 1.8;
      const y = world.supportAt(x, z, 0.35, it.y + 0.4);
      if (Math.abs(y - it.y) < 0.3 && !world.blocked(x, y + 0.05, z, 1.7, 0.35)) {
        Object.assign(meB, { x, y, z, velocityY: 0, grounded: true });
        break;
      }
    }
    const dx = it.x - meB.x,
      dz = it.z - meB.z;
    arena.look(Math.atan2(-dx, -dz), Math.atan2(it.y - meB.y - 1.6, Math.hypot(dx, dz)));
    return { item: it.item, near: inside.length };
  };
  window.sim.toVehicle = (which: "car" | "bike") => {
    const v = which === "car" ? car : bike;
    meB.x = v.x - uz * 2.4;
    meB.z = v.z + ux * 2.4;
    meB.y = world.supportAt(meB.x, meB.z, 0.35, v.y + 1);
    arena.look(Math.atan2(-(v.x - meB.x), -(v.z - meB.z)), -0.2);
    return { id: v.id };
  };
  window.sim.vehicle = (which: "car" | "bike") => {
    const v = which === "car" ? car : bike;
    return { x: v.x, z: v.z, speed: v.speed, driver: v.driver, health: v.health, yaw: v.yaw };
  };
  // Soak: hop between towns (loot and vehicles stream in and out), fire, report memory.
  window.sim.soakStep = (n: number) => {
    const pois = meta.pois;
    const p = pois[n % pois.length]!;
    const x = p.x + 30,
      z = p.z + 30;
    Object.assign(meB, { x, z, y: world.supportAt(x, z, 0.35, 1e4), velocityY: 0 });
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const d = arena.debug();
    return {
      poi: p.id,
      heapMB: m ? +(m.usedJSHeapSize / 1e6).toFixed(1) : null,
      geometries: d.geometries,
      textures: d.textures,
      programs: d.programs,
      loot: d.loot,
    };
  };
  window.sim.remaining = () => testIds.filter((id) => state.loot.items.has(id));
  window.sim.lookAtItem = (id: number) => {
    const it = state.loot.items.get(id);
    if (!it) return;
    const dx = it.x - meB.x,
      dz = it.z - meB.z,
      dy = it.y + 0.15 - (meB.y + 1.6);
    arena.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
  };
  window.sim.lookAtTarget = () => {
    const t = state.seats[target]!.body;
    const dx = t.x - meB.x,
      dz = t.z - meB.z;
    arena.look(Math.atan2(-dx, -dz), Math.atan2(1.15 - 1.6, Math.hypot(dx, dz)));
  };
})();
