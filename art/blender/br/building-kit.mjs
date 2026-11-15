/**
 * Enterable buildings from a short spec (the 2026-11-15 locations upgrade, owner: "ensure new
 * buildings can be enterble/door/stairs. if you cant find that build your self in blender").
 * Built on the textured kit: walls with door and window holes, floors with a stair's well cut
 * out, a straight flight per storey (stacked in one footprint: the flight above covers the well,
 * so only the top floor's well needs a rail), partitions with doorways, flat or gable roofs, an
 * optional stair house onto a flat roof.
 *
 * Model space: metres, pivot at the bottom centre, front +z at turn 0. Outer walls x −w/2..w/2,
 * z −d/2..d/2.
 *
 * Spec:
 *   w, d          outer size (m)
 *   floors        storeys (1..6), fh storey height (3.0), base plinth (0.15), wt walls (0.25)
 *   wall          { m, tint } outer walls (material and colour), inner { m, tint } partitions
 *   floorM        floor finish material (wood), floorTint
 *   doors         [{ side: "front"|"back"|"left"|"right", at, w = 1.3, h = 2.3, floor = 0,
 *                   entrance = true }]  (`at`: along the side, x for front/back, z for left/right;
 *                   w 1.3: a door the bake hangs; wider: an open gateway, not an entrance)
 *   windows       { step = 3.2, w = 1.3, sill = 0.9, head = 2.2, sides = all, skip: [[side, a, b]] }
 *   extraHoles    [{ side, floor, a, b, y0, y1, glass }]  (y relative to the storey's floor)
 *   stair         { axis: "x"|"z", a0, a1, c0, c1 }  (rising from a0 to a1)
 *   roofAccess    true: the stair runs on to a flat roof, a stair house over it
 *   parts         [{ axis: "x"|"z", at, from, to, doors: [centre…], floors: [L…] }]
 *   roof          { type: "flat"|"gable", along: "x"|"z", pitch (rad), over (eave overhang),
 *                   m, tint, parapet (flat: height) }
 *   trim          tint of the door frames, sills and cornice
 *   bands         true: a cornice at every floor line
 */
import { createTexturedKit } from "./textured-kit.mjs";

const SLAB = 0.22;
const RISE_MAX = 0.19;

/**
 * Interior finishes (owner, 2026-11-15: "many houses looks the same in the interior. use
 * diffrent colors or design"): a wall colour over a lining inside the outer walls and on the
 * partitions, a skirting, a floor. Each building starts at its own `palette` index; each floor
 * steps three on, so no two storeys of a house match.
 */
export const PALETTES = [
  { wall: [0.98, 0.88, 0.66], floor: "wood", ft: [0.86, 0.68, 0.5] }, // cream, oak
  { wall: [0.5, 0.72, 0.52], floor: "wood", ft: [0.66, 0.5, 0.38] }, // sage, walnut
  { wall: [0.56, 0.72, 0.94], floor: "tiles", ft: [0.92, 0.92, 0.9] }, // sky blue, white tiles
  { wall: [1.0, 0.7, 0.5], floor: "wood", ft: [0.98, 0.82, 0.64] }, // peach, pine
  { wall: [0.86, 0.5, 0.5], floor: "wood", ft: [0.62, 0.42, 0.32] }, // dusty rose, cherry
  { wall: [0.97, 0.96, 0.92], floor: "floor", ft: [0.8, 0.78, 0.74] }, // white, stone floor
  { wall: [0.7, 0.6, 0.92], floor: "wood", ft: [0.8, 0.64, 0.5] }, // lavender, oak
  { wall: [1.0, 0.8, 0.32], floor: "tiles", ft: [0.86, 0.52, 0.38] }, // ochre, terracotta
  { wall: [0.4, 0.56, 0.74], floor: "wood", ft: [0.9, 0.78, 0.6] }, // slate blue, ash
  { wall: [0.78, 0.9, 0.56], floor: "floor", ft: [0.7, 0.68, 0.64] }, // pistachio, grey stone
];

