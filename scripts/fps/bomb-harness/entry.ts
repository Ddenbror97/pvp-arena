/**
 * Bomb Defusal browser harness: the real client renderer (bomb-renderer.ts) fed by an in-page
 * room (the same simulation, bots and per-recipient snapshots as workers/fps/bomb.ts). Used by
 * run.mjs to check loading, prediction, remote players, spectating, the bomb and draw cost in
 * headless Chromium. Not shipped.
 */
import { mountBombArena, type BombArenaControls } from "../../../src/lib/fps/bomb/bomb-renderer";
import { createBombBots } from "../../../src/lib/fps/bomb/bots";
import {
  buyBombPrimary,
  createBombMatch,
  startBombMatch,
  stepBombMatch,
} from "../../../src/lib/fps/bomb/match";
import type { BombInput, BombMatchState, BombPlayer } from "../../../src/lib/fps/bomb/rules";
import { BombReveal, bombViewFor, type BombView } from "../../../src/lib/fps/bomb/snapshot";
import { HANDLING } from "../../../src/lib/fps/handling";
import { traceWorld } from "../../../src/lib/fps/collision";
import { bombMap, type BombMapId } from "../../../src/lib/fps/bomb/maps";
import { BOT_POINTS, IRON_DISTRICT_BOT_POINTS } from "../../../src/lib/fps/bomb/bots";
import { simStart, simTo } from "../../../src/lib/fps/grenades/physics";
import { GRENADES } from "../../../src/lib/fps/grenades/rules";
import { heRawDamage } from "../../../src/lib/fps/grenades/effects";

declare global {
  interface Window {
    harness: {
      start: (slot: number, mapId?: BombMapId) => Promise<{ loadMs: number }>;
      state: () => BombMatchState;
      view: () => BombView | null;
      live: () => void;
      set: (slot: number, props: Partial<BombPlayer>) => void;
      freezeBots: (frozen: boolean) => void;
      use: (slot: number, held: boolean) => void;
      diagnostics: () => ReturnType<BombArenaControls["diagnostics"]>;
      programs: () => string[];
      key: (code: string, down: boolean) => void;
      look: (yaw: number, pitch: number) => void;
      spectate: (slot: number | null) => void;
      plant: (site: "A" | "B") => void;
      /** Spawn buy menu purchase for the harness player (the room's rule). */
      buy: (item: "rifle" | "awp") => boolean;
      mouse: (button: number, down: boolean) => void;
      /** The yaw from `slot` with the longest open line of sight (at eye height, up to 40 m). */
      openYaw: (slot: number) => number;
      /** Turn the view by `delta` radians (mouse input, sensitivity 1). */
      turn: (delta: number) => void;
      /** Put the damage-test victim on an exposed floor near this throw's actual blast. */
      standNearHeBlast: (slot: number) => boolean;
      errors: string[];
      sent: () => { sent: number; last: BombInput | null };
    };
  }
}

const errors: string[] = [];
window.addEventListener("error", (e) => errors.push(String(e.message)));
let sent = 0,
  lastSent: BombInput | null = null;
let state: BombMatchState,
  arena: BombArenaControls,
  me = 0,
  wanted: number | null = null,
  last: BombView | null = null,
  botsFrozen = false;
const queue: BombInput[] = [];
const reveal = new BombReveal();
const useHeld = new Set<number>();

