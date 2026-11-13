/**
 * Central Hospital, the mega hospital (owner, 2026-11-13: "re design the hospital, right now its
 * like 4 big buildings. make each have 2-3 floors and a bridge over to other buildings, so its a
 * mega hospital"; "full interior so its fun to be in this area"). Four enterable blocks round
 * the old courtyard, joined by glazed sky bridges at different levels:
 *
 *  - hosp-main: the main block across the courtyard's north end (three floors, the lobby and
 *    reception, the morgue, wards, offices; a roof stair to the helipad on its roof);
 *  - hosp-west, hosp-east: the wings either side of the courtyard (three floors: examination
 *    rooms and wards west; labs, surgery and intensive care east);
 *  - hosp-er: the emergency department at the south end (two floors: the ambulance entrance,
 *    the waiting hall and the treatment bays; recovery wards; a roof terrace);
 *  - hosp-bridge-14, hosp-bridge-60: the sky bridges (wings to the main block at the first and
 *    second floor, west wing to the emergency department at the first, east wing onto the
 *    emergency department's roof, and the long bridge over the courtyard between the wings).
 *
 * Each block: a corridor down its length with rooms off both sides (2.2 m doorways: hospital
 * width, left open), two switchback stair cores at opposite ends (never one choke point),
 * windows in every room, doors in every side on the ground floor (fitted doors: doors.ts finds
 * them), openings where the bridges meet it. The rooms' kinds go to src/lib/fps/br/
 * hospital-plan.json, and layout.ts furnishes them with the owner's downloads (beds, curtains,
 * monitors, carts, operating tables, the morgue's cold chambers, reception, waiting chairs…).
 *
 *   node art/blender/br/build_hospital.mjs        (run from the repo root)
 *
 * Model space: metres, pivot at the bottom centre, built along the block's own long axis
 * (`long`: x or z) so it stands at turn 0 in the campus (layout.ts hospitalCampus). Original work.
 */
import fs from "node:fs";
import { COLOURS as C, createKit, publish } from "./procedural-kit.mjs";

const TAG = "mega-v1";
export const STOREY = 4;
const SLAB = 0.3,
  T = 0.3,
  IT = 0.15,
  /** Half the corridor's width. */
  CORR = 1.5,
  /** Room doorways (open: wider than doors.ts fits a panel to) and outside doors (fitted). */
  ROOM_DOOR = 2.2,
  DOOR = 1.8,
  BRIDGE_W = 2.6,
  /** Stair flights: rise per flight (half a storey), steps, tread; the hall strip before them. */
  STEPS = 12,
  TREAD = 0.28,
  STRIP = 1.2,
  FLIGHT_W = 1.5,
  DIVIDER = 0.2;
const FLIGHT_L = STEPS * TREAD;

const K = {
  plaster: [0.9, 0.9, 0.88],
  plinth: [0.55, 0.57, 0.58],
  accent: [0.16, 0.5, 0.58],
  accentDark: [0.1, 0.33, 0.4],
  wallIn: [0.86, 0.88, 0.86],
  wallWard: [0.8, 0.86, 0.84],
  floor: [0.6, 0.64, 0.62],
  corridor: [0.5, 0.56, 0.56],
  stripe: [0.16, 0.5, 0.58],
  roof: [0.47, 0.48, 0.47],
  frame: [0.32, 0.34, 0.36],
  cross: [0.8, 0.12, 0.12],
  white: [0.96, 0.96, 0.96],
  light: [1, 0.99, 0.94],
  canopy: [0.84, 0.86, 0.87],
  helipad: [0.3, 0.32, 0.31],
  yellow: [0.9, 0.75, 0.15],
  steel: C.steel,
  stair: [0.66, 0.67, 0.66],
  rail: C.rail,
  glass: C.glass,
};

/**
 * One block. `long`: the model axis its length runs along; L × D (length, depth); `floors`;
 * `cores`: [bay index, side (±1: +v or −v)], the second listed with `roof` true continues to
 * the roof; `doors`: ground-floor outside doors [face, at]; `bridges`: [face, at, floor]
 * openings; `roofGaps`: [face, at] gaps in the parapet (a bridge onto the roof); `open`:
 * [floor, side, first bay, last bay] rooms merged into a hall (no partitions, no corridor wall);
 * `kinds(floor, side, bay)`: the room's kind for the plan.
 * Faces: "u-", "u+" (the ends), "v-", "v+" (the long sides); `at` runs along the face (v on an
 * end, u on a side).
 */