export function makeBuilding(S) {
  const k = createTexturedKit();
  const far = createTexturedKit();
  const w = S.w,
    d = S.d;
  const X = w / 2,
    Z = d / 2;
  const n = S.floors ?? 1;
  const fh = S.fh ?? 3.0;
  const base = S.base ?? 0.15;
  const wt = S.wt ?? 0.25;
  const Y = (L) => base + L * fh;
  const wall = S.wall ?? { m: "paint", tint: [0.9, 0.88, 0.84] };
  const inner = S.inner ?? { m: "paint", tint: [0.92, 0.9, 0.86] };
  const trim = S.trim ?? [0.3, 0.3, 0.3];
  const IN = { x0: -X + wt, x1: X - wt, z0: -Z + wt, z1: Z - wt };
  const roof = S.roof ?? { type: "flat" };
  // The storey's finish: the building's own palette (or none: bare walls, a plain floor).
  const finish = (L) =>
    S.palette === undefined
      ? { wall: null, floor: S.floorM ?? "wood", ft: S.floorTint ?? [0.85, 0.75, 0.62] }
      : {
          ...PALETTES[(S.palette + L * 3) % PALETTES.length],
          // (One floor material per building, each storey its own shade: a material is a draw.)
          floor: PALETTES[S.palette % PALETTES.length].floor,
        };
  // The far LOD is tint only: the wall's texture's average colour times its tint.
  const AVG = {
    plaster: [0.72, 0.52, 0.45],
    rubble: [0.66, 0.58, 0.45],
    stone: [0.78, 0.75, 0.68],
    concrete: [0.74, 0.71, 0.65],
    metal: [0.7, 0.7, 0.7],
    wood: [0.5, 0.34, 0.22],
    paint: [1, 1, 1],
  };
  const farWall = (AVG[(S.wall ?? {}).m ?? "paint"] ?? [1, 1, 1]).map(
    (v, i) => v * ((S.wall ?? {}).tint ?? [0.9, 0.88, 0.84])[i],
  );
  const top = Y(n);

  // ---------------------------------------------------------------- walls
  /** Run of a wall along `axis` from a0 to a1 at cross c0..c1, with holes. */
  const run = (axis, a0, a1, c0, c1, y0, y1, holes, m, tint, opts = {}) => {
    const cuts = [a0, a1, ...holes.flatMap((h) => [h[0], h[1]])]
      .filter((v) => v >= a0 && v <= a1)
      .sort((p, q) => p - q);
    const B = (pa, ya, pb, yb) =>
      axis === "x" ? [pa, ya, c0, pb, yb, c1] : [c0, ya, pa, c1, yb, pb];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i],
        b = cuts[i + 1];
      if (b - a < 1e-3) continue;
      const mid = (a + b) / 2;
      const h = holes.find((q) => mid > q[0] && mid < q[1]);
      if (!h) k.box(B(a, y0, b, y1), m, tint, opts);
      else {
        if (h[2] > y0) k.box(B(a, y0, b, Math.min(h[2], y1)), m, tint, opts);
        if (h[3] < y1) k.box(B(a, Math.max(h[3], y0), b, y1), m, tint, opts);
        if (h[4]) {
          const c = (c0 + c1) / 2;
          k.box(
            axis === "x"
              ? [a, h[2], c - 0.03, b, h[3], c + 0.03]
              : [c - 0.03, h[2], a, c + 0.03, h[3], b],
            "glass",
            S.glassTint ?? [0.3, 0.4, 0.46],
            { lod: opts.lod ?? 1 },
          );
        }
      }
    }
  };
  /** The four sides: their axis, extent, cross range and outward normal. */
  const SIDES = {
    front: { axis: "x", a0: -X, a1: X, c0: Z - wt, c1: Z, out: [0, 0, 1] },
    back: { axis: "x", a0: -X, a1: X, c0: -Z, c1: -Z + wt, out: [0, 0, -1] },
    left: { axis: "z", a0: -Z + wt, a1: Z - wt, c0: -X, c1: -X + wt, out: [-1, 0, 0] },
    right: { axis: "z", a0: -Z + wt, a1: Z - wt, c0: X - wt, c1: X, out: [1, 0, 0] },
  };
  const doors = (S.doors ?? []).map((q) => ({ w: 1.3, h: 2.3, floor: 0, entrance: true, ...q }));
  const win = { step: 3.2, w: 1.3, sill: 0.9, head: 2.2, ...(S.windows ?? {}) };
  const winSides = win.sides ?? Object.keys(SIDES);
  const holesOf = (side, L) => {
    const s = SIDES[side];
    const y0 = Y(L);
    const out = [];
    for (const q of doors)
      if (q.side === side && q.floor === L)
        out.push([q.at - q.w / 2, q.at + q.w / 2, y0, y0 + q.h, false]);
    for (const h of S.extraHoles ?? [])
      if (h.side === side && h.floor === L)
        out.push([h.a, h.b, y0 + h.y0, y0 + h.y1, h.glass ?? true]);
    if (winSides.includes(side) && !(win.floors && !win.floors.includes(L))) {
      const len = s.a1 - s.a0;
      const cnt = Math.max(0, Math.floor((len - 1.0) / win.step));
      const mid = (s.a0 + s.a1) / 2;
      for (let i = 0; i < cnt; i++) {
        const c = mid + (i - (cnt - 1) / 2) * win.step;
        const a = c - win.w / 2,
          b = c + win.w / 2;
        if (a < s.a0 + 0.5 || b > s.a1 - 0.5) continue;
        if (out.some((h) => a < h[1] + 0.35 && b > h[0] - 0.35)) continue;
        if ((win.skip ?? []).some(([sd, p, q]) => sd === side && a < q && b > p)) continue;
        out.push([a, b, y0 + win.sill, y0 + win.head, true]);
      }
    }
    return out;
  };
  for (let L = 0; L < n; L++) {
    const y0 = Y(L),
      y1 = Y(L + 1);
    for (const [side, s] of Object.entries(SIDES)) {
      const holes = holesOf(side, L);
      run(s.axis, s.a0, s.a1, s.c0, s.c1, L === 0 ? 0 : y0, y1, holes, wall.m, wall.tint);
      // Sills and door frames (drawn only), proud of the wall's outside.
      const o = s.out;
      const face = o[0] + o[2] > 0 ? s.c1 : s.c0;
      const sgn = o[0] + o[2];
      for (const h of holes) {
        const pr = (p0, ya, p1, yb, depth) =>
          s.axis === "x"
            ? [p0, ya, face, p1, yb, face + sgn * depth]
            : [face, ya, p0, face + sgn * depth, yb, p1];
        if (h[4])
          k.box(pr(h[0] - 0.08, h[2] - 0.08, h[1] + 0.08, h[2], 0.1), "paint", trim, {
            collide: false,
          });
        else if (h[1] - h[0] < 2.0) {
          k.box(pr(h[0] - 0.1, h[2], h[0], h[3] + 0.1, 0.06), "paint", trim, { collide: false });
          k.box(pr(h[1], h[2], h[1] + 0.1, h[3] + 0.1, 0.06), "paint", trim, { collide: false });
          k.box(pr(h[0], h[3], h[1], h[3] + 0.1, 0.06), "paint", trim, { collide: false });
        }
      }
    }
  }
  // The rooms' wall colour: a lining 2 cm inside the outer walls (its holes the walls'), a
  // dark skirting along its foot.
  for (let L = 0; L < n; L++) {
    const f = finish(L);
    if (!f.wall) continue;
    const y0 = Y(L),
      y1 = Y(L + 1) - SLAB;
    const LN = {
      front: ["x", IN.x0, IN.x1, IN.z1 - 0.02, IN.z1, "z1"],
      back: ["x", IN.x0, IN.x1, IN.z0, IN.z0 + 0.02, "z0"],
      left: ["z", IN.z0, IN.z1, IN.x0, IN.x0 + 0.02, "x0"],
      right: ["z", IN.z0, IN.z1, IN.x1 - 0.02, IN.x1, "x1"],
    };
    for (const [side, [ax, a0, a1, c0, c1, back]] of Object.entries(LN)) {
      const holes = holesOf(side, L).map((h) => [h[0], h[1], h[2], h[3], false]);
      run(ax, a0, a1, c0, c1, y0, y1, holes, "paint", f.wall, {
        lod: 0,
        collide: false,
        skip: [back],
      });
      const sk = holes.filter((h) => h[2] <= y0 + 0.01);
      const d = back.endsWith("0") ? 0.03 : -0.03;
      run(
        ax,
        a0,
        a1,
        Math.min(c0, c0 + d),
        Math.max(c1, c1 + d),
        y0,
        y0 + 0.12,
        sk,
        "paint",
        [0.36, 0.26, 0.2],
        {
          lod: 0,
          collide: false,
          skip: [back],
        },
      );
    }
  }
  // Plinth and its finish.
  k.box([-X, 0, -Z, X, base, Z], "concrete", S.plinthTint ?? [0.6, 0.6, 0.58]);
  k.box([IN.x0, base - 0.02, IN.z0, IN.x1, base + 0.005, IN.z1], finish(0).floor, finish(0).ft, {
    lod: 0,
    collide: false,
    skip: ["bottom"],
  });
  if (S.bands)
    for (let L = 1; L < n; L++) {
      const y = Y(L) - 0.25;
      const o = 0.06;
      k.box([-X - o, y, Z, X + o, y + 0.2, Z + o], "paint", trim, { collide: false });
      k.box([-X - o, y, -Z - o, X + o, y + 0.2, -Z], "paint", trim, { collide: false });
      k.box([-X - o, y, -Z, -X, y + 0.2, Z], "paint", trim, { collide: false });
      k.box([X, y, -Z, X + o, y + 0.2, Z], "paint", trim, { collide: false });
    }

  // ---------------------------------------------------------------- stair and floors
  const st = S.stair;
  const flights = st ? n - 1 + (S.roofAccess ? 1 : 0) : 0;
  const well = st
    ? st.axis === "x"
      ? [
          Math.min(st.a0, st.a1),
          Math.min(st.c0, st.c1),
          Math.max(st.a0, st.a1),
          Math.max(st.c0, st.c1),
        ]
      : [
          Math.min(st.c0, st.c1),
          Math.min(st.a0, st.a1),
          Math.max(st.c0, st.c1),
          Math.max(st.a0, st.a1),
        ]
    : null; // [x0, z0, x1, z1]
  /** IN minus a rect, as up to four rects. */
  const minus = (r, h) => {
    if (!h) return [r];
    const [x0, z0, x1, z1] = r;
    const [hx0, hz0, hx1, hz1] = h;
    const out = [];
    if (hz0 > z0) out.push([x0, z0, x1, hz0]);
    if (hz1 < z1) out.push([x0, hz1, x1, z1]);
    if (hx0 > x0) out.push([x0, Math.max(z0, hz0), hx0, Math.min(z1, hz1)]);
    if (hx1 < x1) out.push([hx1, Math.max(z0, hz0), x1, Math.min(z1, hz1)]);
    return out.filter((q) => q[2] - q[0] > 1e-3 && q[3] - q[1] > 1e-3);
  };
  const ceiling = (x0, z0, x1, z1, y) =>
    k.quad(
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
      "paint",
      S.ceilingTint ?? [0.97, 0.96, 0.93],
      {
        lod: 0,
        n: [0, 1, 0],
        facing: [0, -1, 0],
      },
    );
  const inRect = [IN.x0, IN.z0, IN.x1, IN.z1];
  for (let L = 1; L <= n; L++) {
    const roofLevel = L === n;
    const cut = st && (roofLevel ? S.roofAccess : true) ? well : null;
    for (const [x0, z0, x1, z1] of minus(inRect, cut)) {
      if (roofLevel) {
        k.box(
          [x0, top - SLAB, z0, x1, top, z1],
          roof.type === "flat" ? "concrete" : "paint",
          roof.type === "flat" ? (roof.slabTint ?? [0.6, 0.6, 0.58]) : [0.9, 0.9, 0.88],
          { skip: ["bottom"] },
        );
      } else
        k.box([x0, Y(L) - SLAB, z0, x1, Y(L), z1], finish(L).floor, finish(L).ft, {
          lod: 0,
          skip: ["bottom"],
        });
      ceiling(x0, z0, x1, z1, Y(L) - SLAB - 0.02);
    }
  }
  if (st) {
    const steps = Math.ceil(fh / RISE_MAX);
    const dir = Math.sign(st.a1 - st.a0);
    for (let L = 0; L < flights; L++) {
      k.flight(
        st.axis,
        st.a0,
        st.a1,
        Math.min(st.c0, st.c1),
        Math.max(st.c0, st.c1),
        Y(L),
        fh,
        steps,
        "concrete",
        S.stairTint ?? [0.72, 0.7, 0.66],
      );
      // Nosings (drawn only).
      for (let s = 0; s < steps; s++) {
        const a = st.a0 + ((st.a1 - st.a0) * (s + 1)) / steps;
        const yy = Y(L) + (fh * (s + 1)) / steps;
        const lo = Math.min(a, a - dir * 0.04),
          hi = Math.max(a, a - dir * 0.04);
        k.box(
          st.axis === "x"
            ? [lo, yy - 0.01, Math.min(st.c0, st.c1), hi, yy + 0.004, Math.max(st.c0, st.c1)]
            : [Math.min(st.c0, st.c1), yy - 0.01, lo, Math.max(st.c0, st.c1), yy + 0.004, hi],
          "paint",
          [0.22, 0.22, 0.22],
          { lod: 0, collide: false },
        );
      }
    }
    // The top floor's well (no flight over it): a rail round its open edges, the exit (a1 end)
    // left open.
    const railL = S.roofAccess ? null : n - 1;
    if (railL !== null && railL > 0) {
      const y = Y(railL);
      const [x0, z0, x1, z1] = well;
      const edges = [
        ["z", x0, z0, z1],
        ["z", x1, z0, z1],
        ["x", z0, x0, x1],
        ["x", z1, x0, x1],
      ];
      for (const [ax, c, p0, p1] of edges) {
        // On an outer wall: no rail. At the exit end: none.
        const onWall =
          ax === "z"
            ? c <= IN.x0 + 0.05 || c >= IN.x1 - 0.05
            : c <= IN.z0 + 0.05 || c >= IN.z1 - 0.05;
        if (onWall) continue;
        const exit =
          st.axis === "x"
            ? ax === "z" && Math.abs(c - st.a1) < 1e-3
            : ax === "x" && Math.abs(c - st.a1) < 1e-3;
        if (exit) continue;
        k.box(
          ax === "z"
            ? [c - 0.04, y, p0, c + 0.04, y + 1.0, p1]
            : [p0, y, c - 0.04, p1, y + 1.0, c + 0.04],
          "paint",
          [0.2, 0.2, 0.22],
          { lod: 0 },
        );
      }
    }
    // Stair house onto a flat roof.
    if (S.roofAccess) {
      const [x0, z0, x1, z1] = well;
      const ext = 1.6; // landing beyond the exit
      let r = [x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2];
      const along = st.axis;
      if (along === "x") dir > 0 ? (r[2] += ext) : (r[0] -= ext);
      else dir > 0 ? (r[3] += ext) : (r[1] -= ext);
      r = [Math.max(r[0], -X), Math.max(r[1], -Z), Math.min(r[2], X), Math.min(r[3], Z)];
      const HY = top + 2.6;
      const [rx0, rz0, rx1, rz1] = r;
      let exitSide = along === "x" ? (dir > 0 ? "x1" : "x0") : dir > 0 ? "z1" : "z0";
      // The door in the end wall when there is room to walk out past it to the parapet (inner
      // face 0.22 m in from the walls); else in the side wall toward the roof's middle, on the
      // landing.
      const PI = 0.22;
      const endGap = { x0: rx0 + X - PI, x1: X - PI - rx1, z0: rz0 + Z - PI, z1: Z - PI - rz1 }[
        exitSide
      ];
      let doorAt = null;
      if (endGap < 1.2) {
        const landing =
          along === "x"
            ? dir > 0
              ? [st.a1, rx1 - 0.2]
              : [rx0 + 0.2, st.a1]
            : dir > 0
              ? [st.a1, rz1 - 0.2]
              : [rz0 + 0.2, st.a1];
        doorAt = (landing[0] + landing[1]) / 2;
        exitSide =
          along === "x" ? ((rz0 + rz1) / 2 < 0 ? "z1" : "z0") : (rx0 + rx1) / 2 < 0 ? "x1" : "x0";
      }
      const wallBox = (b) => k.box(b, wall.m, wall.tint);
      const door = (a0, a1) => {
        const c = doorAt ?? (a0 + a1) / 2;
        return [[c - 0.65, c + 0.65, top, top + 2.25, false]];
      };
      run(
        "x",
        rx0,
        rx1,
        rz1 - 0.2,
        rz1,
        top,
        HY,
        exitSide === "z1" ? door(rx0, rx1) : [],
        wall.m,
        wall.tint,
      );
      run(
        "x",
        rx0,
        rx1,
        rz0,
        rz0 + 0.2,
        top,
        HY,
        exitSide === "z0" ? door(rx0, rx1) : [],
        wall.m,
        wall.tint,
      );
      run(
        "z",
        rz0 + 0.2,
        rz1 - 0.2,
        rx0,
        rx0 + 0.2,
        top,
        HY,
        exitSide === "x0" ? door(rz0, rz1) : [],
        wall.m,
        wall.tint,
      );
      run(
        "z",
        rz0 + 0.2,
        rz1 - 0.2,
        rx1 - 0.2,
        rx1,
        top,
        HY,
        exitSide === "x1" ? door(rz0, rz1) : [],
        wall.m,
        wall.tint,
      );
      void wallBox;
      k.box(
        [rx0 - 0.1, HY, rz0 - 0.1, rx1 + 0.1, HY + 0.2, rz1 + 0.1],
        "concrete",
        [0.55, 0.55, 0.53],
        { skip: ["bottom"] },
      );
      ceiling(rx0 + 0.2, rz0 + 0.2, rx1 - 0.2, rz1 - 0.2, HY - 0.02);
      far.box([rx0, top, rz0, rx1, HY + 0.2, rz1], "paint", farWall, { collide: false });
    }
  }

  // ---------------------------------------------------------------- partitions
  for (const p of S.parts ?? []) {
    for (const L of p.floors ?? [...Array(n).keys()]) {
      const y0 = Y(L),
        y1 = Y(L + 1) - (L === n - 1 ? 0 : SLAB);
      const holes = (p.doors ?? []).map((c) => [c - 0.5, c + 0.5, y0, y0 + 2.15, false]);
      // (The partitions an accent: another palette's colour, so the rooms differ.)
      const pt =
        S.palette === undefined
          ? inner.tint
          : PALETTES[(S.palette + L * 3 + 5) % PALETTES.length].wall;
      if (p.axis === "x")
        run("x", p.from, p.to, p.at - 0.1, p.at + 0.1, y0, y1, holes, inner.m, pt, {
          lod: 0,
        });
      else
        run("z", p.from, p.to, p.at - 0.1, p.at + 0.1, y0, y1, holes, inner.m, pt, {
          lod: 0,
        });
    }
  }

  // ---------------------------------------------------------------- roof
  let height = top;
  if (roof.type === "flat") {
    const ph = roof.parapet ?? 0.9;
    const pt = 0.22;
    k.box([-X, top, -Z, X, top + ph, -Z + pt], wall.m, wall.tint);
    k.box([-X, top, Z - pt, X, top + ph, Z], wall.m, wall.tint);
    k.box([-X, top, -Z + pt, -X + pt, top + ph, Z - pt], wall.m, wall.tint);
    k.box([X - pt, top, -Z + pt, X, top + ph, Z - pt], wall.m, wall.tint);
    const c = roof.coping ?? trim;
    for (const b of [
      [-X - 0.04, -Z - 0.04, X + 0.04, -Z + pt + 0.02],
      [-X - 0.04, Z - pt - 0.02, X + 0.04, Z + 0.04],
      [-X - 0.04, -Z + pt + 0.02, -X + pt + 0.02, Z - pt - 0.02],
      [X - pt - 0.02, -Z + pt + 0.02, X + 0.04, Z - pt - 0.02],
    ])
      k.box([b[0], top + ph, b[1], b[2], top + ph + 0.08, b[3]], "concrete", c, {
        collide: false,
        skip: ["bottom"],
      });
    height = top + ph + 0.08;
    far.box([-X, 0, -Z, X, top + ph, Z], "paint", farWall, { collide: false });
  } else {
    // Gable: the ridge along `along`, eaves `over` beyond the walls.
    const along = roof.along ?? "x";
    const ov = roof.over ?? 0.45;
    const pitch = roof.pitch ?? 0.6;
    const half = (along === "x" ? Z : X) + ov; // eave to ridge (plan)
    const L2 = (along === "x" ? X : Z) + ov * 0.6; // half length along the ridge
    const gh0 = along === "x" ? Z : X;
    const rise = gh0 * Math.tan(pitch); // the slope meets the wall's top at its line
    const ridgeY = top + rise;
    const eaveY = top - ov * Math.tan(pitch);
    const rm = roof.m ?? "rooftile",
      rt = roof.tint ?? [1, 1, 1];
    const P = (a, c, y) => (along === "x" ? [a, y, c] : [c, y, a]);
    for (const s of [-1, 1]) {
      // Each slope, drawn up and (a ceiling-lit) down, 0.12 thick at its edge.
      const nrm =
        along === "x"
          ? [0, Math.cos(pitch), s * Math.sin(pitch)]
          : [s * Math.sin(pitch), Math.cos(pitch), 0];
      k.quad(
        P(-L2, s * half, eaveY),
        P(L2, s * half, eaveY),
        P(L2, 0, ridgeY),
        P(-L2, 0, ridgeY),
        rm,
        rt,
        { n: nrm, facing: nrm },
      );
      k.quad(
        P(-L2, s * half, eaveY - 0.12),
        P(L2, s * half, eaveY - 0.12),
        P(L2, 0, ridgeY - 0.12),
        P(-L2, 0, ridgeY - 0.12),
        "paint",
        [0.55, 0.45, 0.36],
        { n: [0, 1, 0], facing: [-nrm[0], -nrm[1], -nrm[2]] },
      );
      // The fascia along the eave.
      k.box(
        along === "x"
          ? [-L2, eaveY - 0.25, s * half - 0.04, L2, eaveY + 0.02, s * half + 0.04]
          : [s * half - 0.04, eaveY - 0.25, -L2, s * half + 0.04, eaveY + 0.02, L2],
        "paint",
        trim,
        { collide: false },
      );
      far.quad(
        P(-L2, s * half, eaveY),
        P(L2, s * half, eaveY),
        P(L2, 0, ridgeY),
        P(-L2, 0, ridgeY),
        "paint",
        roof.farTint ?? [0.55, 0.3, 0.22],
        { n: nrm, facing: nrm },
      );
      // The gable end over the end wall (both faces): a band up to the eaves' underside, then
      // the triangle to the ridge.
      const end = s * (along === "x" ? X : Z);
      const gh = along === "x" ? Z : X; // wall half width under the gable
      const ey = top + 0.001;
      const out = along === "x" ? [s, 0, 0] : [0, 0, s];
      const band = [P(end, -gh, top), P(end, gh, top), P(end, gh, ey), P(end, -gh, ey)];
      const tri = [
        P(end, -gh, ey),
        P(end, gh, ey),
        P(end, 0, ridgeY - 0.1),
        P(end, 0, ridgeY - 0.1),
      ];
      void band;
      for (const q of [tri]) {
        k.quad(...q, wall.m, wall.tint, { n: out, facing: out, both: true });
        far.quad(...q, "paint", farWall, { n: out, facing: out, both: true });
      }
      // Its collision: a stack of boxes inside the gable wall.
      const e0 = end - (s > 0 ? wt : 0),
        e1 = end + (s > 0 ? 0 : wt);
      for (let i = 0; i < 5; i++) {
        if (i === 0) continue;
        const hw = gh * (1 - (i - 1) / 4);
        const y0 = i === 0 ? top : ey + (ridgeY - 0.1 - ey) * ((i - 1) / 4);
        const y1 = i === 0 ? ey : ey + (ridgeY - 0.1 - ey) * (i / 4);
        k.solids.push(
          (along === "x" ? [e0, y0, -hw, e1, y1, hw] : [-hw, y0, e0, hw, y1, e1]).map(
            (v) => +v.toFixed(3),
          ),
        );
      }
    }
    // Ridge cap.
    k.box(
      along === "x"
        ? [-L2, ridgeY - 0.05, -0.14, L2, ridgeY + 0.08, 0.14]
        : [-0.14, ridgeY - 0.05, -L2, 0.14, ridgeY + 0.08, L2],
      "paint",
      roof.ridgeTint ?? [0.35, 0.25, 0.2],
      { collide: false },
    );
    // The roof's collision: nested boxes stepping up under the slopes (so nothing stands in
    // the air over them and players can stand on them).
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const hc = gh0 * (1 - i / steps);
      const y1 = ridgeY - hc * Math.tan(pitch) - 0.12;
      if (y1 <= top + 0.05) continue;
      k.solids.push(
        (along === "x" ? [-L2, top, -hc, L2, y1, hc] : [-hc, top, -L2, hc, y1, L2]).map(
          (v) => +v.toFixed(3),
        ),
      );
    }
    height = ridgeY + 0.08;
    far.box([-X, 0, -Z, X, top, Z], "paint", farWall, { collide: false });
  }
  // ---------------------------------------------------------------- mezzanines
  // { rect: [x0, z0, x1, z1], y, stair: { axis, a0, a1, c0, c1 } (rising from the floor to its
  // edge, arriving square to it at a1) }: a slab on posts, rails on its open edges.
  for (const M of S.mezz ?? []) {
    const [x0, z0, x1, z1] = M.rect;
    const y = M.y;
    k.box([x0, y - 0.2, z0, x1, y, z1], "concrete", M.tint ?? [0.66, 0.65, 0.62], {
      skip: ["bottom"],
    });
    ceiling(x0, z0, x1, z1, y - 0.22);
    const onWall = (ax, c) =>
      ax === "z" ? c <= IN.x0 + 0.05 || c >= IN.x1 - 0.05 : c <= IN.z0 + 0.05 || c >= IN.z1 - 0.05;
    const ms = M.stair;
    for (const [ax, c, p0, p1] of [
      ["z", x0, z0, z1],
      ["z", x1, z0, z1],
      ["x", z0, x0, x1],
      ["x", z1, x0, x1],
    ]) {
      if (onWall(ax, c)) continue;
      // The stair's arrival: a gap its width.
      const gap =
        ms && ms.axis !== ax && Math.abs(ms.a1 - c) < 0.3
          ? [Math.min(ms.c0, ms.c1), Math.max(ms.c0, ms.c1)]
          : null;
      const segs = gap
        ? [
            [p0, gap[0]],
            [gap[1], p1],
          ]
        : [[p0, p1]];
      for (const [q0, q1] of segs)
        if (q1 - q0 > 0.05)
          k.box(
            ax === "z"
              ? [c - 0.04, y, q0, c + 0.04, y + 1.0, q1]
              : [q0, y, c - 0.04, q1, y + 1.0, c + 0.04],
            "rust",
            [0.22, 0.22, 0.24],
          );
      // Posts under the open edge every 4 m.
      for (let p = p0; p <= p1 + 1e-3; p += Math.max(2, (p1 - p0) / Math.ceil((p1 - p0) / 4))) {
        const pp = Math.min(Math.max(p, p0 + 0.12), p1 - 0.12);
        k.box(
          ax === "z"
            ? [c - 0.12, base, pp - 0.12, c + 0.12, y - 0.2, pp + 0.12]
            : [pp - 0.12, base, c - 0.12, pp + 0.12, y - 0.2, c + 0.12],
          "rust",
          [0.3, 0.3, 0.32],
        );
      }
    }
    if (ms) {
      const steps = Math.ceil((y - base) / RISE_MAX);
      k.flight(
        ms.axis,
        ms.a0,
        ms.a1,
        Math.min(ms.c0, ms.c1),
        Math.max(ms.c0, ms.c1),
        base,
        y - base,
        steps,
        "rust",
        [0.42, 0.42, 0.44],
      );
      // Its handrails (both sides, drawn) and their collision (thin, 1 m over the treads).
      for (const c of [ms.c0, ms.c1])
        k.beam(
          ms.axis === "x" ? [ms.a0, base + 0.9, c] : [c, base + 0.9, ms.a0],
          ms.axis === "x" ? [ms.a1, y + 0.9, c] : [c, y + 0.9, ms.a1],
          0.05,
          0.05,
          "rust",
          [0.2, 0.2, 0.2],
        );
    }
  }
  S.extra?.({ k, far, Y, X, Z, IN, top, wall, trim, farWall });

  // Far LOD: the windows as dark bands.
  for (let L = 0; L < n; L++) {
    const y0 = Y(L);
    far.box([-X + 0.6, y0 + 0.9, Z, X - 0.6, y0 + 2.1, Z + 0.03], "paint", [0.25, 0.3, 0.34], {
      collide: false,
    });
    far.box([-X + 0.6, y0 + 0.9, -Z - 0.03, X - 0.6, y0 + 2.1, -Z], "paint", [0.25, 0.3, 0.34], {
      collide: false,
    });
  }

  const entrances = doors
    .filter((q) => q.entrance && q.w <= 1.4)
    .map((q) => {
      const s = SIDES[q.side];
      const c = +((s.c0 + s.c1) / 2).toFixed(3);
      return s.axis === "x"
        ? {
            x: q.at,
            z: c,
            y0: Y(q.floor),
            y1: +(Y(q.floor) + q.h).toFixed(3),
            along: "x",
            width: q.w,
          }
        : {
            x: c,
            z: q.at,
            y0: Y(q.floor),
            y1: +(Y(q.floor) + q.h).toFixed(3),
            along: "z",
            width: q.w,
          };
    });
  const ov = roof.type === "gable" ? (roof.over ?? 0.45) : 0.05;
  return {
    k,
    far,
    entrances,
    size: [+(w + 2 * ov).toFixed(2), +height.toFixed(2), +(d + 2 * ov).toFixed(2)],
    Y,
    X,
    Z,
    IN,
    top,
  };
}
