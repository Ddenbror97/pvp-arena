/**
 * Battle royale client check without a server deployment: the page runs the real shared match
 * (match.ts) as an in-page stand-in for BrRoom, with a second human seat that mirrors the local
 * player, and connects the real client (br-arena.ts) to it through a fake socket. Driven by
 * scripts/br/client-sim/capture.mjs (Playwright): countdown, plane, jump, freefall, parachute,
 * landing; screenshots and prediction error against the server's state.
 */
import { createBrArena, type BrView } from "../../../src/lib/fps/br/br-arena";
import { decodeHeightfield } from "../../../src/lib/fps/br/heightfield";
import { buildIsland } from "../../../src/lib/fps/br/island";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
import {
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
import { SNAPSHOT_INTERVAL_MS } from "../../../src/lib/fps/network";
import { TICK_MS } from "../../../src/lib/fps/simulation";

declare global {
  interface Window {
    sim: {
      ready: Promise<void>;
      look?: (pitch: number) => void;
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
const arena = createBrArena(document.body, base, () => {});
const ready = (async () => {
  const [hfBuf, lcBuf, meta, collision] = await Promise.all([
    get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    get("/fps/br/models/collision.json").then((r) => r.json() as Promise<CollisionData>),
  ]);
  const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
  const world = buildIsland(hf, cover, meta, collision).solid;
  const state = createBrMatch(meta, 20261103, (x, z) => hf.heightAt(x, z));
  const me = seatHuman(state, "local", "Me");
  const other = seatHuman(state, "remote", "Buddy");
  const queue: BrInput[] = [];
  let mirror: BrInput | null = null;
  arena.setSender((message) => {
    const input = validateBrInput(JSON.parse(message));
    if (!input) throw new Error("client sent an invalid input");
    queue.push(input);
    while (queue.length > 8) queue.shift();
  });
  await arena.ready;
  const sight = new BrSight();
  let clock = 0,
    lastSnap = 0;
  let lastView: BrView | null = null;
  setInterval(() => {
    const input = queue.shift();
    if (input) mirror = { ...input, yaw: input.yaw + 0.3 };
    const inputs = new Map<number, BrInput>();
    if (input) inputs.set(me, input);
    if (mirror) inputs.set(other, mirror);
    clock += TICK_MS;
    stepBrMatch(state, world, meta, inputs, clock, TICK_MS);
    if (performance.now() - lastSnap >= SNAPSHOT_INTERVAL_MS) {
      lastSnap = performance.now();
      lastView = brViewFor(state, world, sight, me, clock) as unknown as BrView;
      arena.snapshot(lastView);
    }
  }, TICK_MS);
  window.sim.status = () => {
    const b = state.seats[me]!.body;
    const p = arena.debug().body;
    return {
      phase: state.phase,
      me: { phase: b.phase, x: b.x, y: b.y, z: b.z },
      predicted: { phase: p.phase, x: p.x, y: p.y, z: p.z },
      error: Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z),
      pending: arena.debug().pending,
      otherSeen: lastView?.players.find((r) => r[0] === other) ?? null,
    };
  };
})();
window.sim = {
  ready,
  look: (p: number) => {
    const b = arena.debug().body;
    arena.look(Math.atan2(-b.vx, -b.vz) || 0, p);
  },
  status: () => {
    throw new Error("not ready");
  },
};