function block(spec) {
  const k = createKit();
  const { long, L, D, floors } = spec;
  const H = floors * STOREY;
  const n = Math.round(L / 7);
  const bay = L / n;
  const U0 = -L / 2,
    V0 = -D / 2;
  const bays = Array.from({ length: n }, (_, i) => [U0 + i * bay, U0 + (i + 1) * bay]);
  const vIn = CORR + IT;
  const vOut = D / 2 - T;
  const xz = (u0, v0, u1, v1) => (long === "x" ? [u0, v0, u1, v1] : [v0, u0, v1, u1]);
  const B = (b, colour, opts) => {
    const [u0, y0, v0, u1, y1, v1] = b;
    const [x0, z0, x1, z1] = xz(
      Math.min(u0, u1),
      Math.min(v0, v1),
      Math.max(u0, u1),
      Math.max(v0, v1),
    );
    k.box([x0, Math.min(y0, y1), z0, x1, Math.max(y0, y1), z1], colour, opts);
  };
  const CEIL_C = [0.93, 0.94, 0.93];
  /** A lit ceiling panel just under the slab over local [u0,u1]×[v0,v1] at height y. */
  const ceilingUV = (u0, u1, v0, v1, y) => {
    const [x0, z0, x1, z1] = xz(
      Math.min(u0, u1),
      Math.min(v0, v1),
      Math.max(u0, u1),
      Math.max(v0, v1),
    );
    k.ceiling(x0, y, z0, x1, z1, CEIL_C);
  };
  /** A light panel just under a ceiling (drawn lit, like the ceiling itself). */
  const ceilingLight = (u0, u1, v0, v1, y) => {
    const [x0, z0, x1, z1] = xz(
      Math.min(u0, u1),
      Math.min(v0, v1),
      Math.max(u0, u1),
      Math.max(v0, v1),
    );
    k.ceiling(x0, y, z0, x1, z1, K.light);
  };
  // Walls: along u (at v0..v1) or along v (at u0..u1), with holes along their run.
  const wallU = (u0, u1, v0, v1, y0, y1, holes, colour, opts) =>
    long === "x"
      ? k.wall("x", u0, u1, Math.min(v0, v1), Math.max(v0, v1), y0, y1, holes, colour, opts)
      : k.wall("z", u0, u1, Math.min(v0, v1), Math.max(v0, v1), y0, y1, holes, colour, opts);
  const wallV = (v0, v1, u0, u1, y0, y1, holes, colour, opts) =>
    long === "x"
      ? k.wall("z", v0, v1, Math.min(u0, u1), Math.max(u0, u1), y0, y1, holes, colour, opts)
      : k.wall("x", v0, v1, Math.min(u0, u1), Math.max(u0, u1), y0, y1, holes, colour, opts);

  const isOpen = (f, side, i) =>
    (spec.open ?? []).some(([of, os, a, b]) => of === f && os === side && i >= a && i <= b);
  const coreAt = (side, i) => spec.cores.findIndex(([ci, cs]) => ci === i && cs === side);
  /** A core's stair geometry in its bay (u ranges of the two flights, v range outward). */
  const core = (ci) => {
    const [i, s] = spec.cores[ci];
    const [b0] = bays[i];
    const A = [b0 + IT / 2 + 0.05, b0 + IT / 2 + 0.05 + FLIGHT_W];
    const Dv = [A[1], A[1] + DIVIDER];
    const Bf = [Dv[1], Dv[1] + FLIGHT_W];
    const vStart = vIn + STRIP,
      vEnd = vStart + FLIGHT_L,
      // The landing runs on to the outside wall (no ledge beyond it to fall from).
      vLand = vOut;
    return { i, s, A, Dv, Bf, vStart, vEnd, vLand, roof: !!spec.cores[ci][2] };
  };
  const cores = spec.cores.map((_, ci) => core(ci));
  /** Slab holes (u0, u1, v0, v1 in local) over the cores whose flights rise to floor f. */
  const holesAt = (f) =>
    cores
      .filter((c) => f < floors || c.roof)
      .map((c) => [c.A[0], c.Bf[1], c.s * c.vStart, c.s * c.vLand]);

  // Rectangle minus holes (all in u, v), as boxes.
  const slab = (u0, u1, v0, v1, y0, y1, holes, colour, opts) => {
    const us = [u0, u1],
      vs = [v0, v1];
    const hs = holes.map(([a, b, c, d]) => [
      Math.min(a, b),
      Math.max(a, b),
      Math.min(c, d),
      Math.max(c, d),
    ]);
    for (const [a, b, c, d] of hs) {
      if (a > u0 && a < u1) us.push(a);
      if (b > u0 && b < u1) us.push(b);
      if (c > v0 && c < v1) vs.push(c);
      if (d > v0 && d < v1) vs.push(d);
    }
    us.sort((p, q) => p - q);
    vs.sort((p, q) => p - q);
    for (let a = 0; a + 1 < us.length; a++) {
      // Merge the kept cells of this column into runs along v.
      let run = null;
      for (let b = 0; b + 1 < vs.length; b++) {
        const mu = (us[a] + us[a + 1]) / 2,
          mv = (vs[b] + vs[b + 1]) / 2;
        const hole = hs.some(([p, q, r, s]) => mu > p && mu < q && mv > r && mv < s);
        if (!hole) run = run ? [run[0], vs[b + 1]] : [vs[b], vs[b + 1]];
        if ((hole || b + 2 === vs.length) && run) {
          if (us[a + 1] - us[a] > 1e-3 && run[1] - run[0] > 1e-3) {
            B([us[a], y0, run[0], us[a + 1], y1, run[1]], colour, opts);
            if (opts?.ceiling) ceilingUV(us[a], us[a + 1], run[0], run[1], y0 - 0.01);
          }
          run = null;
        }
      }
    }
  };

  const facesHoles = (face, f, y) => {
    const out = [];
    const end = face === "u-" || face === "u+";
    const door =
      f === 0 ? (spec.doors ?? []).filter(([fc]) => fc === face).map(([, at]) => at) : [];
    const bridge = (spec.bridges ?? [])
      .filter(([fc, , fl]) => fc === face && fl === f)
      .map(([, at]) => at);
    for (const at of door) out.push([at - DOOR / 2, at + DOOR / 2, y, y + 2.3]);
    for (const at of bridge) out.push([at - BRIDGE_W / 2, at + BRIDGE_W / 2, y, y + 2.6]);
    const taken = (c, w) => out.some(([a, b]) => b > c - w / 2 - 0.4 && a < c + w / 2 + 0.4);
    if (end) {
      // An end: the corridor's window and a window into each end room.
      const mid = (vIn + vOut) / 2;
      for (const c of [0, mid, -mid]) {
        const w = c === 0 ? 2 : 3.2;
        if (!taken(c, w)) out.push([c - w / 2, c + w / 2, y + 1.0, y + 3.0, true]);
      }
    } else {
      const side = face === "v+" ? 1 : -1;
      bays.forEach(([b0, b1], i) => {
        const c = (b0 + b1) / 2;
        // Stair cores get a narrow window (the flights run against this wall's inside).
        const w = coreAt(side, i) >= 0 ? 1.4 : 4.2;
        const cc = coreAt(side, i) >= 0 ? b1 - 1.2 : c;
        if (!taken(cc, w)) out.push([cc - w / 2, cc + w / 2, y + 1.0, y + 3.0, true]);
      });
    }
    return out.sort((p, q) => p[0] - q[0]);
  };

  const rooms = [];
  for (let f = 0; f < floors; f++) {
    const y = f * STOREY,
      top = y + STOREY,
      ceil = top - SLAB;
    // Outside walls (the plaster shell, LOD 1: seen from outside).
    wallV(V0, -V0, U0, U0 + T, y, top, facesHoles("u-", f, y), K.plaster);
    wallV(V0, -V0, -U0 - T, -U0, y, top, facesHoles("u+", f, y), K.plaster);
    wallU(U0 + T, -U0 - T, -V0 - T, -V0, y, top, facesHoles("v+", f, y), K.plaster);
    wallU(U0 + T, -U0 - T, V0, V0 + T, y, top, facesHoles("v-", f, y), K.plaster);
    // The floor: on the ground a finish over the pad (the pad carries you); upstairs the slab,
    // open over the stairs rising to it.
    if (f === 0) {
      B([U0 + T, 0, V0 + T, -U0 - T, 0.02, -V0 - T], K.floor, { collide: false, lod: 0 });
    } else {
      slab(U0 + T, -U0 - T, V0 + T, -V0 - T, y - SLAB, y, holesAt(f), K.floor, {
        lod: 0,
        ceiling: true,
      });
    }
    // The corridor's floor stripe and its ceiling lights.
    B([U0 + T, y + 0.02, -0.12, -U0 - T, y + 0.03, 0.12], K.stripe, { collide: false, lod: 0 });
    for (let u = U0 + 3; u < -U0 - 2; u += 3.5)
      ceilingLight(u - 0.6, u + 0.6, -0.25, 0.25, ceil - 0.02);
    for (const side of [1, -1]) {
      // The corridor wall: a doorway into each room, the cores' wide openings, none along a hall.
      const holes = [];
      const segs = [];
      let from = U0 + T;
      bays.forEach(([b0, b1], i) => {
        if (isOpen(f, side, i)) {
          if (b0 > from) segs.push([from, b0]);
          from = b1;
          return;
        }
        const ci = coreAt(side, i);
        if (ci >= 0) holes.push([cores[ci].A[0], cores[ci].Bf[1] + 0.6, y, y + 2.6]);
        else holes.push([(b0 + b1) / 2 - ROOM_DOOR / 2, (b0 + b1) / 2 + ROOM_DOOR / 2, y, y + 2.4]);
      });
      if (-U0 - T > from) segs.push([from, -U0 - T]);
      for (const [a, b] of segs) {
        const hs = holes.filter(([p, q]) => p >= a - 1e-6 && q <= b + 1e-6);
        wallU(a, b, side * CORR, side * vIn, y, ceil, hs, f === 0 ? K.wallIn : K.wallWard, {
          lod: 0,
        });
        // A handrail and a coloured dado along it, corridor side.
        B([a, y + 0.85, side * (CORR - 0.06), b, y + 0.92, side * CORR], K.accent, {
          collide: false,
          lod: 0,
        });
      }
      // Partitions between rooms (not inside a hall), from the corridor wall to the outside.
      for (let i = 1; i < n; i++) {
        if (isOpen(f, side, i - 1) && isOpen(f, side, i)) continue;
        const u = bays[i][0];
        wallV(side * vIn, side * vOut, u - IT / 2, u + IT / 2, y, ceil, [], K.wallIn, { lod: 0 });
      }
      // A light panel in each room.
      bays.forEach(([b0, b1], i) => {
        if (coreAt(side, i) >= 0) return;
        const c = (b0 + b1) / 2,
          m = (side * (vIn + vOut)) / 2;
        ceilingLight(c - 0.9, c + 0.9, m - 0.4, m + 0.4, ceil - 0.02);
      });
      // Rooms for the plan (cores excluded). A room an outside door or a bridge opens into is
      // an entry (kept clear: a way through, not furnished in the way).
      const face = side > 0 ? "v+" : "v-";
      const opensInto = (b0, b1) =>
        (f === 0 && (spec.doors ?? []).some(([fc, at]) => fc === face && at > b0 && at < b1)) ||
        (spec.bridges ?? []).some(([fc, at, fl]) => fc === face && fl === f && at > b0 && at < b1);
      bays.forEach(([b0, b1], i) => {
        if (coreAt(side, i) >= 0) return;
        rooms.push({
          floor: f,
          side,
          bay: i,
          u: [+(b0 + IT / 2).toFixed(2), +(b1 - IT / 2).toFixed(2)],
          v: [+(side * vIn).toFixed(2), +(side * vOut).toFixed(2)],
          hall: isOpen(f, side, i),
          kind: isOpen(f, side, i) || !opensInto(b0, b1) ? spec.kinds(f, side, i) : "entry",
        });
      });
    }
    // Stair cores: flight A out from the hall strip, the landing, flight B back up to the next
    // floor; the divider between them; rails round the well where it is open.
    for (const c of cores) {
      const s = c.s;
      const rises = f < floors - 1 || c.roof;
      const step = (u0, u1, va, vb, t) =>
        B([u0, Math.max(y, t - 0.3), s * va, u1, t, s * vb], K.stair, { lod: 0 });
      if (rises) {
        const r = STOREY / 2 / STEPS;
        for (let q = 0; q < STEPS; q++) {
          step(c.A[0], c.A[1], c.vStart + q * TREAD, c.vStart + (q + 1) * TREAD, y + (q + 1) * r);
          step(
            c.Bf[0],
            c.Bf[1],
            c.vEnd - (q + 1) * TREAD,
            c.vEnd - q * TREAD,
            y + STOREY / 2 + (q + 1) * r,
          );
        }
        // The landing (half a storey up), the divider (to the next floor's slab).
        B(
          [c.A[0], y + STOREY / 2 - 0.3, s * c.vEnd, c.Bf[1], y + STOREY / 2, s * c.vLand],
          K.stair,
          { lod: 0 },
        );
        B(
          [c.Dv[0], y, s * c.vStart, c.Dv[1], top + (f === floors - 1 ? 1.05 : 0), s * c.vEnd],
          K.wallIn,
          { lod: 0 },
        );
      }
      // Arriving here from below: rails round the open well (B's outer side; on a top floor
      // also across A's head, where no flight goes on up).
      if (f > 0) {
        const goesOn = rises;
        B([c.Bf[1], y, s * c.vStart, c.Bf[1] + 0.1, y + 1.05, s * c.vLand], K.rail, { lod: 0 });
        if (!goesOn)
          B([c.A[0], y, s * (c.vStart - 0.1), c.Dv[1], y + 1.05, s * c.vStart], K.rail, { lod: 0 });
      }
    }
  }
  // Roof: the slab (open over a roof stair), the parapet (gaps where a bridge lands), plant.
  slab(U0, -U0, V0, -V0, H - SLAB, H, holesAt(floors), K.roof, {});
  // The top floor's ceiling under the roof slab (inside the outside walls).
  slab(U0 + T, -U0 - T, V0 + T, -V0 - T, H - SLAB, H - SLAB, holesAt(floors), K.roof, {
    lod: 0,
    ceiling: true,
    collide: false,
    visible: false,
  });
  const gaps = spec.roofGaps ?? [];
  const parapet = (face) => {
    const hs = gaps
      .filter(([fc]) => fc === face)
      .map(([, at]) => [at - BRIDGE_W / 2, at + BRIDGE_W / 2, H, H + 1.1]);
    if (face === "v+") wallU(U0, -U0, -V0 - 0.25, -V0, H, H + 1.1, hs, K.plaster);
    if (face === "v-") wallU(U0, -U0, V0, V0 + 0.25, H, H + 1.1, hs, K.plaster);
    if (face === "u-") wallV(V0 + 0.25, -V0 - 0.25, U0, U0 + 0.25, H, H + 1.1, hs, K.plaster);
    if (face === "u+") wallV(V0 + 0.25, -V0 - 0.25, -U0 - 0.25, -U0, H, H + 1.1, hs, K.plaster);
  };
  for (const face of ["v+", "v-", "u-", "u+"]) parapet(face);
  // Coping and the accent bands at each floor (outside, drawn only).
  B([U0 - 0.05, H + 1.1, V0 - 0.05, -U0 + 0.05, H + 1.2, -V0 + 0.05], K.white, { collide: false });
  for (let f = 1; f <= floors; f++) {
    const y = f * STOREY;
    B([U0 - 0.06, y - 0.45, -V0, -U0 + 0.06, y - 0.05, -V0 + 0.06], K.accent, { collide: false });
    B([U0 - 0.06, y - 0.45, V0 - 0.06, -U0 + 0.06, y - 0.05, V0], K.accent, { collide: false });
    B([U0 - 0.06, y - 0.45, V0, U0, y - 0.05, -V0], K.accent, { collide: false });
    B([-U0, y - 0.45, V0, -U0 + 0.06, y - 0.05, -V0], K.accent, { collide: false });
  }
  B([U0 - 0.04, 0, V0 - 0.04, -U0 + 0.04, 0.6, -V0 + 0.04], K.plinth, { collide: false });
  // Roof stair house over the roof core, its door onto the roof towards the core's free half.
  for (const c of cores.filter((q) => q.roof)) {
    const s = c.s;
    const u0 = c.A[0] - 0.25,
      u1 = c.Bf[1] + 0.25;
    const va = s * (vIn - 0.25),
      vb = s * (c.vLand + 0.25);
    const top = H + 3.0;
    wallV(va, vb, u0, u0 + 0.25, H, top, [], K.plaster);
    wallU(u0, u1, vb - s * 0.25, vb, H, top, [], K.plaster);
    wallU(u0, u1, va, va + s * 0.25, H, top, [], K.plaster);
    const lo = Math.min(s * vIn, s * c.vStart),
      hi = Math.max(s * vIn, s * c.vStart);
    wallV(va, vb, u1 - 0.25, u1, H, top, [[lo + 0.05, hi - 0.05, H, H + 2.3]], K.plaster);
    B([u0, top, Math.min(va, vb), u1, top + 0.25, Math.max(va, vb)], K.roof, {});
    B([c.A[0], H, s * (c.vStart - 0.1), c.Dv[1], H + 1.05, s * c.vStart], K.rail, { lod: 0 });
  }
  // Plant on the roof: air handlers (cover), vents.
  for (const [pu, pv] of spec.plant ?? []) {
    B([pu - 1.6, H, pv - 1.0, pu + 1.6, H + 1.6, pv + 1.0], K.steel, {});
    B([pu - 1.4, H + 1.6, pv - 0.8, pu + 1.4, H + 1.75, pv + 0.8], K.frame, { collide: false });
  }
  // Red crosses high on the long sides (and the ends when asked), the block's name band.
  for (const [face, at] of spec.crosses ?? []) {
    const y = H - 1.9;
    const side = face === "v+" ? 1 : -1;
    const v = side * (-V0 + 0.04);
    B([at - 1.2, y - 0.35, v - 0.04, at + 1.2, y + 0.35, v + 0.04], K.cross, { collide: false });
    B([at - 0.35, y - 1.2, v - 0.04, at + 0.35, y + 1.2, v + 0.04], K.cross, { collide: false });
  }
  // Entrance canopies over the chosen outside doors.
  for (const [face, at, w = 6, depth = 3.2] of spec.canopies ?? []) {
    const y = 3.0;
    if (face === "v+" || face === "v-") {
      const s = face === "v+" ? 1 : -1;
      B([at - w / 2, y, s * -V0, at + w / 2, y + 0.3, s * (-V0 + depth)], K.canopy, {});
      B(
        [at - w / 2, y - 0.1, s * (-V0 + depth - 0.1), at + w / 2, y + 0.4, s * (-V0 + depth)],
        K.accent,
        { collide: false },
      );
      for (const e of [-1, 1])
        B(
          [
            at + e * (w / 2 - 0.3) - 0.12,
            0,
            s * (-V0 + depth - 0.4) - 0.12,
            at + e * (w / 2 - 0.3) + 0.12,
            y,
            s * (-V0 + depth - 0.4) + 0.12,
          ],
          K.frame,
          {},
        );
    }
  }
  // A helipad marking on the roof (drawn only).
  if (spec.helipad) {
    const [hu, hv] = spec.helipad;
    B([hu - 7, H + 0.01, hv - 7, hu + 7, H + 0.03, hv + 7], K.helipad, { collide: false });
    B([hu - 6.6, H + 0.03, hv - 6.6, hu + 6.6, H + 0.04, hv - 6.3], K.yellow, { collide: false });
    B([hu - 6.6, H + 0.03, hv + 6.3, hu + 6.6, H + 0.04, hv + 6.6], K.yellow, { collide: false });
    B([hu - 6.6, H + 0.03, hv - 6.6, hu - 6.3, H + 0.04, hv + 6.6], K.yellow, { collide: false });
    B([hu + 6.3, H + 0.03, hv - 6.6, hu + 6.6, H + 0.04, hv + 6.6], K.yellow, { collide: false });
    B([hu - 2.2, H + 0.04, hv - 3, hu - 1.2, H + 0.05, hv + 3], K.white, { collide: false });
    B([hu + 1.2, H + 0.04, hv - 3, hu + 2.2, H + 0.05, hv + 3], K.white, { collide: false });
    B([hu - 1.2, H + 0.04, hv - 0.5, hu + 1.2, H + 0.05, hv + 0.5], K.white, { collide: false });
  }

  // Far LOD: the shell, window bands, accent bands, crosses.
  const far = createKit();
  const FB = (b, colour) => {
    const [u0, y0, v0, u1, y1, v1] = b;
    const [x0, z0, x1, z1] = xz(
      Math.min(u0, u1),
      Math.min(v0, v1),
      Math.max(u0, u1),
      Math.max(v0, v1),
    );
    far.box([x0, y0, z0, x1, y1, z1], colour, { lod: 2 });
  };
  FB([U0, 0, V0, -U0, H + 1.1, -V0], K.plaster);
  for (let f = 0; f < floors; f++) {
    const y = f * STOREY;
    FB([U0 + 1, y + 1.0, -V0, -U0 - 1, y + 3.0, -V0 + 0.03], K.glass);
    FB([U0 + 1, y + 1.0, V0 - 0.03, -U0 - 1, y + 3.0, V0], K.glass);
    FB([U0 - 0.03, y + 1.0, V0 + 1, U0, y + 3.0, -V0 - 1], K.glass);
    FB([-U0, y + 1.0, V0 + 1, -U0 + 0.03, y + 3.0, -V0 - 1], K.glass);
    FB(
      [U0 - 0.05, y + STOREY - 0.45, V0 - 0.05, -U0 + 0.05, y + STOREY - 0.05, -V0 + 0.05],
      K.accent,
    );
  }
  const size = long === "x" ? [L, +(H + 3.25).toFixed(2), D] : [D, +(H + 3.25).toFixed(2), L];
  // Points 1.5 m outside each ground-floor door (model x, z): layout.ts keeps them clear.
  const aprons = (spec.doors ?? []).map(([face, at]) => {
    const [u, v] =
      face === "u-"
        ? [U0 - 1.5, at]
        : face === "u+"
          ? [-U0 + 1.5, at]
          : face === "v+"
            ? [at, -V0 + 1.5]
            : [at, V0 - 1.5];
    return long === "x" ? [u, v] : [v, u];
  });
  return { kit: k, far, size, rooms, bays, H, aprons };
}

