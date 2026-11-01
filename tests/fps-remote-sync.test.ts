import { describe, expect, it } from "vitest";
import {
  createMatch,
  predictMovement,
  startMatch,
  stepMatch,
  TICK_MS,
  type Input,
  type MatchState,
} from "../src/lib/fps/simulation";
import { canSeeOpponent, snapshotForPlayer } from "../src/lib/fps/visibility";
import { RemotePresentation } from "../src/lib/fps/presentation";
import { REMOTE_DELAY_MS, SnapshotClock } from "../src/lib/fps/network";

/**
 * End-to-end opponent synchronisation harness. It runs the real server step and
 * snapshot cadence (30 Hz physics, 20 Hz snapshot deadline, poseAt on the physics clock),
 * the real per-recipient visibility redaction, an in-order WebSocket model (latency,
 * jitter, delivery stalls) and the client's actual playback classes at a given render
 * rate. Every frame is compared with the authoritative server history at the
 * displayed physics time.
 */

type Script = (t: number) => Partial<Input>;
type Net = { rtt: number; jitter: number; stalls?: [number, number][] };
type Frame = ReturnType<
  typeof snapshotForPlayer<{ state: MatchState; serverNow: number; poseAt: number }>
>;

function rng(seed: number) {
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
}

function input(seq: number, partial: Partial<Input>): Input {
  return {
    v: 1,
    type: "input",
    combatVersion: 2,
    seq,
    forward: 0,
    strafe: 0,
    yaw: 0,
    pitch: 0,
    fire: false,
    reload: false,
    weapon: "rifle",
    jump: false,
    sprint: false,
    crouch: false,
    ...partial,
  };
}

/** Previous receive/draw path, reproduced exactly: 75 ms buffer, visibility applied on
 * arrival and history cleared on every redacted frame. */
function legacyClient() {
  const clock = new SnapshotClock(),
    motion = new RemotePresentation();
  let visible = true;
  return {
    receive(f: Frame, at: number) {
      clock.observe(f.serverNow, at);
      visible = f.visibility?.B !== false;
      if (!visible) motion.clear();
      else motion.push(f.state.players.B, f.poseAt);
    },
    draw(now: number, elapsed: number, out: Pose) {
      out.at = clock.now(now) - 75;
      return visible && motion.sample(out.at, out, elapsed);
    },
  };
}
/** Current renderer path: visibility is part of the playback timeline. */
function timelineClient(delay = REMOTE_DELAY_MS, project = true, bridgeMs?: number) {
  const clock = new SnapshotClock(),
    motion = new RemotePresentation();
  if (bridgeMs !== undefined) motion.bridgeMs = bridgeMs;
  if (!project) Reflect.set(motion, "projectionAllowed", false);
  return {
    receive(f: Frame, at: number) {
      clock.observe(f.serverNow, at);
      motion.push(f.state.players.B, f.poseAt, f.visibility?.B !== false);
      if (!project) Reflect.set(motion, "projectionAllowed", false);
    },
    draw(now: number, elapsed: number, out: Pose) {
      out.at = clock.now(now) - delay;
      return motion.sample(out.at, out, elapsed);
    },
  };
}
type Pose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  at: number;
  crouch?: number;
};

