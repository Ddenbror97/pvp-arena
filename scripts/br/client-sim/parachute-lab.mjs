/**
 * Parachute lab (headless): the real client flying its own drop against the in-page match, its
 * snapshots delivered through a connection with latency and jitter, its keys and its mouse fed
 * as a keyboard and a 125 Hz mouse feed them. Every frame the camera, your body as drawn, your
 * figure and the phase are recorded.
 *
 *   node scripts/br/client-sim/parachute-lab.mjs [out.json] [--chromium=/path]
 *     [--only=exit,keyTurn] [--net=lan] [--fps=60] [--hz=15] [--draw] [--shots=dir]
 *
 * One connection and one frame rate a run (the exit from the drop plane happens once a match).
 * Without --draw the GL draw calls are no-ops once the match is live (as spectate-lab.mjs).
 *
 * Per scenario:
 *   camRough   cm   RMS of the camera path's second difference (a straight glide is 0)
 *   camSnap    n    frames the camera moved more than twice its pace and 25 cm further than it
 *   rotRough   °    RMS of the view direction's second difference
 *   rotSnap    n    frames the view turned 2° more than the frames around it
 *   bodyRough  °    RMS of the second difference of your figure's heading (the canopy's too)
 *   bodyStill  %    frames your figure's heading did not turn while it turned over the run
 *   viewJump   m    the camera's largest step at a change of phase, beyond its pace (viewTurn °)
 *   bareMs     ms   time in the air with no canopy over you; legSwing m/s how fast your feet
 *                   moved against your hips meanwhile (a stride in mid-air)
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
const HZ = Number(arg("hz", 15));
const FPS = Number(arg("fps", 60));
const NETS = {
  lan: { latencyMs: 5, jitterMs: 2 },
  cable: { latencyMs: 35, jitterMs: 12 },
  wifi: { latencyMs: 60, jitterMs: 45, spikeEvery: 40, spikeMs: 140 },
  mobile: { latencyMs: 110, jitterMs: 80, spikeEvery: 25, spikeMs: 220 },
};
const NET = arg("net", "lan");
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
  "<!doctype html><meta charset=utf-8><title>Parachute lab</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='sim.js'></script>";
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
  // (The page cannot take the pointer: br-arena.ts reads this instead.)
  window.__brAssumeLock = true;
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
  // The lab's own clock, as spectate-lab.mjs: frames exactly 1000 / fps apart, the match pumped
  // once a frame. Events carry its time too (the mouse's reports are spread over the frames by
  // their timestamps).
  const realNow = performance.now.bind(performance);
  const realRaf = window.requestAnimationFrame.bind(window);
  let virtual = null,
    stepMs = 1000 / 60,
    queue = [],
    waits = [];
  performance.now = () => virtual ?? realNow();
  const stamp = Object.getOwnPropertyDescriptor(Event.prototype, "timeStamp").get;
  Object.defineProperty(Event.prototype, "timeStamp", {
    get() {
      return this.__at ?? (virtual === null ? stamp.call(this) : virtual);
    },
  });
  window.__frameMs = [];
  window.requestAnimationFrame = (f) => {
    if (virtual === null) return realRaf(f);
    queue.push(f);
    return 0;
  };
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    const from = virtual;
    virtual += stepMs;
    window.sim.pump();
    window.__clock.each?.(from, virtual);
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
    setTimeout(() => channel.port2.postMessage(0), 0);
  };
  window.__clock = {
    start(fps) {
      stepMs = 1000 / fps;
      virtual = realNow();
      channel.port2.postMessage(0);
    },
    now: () => virtual,
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
    const { state, hf } = I;
    const me = state.seats[I.me],
      other = state.seats[I.other];
    const wait = (ms) => window.__clock.wait(ms);
    const key = (code, down) =>
      window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
    const KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "Space"];
    const button = (b, down) =>
      window.dispatchEvent(
        new MouseEvent(down ? "mousedown" : "mouseup", { button: b, bubbles: true }),
      );
    /**
     * The mouse: `rate(ms)` → counts a second on each axis; reported 125 times a second in
     * whole counts (the rest carried), each report with its own time.
     */
    let mouse = null,
      mouseFrom = 0,
      mouseNext = 0,
      carryX = 0,
      carryY = 0;
    const REPORT_MS = 8;
    const feed = (from, to) => {
      if (!mouse) return;
      for (; mouseNext <= to; mouseNext += REPORT_MS) {
        if (mouseNext <= from) continue;
        const [vx, vy] = mouse(mouseNext - mouseFrom);
        carryX += (vx * REPORT_MS) / 1000;
        carryY += (vy * REPORT_MS) / 1000;
        const dx = Math.trunc(carryX),
          dy = Math.trunc(carryY);
        carryX -= dx;
        carryY -= dy;
        if (!dx && !dy) continue;
        const e = new MouseEvent("mousemove", { movementX: dx, movementY: dy, bubbles: true });
        e.__at = mouseNext;
        window.dispatchEvent(e);
      }
    };
    const setMouse = (rate) => {
      mouse = rate;
      mouseFrom = window.__clock.now();
      mouseNext = mouseFrom + 3.1;
      carryX = carryY = 0;
    };
    let spot = { x: 60, z: 60, yaw: 0 };
    let foot = null;
    const lab = (window.lab = {
      async start(fps, net, hz) {
        for (let i = 0; i < 400 && state.phase !== "plane"; i++) {
          sim.takeOff();
          await wait(50);
        }
        if (!draw) window.__noDraw = true;
        sim.net({ hz, seed: 7, manual: true, ...net });
        window.__clock.each = (from, to) => {
          lab.keepAlive();
          feed(from, to);
        };
        window.__clock.start(fps);
        // (The jump window opens two seconds into the flight; the client's clocks settle.)
        await wait(6000);
        return { phase: state.phase, mine: me.body.phase };
      },
      keepAlive() {
        other.kit.hp = 100;
        me.kit.hp = 100;
      },
      idle() {
        for (const k of KEYS) key(k, false);
        button(2, false);
        mouse = null;
      },
      /** Under the canopy `agl` m over the island's middle, flying; settled before measuring. */
      async aloft(agl = 450) {
        lab.idle();
        if (state.phase !== "active") throw new Error(`the match is ${state.phase}`);
        const b = me.body;
        delete me.cockpit;
        Object.assign(b, {
          phase: "parachute",
          grounded: false,
          x: spot.x,
          z: spot.z,
          y: hf.heightAt(spot.x, spot.z) + agl,
          vx: -Math.sin(spot.yaw) * 16,
          vz: -Math.cos(spot.yaw) * 16,
          velocityY: -5,
        });
        sim.arena.look(spot.yaw, -0.2);
        await wait(2500);
      },
      scenarios: {
        /** Out of the drop plane (Space): first of all, while the plane still flies. */
        async exit() {
          if (me.body.phase !== "plane") throw new Error(`not aboard: ${me.body.phase}`);
          lab.after(1200, () => key("Space", true));
          lab.after(1300, () => key("Space", false));
          return 5000;
        },
        /** A glide, W held, nothing else. */
        async glide() {
          await lab.aloft();
          key("KeyW", true);
          await wait(1500);
          return 6000;
        },
        /** Steering with the mouse: the course swept ±40° every three seconds. */
        async mouseSteer() {
          await lab.aloft();
          key("KeyW", true);
          await wait(1000);
          setMouse((ms) => [520 * Math.cos((ms / 3000) * 2 * Math.PI), 0]);
          return 6000;
        },
        /** Looking round (right button held): the view swept, the canopy flying on. */
        async freeLook() {
          await lab.aloft();
          key("KeyW", true);
          await wait(1000);
          button(2, true);
          setMouse((ms) => [
            900 * Math.cos((ms / 2500) * 2 * Math.PI),
            260 * Math.sin((ms / 1700) * 2 * Math.PI),
          ]);
          lab.after(5000, () => button(2, false));
          return 6500;
        },
        /** Steering with the keys: D, then A. */
        async keyTurn() {
          await lab.aloft();
          key("KeyW", true);
          await wait(1000);
          key("KeyD", true);
          lab.after(2500, () => (key("KeyD", false), key("KeyA", true)));
          lab.after(5000, () => key("KeyA", false));
          return 6000;
        },
        /** A dive (Q) and out of it, turning. */
        async dive() {
          await lab.aloft(700);
          key("KeyW", true);
          await wait(1000);
          key("KeyQ", true);
          key("KeyD", true);
          lab.after(3000, () => (key("KeyQ", false), key("KeyD", false)));
          return 6000;
        },
        /** The touchdown: from 22 m up, gliding. */
        async land() {
          await lab.aloft(40);
          key("KeyW", true);
          return 7000;
        },
        /** Out of the aircraft 700 m up (E), flying at 52 m/s. */
        async bail() {
          lab.idle();
          const a = state.aircraft;
          if (!a) throw new Error("no aircraft");
          const fx = -Math.sin(spot.yaw),
            fz = -Math.cos(spot.yaw);
          Object.assign(a, {
            x: spot.x,
            z: spot.z,
            y: hf.heightAt(spot.x, spot.z) + 700,
            qx: 0,
            qy: Math.sin(spot.yaw / 2),
            qz: 0,
            qw: Math.cos(spot.yaw / 2),
            vx: fx * 52,
            vy: 0,
            vz: fz * 52,
            wx: 0,
            wy: 0,
            wz: 0,
            engine: "on",
            throttle: 1,
            rpm: 1,
            pilot: me.seat,
            passenger: -1,
            health: a.maxHealth,
            destroyed: false,
            grounded: false,
          });
          me.cockpit = 0;
          await wait(2500);
          lab.after(800, () => I.act({ act: "exit" }));
          return 7000;
        },
      },
      timers: [],
      /** `f` at `ms` into the measurement. */
      after(ms, f) {
        lab.timers.push({ ms, f });
      },
      async run(name) {
        lab.timers = [];
        lab.keepAlive();
        const ms = await lab.scenarios[name]();
        const frames = [];
        const marks = [];
        window.__frameMs.length = 0;
        window.__timing = true;
        const t0 = performance.now();
        const cam = sim.arena.debug().view.camera;
        const fwd = { x: 0, y: 0, z: 0 };
        await new Promise((done) => {
          const rec = () => {
            const t = performance.now() - t0;
            for (const m of lab.timers)
              if (!m.done && t >= m.ms) {
                m.done = true;
                m.f();
                marks.push(Math.round(t));
              }
            const d = sim.arena.debug();
            const fig = d.figure;
            // The figure's heading (its −z turned by its rotation), and a foot against the hips.
            const q = fig.quaternion;
            fwd.x = -2 * (q.x * q.z + q.w * q.y);
            fwd.z = -(1 - 2 * (q.x * q.x + q.y * q.y));
            foot ??= (() => {
              let l = null,
                hips = null;
              fig.traverse((o) => {
                if (/LeftFoot$/.test(o.name)) l ??= o;
                if (/Hips$/.test(o.name)) hips ??= o;
              });
              return l && hips ? { l, hips } : null;
            })();
            let fz = NaN,
              fy = NaN;
            if (foot && fig.visible) {
              const a = foot.l.matrixWorld.elements,
                h = foot.hips.matrixWorld.elements;
              // (In the figure's own frame: the world's difference turned back by its rotation.)
              const dx = a[12] - h[12],
                dy = a[13] - h[13],
                dz = a[14] - h[14];
              const m = fig.matrixWorld.elements;
              fz = dx * m[8] + dy * m[9] + dz * m[10];
              fy = dx * m[4] + dy * m[5] + dz * m[6];
            }
            frames.push([
              t,
              cam.position.x,
              cam.position.y,
              cam.position.z,
              cam.quaternion.x,
              cam.quaternion.y,
              cam.quaternion.z,
              cam.quaternion.w,
              d.shown[0],
              d.shown[1],
              d.shown[2],
              fig.visible ? Math.atan2(-fwd.x, -fwd.z) : NaN,
              ["plane", "freefall", "parachute", "ground", "swim"].indexOf(d.body.phase),
              d.canopy?.visible ? 1 : 0,
              fz,
              fy,
              d.yaw,
            ]);
            if (t < ms) requestAnimationFrame(rec);
            else done();
          };
          requestAnimationFrame(rec);
        });
        window.__timing = false;
        lab.idle();
        // Where the next one starts: over where this one ended, the same way.
        const b = me.body;
        spot = {
          x: Math.max(-2500, Math.min(2500, b.x)),
          z: Math.max(-2500, Math.min(2500, b.z)),
          yaw: spot.yaw,
        };
        return { frames, marks, frameMs: window.__frameMs.slice(), phase: state.phase };
      },
      /** After the exit: everyone down, the match in play (the gas harms nobody the lab needs). */
      async toPlay() {
        lab.idle();
        state.planeAt = sim.clock().clock - 3600000;
        for (const s of state.seats) {
          if (s.bot) s.dead = true;
          const b = s.body;
          Object.assign(b, { phase: "ground", grounded: true, vx: 0, vz: 0, velocityY: 0 });
          b.y = hf.heightAt(b.x, b.z);
        }
        Object.assign(other.body, { x: 80, z: 80, y: hf.heightAt(80, 80) });
        for (let i = 0; i < 200 && state.phase !== "active"; i++) await wait(50);
        for (let i = 0; i < 100 && !state.aircraft; i++) await wait(50);
        spot = { x: 200, z: 200, yaw: 0.6 };
        await wait(1000);
        return state.phase;
      },
    });
  },
  { draw },
);

