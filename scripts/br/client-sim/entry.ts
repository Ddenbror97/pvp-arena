import * as THREE from "three";
/**
 * Battle royale client check without a server deployment: the page runs the real shared match
 * (match.ts) as an in-page stand-in for BrRoom, with a second human seat that mirrors the local
 * player, and connects the real client (br-arena.ts) to it through a fake socket. Driven by
 * scripts/br/client-sim/capture.mjs (Playwright): countdown, plane, jump, freefall, parachute,
 * landing; screenshots and prediction error against the server's state.
 */
import { validateBrAct, type BrAct } from "../../../src/lib/fps/br/actions";
import { createBrArena, type BrArenaControls, type BrView } from "../../../src/lib/fps/br/br-arena";
import { decodeHeightfield } from "../../../src/lib/fps/br/heightfield";
import { buildIsland } from "../../../src/lib/fps/br/island";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
import { ITEMS } from "../../../src/lib/fps/br/items";
import { pickUp } from "../../../src/lib/fps/br/inventory";
import { rollLoot } from "../../../src/lib/fps/br/loot";
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
import { ZIP_HEADING, ZIP_STAND, zipLanding } from "../../../src/lib/fps/br/zipline";
import { climbPoint, ladders } from "../../../src/lib/fps/br/ladders";
import { SNAPSHOT_INTERVAL_MS } from "../../../src/lib/fps/network";
import { TICK_MS } from "../../../src/lib/fps/simulation";

declare global {
  interface Window {
    sim: {
      ready: Promise<void>;
      arena: BrArenaControls;
      look?: (pitch: number) => void;
      /** UI check only: stand the local player on the nearest weapon (the room has no such hook). */
      toLoot?: () => void;
      /** UI check only: stand the local player 40 m outside the circle (to see the gas HUD). */
      toGas?: () => void;
      /**
       * Knife check only: stand the local player on open ground where it is, the other player
       * still an arm's length ahead (`behind`: facing away), no longer mirroring the input.
       */
      knifeSetup?: (behind?: boolean) => void;
      /**
       * Knife and gun checks: a gun into the local player's hands (default the AK-47) with
       * attachments, and rounds for it in the bag.
       */
      giveGun?: (item?: string, optic?: string | null, muzzle?: string | null) => void;
      /** Zip-line check only: stand the local player on the Iron Peaks deck at the handle. */
      toZip?: () => number;
      /** Zip-line check only: the other player takes the line (server act), the local player
       * standing beside the Pine Ridge landing to watch them come in. */
      zipOther?: () => void;
      /** Zip-line check only: the other player's ride time (ms; -1 off the line). */
      otherZip?: () => number;
      /** Ladder check only: the local player at the foot of the Iron Peaks watchtower's ladder
       * (returns the way to face it). */
      toLadder?: () => { yaw: number; bottom: number; top: number };
      /** Ladder check only: the other player climbs it, the local player watching from the east. */
      ladderOther?: () => number;
      /** Ladder check only: the other climber holds still (0) or climbs on (1). */
      otherClimb?: (forward: number) => void;
      /** Inventory check only: a helmet, vest and backpack of `level` (1–3), worn. */
      giveGear?: (level: number) => void;
      status: () => {
        phase: string;
        me: { phase: string; x: number; y: number; z: number };
        predicted: { phase: string; x: number; y: number; z: number };
        error: number;
        pending: number;
        otherSeen: number[] | null;
      };
    };
  }
}