function run(opts: {
  a: [number, number];
  b: [number, number];
  script: Script;
  net: Net;
  fps: number;
  durationMs: number;
  client: () => ReturnType<typeof legacyClient>;
  seed?: number;
  snapshotMs?: number;
}) {
  const random = rng(opts.seed ?? 7);
  const T0 = 1_000_000;
  const state = createMatch({ A: "a", B: "b" }, 5, T0);
  startMatch(state, T0);
  state.phase = "live";
  state.phaseEndsAt = T0 + 3_600_000;
  Object.assign(state.players.A, { x: opts.a[0], z: opts.a[1], yaw: Math.PI, pitch: 0 });
  Object.assign(state.players.B, { x: opts.b[0], z: opts.b[1], yaw: 0, pitch: 0 });
  state.server!.lastStepAt = T0;

  const truth: { at: number; x: number; z: number; visible: boolean }[] = [];
  const record = () =>
    truth.push({
      at: state.server!.lastStepAt,
      x: state.players.B.x,
      z: state.players.B.z,
      visible: canSeeOpponent(state, "A"),
    });
  record();
  const inFlight: { at: number; frame: Frame }[] = [];
  let lastDelivery = 0,
    lastSnapshot = 0,
    seq = 0;
  const oneWay = opts.net.rtt / 2;
  // Server timer: setInterval(ceil(TICK_MS)) with platform jitter.
  let timer = T0;
  const client = opts.client();
  const clientOffset = -987_654; // local performance clock is unrelated to server time
  const frameMs = 1000 / opts.fps;
  let clientNow = T0 + 300;
  const out: Pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
  const frames: { at: number; shown: boolean; x: number; z: number; now: number }[] = [];
  const end = T0 + opts.durationMs;
  let lastFrame = clientNow;
  while (clientNow < end) {
    // Advance the server until the client's current time.
    while (timer <= clientNow) {
      const now = timer;
      for (let step = 0; step < 3; step++) {
        const last = state.server!.lastStepAt;
        if (now - last < Math.ceil(TICK_MS)) break;
        const stepAt = Math.max(last + Math.ceil(TICK_MS), now - 2 * Math.ceil(TICK_MS));
        stepMatch(state, { B: input(++seq, opts.script(stepAt - T0)) }, stepAt, TICK_MS);
        record();
      }
      const every = opts.snapshotMs ?? 50;
      if (now - lastSnapshot >= every) {
        lastSnapshot = lastSnapshot ? Math.max(lastSnapshot + every, now - every) : now;
        const frame = snapshotForPlayer(
          {
            state: structuredClone({ ...state, server: undefined }) as MatchState,
            serverNow: now,
            poseAt: state.server!.lastStepAt,
          },
          "A",
        );
        let at = now + oneWay + random() * opts.net.jitter;
        for (const [s, d] of opts.net.stalls ?? [])
          if (now >= T0 + s && now < T0 + s + d) at = Math.max(at, T0 + s + d + oneWay);
        // WebSocket delivery is in order (TCP): a late message delays later ones.
        at = Math.max(at, lastDelivery);
        lastDelivery = at;
        inFlight.push({ at, frame });
      }
      timer += Math.ceil(TICK_MS) + random() * 6;
    }
    while (inFlight.length && inFlight[0]!.at <= clientNow)
      client.receive(inFlight.shift()!.frame, inFlight.length >= 0 ? clientNow + clientOffset : 0);
    const shown = client.draw(clientNow + clientOffset, clientNow - lastFrame, out);
    lastFrame = clientNow;
    frames.push({ at: out.at, shown, x: out.x, z: out.z, now: clientNow });
    clientNow += frameMs;
  }

  // Compare with the authoritative history at each frame's displayed physics time.
  const truthAt = (at: number) => {
    let i = truth.findIndex((p) => p.at >= at);
    if (i < 0) i = truth.length - 1;
    if (i === 0) return truth[0]!;
    const a = truth[i - 1]!,
      b = truth[i]!,
      t = Math.max(0, Math.min(1, (at - a.at) / (b.at - a.at)));
    return {
      at,
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      visible: a.visible && b.visible,
      hiddenNear: !a.visible || !b.visible,
    };
  };
  const settled = frames.filter((f) => f.now > T0 + 800);
  let disappeared = 0,
    leaked = 0,
    backward = 0,
    teleports = 0,
    frozen = 0,
    maxError = 0,
    shownFrames = 0;
  for (let i = 0; i < settled.length; i++) {
    const f = settled[i]!,
      truthPose = truthAt(f.at) as ReturnType<typeof truthAt> & { hiddenNear?: boolean };
    if (!f.shown && truthPose.visible) disappeared++;
    if (f.shown && !truthPose.visible && !truthPose.hiddenNear) leaked++;
    if (!f.shown) continue;
    shownFrames++;
    // Within one snapshot of a redaction edge the client holds the last known pose.
    const nearRedaction = truth.some((p) => !p.visible && Math.abs(p.at - f.at) <= 70);
    if (!nearRedaction)
      maxError = Math.max(maxError, Math.hypot(f.x - truthPose.x, f.z - truthPose.z));
    const prev = settled[i - 1];
    if (!prev?.shown) continue;
    const dx = f.x - prev.x,
      dz = f.z - prev.z;
    const t0 = truthAt(prev.at),
      vx = truthPose.x - t0.x,
      vz = truthPose.z - t0.z;
    const truthStep = Math.hypot(vx, vz);
    if (truthStep > 0.002 && (dx * vx + dz * vz) / truthStep < -0.01) backward++;
    if (truthStep > 0.02 && Math.hypot(dx, dz) < truthStep * 0.1) frozen++;
    if (Math.hypot(dx, dz) > 0.6) {
      teleports++;
      if (process.env["TRACE"]) console.log("TELE", Math.round(f.now - T0), Math.hypot(dx, dz).toFixed(2));
    }
  }
  if (process.env["TRACE3"])
    for (const f of settled) {
      const tv = truthAt(f.at);
      if (f.shown && Math.hypot(f.x - tv.x, f.z - tv.z) > 0.25)
        console.log(
          "T3",
          Math.round(f.now - T0),
          "disp",
          Math.round(f.at - T0),
          "x",
          f.x.toFixed(3),
          f.z.toFixed(3),
          "truth",
          tv.x.toFixed(3),
          tv.z.toFixed(3),
        );
    }
  if (process.env["TRACE2"])
    for (const f of settled.slice(300, 380)) {
      const tv = truthAt(f.at);
      console.log(
        "T2",
        Math.round(f.now - T0),
        "disp",
        Math.round(f.at - T0),
        "x",
        f.x.toFixed(3),
        "truth",
        tv.x.toFixed(3),
        "err",
        (f.x - tv.x).toFixed(3),
      );
    }
  if (process.env["TRACE"])
    for (let i = 1; i < settled.length; i++) {
      const f = settled[i]!,
        p = settled[i - 1]!,
        tv = truthAt(f.at);
      if (
        f.shown !== p.shown ||
        (tv as { visible: boolean }).visible !== (truthAt(p.at) as { visible: boolean }).visible
      )
        console.log(
          "TR",
          Math.round(f.now - T0),
          "disp",
          Math.round(f.at - T0),
          "shown",
          f.shown,
          "truthVisible",
          (tv as { visible: boolean }).visible,
          "x",
          tv.x.toFixed(2),
        );
    }
  return {
    frames: settled.length,
    shownFrames,
    disappeared,
    leaked,
    backward,
    teleports,
    frozen,
    maxError: +maxError.toFixed(3),
  };
}