window.harness = {
  errors,
  sent: () => ({ sent, last: lastSent }),
  async start(slot, mapId) {
    me = slot;
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;inset:0";
    document.body.appendChild(host);
    const began = performance.now();
    arena = mountBombArena(
      host,
      (input) => {
        sent++;
        lastSent = input;
        queue.push(input);
        while (queue.length > 8) queue.shift();
      },
      () => {},
      {},
      mapId ?? "sandgate",
    );
    // Headless: pretend the pointer is captured and the page focused, so the renderer reads keys.
    const canvas = host.querySelector("canvas")!;
    Object.defineProperty(document, "pointerLockElement", { get: () => canvas });
    document.hasFocus = () => true;
    const slots = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      name: i === slot ? "You" : `BOT ${i}`,
      bot: i !== slot,
    }));
    const now = Date.now();
    state = createBombMatch(slots, now, 7, mapId ?? "sandgate");
    startBombMatch(state, now);
    const bots = createBombBots(() => Math.random());
    setInterval(() => {
      const t = Date.now();
      const inputs: Record<number, BombInput> = botsFrozen ? {} : { ...bots.inputs(state, t) };
      const mine = queue.shift();
      if (mine) inputs[me] = mine;
      for (const slot of useHeld) {
        const p = state.players[slot]!;
        inputs[slot] = {
          v: 1,
          type: "input",
          combatVersion: 2,
          seq: p.lastSeq + 1,
          round: state.round,
          forward: 0,
          strafe: 0,
          yaw: p.yaw,
          pitch: p.pitch,
          weapon: "rifle",
          fire: false,
          reload: false,
          jump: false,
          sprint: false,
          use: true,
        };
      }
      stepBombMatch(state, inputs, t);
      last = bombViewFor(state, me, wanted, reveal, t);
      arena.snapshot(last);
    }, 34);
    await arena.ready;
    return { loadMs: performance.now() - began };
  },
  state: () => state,
  view: () => last,
  live() {
    state.phaseEndsAt = Date.now();
    // SwiftShader runs a few frames per second: keep the round from timing out mid-check.
    state.roundEndsAt = Date.now() + 3_600_000;
  },
  set(slot, props) {
    Object.assign(state.players[slot]!, props);
  },
  freezeBots(frozen) {
    botsFrozen = frozen;
  },
  use(slot, held) {
    if (held) useHeld.add(slot);
    else useHeld.delete(slot);
  },
  diagnostics: () => arena.diagnostics(),
  programs: () => arena.programs(),
  key(code, down) {
    document.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code }));
  },
  look(yaw, pitch) {
    // Mouse deltas the renderer turns into yaw/pitch (sensitivity 1).
    document.dispatchEvent(new MouseEvent("mousemove", { movementX: yaw, movementY: pitch }));
  },
  spectate(slot) {
    wanted = slot;
  },
  buy(item) {
    return buyBombPrimary(state, me, item, Date.now());
  },
  openYaw(slot) {
    const p = state.players[slot]!;
    let best = 0,
      far = -1;
    for (let i = 0; i < 72; i++) {
      const yaw = (i / 72) * Math.PI * 2 - Math.PI;
      const hit = traceWorld(
        { x: p.x, y: p.y + 1.5, z: p.z },
        { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) },
        40,
        bombMap(state.mapId).map,
      );
      const d = hit?.distance ?? 40;
      if (d > far) {
        far = d;
        best = yaw;
      }
    }
    return best;
  },
  turn(delta) {
    document.dispatchEvent(
      new MouseEvent("mousemove", { movementX: -delta / HANDLING.sensitivity }),
    );
  },
  mouse(button, down) {
    document.dispatchEvent(new MouseEvent(down ? "mousedown" : "mouseup", { button }));
  },
  standNearHeBlast(slot) {
    const p = state.grenades?.flying.find((p) => p.type === "he");
    if (!p) return false;
    const blast = simStart(
      { x: p.o[0], y: p.o[1], z: p.o[2] },
      { x: p.v[0], y: p.v[1], z: p.v[2] },
    );
    simTo(blast, bombMap(state.mapId).map, GRENADES.he.fuseMs / 1000);
    for (const [dx, dz] of [
      [0.7, 0],
      [-0.7, 0],
      [0, 0.7],
      [0, -0.7],
    ]) {
      const floor = traceWorld(
        { x: blast.x + dx!, y: blast.y + 1, z: blast.z + dz! },
        { x: 0, y: -1, z: 0 },
        blast.y + 4,
        bombMap(state.mapId).map,
      );
      if (!floor || floor.normal.y < 0.9) continue;
      const target = { x: floor.point.x, y: floor.point.y + 0.001, z: floor.point.z };
      if (heRawDamage(blast, target, bombMap(state.mapId).map) < 8) continue;
      Object.assign(state.players[slot]!, target, { hp: 100, dead: false, velocityY: 0 });
      return true;
    }
    return false;
  },
  plant(site) {
    const t = Date.now();
    const points = state.mapId === "iron-district" ? IRON_DISTRICT_BOT_POINTS : BOT_POINTS;
    const at = points.plant[site as "A" | "B"];
    state.bomb = {
      state: "planted",
      x: at.x,
      z: at.z,
      y: at.y ?? 0,
      site,
      plantedAt: t,
      explodesAt: t + 40000,
    };
  },
};