/** A glazed sky bridge `len` m long along x, its walkway at y = 0 (3.3 m between the glass). */
function bridge(len) {
  const k = createKit();
  const L = len / 2,
    W = 1.75;
  // Deck and its truss (drawn), the walkway.
  k.box([-L, -0.35, -W, L, 0, W], K.plinth, {});
  k.box([-L, 0, -W + 0.06, L, 0.02, W - 0.06], K.floor, { collide: false, lod: 0 });
  k.box([-L, -0.95, -W, L, -0.35, -W + 0.15], K.steel, { collide: false });
  k.box([-L, -0.95, W - 0.15, L, -0.35, W], K.steel, { collide: false });
  // Sides: an opaque sill, glass above (solid: no one steps off a bridge), posts every 2.5 m.
  for (const s of [-1, 1]) {
    const z0 = s * W - (s > 0 ? 0.12 : 0),
      z1 = z0 + 0.12;
    k.box([-L, 0, z0, L, 0.9, z1], K.accent, {});
    k.box([-L, 0.9, s * W - 0.03, L, 2.6, s * W + 0.03], K.glass, { collide: false });
    k.box([-L, 0.9, z0, L, 2.6, z1], K.glass, { visible: false });
    for (let x = -L; x <= L + 1e-6; x += Math.min(2.5, len / Math.max(1, Math.round(len / 2.5))))
      k.box([x - 0.06, 0.9, z0 - 0.02, x + 0.06, 2.65, z1 + 0.02], K.frame, { collide: false });
  }
  k.box([-L, 2.6, -W - 0.1, L, 2.85, W + 0.1], K.roof, {});
  k.ceiling(-L, 2.59, -W, L, W, [0.9, 0.91, 0.9]);
  k.ceiling(-L, 2.575, -0.4, L, 0.4, K.light);
  const far = createKit();
  far.box([-L, -0.95, -W, L, 2.85, W], K.glass, { lod: 2 });
  far.box([-L, -0.95, -W, L, 0.9, W], K.accent, { lod: 2 });
  return { kit: k, far, size: [len, 3.8, 2 * W + 0.2] };
}

