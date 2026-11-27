/**
 * Spectator lab (headless): the real client, eliminated and watching another player, against the
 * in-page match, its snapshots delivered through a connection with latency and jitter. Every
 * frame the camera, the watched player's row as drawn and the vehicle or aircraft they sit in
 * are recorded, and the watched player's true place in the match at that moment.
 *
 *   node scripts/br/client-sim/spectate-lab.mjs [out.json] [--chromium=/path]
 *     [--only=car,bike] [--net=wifi,lan] [--hz=15] [--fps=60] [--seconds=10] [--draw] [--shots=dir]
 *
 * Without --draw the GL draw calls are no-ops once the match is live, so the frame loop runs at
 * the display's pace on a machine without a GPU (as client-sim/profile.mjs --no-draw).
 *
 * Per scenario and connection:
 *   camRough   cm   RMS of the camera path's second difference (a straight glide is 0)
 *   camBack    n    frames the camera moved against its own travel (≥ 1 cm, moving ≥ 1 m/s)
 *   camSnap    n    frames it moved more than twice its pace and 25 cm further than it
 *   camFreeze  n    frames it stood still (under a fifth of its pace, moving ≥ 2 m/s)
 *   rotRough   °    RMS of the view direction's second difference
 *   rotSnap    n    frames the view turned 4° more than the frames around it
 *   subjPx     px   RMS frame-to-frame jump of the watched body (or their vehicle) on screen,
 *                   beyond its smooth motion (720p, 75° view); subjPxMax the worst frame
 *   lagMs      ms   how far behind the match the watched body is drawn
 *   frameMs    ms   the frame callbacks' own time (mean / p95)
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const out = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const exe = arg("chromium");
const draw = process.argv.includes("--draw");
const shots = arg("shots");
const SECONDS = Number(arg("seconds", 10));
const HZ = Number(arg("hz", 15));
const FPS = Number(arg("fps", 60));

/** Connections: one-way delay, jitter (uniform), a retransmission now and then. */
const NETS = {
  lan: { latencyMs: 5, jitterMs: 2 },
  cable: { latencyMs: 35, jitterMs: 12 },
  wifi: { latencyMs: 60, jitterMs: 45, spikeEvery: 40, spikeMs: 140 },
  mobile: { latencyMs: 110, jitterMs: 80, spikeEvery: 25, spikeMs: 220 },
};
const nets = arg("net", "lan,cable,wifi,mobile").split(",");
const only = arg("only")?.split(",");

const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/client-sim/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><title>Spectator lab</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='sim.js'></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/sim.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on("pageerror", (e) => console.log("pageerror", String(e)));
await page.addInitScript(() => {
  const gl = WebGL2RenderingContext.prototype;
  for (const name of [
    "drawArrays",
    "drawElements",
    "drawArraysInstanced",
    "drawElementsInstanced",
    "drawRangeElements",
  ]) {
    const real = gl[name];
    gl[name] = function (...args) {
      if (!window.__noDraw) return real.apply(this, args);
    };
  }
  // The lab's own clock: frames exactly 1000 / fps apart whatever this machine manages (two
  // cores and a software compositor present 30 uneven frames a second), the match pumped once
  // a frame as a socket's messages are handled between frames. performance.now() and
  // requestAnimationFrame are the page's; the frame callbacks' own time is on the real clock.
  const realNow = performance.now.bind(performance);
  const realRaf = window.requestAnimationFrame.bind(window);
  let virtual = null,
    stepMs = 1000 / 60,
    queue = [],
    waits = [];
  performance.now = () => virtual ?? realNow();
  window.__frameMs = [];
  window.requestAnimationFrame = (f) => {
    if (virtual === null) return realRaf(f);
    queue.push(f);
    return 0;
  };
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    virtual += stepMs;
    window.sim.pump();
    window.__clock.each?.();
    const run = queue;
    queue = [];
    const a = realNow();
    for (const f of run) f(virtual);
    if (window.__timing) window.__frameMs.push(realNow() - a);
    if (waits.length) {
      const due = waits.filter((w) => w.at <= virtual);
      waits = waits.filter((w) => w.at > virtual);
      for (const w of due) w.done();
    }
    // (A turn for the page's own tasks between frames.)
    setTimeout(() => channel.port2.postMessage(0), 0);
  };
  window.__clock = {
    start(fps) {
      stepMs = 1000 / fps;
      virtual = realNow();
      channel.port2.postMessage(0);
    },
    wait: (ms) =>
      virtual === null
        ? new Promise((r) => setTimeout(r, ms))
        : new Promise((done) => waits.push({ at: virtual + ms, done })),
  };
});
await page.goto(`http://127.0.0.1:${server.address().port}/?vehicles=1&immortal=1`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.sim, null, { timeout: 180000 });
await page.evaluate(() => window.sim.ready);
await page.mouse.click(480, 270);

