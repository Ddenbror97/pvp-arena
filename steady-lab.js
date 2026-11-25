// Steadying investigation helpers (release audit 2026-11-24): routes, per-pass GPU timer, runners.
(() => {
  const g = (x, z) => explorer.groundAt(x, z);
  window.routes = {
    bauhaus: { cam: [1351.8, 357.6], aim: [1351.8, 397.6], up: 3 },
    street: { cam: [1300, 420], aim: [1300, 380], tyAgl: 1.2 },
    interior: { cam: [1229, 354], eye: 17.53 + 1.7, aim: [1229, 330], ty: 17.53 + 1.5 },
    northstar: { cam: [-3534, -3462], aim: [-3548, -3509], up: 5 },
    ruins: { cam: [2420, 1790], aim: [2420, 1718], up: 8 },
    military: { cam: [1088, 1596], aim: [1049, 1596], up: 2 },
    fortress: { cam: [-1080, 1800], aim: [-1080, 1734], up: 6 },
    forest: { cam: [-4500, -300], aim: [-4470, -300], tyAgl: 1.5 },
    field: { cam: [1700, -2700], aim: [1700, -2660], tyAgl: 1.2 },
  };
  window.R = Object.keys(routes);
  const ty = (r) => r.ty ?? (r.tyAgl != null ? g(r.aim[0], r.aim[1]) + r.tyAgl : g(r.cam[0], r.cam[1]) + 1.7 + (r.up ?? 1.5));
  window.benchView = (r) => ({ pos: [r.cam[0], r.eye ?? g(r.cam[0], r.cam[1]) + 1.7, r.cam[1]], look: [r.aim[0], ty(r), r.aim[1]] });
  window.oscOpts = (r, extra = {}) => {
    const [x, z] = r.cam, [tx, tz] = r.aim, d = Math.hypot(x - tx, z - tz);
    return { cx: tx, cz: tz, dx: (x - tx) / d, dz: (z - tz) / d, dist: d, ty: ty(r), eye: r.eye, frames: 40, step: 0.03, ...extra };
  };
  // Per-pass GPU time: timer queries split at each framebuffer bind, labelled by the programs drawn.
  const cv = document.querySelector("canvas"), gl = cv.getContext("webgl2");
  const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  const P = WebGL2RenderingContext.prototype;
  const ob = P.beginQuery, oe = P.endQuery, obf = P.bindFramebuffer, oup = P.useProgram;
  const kindOf = new Map(); let curProg = null, open = null, on = false, mine = false; const done = [];
  const pk = (p) => { if (!p) return "x"; let k = kindOf.get(p); if (!k) { const fs = gl.getAttachedShaders(p).map((s) => gl.getShaderSource(s)).join("\n"); k = fs.includes("steadyOut") ? "steady" : fs.includes("tOverlayDepth") ? "present" : "scene"; kindOf.set(p, k); } return k; };
  P.beginQuery = function (t, q) { if (this === gl && !mine) return; return ob.call(this, t, q); };
  P.endQuery = function (t) { if (this === gl && !mine) return; return oe.call(this, t); };
  const close = () => { if (!open) return; mine = true; oe.call(gl, ext.TIME_ELAPSED_EXT); mine = false; done.push(open); open = null; };
  const start = (fid) => { const q = gl.createQuery(); mine = true; ob.call(gl, ext.TIME_ELAPSED_EXT, q); mine = false; open = { q, kinds: new Set(), fid }; };
  P.bindFramebuffer = function (t, fb) { const r = obf.call(this, t, fb); if (this === gl && on && t !== gl.READ_FRAMEBUFFER) { const f = open?.fid; close(); start(f); } return r; };
  P.useProgram = function (p) { if (this === gl && on && open) open.kinds.add(pk(p)); curProg = p; return oup.call(this, p); };
  for (const m of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) { const o = P[m]; P[m] = function (...a) { if (this === gl && on && open) open.kinds.add(pk(curProg)); return o.apply(this, a); }; }
  window.profFrames = async (n = 60, w = (window.LAB_SIZE ?? [1280, 720])[0], h = (window.LAB_SIZE ?? [1280, 720])[1]) => {
    done.length = 0; on = true;
    for (let i = 0; i < n; i++) { start(i); brDraw(w, h); close(); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); }
    on = false; gl.finish();
    for (let t = 0; t < 50; t++) { if (done.every((s) => gl.getQueryParameter(s.q, gl.QUERY_RESULT_AVAILABLE))) break; await new Promise((r) => setTimeout(r, 20)); }
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT), per = {};
    for (const s of done) { const ns = gl.getQueryParameter(s.q, gl.QUERY_RESULT) ?? 0; gl.deleteQuery(s.q); const k = s.kinds.has("steady") ? "steady" : s.kinds.has("present") ? "present" : s.kinds.size ? "scene" : "idle"; (per[s.fid] ??= {})[k] = (per[s.fid][k] ?? 0) + ns / 1e6; }
    const fr = Object.values(per).slice(10);
    const med = (k) => { const a = fr.map((f) => f[k] ?? 0).sort((x, y) => x - y); return +a[a.length >> 1].toFixed(3); };
    const tot = fr.map((f) => Object.values(f).reduce((a, b) => a + b, 0)).sort((x, y) => x - y);
    return { disjoint, scene: med("scene"), steady: med("steady"), present: med("present"), idle: med("idle"), total: +tot[tot.length >> 1].toFixed(3) };
  };
  window.VARIANTS = {
    off: { on: false },
    full: { on: true, v: null },
    fixed: { on: true, v: { fixed: true } },
    single: { on: true, v: { single: true } },
    lite3: { on: true, v: { depth1: true, cross: true, bilinear: true } },
    lite: { on: true, v: { depth1: true, cross: true, bilinear: true, single: true } },
    litec: { on: true, v: { depth1: true, cross: true, bilinear: true, single: true, compact: true } },
    fullc: { on: true, v: { single: true, compact: true } },
    fixedc: { on: true, v: { fixed: true, single: true, compact: true } },
    litecr: { on: true, v: { depth1: true, cross: true, single: true } },
    slim: { on: true, v: { depth1: true, cross: true, slim: true } },
    slim5: { on: true, v: { cross: true, slim: true } },
    slimfull: { on: true, v: { slim: true } },
  };
  window.setVariant = (name) => { const c = VARIANTS[name]; brSteadyMode.on = c.on; brSteadyMode.foot = true; brSteadyMode.lite = false; brSteadyLab.variant = c.v ?? null; };
  window.__prof = {}; window.__osc = {}; window.__progress = "";
  const goto = async (rk) => { const v = benchView(routes[rk]); brDraw(...(window.LAB_SIZE ?? [1280, 720])); await explorer.view(v.pos, v.look); for (let i = 0; i < 5; i++) brDraw(...(window.LAB_SIZE ?? [1280, 720])); };
  window.runProf = async (vars, list = R, n = 40) => {
    for (const rk of list) for (const vn of vars) { setVariant(vn); await goto(rk); (__prof[rk] ??= {})[vn] = await profFrames(n); __progress = "prof " + rk + " " + vn; }
    __progress = "done";
  };
  window.sharp = () => { const c = __oscLast.img, W = c.width, H = c.height; const d = c.getContext("2d").getImageData(0, 0, W, H).data; const band = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y += 2) for (let x = 0; x < W - 1; x += 2) { const i = y * W + x; const L0 = 0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2], L1 = 0.299 * d[4 * i + 4] + 0.587 * d[4 * i + 5] + 0.114 * d[4 * i + 6], L2 = 0.299 * d[4 * (i + W)] + 0.587 * d[4 * (i + W) + 1] + 0.114 * d[4 * (i + W) + 2]; s += Math.abs(L1 - L0) + Math.abs(L2 - L0); n++; } return +(s / n).toFixed(2); }; return { smid: band((H / 3) | 0, ((2 * H) / 3) | 0), slow: band(((2 * H) / 3) | 0, H - 1) }; };
  window.__err = null; window.__shots = {};
  window.runOsc = async (vars, list = R, extra = {}) => {
    for (const rk of list) for (const vn of vars) {
      try {
        setVariant(vn); await goto(rk);
        const o = await labOsc(oscOpts(routes[rk], extra));
        (__osc[rk] ??= {})[vn] = { osc: o.osc, top: o.grid[0].reduce((a, b) => a + b, 0), mid: o.grid[1].reduce((a, b) => a + b, 0), low: o.grid[2].reduce((a, b) => a + b, 0), ...sharp() };
        const k = document.createElement("canvas"); k.width = __oscLast.img.width; k.height = __oscLast.img.height; k.getContext("2d").drawImage(__oscLast.img, 0, 0); (__shots[rk] ??= {})[vn] = k;
        __progress = "osc " + rk + " " + vn;
      } catch (e) { __err = rk + " " + vn + " " + e; }
    }
    __progress = "done";
  };
  window.table = (obj, f) => Object.entries(obj).map(([rk, o]) => rk.padEnd(10) + " " + Object.entries(o).map(([v, x]) => v + ":" + f(x)).join(" ")).join("\n");
})();
// Enemy visibility: a person-sized box crossing 20 m ahead while the camera strafes. Counted:
// pixels of the box's silhouette (where it changes the picture with the steadying off) that a
// variant shows more than 25 of 255 away from that picture.
(() => {
  let box = null;
  const makeBox = (color) => {
    let proto = null;
    explorer.scene.traverse((o) => { if (!proto && o.isMesh && o.geometry?.attributes?.position && !o.isInstancedMesh && o.material && !Array.isArray(o.material) && o.material.isMeshStandardMaterial) proto = o; });
    // (Not the terrain's instanced geometry: a plain one, its parent class.)
    let G = proto.geometry.constructor; if (proto.geometry.isInstancedBufferGeometry) G = Object.getPrototypeOf(G.prototype).constructor;
    const A = proto.geometry.attributes.position.constructor;
    const hx = 0.25, hy = 0.9, hz = 0.2, p = [], n = [];
    const face = (a, b, c, d, nn) => { for (const v of [a, b, c, a, c, d]) { p.push(...v); n.push(...nn); } };
    const X = [-hx, hx], Y = [-hy, hy], Z = [-hz, hz];
    face([X[0],Y[0],Z[1]],[X[1],Y[0],Z[1]],[X[1],Y[1],Z[1]],[X[0],Y[1],Z[1]],[0,0,1]);
    face([X[1],Y[0],Z[0]],[X[0],Y[0],Z[0]],[X[0],Y[1],Z[0]],[X[1],Y[1],Z[0]],[0,0,-1]);
    face([X[1],Y[0],Z[1]],[X[1],Y[0],Z[0]],[X[1],Y[1],Z[0]],[X[1],Y[1],Z[1]],[1,0,0]);
    face([X[0],Y[0],Z[0]],[X[0],Y[0],Z[1]],[X[0],Y[1],Z[1]],[X[0],Y[1],Z[0]],[-1,0,0]);
    face([X[0],Y[1],Z[1]],[X[1],Y[1],Z[1]],[X[1],Y[1],Z[0]],[X[0],Y[1],Z[0]],[0,1,0]);
    const g = new G(); g.setAttribute("position", new A(new Float32Array(p), 3)); g.setAttribute("normal", new A(new Float32Array(n), 3));
    const m = new proto.material.constructor({ color }); m.color.setHex(color);
    const mesh = new proto.constructor(g, m); mesh.frustumCulled = false; return mesh;
  };
  const grab = () => { const cv = document.querySelector("canvas"); const k = window.__gk ??= document.createElement("canvas"); k.width = cv.width; k.height = cv.height; const c = k.getContext("2d", { willReadFrequently: true }); c.drawImage(cv, 0, 0); const d = c.getImageData(0, 0, k.width, k.height).data; const L = new Uint8Array(k.width * k.height); for (let i = 0; i < L.length; i++) L[i] = (0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2]) | 0; return L; };
  const seq = async (rk, withBox, frames, speed) => {
    const r = routes[rk], v = benchView(r);
    const [x, z] = r.cam, [tx, tz] = r.aim, d = Math.hypot(x - tx, z - tz), fx = (tx - x) / d, fz = (tz - z) / d, sx = -fz, sz = fx;
    const bx = x + fx * 20, bz = z + fz * 20, by = explorer.groundAt(bx, bz) + 0.9;
    if (withBox) explorer.scene.add(box); else explorer.scene.remove(box);
    brDraw(...(window.LAB_SIZE ?? [1280, 720]));
    const out = [];
    for (let f = -6; f < frames; f++) {
      const s = (f - frames / 2);
      box.position.set(bx + sx * s * speed, by, bz + sz * s * speed);
      box.updateMatrixWorld(true);
      const cs = s * 0.03;
      await explorer.view([v.pos[0] - sx * cs, v.pos[1], v.pos[2] - sz * cs], v.look.map((q, i) => i === 1 ? q : q - (i === 0 ? sx : sz) * cs));
      if (f >= 0) out.push(grab());
    }
    explorer.scene.remove(box);
    return out;
  };
  window.runGhost = async (rk, vars, { color = 0x404040, frames = 30, speed = 0.083 } = {}) => {
    box = makeBox(color);
    setVariant("off");
    const ref = await seq(rk, true, frames, speed), bare = await seq(rk, false, frames, speed);
    const res = {};
    for (const vn of vars) {
      setVariant(vn);
      const got = await seq(rk, true, frames, speed);
      let mask = 0, off = 0, worst = 0;
      for (let f = 2; f < frames; f++) { let fo = 0, fm = 0; for (let i = 0; i < ref[f].length; i++) if (Math.abs(ref[f][i] - bare[f][i]) > 12) { fm++; if (Math.abs(got[f][i] - ref[f][i]) > 25) fo++; } mask += fm; off += fo; worst = Math.max(worst, fm ? fo / fm : 0); }
      res[vn] = { silhouettePx: mask, alteredPx: off, pct: +(100 * off / Math.max(1, mask)).toFixed(2), worstFramePct: +(100 * worst).toFixed(1) };
      __progress = "ghost " + rk + " " + vn;
    }
    (window.__ghost ??= {})[rk + "@" + color.toString(16)] = res;
    __progress = "done";
    return res;
  };
})();
