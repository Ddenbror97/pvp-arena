/**
 * Battle royale startup, end to end in one page: the real BrMatch component (loading screen,
 * admission, socket handling), the real arena and assets, and the real shared match behind a
 * stand-in WebSocket that speaks the BrRoom protocol (welcome, snapshots at the room's rate,
 * pings). Only sign-in and admission are stubbed (startup-sim/capture.mjs bundles them out).
 * The page reports what the loading screen shows over time, so a stall can be located.
 */
import { createRoot } from "react-dom/client";
import { BrMatch } from "../../../src/components/fps/BrMatch";
import { validateBrAct, type BrAct } from "../../../src/lib/fps/br/actions";
import { decodeHeightfield } from "../../../src/lib/fps/br/heightfield";
import { buildIsland } from "../../../src/lib/fps/br/island";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
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
import { BR_RULESET_VERSION } from "../../../src/lib/fps/br/ruleset";
import type { CollisionData } from "../../../src/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "../../../src/lib/fps/br/world";
import { SNAPSHOT_INTERVAL_MS } from "../../../src/lib/fps/network";
import { TICK_MS } from "../../../src/lib/fps/simulation";

const log: string[] = [];
const t0 = performance.now();
const note = (s: string) => {
  const line = `${((performance.now() - t0) / 1000).toFixed(1)}s ${s}`;
  log.push(line);
  console.log("STARTUP", line);
};
(window as unknown as { startup: { log: string[] } }).startup = { log };

// The room: the shared match, built from the same world files the client loads.
const get = (p: string) => fetch(new URL(p.replace(/^\//, ""), location.href));
const room = (async () => {
  const [hfBuf, lcBuf, meta, collision] = await Promise.all([
    get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    get(WORLD_ASSETS.collision).then((r) => r.json() as Promise<CollisionData>),
  ]);
  const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
  const island = buildIsland(hf, cover, meta, collision);
  const seed = 20261108;
  const loot = rollLoot(seed, island.layout, collision, island.solid, meta);
  const state = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, {
    open: (x, z) => !island.solid.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
  });
  const me = seatHuman(state, "local", "Me");
  note("room ready");
  return { state, me, world: island.solid, meta, sight: new BrSight() };
})();

class RoomSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readyState = 0;
  url: string;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private queue: BrInput[] = [];
  private acts: BrAct[] = [];
  constructor(url: string) {
    super();
    this.url = String(url);
    note(`socket ${this.url}`);
    void room.then((r) => this.open(r));
  }
  private deliver(data: unknown) {
    if (this.readyState !== 1) return;
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
  }
  private open(r: Awaited<typeof room>) {
    if (this.readyState !== 0) return;
    this.readyState = 1;
    this.onopen?.(new Event("open"));
    const sync = new BrSeatSync();
    this.deliver({
      v: 1,
      type: "welcome",
      worldRevision: WORLD_ASSETS.revision,
      rulesVersion: BR_RULESET_VERSION,
      mode: "br",
      matchId: "sim",
      seat: r.me,
      seed: r.state.seed,
      route: r.state.route,
    });
    let clock = 0;
    const view = () => brViewFor(r.state, r.world, r.sight, r.me, clock, sync);
    this.deliver({ ...view(), events: [], combat: [] });
    note("welcome and first snapshot sent");
    let lastSnap = performance.now(),
      snaps = 1;
    this.timer = setInterval(() => {
      clock += TICK_MS;
      const inputs = new Map<number, BrInput>();
      const input = this.queue.shift();
      if (input) inputs.set(r.me, input);
      const acts = new Map<number, BrAct[]>();
      if (this.acts.length) acts.set(r.me, this.acts.splice(0, 4));
      stepBrMatch(r.state, r.world, r.meta, inputs, clock, TICK_MS, acts);
      if (performance.now() - lastSnap >= SNAPSHOT_INTERVAL_MS) {
        lastSnap = performance.now();
        this.deliver(view());
        if (++snaps % 30 === 0) this.deliver({ type: "ping", id: String(snaps) });
      }
    }, TICK_MS);
  }
  send(message: string) {
    const raw = JSON.parse(message);
    if (raw?.type === "pong") return;
    if (raw?.type === "br-act") {
      const act = validateBrAct(raw);
      if (act) this.acts.push(act);
      else note(`invalid act ${message.slice(0, 120)}`);
      return;
    }
    const input = validateBrInput(raw);
    if (!input) {
      note(`invalid input ${message.slice(0, 160)}`);
      return;
    }
    this.queue.push(input);
    while (this.queue.length > 8) this.queue.shift();
  }
  close(code = 1000, reason = "") {
    if (this.readyState >= 2) return;
    note(`client closed ${code} ${reason}`);
    this.readyState = 3;
    clearInterval(this.timer);
    this.onclose?.(new CloseEvent("close", { code, reason }));
  }
}
(window as unknown as { WebSocket: unknown }).WebSocket = RoomSocket;

// What the loading screen says, every change.
let lastSeen = "";
setInterval(() => {
  const loading = document.querySelector(".duel-loading, [class*='loading']");
  const text = loading ? (loading as HTMLElement).innerText.replace(/\s+/g, " ").slice(0, 160) : "";
  const seen = loading && (loading as HTMLElement).offsetParent !== null ? text : "(no loading)";
  if (seen !== lastSeen) {
    lastSeen = seen;
    note(`screen: ${seen}`);
  }
}, 250);
addEventListener("error", (e) => note(`error: ${e.message}`));
addEventListener("unhandledrejection", (e) => note(`rejection: ${String(e.reason)}`));

createRoot(document.getElementById("root")!).render(<BrMatch />);