// ---------------------------------------------------------------- measures
const rms = (a) => (a.length ? Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) : 0);
const round = (v, d = 2) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
function measure({ frames, frameMs }) {
  const n = frames.length;
  const P = (i) => frames[i].slice(1, 4);
  const dir = (i) => {
    const [x, y, z, w] = frames[i].slice(4, 8);
    return [-2 * (x * z + w * y), -2 * (y * z - w * x), -(1 - 2 * (x * x + y * y))];
  };
  const ang = (a, b) =>
    (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;
  const acc = [],
    rot = [],
    body = [];
  let camSnap = 0,
    rotSnap = 0,
    viewJump = 0,
    viewTurn = 0,
    still = 0,
    turning = 0,
    bare = 0;
  const swing = [];
  for (let i = 2; i < n; i++) {
    const a = P(i - 2),
      b = P(i - 1),
      c = P(i);
    const v0 = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
      v1 = Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]);
    const d2 = Math.hypot(c[0] - 2 * b[0] + a[0], c[1] - 2 * b[1] + a[1], c[2] - 2 * b[2] + a[2]);
    const r0 = ang(dir(i - 2), dir(i - 1)),
      r1 = ang(dir(i - 1), dir(i));
    const changed = frames[i][12] !== frames[i - 1][12] || frames[i - 1][12] !== frames[i - 2][12];
    // A change of phase and the eased change of view after it are measured on their own.
    let near = false;
    for (let j = i + 2; j >= 1; j--) {
      if (j > n - 1) continue;
      if (frames[i][0] - frames[j][0] > 750) break;
      if (frames[j][12] !== frames[j - 1][12]) near = true;
    }
    if (near) {
      viewJump = Math.max(viewJump, Math.abs(v1 - v0));
      viewTurn = Math.max(viewTurn, Math.abs(r1 - r0));
    } else {
      acc.push(d2 * 100);
      rot.push(r1 - r0);
      if (v1 > 2 * v0 + 0.25 || v0 > 2 * v1 + 0.25) camSnap++;
      if (Math.abs(r1 - r0) > 2) rotSnap++;
    }
    const h0 = frames[i - 2][11],
      h1 = frames[i - 1][11],
      h2 = frames[i][11];
    if (!changed && [h0, h1, h2].every(Number.isFinite) && frames[i][12] === 2) {
      const t0 = turn(h0, h1),
        t1 = turn(h1, h2);
      body.push(((t1 - t0) * 180) / Math.PI);
      if (Math.abs(t0) > 1e-4 || Math.abs(t1) > 1e-4) {
        turning++;
        if (Math.abs(t1) < 1e-6) still++;
      }
    }
    if (frames[i][12] === 1) {
      bare += frames[i][0] - frames[i - 1][0];
      const dt = (frames[i][0] - frames[i - 1][0]) / 1000;
      if (Number.isFinite(frames[i][14]) && Number.isFinite(frames[i - 1][14]) && dt > 0)
        swing.push(
          Math.hypot(frames[i][14] - frames[i - 1][14], frames[i][15] - frames[i - 1][15]) / dt,
        );
    }
  }
  const sorted = frameMs.slice().sort((a, b) => a - b);
  return {
    frames: n,
    camRough: round(rms(acc)),
    camSnap,
    rotRough: round(rms(rot), 3),
    rotSnap,
    bodyRough: round(rms(body), 3),
    bodyStill: turning ? round((100 * still) / turning, 1) : 0,
    viewJump: round(viewJump),
    viewTurn: round(viewTurn, 1),
    bareMs: Math.round(bare),
    legSwing: round(rms(swing)),
    frameMs: round(frameMs.reduce((s, v) => s + v, 0) / Math.max(1, frameMs.length)),
    frameP95: round(sorted[Math.floor(sorted.length * 0.95)] ?? 0, 1),
  };
}