// ---------------------------------------------------------------- the campus
// Kinds of rooms (layout.ts furnishes each kind).
const wing = (L) => ({ long: "z", L, D: 20, floors: 3 });
export const BLOCKS = {
  // West wing: examination rooms on the ground floor, wards above.
  "hosp-west": {
    ...wing(70),
    cores: [
      [1, 1],
      [8, -1],
    ],
    doors: [
      ["u-", 0],
      ["u+", 0],
      ["v+", -3.5],
      ["v-", 10.5],
    ],
    bridges: [
      ["u-", 0, 1],
      ["u+", 0, 1],
      ["v+", 3.5, 2],
    ],
    canopies: [["v+", -3.5, 5, 2.6]],
    crosses: [["v-", -21]],
    plant: [
      [-20, -6],
      [16, 6],
    ],
    kinds: (f, side, i) =>
      f === 0 ? (i % 3 === 0 ? "imaging" : "exam") : i % 4 === 2 ? "nurse" : "ward",
  },
  // East wing: labs on the ground floor, surgery on the first, intensive care on the second.
  "hosp-east": {
    ...wing(70),
    cores: [
      [1, -1],
      [8, 1],
    ],
    doors: [
      ["u-", 0],
      ["u+", 0],
      ["v-", -3.5],
      ["v+", 10.5],
    ],
    bridges: [
      ["u-", 0, 2],
      ["u+", 0, 2],
      ["v-", 3.5, 2],
    ],
    canopies: [["v-", -3.5, 5, 2.6]],
    crosses: [["v+", -21]],
    plant: [
      [-20, 6],
      [16, -6],
    ],
    kinds: (f, side, i) =>
      f === 0 ? "lab" : f === 1 ? (i % 3 === 1 ? "scrub" : "surgery") : "icu",
  },
  // The main block: lobby and reception, the morgue and offices below, wards, administration;
  // the roof stair to the helipad.
  "hosp-main": {
    long: "x",
    L: 98,
    D: 20,
    floors: 3,
    cores: [
      [2, -1],
      [11, -1, true],
    ],
    doors: [
      ["v+", 0],
      ["v-", 3.5],
      ["u-", 0],
      ["u+", 0],
      ["v-", -24.5],
    ],
    bridges: [
      ["v+", -40, 1],
      ["v+", 40, 2],
    ],
    open: [[0, 1, 5, 8]],
    canopies: [["v+", 0, 8, 3.4]],
    crosses: [
      ["v+", -24],
      ["v+", 24],
      ["v-", 0],
    ],
    helipad: [-14, 2],
    plant: [
      [-36, -4],
      [10, -6],
    ],
    kinds: (f, side, i) => {
      if (f === 0) {
        if (side === 1 && i >= 5 && i <= 8) return "lobby";
        if (side === -1 && i <= 1) return "morgue";
        return side === 1 ? "office" : i % 2 ? "storage" : "office";
      }
      return f === 1 ? (i % 4 === 3 ? "nurse" : "ward") : i % 3 === 0 ? "storage" : "office";
    },
  },
  // Emergency: the ambulance entrance and waiting hall, treatment bays; recovery above; the
  // roof terrace the east wing's bridge lands on.
  "hosp-er": {
    long: "x",
    L: 91,
    D: 20,
    floors: 2,
    cores: [
      [1, 1],
      [11, 1, true],
    ],
    doors: [
      ["v+", 0],
      ["v-", 0],
      ["u-", 0],
      ["u+", 0],
      ["v+", -21],
      ["v+", 21],
    ],
    bridges: [["v-", -40, 1]],
    roofGaps: [["v-", 40]],
    open: [[0, 1, 5, 7]],
    canopies: [
      ["v+", 0, 12, 7],
      ["v+", -21, 4, 2.4],
      ["v+", 21, 4, 2.4],
    ],
    crosses: [
      ["v+", -14],
      ["v+", 14],
    ],
    plant: [[-20, 2]],
    kinds: (f, side, i) => {
      if (f === 0) {
        if (side === 1 && i >= 5 && i <= 7) return "waiting";
        return side === 1 ? "trauma" : i % 3 === 0 ? "storage" : "treatment";
      }
      return i % 4 === 1 ? "nurse" : "ward";
    },
  },
};
export const BRIDGES = { "hosp-bridge-14": 14, "hosp-bridge-60": 60 };