// B strafes along z = -5 between open ground and cover while A watches from (-4, 0):
// the sight line opens/closes near x = -7.5 (measured on the Aim Arena layout).
const corner: Script = (t) => ({ strafe: Math.floor(t / 1600) % 2 ? -1 : 1, yaw: 0 });
const cornerStart: [number, number] = [-9.6, -5];
// Verified open strip: B can move ±5 m along z = -9.5 (standing or crouched) and stays in
// A's sight line the whole way.
const open = { a: [-6.5, -4.5] as [number, number], b: [-6.5, -9.5] as [number, number] };
const counterStrafe: Script = (t) => ({ strafe: Math.floor(t / 280) % 2 ? -1 : 1, yaw: 0 });
const jumpCrouch: Script = (t) => ({
  strafe: Math.floor(t / 800) % 2 ? -1 : 1,
  jump: Math.floor(t / 600) % 3 === 0,
  crouch: Math.floor(t / 750) % 4 === 1,
  yaw: 0,
});

describe.skipIf(!process.env["SWEEP"])("jitter sweep", () => {
  it("sweep", () => {
    const variants: [string, () => ReturnType<typeof legacyClient>, number][] = [
      ["100ms bridge50", () => timelineClient(100, true, 50), 50],
      ["100ms bridge34", () => timelineClient(100, true, 34), 50],
      ["100ms bridge20", () => timelineClient(100, true, 20), 50],
      ["100ms bridge0", () => timelineClient(100, true, 0), 50],
    ];
    for (const [name, client, snapshotMs] of variants)
      for (const jitter of [10, 30, 50]) {
        const r = run({
          a: open.a,
          b: open.b,
          script: counterStrafe,
          net: { rtt: 100, jitter },
          fps: 144,
          durationMs: 6000,
          client,
          snapshotMs,
        });
        const w = run({
          a: open.a,
          b: open.b,
          script: (t) => ({ strafe: Math.floor(t / 2400) % 2 ? -1 : 1 }),
          net: { rtt: 100, jitter },
          fps: 144,
          durationMs: 6000,
          client,
          snapshotMs,
        });
        console.log(
          `SW ${name} j${jitter} strafe ` +
            JSON.stringify(r) +
            " walk " +
            JSON.stringify({ backward: w.backward, frozen: w.frozen, maxError: w.maxError }),
        );
      }
  });
});