// ---------------------------------------------------------------- in the page: the scenarios
await page.evaluate(
  ({ draw }) => {
    const sim = window.sim;
    const I = sim.internals();
    const { state, world, hf } = I;
    const me = state.seats[I.me],
      other = state.seats[I.other];
    const wait = (ms) => window.__clock.wait(ms);
    const stop = (b) => (b.vx = b.vz = b.velocityY = 0);
    const stand = (b, x, z) => {
      Object.assign(b, { phase: "ground", grounded: true, crouched: false, x, z });
      delete b.zip;
      delete b.ladder;
      delete b.rappel;
      b.y = world.supportAt(x, z, 0.35, hf.heightAt(x, z) + 1);
      stop(b);
    };
    /** The third player (a bot far away), for switching. */
    let third = null;
    /** The runway: where the aircraft is parked and the way it points. */
    let field = { x: 0, z: 0, yaw: 0 };
    const along = (d, side = 0) => ({
      x: field.x - Math.sin(field.yaw) * d + Math.cos(field.yaw) * side,
      z: field.z - Math.cos(field.yaw) * d - Math.sin(field.yaw) * side,
    });
    const lab = (window.lab = {
      async start(fps) {
        for (let i = 0; i < 400 && state.phase !== "plane"; i++) {
          sim.takeOff();
          await wait(50);
        }
        // Everyone down at once; the bots out of it but one.
        state.planeAt = sim.clock().clock - 3600000;
        for (const s of state.seats) {
          if (s.bot && !third) third = s;
          else if (s.bot) s.dead = true;
          stand(s.body, s.body.x, s.body.z);
        }
        // (The gas is everywhere by now: nobody the lab needs dies of it.)
        const alive = setInterval(() => lab.keepAlive(), 10);
        window.__clock.each = () => lab.keepAlive();
        for (let i = 0; i < 200 && state.phase !== "active"; i++) await wait(50);
        for (let i = 0; i < 100 && !state.aircraft; i++) await wait(50);
        const a = state.aircraft;
        const fx = -2 * (a.qx * a.qz + a.qw * a.qy),
          fz = -(1 - 2 * (a.qx * a.qx + a.qy * a.qy));
        field = { x: a.x, z: a.z, yaw: Math.atan2(-fx, -fz) };
        lab.reset();
        if (!draw) window.__noDraw = true;
        sim.net({ hz: 15, manual: true });
        window.__clock.start(fps);
        // (The client's clock for the others keeps its least-delayed packet of the last five
        // seconds: those from before the lab's connection are gone after this.)
        await wait(6000);
        clearInterval(alive);
        return { phase: state.phase, field };
      },
      /** Everyone back to a known state between scenarios. */
      reset() {
        sim.otherScript(null);
        if (other.vehicle !== undefined) {
          const v = state.vehicles[other.vehicle];
          if (v) v.driver = -1;
          delete other.vehicle;
        }
        if (other.cockpit !== undefined) {
          if (state.aircraft) state.aircraft.pilot = state.aircraft.passenger = -1;
          delete other.cockpit;
        }
        other.dead = false;
        other.kit.hp = 100;
        me.dead = false;
        me.kitVersion++;
        delete me.spectate;
        const p = along(-30, 25);
        stand(other.body, p.x, p.z);
        const q = along(-60, 60);
        stand(me.body, q.x, q.z);
        if (third) {
          third.dead = false;
          third.kit.hp = 100;
          const r = along(900, 300);
          stand(third.body, r.x, r.z);
        }
      },
      keepAlive() {
        if (third) third.kit.hp = 100;
        other.kit.hp = 100;
      },
      vehicle(kind, d = 20, side = 30) {
        const v = state.vehicles.find((x) => x.kind === kind && !x.destroyed && x.driver < 0);
        const p = along(d, side);
        Object.assign(v, {
          x: p.x,
          z: p.z,
          y: hf.heightAt(p.x, p.z) + 0.3,
          yaw: field.yaw,
          pitch: 0,
          roll: 0,
          speed: 0,
          health: v.maxHealth,
        });
        stand(other.body, p.x + Math.cos(field.yaw) * 1.6, p.z - Math.sin(field.yaw) * 1.6);
        return v;
      },
      scenarios: {
        walk() {
          const y0 = field.yaw;
          sim.otherScript((tick) => ({
            forward: 1,
            walk: true,
            yaw: y0 + 0.9 * Math.sin(tick * 0.02),
            pitch: 0.15 * Math.sin(tick * 0.031),
          }));
        },
        sprint() {
          const y0 = field.yaw;
          sim.otherScript((tick) => ({
            forward: 1,
            sprint: true,
            strafe: tick % 90 < 30 ? 1 : 0,
            jump: tick % 75 === 0,
            yaw: y0 + 0.7 * Math.sin(tick * 0.035),
            pitch: 0.1 * Math.sin(tick * 0.05),
          }));
        },
        crouch() {
          const y0 = field.yaw;
          sim.otherScript((tick) => ({
            forward: 1,
            crouch: tick % 120 < 80,
            yaw: y0 + 1.2 * Math.sin(tick * 0.015),
          }));
        },
        shoot() {
          sim.otherHold("ak47");
          const y0 = field.yaw;
          sim.otherScript((tick) => {
            // Flicks between two bearings, bursts, the sights up half the time.
            const flick = Math.floor(tick / 45) % 2 ? 0.8 : -0.5;
            return {
              forward: tick % 180 < 60 ? 1 : 0,
              strafe: tick % 60 < 30 ? 1 : -1,
              yaw: y0 + flick + 0.2 * Math.sin(tick * 0.2),
              pitch: 0.25 * Math.sin(tick * 0.09),
              fire: tick % 30 < 12,
              aim: tick % 150 > 75,
              reload: tick % 240 === 200,
            };
          });
        },
        car() {
          const v = lab.vehicle("sedan");
          sim.otherAct({ act: "enter", id: v.id });
          sim.otherScript((tick) => ({
            forward: 1,
            strafe: 0.55 * Math.sin(tick * 0.025),
            yaw: v.yaw,
          }));
        },
        /** The driver looks about with the mouse as they drive (their view's heading is sent). */
        carLook() {
          const v = lab.vehicle("sedan");
          sim.otherAct({ act: "enter", id: v.id });
          sim.otherScript((tick) => ({
            forward: 1,
            strafe: 0.4 * Math.sin(tick * 0.025),
            yaw: v.yaw + 1.1 * Math.sin(tick * 0.06) + (tick % 150 < 6 ? 0.6 : 0),
            pitch: 0.2 * Math.sin(tick * 0.04),
          }));
        },
        bike() {
          const v = lab.vehicle("bike");
          sim.otherAct({ act: "enter", id: v.id });
          sim.otherScript((tick) => ({
            forward: 1,
            strafe: 0.5 * Math.sin(tick * 0.03),
            yaw: v.yaw,
          }));
        },
        vehicleInOut() {
          const v = lab.vehicle("suv") ?? lab.vehicle("sedan");
          let seated = false;
          sim.otherScript((tick) => {
            const k = tick % 240;
            if (k === 5 && !seated) (sim.otherAct({ act: "enter", id: v.id }), (seated = true));
            if (k === 150 && seated) (sim.otherAct({ act: "exit" }), (seated = false));
            // In: drive 3 s, brake 1.5 s. Out: stand, then step back to the door.
            if (seated)
              return { forward: k < 100 ? 1 : 0, jump: k >= 100, strafe: 0.3, yaw: v.yaw };
            return { forward: 0, yaw: v.yaw + 0.5 * Math.sin(tick * 0.05) };
          });
        },
        plane() {
          const a = state.aircraft;
          const fx = -Math.sin(field.yaw),
            fz = -Math.cos(field.yaw);
          Object.assign(a, {
            y: hf.heightAt(a.x, a.z) + 260,
            vx: fx * 52,
            vy: 0,
            vz: fz * 52,
            wx: 0,
            wy: 0,
            wz: 0,
            engine: "on",
            throttle: 1,
            rpm: 1,
            pilot: other.seat,
            health: a.maxHealth,
            destroyed: false,
          });
          other.cockpit = 0;
          sim.otherScript((tick) => ({
            thr: 1,
            elev: 0.12 + 0.1 * Math.sin(tick * 0.02),
            ail: 0.35 * Math.sin(tick * 0.012),
            rud: 0,
            flaps: 0,
            yaw: field.yaw,
          }));
        },
        parachute() {
          const b = other.body;
          Object.assign(b, { phase: "parachute", grounded: false, y: hf.heightAt(b.x, b.z) + 420 });
          b.vx = -Math.sin(field.yaw) * 20;
          b.vz = -Math.cos(field.yaw) * 20;
          b.velocityY = -5;
          const y0 = field.yaw;
          sim.otherScript((tick) => ({
            forward: 1,
            yaw: y0 + 1.1 * Math.sin(tick * 0.012),
            pitch: -0.3,
            dive: tick % 200 > 140,
          }));
        },
        swim() {
          sim.toWater(5);
          sim.otherSwim(10, 0, 0.3, false, 9);
        },
        zip() {
          sim.zipOther();
        },
        rope() {
          sim.ropeOther();
        },
        async rappel() {
          sim.rappelStand("other", 1344.63, 29.63, 293.2, 0, 4.2, 2.6);
          await wait(400);
          sim.rappelOther();
          await wait(900);
          // Down in hops: S held on and off.
          sim.otherScript((tick) => ({ forward: tick % 90 < 14 ? -1 : 0, yaw: 0 }));
        },
        switching() {
          const y0 = field.yaw;
          sim.otherScript((tick) => {
            if (tick % 75 === 0) me.spectate = me.spectate === other.seat ? third.seat : other.seat;
            return { forward: 1, yaw: y0 + 0.9 * Math.sin(tick * 0.02) };
          });
        },
      },
      /** Run one scenario for `seconds` over connection `net`; the recorded frames. */
      async run(name, net, seconds, hz) {
        lab.reset();
        sim.net({ hz, seed: 7, manual: true, ...net });
        await wait(600);
        await lab.scenarios[name]();
        const dbg = [
          other.body.phase,
          Math.round(other.body.x),
          Math.round(other.body.y),
          Math.round(other.body.z),
          other.dead,
          state.phase,
        ];
        sim.spectate(other.seat);
        // (Settled: the vehicle up to speed, the watcher's view on the watched.)
        await wait(name === "zip" ? 4500 : name === "rappel" ? 300 : 2500);
        const frames = [];
        window.__frameMs.length = 0;
        window.__timing = true;
        const end = performance.now() + seconds * 1000;
        const cam = sim.arena.debug().view.camera;
        await new Promise((done) => {
          const rec = () => {
            lab.keepAlive();
            const w = sim.arena.debug().watch;
            const { clock, t0 } = sim.clock();
            // The truth: their vehicle, the aircraft, or their body.
            const o = state.seats[w ? w.seat : other.seat];
            const tv = o.vehicle !== undefined ? state.vehicles[o.vehicle] : null;
            const t = tv ?? (o.cockpit !== undefined ? state.aircraft : o.body);
            const subj = w
              ? (w.vehiclePos ?? (w.vehicle <= -2 ? w.aircraft : null) ?? w.pos)
              : null;
            frames.push([
              performance.now() - t0,
              cam.position.x,
              cam.position.y,
              cam.position.z,
              cam.quaternion.x,
              cam.quaternion.y,
              cam.quaternion.z,
              cam.quaternion.w,
              subj ? subj[0] : NaN,
              subj ? subj[1] : NaN,
              subj ? subj[2] : NaN,
              clock,
              t.x,
              t.y,
              t.z,
              w ? w.seat : -1,
              w && w.pov ? 1 : 0,
              w && w.pos ? w.pos[0] : NaN,
              w && w.pos ? w.pos[1] : NaN,
              w && w.pos ? w.pos[2] : NaN,
            ]);
            if (performance.now() < end) requestAnimationFrame(rec);
            else done();
          };
          requestAnimationFrame(rec);
        });
        window.__timing = false;
        const phase = sim.arena.debug().watch?.phase ?? null;
        sim.otherScript(null);
        return {
          frames,
          frameMs: window.__frameMs.slice(),
          phase,
          acts: sim.otherActLog(),
          dbg: [
            ...dbg,
            other.body.phase,
            Math.round(other.body.x),
            Math.round(other.body.y),
            Math.round(other.body.z),
            other.dead,
          ],
        };
      },
    });
  },
  { draw },
);
console.log("start", JSON.stringify(await page.evaluate((fps) => window.lab.start(fps), FPS)));