const start = await page.evaluate(
  ([fps, net, hz]) => window.lab.start(fps, net, hz),
  [FPS, NETS[NET], HZ],
);
console.log("start", JSON.stringify(start), `fps ${FPS} net ${NET} hz ${HZ}`);
const names = await page.evaluate(() => Object.keys(window.lab.scenarios));
const results = {};
for (const name of names) {
  if (name !== "exit" && only && !only.includes(name)) continue;
  const rec = await page.evaluate((name) => window.lab.run(name), name);
  const m = measure(rec);
  if (process.env.RAW)
    fs.writeFileSync(`${process.env.RAW}-${name}-${NET}-${FPS}.json`, JSON.stringify(rec.frames));
  if (!only || only.includes(name)) {
    results[name] = m;
    console.log(name.padEnd(11), JSON.stringify(m));
  }
  if (shots && (!only || only.includes(name))) {
    fs.mkdirSync(shots, { recursive: true });
    await page.evaluate(() => (window.__noDraw = false));
    await page.evaluate(() => window.__clock.wait(400));
    await page.screenshot({ path: path.join(shots, `${name}-${NET}-${FPS}.png`) });
    await page.evaluate((d) => (window.__noDraw = !d), draw);
  }
  if (name === "exit") console.log("play", await page.evaluate(() => window.lab.toPlay()));
}
if (out) fs.writeFileSync(out, JSON.stringify({ fps: FPS, net: NET, hz: HZ, results }, null, 1));
await browser.close();
server.close();