describe("remote opponent synchronisation (server step → network → client playback)", () => {
  it("reproduces the previous client's defects (baseline)", () => {
    const corner100 = run({
      a: [-4, 0],
      b: cornerStart,
      script: corner,
      net: { rtt: 100, jitter: 20 },
      fps: 144,
      durationMs: 8000,
      client: legacyClient,
    });
    const strafe = run({
      a: open.a,
      b: open.b,
      script: counterStrafe,
      net: { rtt: 100, jitter: 10 },
      fps: 144,
      durationMs: 6000,
      client: legacyClient,
    });
    console.log("ROW legacy corner " + JSON.stringify(corner100));
    console.log("ROW legacy counter-strafe " + JSON.stringify(strafe));
    // Hidden on arrival: the opponent vanished while still visible at the drawn time.
    expect(corner100.disappeared).toBeGreaterThan(0);
    // Playback ran past the newest pose and the bridge overshot every reversal.
    expect(strafe.backward).toBeGreaterThan(15);
    expect(strafe.maxError).toBeGreaterThan(0.25);
  });

  // Typical connection: 10 ms jitter. Harsh: 30 ms uniform jitter with in-order bursts.
  for (const jitter of [10, 30])
    for (const rtt of [50, 100, 200])
      for (const fps of [30, 60, 144, 240])
        it(`corner peeks at ${rtt} ms RTT, ${jitter} ms jitter, ${fps} FPS`, () => {
          const r = run({
            a: [-4, 0],
            b: cornerStart,
            script: corner,
            net: { rtt, jitter },
            fps,
            durationMs: 8000,
            client: timelineClient,
          });
          if (fps === 144) console.log(`ROW corner rtt${rtt} j${jitter} ` + JSON.stringify(r));
          // Drawn exactly while the server reports it visible at the drawn physics time.
          expect(r.disappeared).toBe(0);
          expect(r.leaked).toBe(0);
          expect(r.teleports).toBe(0);
          // At most one frame per direction reversal (5 in 8 s), where linear 20 Hz
          // interpolation cuts the reversal corner by up to ~0.2 m.
          expect(r.backward).toBeLessThanOrEqual(6);
          expect(r.maxError).toBeLessThan(0.25);
        });

  for (const [name, script] of [
    ["counter-strafing", counterStrafe],
    ["jumping and crouching", jumpCrouch],
  ] as const)
    for (const jitter of [10, 30])
      for (const rtt of [50, 200])
        it(`${name} at ${rtt} ms RTT, ${jitter} ms jitter stays continuous`, () => {
          const r = run({
            a: open.a,
            b: open.b,
            script,
            net: { rtt, jitter },
            fps: 144,
            durationMs: 6000,
            client: timelineClient,
          });
          console.log(`ROW ${name} rtt${rtt} j${jitter} ` + JSON.stringify(r));
          expect(r.disappeared).toBe(0);
          expect(r.teleports).toBe(0);
          // One reversal-corner frame per direction change (21 / 7 in 6 s); under 30 ms
          // jitter the bounded 50 ms bridge may overshoot a few reversals as well.
          const reversals = name === "counter-strafing" ? 21 : 7;
          expect(r.backward).toBeLessThanOrEqual(jitter > 10 ? 12 : Math.min(reversals, 6));
          expect(r.maxError).toBeLessThan(jitter > 10 ? 0.32 : 0.25);
        });

  it("a 400 ms delivery stall freezes, then resumes forward without rewinding", () => {
    const r = run({
      a: open.a,
      b: open.b,
      script: (t) => ({ strafe: Math.floor(t / 1800) % 2 ? -1 : 1 }),
      net: { rtt: 100, jitter: 10, stalls: [[2000, 400]] },
      fps: 144,
      durationMs: 5000,
      client: timelineClient,
    });
    console.log("ROW stall " + JSON.stringify(r));
    expect(r.backward).toBeLessThanOrEqual(3); // reversal corners only
    expect(r.teleports).toBe(0); // the backlog is repaid as a forward glide, not a jump
    expect(r.disappeared).toBe(0);
  });
});

