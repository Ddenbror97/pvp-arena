/**
 * Bomb Defusal room for the benchmark, off the main thread (as on the real server): ten bots,
 * the authoritative step and slot 0's filtered snapshot, posted as the JSON text a client
 * receives. The page only parses and draws, like the real client.
 */
import { createBombBots } from "../../../src/lib/fps/bomb/bots";
import { createBombMatch, startBombMatch, stepBombMatch } from "../../../src/lib/fps/bomb/match";
import { BombReveal, bombViewFor } from "../../../src/lib/fps/bomb/snapshot";
import { isBombMapId, type BombMapId } from "../../../src/lib/fps/bomb/maps";
import { applyPurchase } from "../../../src/lib/fps/buy";
import { primaryStats } from "../../../src/lib/fps/simulation";

/** ?awp=1: the viewed player (slot 0) and every other police carry the AWP. */
const query = new URL(self.location.href).searchParams;
const awp = query.get("awp") === "1";
/** ?map=iron-district: the 5v5 map (default Sandgate). */
const mapId = isBombMapId(query.get("map")) ? (query.get("map") as BombMapId) : "sandgate";
/**
 * Hotspot tour: the page sends `{ pin: { x, y, z } }` to park slot 0 there (alive, standing) and
 * `{ input }` with the client's own inputs, which then replace slot 0's bot (the view turns with
 * the client, and the room acknowledges its sequence numbers as a real room does).
 */
let pin: { x: number; y: number; z: number } | null = null;
const queue: unknown[] = [];
self.onmessage = (e: MessageEvent<{ pin?: typeof pin; input?: unknown }>) => {
  if (e.data.pin !== undefined) pin = e.data.pin;
  if (e.data.input !== undefined && queue.length < 8) queue.push(e.data.input);
};

const slots = Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, name: `BOT ${i}`, bot: true }));
const now0 = Date.now();
const state = createBombMatch(slots, now0, 11, mapId);
startBombMatch(state, now0);
state.phaseEndsAt = now0; // skip the freeze
const arm = () => {
  if (awp)
    for (const p of state.players)
      if (p.slot % 2 === 0) applyPurchase(p, "awp", primaryStats({ primary: "awp" }));
};
arm();
const bots = createBombBots(() => 0.37);
const reveal = new BombReveal();
setInterval(() => {
  const t = Date.now();
  const a = performance.now();
  const inputs: Record<number, unknown> = bots.inputs(state, t);
  const park = () => {
    if (!pin) return;
    Object.assign(state.players[0]!, { ...pin, velocityY: 0, hp: 100 });
    state.roundEndsAt = t + 3_600_000;
  };
  if (pin) {
    const mine = queue.shift();
    if (mine) inputs[0] = mine;
    else delete inputs[0];
    park();
  }
  stepBombMatch(state, inputs, t);
  park();
  const json = JSON.stringify(bombViewFor(state, 0, null, reveal, t));
  // Keep the match going for the whole sample.
  if (state.phase === "completed") Object.assign(state, { phase: "freeze", phaseEndsAt: t });
  if (state.phase === "freeze") arm();
  postMessage({
    json,
    stepMs: performance.now() - a,
    score: `${state.score.alpha}-${state.score.bravo}`,
    round: state.round,
  });
}, 34);