const base = new URL(".", location.href).href;
const get = (p: string) => fetch(new URL(p.replace(/^\//, ""), base));
const params = new URLSearchParams(location.search);
// The UI harness (ui.tsx) mounts the arena in its own host; the plain check uses the body.
const host = document.getElementById("arena") ?? document.body;
const arena = createBrArena(host, base, () => {});
const ready = (async () => {
  const [hfBuf, lcBuf, meta, collision] = await Promise.all([
    get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    get(WORLD_ASSETS.collision).then((r) => r.json() as Promise<CollisionData>),
  ]);
  const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
  const island = buildIsland(hf, cover, meta, collision);
  const world = island.solid;
  const seed = 20261103;
  // ?zone=0.2 runs the zone faster (to see the gas); ?loot=1 rolls the match's loot, as the room does.
  const scale = Number(params.get("zone") ?? 1);
  const loot = params.get("loot") ? rollLoot(seed, island.layout, collision, world, meta) : [];
  const state = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, {
    zoneTimeScale: scale > 0 && scale <= 1 ? scale : 1,
    open: (x, z) => !world.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
  });
  const me = seatHuman(state, "local", "Me");
  const other = seatHuman(state, "remote", "Buddy");
  const queue: BrInput[] = [];
  const actQueue: BrAct[] = [];
  let mirror: BrInput | null = null;
  let mirroring = true;
  let lastInput: BrInput | null = null;
  arena.setSender((message) => {
    const raw = JSON.parse(message);
    if (raw?.type === "br-act") {
      const act = validateBrAct(raw);
      if (!act) throw new Error("client sent an invalid action");
      actQueue.push(act);
      return;
    }
    const input = validateBrInput(raw);
    if (!input) throw new Error("client sent an invalid input");
    lastInput = input;
    queue.push(input);
    while (queue.length > 8) queue.shift();
  });
  await arena.ready;
  const sight = new BrSight();
  // Per-connection state, as the room keeps it: loot, vehicles, doors and the kit go by it.
  const sync = new BrSeatSync();
  let clock = 0,
    lastSnap = 0;
  let lastView: BrView | null = null;
  setInterval(() => {
    const input = queue.shift();
    if (input && mirroring) mirror = { ...input, yaw: input.yaw + 0.3 };
    const inputs = new Map<number, BrInput>();
    if (input) inputs.set(me, input);
    if (mirror) inputs.set(other, mirror);
    clock += TICK_MS;
    const acts = new Map<number, BrAct[]>();
    if (actQueue.length) acts.set(me, actQueue.splice(0, 4));
    if (otherActs.length) acts.set(other, otherActs.splice(0, 4));
    stepBrMatch(state, world, meta, inputs, clock, TICK_MS, acts);
    if (performance.now() - lastSnap >= SNAPSHOT_INTERVAL_MS) {
      lastSnap = performance.now();
      lastView = brViewFor(state, world, sight, me, clock, sync) as unknown as BrView;
      arena.snapshot(lastView);
    }
  }, TICK_MS);
  window.sim.toLoot = () => {
    const b = state.seats[me]!.body;
    let best: { x: number; y: number; z: number } | null = null,
      bd = Infinity;
    // A weapon outdoors (on the ground, not under a roof) with more loot beside it: the
    // inventory's Nearby list then shows several rows, the world stays in view.
    const items = [...state.loot.items.values()];
    for (const i of items) {
      if (ITEMS[i.item]?.category !== "weapon") continue;
      if (Math.abs(i.y - hf.heightAt(i.x, i.z)) > 0.6) continue;
      const near = items.filter((o) => Math.hypot(o.x - i.x, o.z - i.z) < 3).length;
      const d = Math.hypot(i.x - b.x, i.z - b.z) + (near >= 2 ? 0 : 2000);
      if (d < bd) [bd, best] = [d, i];
    }
    if (!best) return;
    b.x = best.x + 0.6;
    b.z = best.z;
    b.y = best.y;
    b.vx = b.vy = b.vz = 0;
  };
  window.sim.knifeSetup = (behind = false) => {
    const b = state.seats[me]!.body,
      o = state.seats[other]!;
    mirroring = false;
    mirror = null;
    b.phase = "ground";
    // Open dry ground: the first clear spot on a spiral from the island's centre.
    const yaw = lastInput?.yaw ?? 0;
    const clear = (x: number, z: number) => {
      const y = hf.heightAt(x, z);
      return (
        y > 3 &&
        !world.blocked(x, y + 0.1, z, 1.8, 0.6) &&
        Math.abs(world.supportAt(x, z, 0.35, y + 0.5) - y) < 0.01
      );
    };
    for (let i = 0; i < 4000; i++) {
      const r = 40 + i * 2,
        a = i * 0.7;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const ox = x - Math.sin(yaw) * 1.1,
        oz = z - Math.cos(yaw) * 1.1;
      if (clear(x, z) && clear(ox, oz) && Math.abs(hf.heightAt(x, z) - hf.heightAt(ox, oz)) < 0.3) {
        b.x = x;
        b.z = z;
        break;
      }
    }
    b.y = hf.heightAt(b.x, b.z);
    b.vx = b.vy = b.vz = 0;
    o.body.phase = "ground";
    o.body.x = b.x - Math.sin(yaw) * 1.1;
    o.body.z = b.z - Math.cos(yaw) * 1.1;
    o.body.y = hf.heightAt(o.body.x, o.body.z);
    o.body.vx = o.body.vy = o.body.vz = 0;
    o.yaw = behind ? yaw : yaw + Math.PI;
    o.kit.hp = 100;
    o.dead = false;
  };
  const otherActs: BrAct[] = [];
  const stop = (b: { vx: number; vz: number; velocityY: number }) => {
    b.vx = b.vz = b.velocityY = 0;
  };
  window.sim.toZip = () => {
    const b = state.seats[me]!.body;
    mirroring = false;
    mirror = null;
    Object.assign(b, {
      phase: "ground",
      grounded: true,
      x: ZIP_STAND.x,
      y: ZIP_STAND.y,
      z: ZIP_STAND.z,
    });
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: ZIP_STAND.x + 30, z: ZIP_STAND.z + 30 });
    o.y = hf.heightAt(o.x, o.z);
    stop(o);
    return ZIP_HEADING;
  };
  window.sim.toLadder = () => {
    const l = ladders(hf)[0]!;
    const foot = climbPoint(l, 0);
    const b = state.seats[me]!.body;
    mirroring = false;
    mirror = null;
    Object.assign(b, { phase: "ground", grounded: true, x: foot.x + 0.6, y: foot.y, z: foot.z });
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: foot.x + 25, z: foot.z + 25 });
    o.y = hf.heightAt(o.x, o.z);
    stop(o);
    return { yaw: l.yaw, bottom: l.bottom, top: l.top };
  };
  window.sim.ladderOther = () => {
    const l = ladders(hf)[0]!;
    const foot = climbPoint(l, 0);
    const b = state.seats[me]!.body;
    Object.assign(b, { phase: "ground", grounded: true, x: foot.x + 4.5, z: foot.z + 1.2 });
    b.y = world.supportAt(b.x, b.z, 0.35, hf.heightAt(b.x, b.z) + 1);
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: foot.x + 0.4, y: foot.y, z: foot.z });
    stop(o);
    otherActs.push({ act: "ladder" });
    mirroring = false;
    mirror = { seq: 1, forward: 1, strafe: 0, yaw: l.yaw };
    return l.yaw;
  };
  window.sim.otherZip = () => state.seats[other]!.body.zip?.ms ?? -1;
  window.sim.otherClimb = (forward) => {
    const l = ladders(hf)[0]!;
    mirror = { seq: 1, forward, strafe: 0, yaw: l.yaw };
  };
  window.sim.zipOther = () => {
    const end = zipLanding((x, z) => hf.heightAt(x, z));
    const b = state.seats[me]!.body;
    Object.assign(b, { phase: "ground", grounded: true, x: end.x + 9, z: end.z + 9 });
    b.y = world.supportAt(b.x, b.z, 0.35, hf.heightAt(b.x, b.z) + 2);
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, {
      phase: "ground",
      grounded: true,
      x: ZIP_STAND.x,
      y: ZIP_STAND.y,
      z: ZIP_STAND.z,
    });
    delete o.ladder;
    stop(o);
    mirror = null;
    otherActs.push({ act: "zip" });
  };
  window.sim.giveGear = (level) => {
    const kit = state.seats[me]!.kit;
    for (const slot of ["helmet", "vest", "backpack"] as const) {
      const item = `${slot}-${level}` as keyof typeof ITEMS;
      const d = ITEMS[item] as { durability?: number };
      // Replace what is worn (straight on, as the inventory's equip does).
      if (slot === "backpack") kit.backpack = item;
      else kit.armour[slot] = { item, durability: d.durability ?? 100 };
    }
    state.seats[me]!.kitVersion++;
  };
  window.sim.giveGun = (item = "ak47", optic = null, muzzle = null) => {
    const kit = state.seats[me]!.kit;
    const d = ITEMS[item as keyof typeof ITEMS] as { magazine: number; ammo: string };
    pickUp(kit, {
      item: item as keyof typeof ITEMS,
      qty: 1,
      mag: d.magazine,
      optic: optic as keyof typeof ITEMS | null,
      muzzle: muzzle as keyof typeof ITEMS | null,
    });
    pickUp(kit, { item: d.ammo as keyof typeof ITEMS, qty: 60 });
    state.seats[me]!.kitVersion++;
  };
  window.sim.toGas = () => {
    const b = state.seats[me]!.body;
    const c = state.zoneNow?.now;
    if (!c) return;
    const a = Math.atan2(b.z - c.z, b.x - c.x);
    b.x = c.x + Math.cos(a) * (c.r + 40);
    b.z = c.z + Math.sin(a) * (c.r + 40);
    b.y = hf.heightAt(b.x, b.z);
    b.vx = b.vy = b.vz = 0;
  };
  window.sim.status = () => {
    const b = state.seats[me]!.body;
    const p = arena.debug().body;
    return {
      phase: state.phase,
      me: { phase: b.phase, x: b.x, y: b.y, z: b.z },
      ground: world.supportAt(b.x, b.z, 0.35, b.y),
      cam: arena.debug().camera.map((v) => Math.round(v * 10) / 10),
      camDist: (() => {
        const d = arena.debug();
        return (
          Math.round(
            Math.hypot(
              d.camera[0] - d.shown[0],
              d.camera[1] - d.shown[1],
              d.camera[2] - d.shown[2],
            ) * 10,
          ) / 10
        );
      })(),
      shown: arena.debug().shown,
      /** Where your drawn character's root and its head land on screen (NDC). */
      ndc: (() => {
        const v = arena.debug().view as { camera: THREE.Camera; me: THREE.Object3D } | undefined;
        if (!v) return null;
        const at = (o: THREE.Vector3) =>
          o
            .project(v.camera)
            .toArray()
            .map((n) => Math.round(n * 100) / 100);
        const root = v.me.getWorldPosition(new THREE.Vector3());
        const head = v.me.getObjectByName("mixamorigHead")?.getWorldPosition(new THREE.Vector3());
        const dir = (v.camera as THREE.Camera).getWorldDirection(new THREE.Vector3());
        const cam = v.camera as THREE.PerspectiveCamera;
        return {
          root: at(root.clone()),
          head: head ? at(head) : null,
          rootY: root.y,
          pitchDeg: Math.round((Math.asin(dir.y) * 180) / Math.PI),
          fov: Math.round(cam.fov),
          blend: (arena.debug().view as { zipBlend: number }).zipBlend,
        };
      })(),
      predicted: { phase: p.phase, x: p.x, y: p.y, z: p.z },
      error: Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z),
      pending: arena.debug().pending,
      input: lastInput,
      velocity: [b.vx, b.vz],
      otherSeen: lastView?.players.find((r) => r[0] === other) ?? null,
      otherHp: state.seats[other]!.kit.hp,
      myActive: state.seats[me]!.kit.active,
      zip: state.seats[me]!.body.zip?.ms ?? null,
      otherPhase: state.seats[other]!.body.phase,
      otherPos: [
        state.seats[other]!.body.x,
        state.seats[other]!.body.y,
        state.seats[other]!.body.z,
      ],
    };
  };
})();
window.sim = {
  ready,
  arena,
  look: (p: number) => {
    const b = arena.debug().body;
    arena.look(Math.atan2(-b.vx, -b.vz) || 0, p);
  },
  status: () => {
    throw new Error("not ready");
  },
};
/** For the UI harness (ui.tsx): importing a binding keeps this module (the package is side-effect free). */
export const sim = window.sim;