describe("remote playback timeline units", () => {
  const P = (x: number, z = 0) =>
    ({ x, y: 0, z, yaw: 0, pitch: 0, hp: 100 }) as unknown as MatchState["players"]["A"];
  const out: Pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };

  it("ignores stale and duplicate frames instead of rewinding", () => {
    const r = new RemotePresentation();
    r.push(P(0), 0);
    r.push(P(1), 100);
    r.push(P(-5), 50); // older frame arriving late
    r.push(P(-5), 100); // duplicate physics time
    r.push(P(-5), 100, false); // stale redaction
    expect(r.sample(100, out)).toBe(true);
    expect(out.x).toBe(1);
  });

  it("hides at the redaction's physics time, not on arrival", () => {
    const r = new RemotePresentation();
    r.push(P(0), 0);
    r.push(P(0.5), 100);
    r.push(P(0), 200, false);
    expect(r.sample(150, out)).toBe(true); // still drawn before the hidden frame's time
    expect(out.x).toBe(0.5); // held at the newest known pose, never extrapolated into cover
    expect(r.sample(200, out)).toBe(false);
    expect(r.sample(260, out)).toBe(false);
  });

  it("never interpolates across a hidden interval and reappears on time", () => {
    const r = new RemotePresentation();
    r.push(P(0), 0);
    r.push(P(0), 100, false);
    r.push(P(0), 150, false);
    r.push(P(2), 200);
    r.push(P(2.2), 250);
    expect(r.sample(50, out)).toBe(true);
    expect(out.x).toBe(0); // held, not sliding toward the far side of the wall
    expect(r.sample(120, out)).toBe(false);
    expect(r.sample(199, out)).toBe(false);
    expect(r.sample(200, out)).toBe(true);
    expect(out.x).toBe(2);
    expect(r.sample(225, out)).toBe(true);
    expect(out.x).toBeCloseTo(2.1);
  });

  it("a first frame that is redacted keeps the opponent hidden until its first pose", () => {
    const r = new RemotePresentation();
    r.push(P(0), 0, false);
    r.push(P(3), 100);
    expect(r.sample(50, out)).toBe(false);
    expect(r.sample(100, out)).toBe(true);
  });

  it("resets history on teleports and respawns (>3 m) instead of sliding across the map", () => {
    const r = new RemotePresentation();
    r.push(P(0), 0);
    r.push(P(0.2), 50);
    r.push(P(10), 100);
    expect(r.sample(60, out)).toBe(true);
    expect(out.x).toBe(10);
  });

  it("maps snapshot time through the least-delayed packet, so a late burst cannot rewind", () => {
    const c = new SnapshotClock();
    c.observe(1000, 5050); // 50 ms in flight
    const before = c.now(5100);
    c.observe(1100, 5400); // 250 ms late burst
    c.observe(1150, 5400);
    expect(c.now(5100)).toBe(before);
  });
});

describe("fixed-step movement is independent of render rate", () => {
  // Mirrors the renderer's input clock: capped frame delta into an accumulator, one
  // TICK_MS physics step per ceil(TICK_MS) of accumulated time.
  const simulate = (fps: number, script: (t: number) => Partial<Input>, ms = 3000) => {
    const p = { ...createMatch({ A: "a", B: "b" }, 5, 0).players.A, x: -4, z: -6.5, y: 0 };
    const stepMs = Math.ceil(TICK_MS);
    let accumulator = 0,
      now = 0,
      steps = 0,
      maxY = 0;
    while (now < ms) {
      const next = now + 1000 / fps;
      accumulator += Math.max(0, Math.min(100, next - now));
      now = next;
      while (accumulator >= stepMs) {
        accumulator -= stepMs;
        predictMovement(p, input(++steps, script(steps * stepMs)), TICK_MS);
        maxY = Math.max(maxY, p.y);
      }
    }
    return { steps, x: p.x, z: p.z, maxY };
  };
  const walkJump = (t: number) => ({ strafe: 1, jump: t > 300 && t < 400 });
  const reference = simulate(60, walkJump);
  for (const fps of [30, 120, 144, 240])
    it(`${fps} FPS matches 60 FPS: input rate, distance and jump height`, () => {
      const r = simulate(fps, walkJump);
      expect(Math.abs(r.steps - reference.steps)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.x - reference.x)).toBeLessThan(0.2); // at most one 34 ms step at 5 m/s
      expect(r.z).toBeCloseTo(reference.z, 6);
      expect(r.maxY).toBeCloseTo(reference.maxY, 6);
    });
});