// ---------------------------------------------------------------- here: the measures
const rms = (a) => (a.length ? Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) : 0);
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const quat = (q, v) => {
  // v turned by the inverse of q (world → camera).
  const [x, y, z, w] = [-q[0], -q[1], -q[2], q[3]];
  const ix = w * v[0] + y * v[2] - z * v[1],
    iy = w * v[1] + z * v[0] - x * v[2],
    iz = w * v[2] + x * v[1] - y * v[0],
    iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
};
const FOCAL = 360 / Math.tan((75 / 2) * (Math.PI / 180));
function measure({ frames, frameMs }, switching) {
  const n = frames.length;
  const P = frames.map((f) => [f[1], f[2], f[3]]);
  const dt = frames.map((f, i) => (i ? f[0] - frames[i - 1][0] : 16.7));
  const step = P.map((p, i) =>
    i ? [p[0] - P[i - 1][0], p[1] - P[i - 1][1], p[2] - P[i - 1][2]] : [0, 0, 0],
  );
  const len = (v) => Math.hypot(v[0], v[1], v[2]);
  const speed = step.map((s, i) => (len(s) / dt[i]) * 1000);
  // The pace around each frame: the median speed of the 17 frames about it.
  const pace = speed.map((_, i) => median(speed.slice(Math.max(1, i - 8), i + 9)));
  // (A change of the watched player is a cut: the frames around it are not a camera fault.)
  const cut = frames.map((f, i) => {
    for (let k = Math.max(1, i - 2); k <= Math.min(n - 1, i + 2); k++)
      if (frames[k][15] !== frames[k - 1][15] || frames[k][16] !== frames[k - 1][16]) return true;
    return false;
  });
  let back = 0,
    snap = 0,
    freeze = 0,
    rotSnap = 0;
  const rough = [],
    rotRough = [],
    px = [];
  const fwd = frames.map((f) => quat([-f[4], -f[5], -f[6], f[7]], [0, 0, -1]));
  const turn = fwd.map((d, i) =>
    i
      ? (Math.acos(
          Math.min(1, d[0] * fwd[i - 1][0] + d[1] * fwd[i - 1][1] + d[2] * fwd[i - 1][2]),
        ) *
          180) /
        Math.PI
      : 0,
  );
  const rel = frames.map((f) =>
    quat([f[4], f[5], f[6], f[7]], [f[8] - f[1], f[9] - f[2], f[10] - f[3]]),
  );
  for (let i = 2; i < n - 1; i++) {
    if (cut[i] || cut[i + 1]) continue;
    // The travel's direction: the mean step of the frames before.
    const dir = [0, 1, 2].map((k) => step[i - 1][k] + step[i - 2][k]);
    const dl = len(dir);
    const expect = (pace[i] * dt[i]) / 1000;
    if (pace[i] >= 1 && dl > 0 && i + 2 < n) {
      // Against its travel, and on the same way again right after (a turn round is not one).
      const dot = (v) => (v[0] * dir[0] + v[1] * dir[1] + v[2] * dir[2]) / dl;
      if (dot(step[i]) < -0.01 && dot(step[i + 1]) + dot(step[i + 2]) > 0.01) back++;
    }
    if (len(step[i]) > 2 * expect && len(step[i]) - expect > 0.25) snap++;
    if (pace[i] >= 2 && len(step[i]) < 0.2 * expect) freeze++;
    rough.push(len([0, 1, 2].map((k) => P[i + 1][k] - 2 * P[i][k] + P[i - 1][k])) * 100);
    rotRough.push(
      len([0, 1, 2].map((k) => fwd[i + 1][k] - 2 * fwd[i][k] + fwd[i - 1][k])) * (180 / Math.PI),
    );
    if (turn[i] - Math.max(turn[i - 1], turn[i + 1]) > 4) rotSnap++;
    // The watched body on screen: what its place in the view does beyond gliding.
    // (Seen from their own eyes there is no body in the picture.)
    if (
      !frames[i][16] &&
      Number.isFinite(rel[i][0]) &&
      Number.isFinite(rel[i - 1][0]) &&
      Number.isFinite(rel[i + 1][0])
    ) {
      const depth = Math.max(0.5, -rel[i][2]);
      const jx = rel[i + 1][0] - 2 * rel[i][0] + rel[i - 1][0],
        jy = rel[i + 1][1] - 2 * rel[i][1] + rel[i - 1][1];
      px.push((Math.hypot(jx, jy) / depth) * FOCAL);
    }
  }
  // How far behind the match the watched body is drawn: where on the true path it is.
  const truth = [];
  for (const f of frames)
    if (!truth.length || truth.at(-1)[0] !== f[11]) truth.push([f[11], f[12], f[13], f[14]]);
  const lags = [];
  if (!switching)
    for (let i = 0; i < n; i++) {
      const f = frames[i];
      if (!Number.isFinite(f[8])) continue;
      let best = Infinity,
        at = NaN;
      for (let j = 1; j < truth.length; j++) {
        const a = truth[j - 1],
          b = truth[j];
        if (b[0] > f[11] || b[0] < f[11] - 1500) continue;
        const ab = [b[1] - a[1], b[2] - a[2], b[3] - a[3]];
        const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
        if (l2 < 1e-6) continue;
        const k = Math.max(
          0,
          Math.min(
            1,
            ((f[8] - a[1]) * ab[0] + (f[9] - a[2]) * ab[1] + (f[10] - a[3]) * ab[2]) / l2,
          ),
        );
        const d = Math.hypot(
          a[1] + ab[0] * k - f[8],
          a[2] + ab[1] * k - f[9],
          a[3] + ab[2] * k - f[10],
        );
        if (d < best) ((best = d), (at = a[0] + (b[0] - a[0]) * k));
      }
      if (best < 1.5) lags.push(f[0] - at);
    }
  const sorted = [...frameMs].sort((a, b) => a - b);
  const r = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  return {
    frames: n,
    fps: r(1000 / (dt.reduce((a, b) => a + b, 0) / n), 0),
    pace: r(median(pace), 1),
    camRough: r(rms(rough)),
    camBack: back,
    camSnap: snap,
    camFreeze: freeze,
    rotRough: r(rms(rotRough), 3),
    rotSnap,
    subjPx: r(rms(px)),
    subjPxMax: r(Math.max(0, ...px), 1),
    lagMs: r(median(lags), 0),
    frameMs: r(frameMs.reduce((a, b) => a + b, 0) / Math.max(1, frameMs.length)),
    frameP95: r(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
  };
}

const names = await page.evaluate(() => Object.keys(window.lab.scenarios));
const results = {};
for (const name of names) {
  if (only && !only.includes(name)) continue;
  for (const net of nets) {
    const rec = await page.evaluate(
      ([name, net, seconds, hz]) => window.lab.run(name, net, seconds, hz),
      [name, NETS[net], SECONDS, HZ],
    );
    const m = { phase: rec.phase, ...measure(rec, name === "switching") };
    if (rec.acts.length) m.acts = rec.acts.join(",");
    if (process.env.DEBUG) console.log("  dbg", JSON.stringify(rec.dbg));
    if (process.env.RAW)
      fs.writeFileSync(`${process.env.RAW}-${name}-${net}.json`, JSON.stringify(rec.frames));
    (results[name] ??= {})[net] = m;
    console.log(name.padEnd(13), net.padEnd(7), JSON.stringify(m));
    if (shots) {
      fs.mkdirSync(shots, { recursive: true });
      await page.evaluate(() => (window.__noDraw = false));
      await page.evaluate(() => window.__clock.wait(400));
      await page.screenshot({ path: path.join(shots, `${name}-${net}.png`) });
      await page.evaluate((d) => (window.__noDraw = !d), draw);
    }
  }
}
if (out)
  fs.writeFileSync(out, JSON.stringify({ hz: HZ, seconds: SECONDS, nets: NETS, results }, null, 1));
await browser.close();
server.close();
