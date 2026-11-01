import { describe, expect, it } from "vitest";
import {
  applyQueuedMovement,
  createMatch,
  predictMovement,
  startMatch,
  stepMatch,
  TICK_MS,
  type Input,
  type MatchState,
} from "../src/lib/fps/simulation";
import {
  canSeeOpponent,
  snapshotForPlayer,
  trailForPlayer,
  trailStep,
  type TrailEntry,
  type TrailStep,
} from "../src/lib/fps/visibility";
import { RemotePresentation } from "../src/lib/fps/presentation";
import { REMOTE_DELAY_MS, SnapshotClock, PlaybackDelay } from "../src/lib/fps/network";

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
> & { trail?: TrailEntry[] };

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
function timelineClient(
  delay = REMOTE_DELAY_MS,
  project = true,
  bridgeMs?: number,
  useTrail = true,
  adaptive = false,
) {
  const playback = new PlaybackDelay();
  const clock = new SnapshotClock(),
    motion = new RemotePresentation();
  if (bridgeMs !== undefined) motion.bridgeMs = bridgeMs;
  if (!project) Reflect.set(motion, "projectionAllowed", false);
  return {
    receive(f: Frame, at: number) {
      clock.observe(f.serverNow, at);
      playback.observe(at, Math.max(0, f.serverNow - f.poseAt));
      motion.pushFrame(
        f.state.players.B,
        f.poseAt,
        f.visibility?.B !== false,
        useTrail ? f.trail : undefined,
      );
      if (!project) Reflect.set(motion, "projectionAllowed", false);
    },
    draw(now: number, elapsed: number, out: Pose) {
      out.at = clock.now(now) - (adaptive ? playback.sample(elapsed) : delay);
      const shown = motion.sample(out.at, out, elapsed);
      return shown;
    },
    /** Presentation internals for classifying anomalies (bridge / correction active). */
    debug() {
      return {
        bridged: !!Reflect.get(motion, "projected"),
        correction: Math.hypot(
          Number(Reflect.get(motion, "correctionX")),
          Number(Reflect.get(motion, "correctionZ")),
        ),
      };
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
  const steps: TrailStep[] = [];
  let lastTrailAt = -Infinity;
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
  const frames: {
    at: number;
    shown: boolean;
    x: number;
    z: number;
    now: number;
    bridged: boolean;
    correction: number;
  }[] = [];
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
        steps.push(trailStep(state, state.server!.lastStepAt));
        if (steps.length > 6) steps.shift();
      }
      const every = opts.snapshotMs ?? 50;
      if (now - lastSnapshot >= every) {
        lastSnapshot = lastSnapshot ? Math.max(lastSnapshot + every, now - every) : now;
        const poseAt = state.server!.lastStepAt;
        const frame: Frame = {
          ...snapshotForPlayer(
            {
              state: structuredClone({ ...state, server: undefined }) as MatchState,
              serverNow: now,
              poseAt,
            },
            "A",
          ),
          // Same bundling as the runtime: intermediate physics steps since the last send.
          trail: trailForPlayer(steps, "A", lastTrailAt, poseAt),
        };
        lastTrailAt = poseAt;
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
    const dbg = (client as { debug?: () => { bridged: boolean; correction: number } }).debug?.();
    frames.push({
      at: out.at,
      shown,
      x: out.x,
      z: out.z,
      now: clientNow,
      bridged: !!dbg?.bridged,
      correction: dbg?.correction ?? 0,
    });
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
  const causes = { reversal: 0, correction: 0, unexplained: 0 };
  let maxBackward = 0;
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
    if (truthStep > 0.002 && (dx * vx + dz * vz) / truthStep < -0.01) {
      backward++;
      maxBackward = Math.max(maxBackward, -(dx * vx + dz * vz) / truthStep);
      // Classify: did the authoritative path reverse within one snapshot gap of the
      // drawn interval, was a bridge/correction active, or neither (a bug)?
      const window = truth.filter((p) => p.at >= prev.at - 70 && p.at <= f.at + 70);
      let reversal = false;
      for (let k = 2; k < window.length; k++) {
        const ax = window[k - 1]!.x - window[k - 2]!.x,
          az = window[k - 1]!.z - window[k - 2]!.z,
          bx = window[k]!.x - window[k - 1]!.x,
          bz = window[k]!.z - window[k - 1]!.z;
        if (ax * bx + az * bz < 0) reversal = true;
      }
      const cause =
        f.bridged || prev.bridged || f.correction > 0.001 || prev.correction > 0.001
          ? "correction"
          : reversal
            ? "reversal"
            : "unexplained";
      causes[cause]++;
    }
    if (truthStep > 0.02 && Math.hypot(dx, dz) < truthStep * 0.1) frozen++;
    if (Math.hypot(dx, dz) > 0.6) {
      teleports++;
      if (process.env["TRACE"])
        console.log("TELE", Math.round(f.now - T0), Math.hypot(dx, dz).toFixed(2));
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
    causes,
    maxBackwardCm: +(maxBackward * 100).toFixed(1),
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
      ["100ms no trail", () => timelineClient(100, true, 50, false), 50],
      ["100ms + trail", () => timelineClient(100, true, 50, true), 50],
      ["110ms + trail", () => timelineClient(110, true, 50, true), 50],
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
          // Every physics step is delivered (trail), so playback stays inside received
          // poses: no extrapolation at typical jitter, nothing unexplained at any jitter.
          expect(r.causes.unexplained).toBe(0);
          expect(r.backward).toBeLessThanOrEqual(jitter > 10 ? 3 : 0);
          expect(r.maxError).toBeLessThan(jitter > 10 ? 0.05 : 0.01);
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
          // Typical jitter: drawn poses equal the authoritative path. Under 30 ms jitter the
          // late-packet bridge may extrapolate a few ms past the newest pose; the resulting
          // pull-back is bounded to a few centimetres. Nothing is ever unexplained.
          expect(r.causes.unexplained).toBe(0);
          expect(r.causes.reversal).toBe(0);
          expect(r.backward).toBeLessThanOrEqual(jitter > 10 ? 6 : 0);
          expect(r.maxBackwardCm).toBeLessThan(jitter > 10 ? 5 : 0.1);
          expect(r.maxError).toBeLessThan(jitter > 10 ? 0.25 : 0.01);
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

describe("adaptive 30 Hz playback", () => {
  for (const script of [counterStrafe, jumpCrouch])
    for (const jitter of [10, 30, 80])
      for (const fps of [60, 144])
        it(`preserves visibility and motion at ${fps} FPS and ${jitter}ms jitter`, () => {
          const r = run({
            a: open.a,
            b: open.b,
            script,
            net: { rtt: 150, jitter },
            fps,
            durationMs: 6000,
            snapshotMs: 34,
            client: () => timelineClient(110, true, undefined, true, true),
          });
          expect(r.disappeared).toBe(0);
          expect(r.leaked).toBe(0);
          expect(r.teleports).toBe(0);
          expect(r.causes.unexplained).toBe(0);
          expect(r.causes.reversal).toBe(0);
          expect(r.maxBackwardCm).toBeLessThan(jitter > 30 ? 20 : 5);
        });
});

describe("snapshot trail (intermediate physics poses)", () => {
  const step = (at: number, bx: number, bz: number): TrailStep => ({
    at,
    phase: "live",
    players: {
      A: { x: -4, y: 0, z: 0, yaw: 0, pitch: 0, crouched: false, hp: 100, velocityY: 0 },
      B: { x: bx, y: 0, z: bz, yaw: 0, pitch: 0, crouched: false, hp: 100, velocityY: 0 },
    },
  });
  it("includes only steps between the previous and current snapshot", () => {
    const steps = [step(10, -6, -9.5), step(44, -6.1, -9.5), step(78, -6.2, -9.5)];
    expect(trailForPlayer(steps, "A", 10, 78).map((e) => e.poseAt)).toEqual([44]);
  });
  it("never carries a pose the recipient could not see at that step", () => {
    // B at (-9.6, -5) is behind cover from A at (-4, 0); (-6.5, -9.5) is in the open.
    const steps = [step(10, -6.5, -9.5), step(44, -9.6, -5)];
    const trail = trailForPlayer(steps, "A", 0, 100);
    expect(trail[0]!.pose).toBeDefined();
    expect(trail[1]).toEqual({ poseAt: 44 });
    expect(
      canSeeOpponent({ phase: "live", players: steps[1]!.players, events: [] } as never, "A"),
    ).toBe(false);
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

describe("bounded command catch-up (applyQueuedMovement)", () => {
  const live = () => {
    const s = createMatch({ A: "a", B: "b" }, 5, 0);
    startMatch(s, 0);
    s.phase = "live";
    Object.assign(s.players.A, { x: -6.5, z: -9.5, y: 0 });
    return s;
  };
  it("moves exactly like the regular step and keeps Shift-walking silent", () => {
    const folded = live(),
      stepped = live();
    expect(applyQueuedMovement(folded, "A", input(1, { strafe: 1 }))).toBe(true);
    predictMovement(stepped.players.A, input(1, { strafe: 1 }), TICK_MS);
    expect(folded.players.A.x).toBeCloseTo(stepped.players.A.x, 9);
    expect(folded.players.A.lastSeq).toBe(1);
    const walker = live();
    walker.players.A.stepDistance = 1.5;
    expect(applyQueuedMovement(walker, "A", input(1, { strafe: 1, walk: true }))).toBe(true);
    expect(walker.players.A.stepDistance).toBe(0);
  });
  it("never folds isolated fire, reload, weapon switches or stale commands", () => {
    const s = live();
    expect(applyQueuedMovement(s, "A", input(1, { fire: true }))).toBe(false);
    expect(applyQueuedMovement(s, "A", input(1, { reload: true }))).toBe(false);
    expect(applyQueuedMovement(s, "A", input(1, { weapon: "pistol" }))).toBe(false);
    expect(applyQueuedMovement(s, "A", input(2, {}))).toBe(true);
    expect(applyQueuedMovement(s, "A", input(2, {}))).toBe(false);
  });
  it("catches up held rifle inputs without minting bullets or speeding up cadence", () => {
    const s = live(),
      p = s.players.A;
    s.phaseEndsAt = 100000;
    const ammo = p.ammo;
    expect(applyQueuedMovement(s, "A", input(1, { fire: true }), input(2, { fire: true }))).toBe(
      true,
    );
    expect(p.ammo).toBe(ammo);
    expect(s.events.some((event) => event.type === "shot")).toBe(false);
    stepMatch(s, { A: input(2, { fire: true }) }, 3100, TICK_MS);
    expect(p.ammo).toBe(ammo - 1);
    expect(applyQueuedMovement(s, "A", input(3, { fire: true }), input(4, { fire: true }))).toBe(
      true,
    );
    stepMatch(s, { A: input(4, { fire: true }) }, 3134, TICK_MS);
    expect(p.ammo).toBe(ammo - 1);
  });
  it("preserves tap releases, reloads and pistol trigger edges", () => {
    for (const next of [
      { fire: false },
      { fire: true, reload: true },
      { fire: true, weapon: "pistol" as const },
    ]) {
      const s = live();
      expect(applyQueuedMovement(s, "A", input(1, { fire: true }), input(2, next))).toBe(false);
      expect(s.players.A.lastSeq).toBe(-1);
    }
    const s = live();
    s.players.A.weapon = "pistol";
    s.players.A.triggerHeld = true;
    expect(
      applyQueuedMovement(
        s,
        "A",
        input(1, { weapon: "pistol", fire: true }),
        input(2, { weapon: "pistol", fire: true }),
      ),
    ).toBe(false);
    expect(
      applyQueuedMovement(
        s,
        "A",
        input(1, { weapon: "pistol", fire: false }),
        input(2, { weapon: "pistol", fire: true }),
      ),
    ).toBe(true);
    expect(s.players.A.triggerHeld).toBe(false);
  });
});
