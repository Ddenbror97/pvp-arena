/**
 * Shader warm-up check for the 1v1 renderer: mount a map with the real renderer and simulation,
 * wait for Ready, then play (bot vs a scripted player who turns, moves and fires) and report how
 * many shader programs were compiled after Ready. Anything compiled then is a mid-match hitch.
 */
import { mountArena } from "../../../src/lib/fps/renderer";
import { createMatch, startMatch, stepMatch, TICK_MS } from "../../../src/lib/fps/simulation";
import { createPracticeBot } from "../../../src/lib/fps/practice-bot";
import { applyPurchase } from "../../../src/lib/fps/buy";
import { primaryStats } from "../../../src/lib/fps/simulation";

/** Shader names compiled (three defines SHADER_NAME per program), recorded as they compile. */
const compiled: string[] = [];
const defines: [string, string][] = [];
const source = WebGL2RenderingContext.prototype.shaderSource;
WebGL2RenderingContext.prototype.shaderSource = function (shader, text) {
  const name = /#define SHADER_NAME (.*)/.exec(text)?.[1];
  if (name && /gl_FragColor|pc_fragColor|out highp vec4/.test(text) === true) compiled.push(name);
  if (name === "brass") defines.push([name, text]);
  return source.call(this, shader, text);
};
declare global {
  interface Window {
    check: (mapId: string, playMs: number, awp?: boolean) => Promise<unknown>;
  }
}
window.check = async (mapId, playMs, awp = false) => {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0";
  document.body.appendChild(host);
  const now0 = Date.now();
  const state = createMatch({ A: "a", B: "b" }, 5, now0 - 3000, undefined, mapId);
  startMatch(state, now0 - 3000);
  stepMatch(state, {}, now0, TICK_MS);
  // AWP run: both players carry it (first person, bolt, reloads, zoom; third person).
  if (awp)
    for (const seat of ["A", "B"] as const)
      applyPurchase(state.players[seat], "awp", primaryStats({ primary: "awp" }));
  const controls = mountArena(
    host,
    () => {},
    () => {},
    undefined,
    undefined,
    { mapId },
  );
  const push = () =>
    controls.snapshot(
      {
        state: structuredClone(state),
        serverNow: Date.now(),
        poseAt: state.server.lastStepAt,
        settled: false,
        settlementPending: false,
      },
      "A",
    );
  push();
  await controls.ready;
  const atReady = controls.diagnostics().programs;
  const namesAtReady = compiled.length;
  const brassAtReady = defines.length;
  const bot = createPracticeBot(() => 0.37);
  let seq = 0;
  state.server.lastStepAt = Date.now();
  state.phaseEndsAt = Date.now() + 3_600_000;
  const started = performance.now();
  const timer = setInterval(() => {
    const t = Date.now();
    if (t - state.server.lastStepAt < 34) return;
    const s = (performance.now() - started) / 1000;
    const a = state.players.A;
    const input = {
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: ++seq,
      round: state.round,
      forward: 1,
      strafe: Math.sin(s),
      yaw: a.yaw + 0.06,
      pitch: 0,
      weapon: s % 6 < 4 ? "rifle" : "knife",
      // The AWP fires on the trigger edge: one tick every 1.6 s, zoomed half of the time.
      fire: awp ? s % 1.6 < 0.04 : s % 1.2 < 0.4,
      ...(awp && s % 6 < 4 && s % 8 < 4 ? { scope: true } : {}),
      reload: a.ammo === 0,
      jump: false,
      sprint: false,
      walk: false,
      crouch: false,
    } as never;
    stepMatch(state, { A: input, B: bot.input(state, t) }, state.server.lastStepAt + 34, TICK_MS);
    state.phaseEndsAt = Date.now() + 3_600_000;
    push();
  }, 8);
  await new Promise((r) => setTimeout(r, playMs));
  clearInterval(timer);
  const after = controls.diagnostics();
  const result = {
    mapId,
    atReady,
    after: after.programs,
    shots: seq,
    frames: after.renderFrames,
    lateShaders: compiled.slice(namesAtReady),
    diff: (() => {
      const late = defines
        .slice(brassAtReady)
        .filter(([n]) => n === "brass")
        .map(([, d]) => d);
      const early = defines
        .slice(0, brassAtReady)
        .filter(([n]) => n === "brass")
        .map(([, d]) => d);
      if (!late[0]) return null;
      return {
        early: early.length,
        late: late.length,
        diffs: late.map((l, i) => {
          const e = early[i] ?? "";
          const A = l.split("\n"),
            B = e.split("\n");
          const s = new Set(B),
            r = new Set(A);
          return {
            onlyLate: A.filter((x) => !s.has(x)).slice(0, 6),
            onlyEarly: B.filter((x) => !r.has(x)).slice(0, 6),
          };
        }),
      };
    })(),
  };
  controls.dispose();
  host.remove();
  return result;
};
