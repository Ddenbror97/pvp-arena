/**
 * Bomb Defusal room for the benchmark, off the main thread (as on the real server): ten bots,
 * the authoritative step and slot 0's filtered snapshot, posted as the JSON text a client
 * receives. The page only parses and draws, like the real client.
 */
import { createBombBots } from "../../../src/lib/fps/bomb/bots";
import { createBombMatch, startBombMatch, stepBombMatch } from "../../../src/lib/fps/bomb/match";
import { BombReveal, bombViewFor } from "../../../src/lib/fps/bomb/snapshot";
import { applyPurchase } from "../../../src/lib/fps/buy";
import { primaryStats } from "../../../src/lib/fps/simulation";

/** ?awp=1: the viewed player (slot 0) and every other police carry the AWP. */
const awp = new URL(self.location.href).searchParams.get("awp") === "1";

const slots = Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, name: `BOT ${i}`, bot: true }));
const now0 = Date.now();
const state = createBombMatch(slots, now0, 11);
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
  stepBombMatch(state, bots.inputs(state, t), t);
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