const plan = { storey: STOREY, blocks: {} };
for (const [id, spec] of Object.entries(BLOCKS)) {
  const { kit, far, size, rooms, aprons } = block(spec);
  plan.blocks[id] = {
    long: spec.long,
    L: spec.L,
    D: spec.D,
    floors: spec.floors,
    corridor: CORR,
    aprons,
    cores: spec.cores.map(([i, side]) => ({ bay: i, side })),
    rooms,
  };
  await publish(id, kit, far, {
    tag: TAG,
    title: `Central Hospital: ${id.slice(5)} block`,
    source: "art/blender/br/build_hospital.mjs",
    use: "the mega hospital (2026-11-13): enterable block, rooms, stair cores, bridge openings",
    class: "building",
    ring: "building",
    glass: true,
    size,
  });
}
for (const [id, len] of Object.entries(BRIDGES)) {
  const { kit, far, size } = bridge(len);
  await publish(id, kit, far, {
    tag: TAG,
    title: `Central Hospital: sky bridge (${len} m)`,
    source: "art/blender/br/build_hospital.mjs",
    use: "the mega hospital's glazed sky bridges between its blocks",
    class: "structure",
    ring: "building",
    glass: true,
    size,
  });
}
fs.writeFileSync("src/lib/fps/br/hospital-plan.json", JSON.stringify(plan) + "\n");
console.log(
  Object.entries(plan.blocks)
    .map(([id, b]) => `${id}: ${b.rooms.length} rooms`)
    .join(", "),
);
