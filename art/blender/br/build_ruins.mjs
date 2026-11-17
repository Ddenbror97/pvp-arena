/**
 * Forgotten Ruins' Maya buildings (owner, 2026-11-17: "build the ruins your self? enterble
 * diffrent levels", "a very realistic jungle/maya location with fun buildings/tunnels"),
 * after the owner's reference: stepped temple pyramids, a palace with galleries, a tower,
 * corbel-vaulted rooms and tunnels, a ball court and an arch, all of weathered limestone
 * (make_ruins_textures.py) going green with moss on every ledge.
 *
 * Built of solid masses with their rooms, passages and tunnels carved out (`mass`): the faces
 * of what is left are the rooms' walls, and the Maya corbel vault is a stack of ever narrower
 * cuts. Every level is reached on foot: front stairs, inner stairs, doorways onto terraces.
 *
 *   node art/blender/br/build_ruins.mjs [id ...]
 *
 * Writes public/fps/br/models/<id>.<tag>.lod{0,1,2}.glb, the models.json entry and
 * art/br/procedural/<id>.boxes.json; footprints in src/lib/fps/br/location-buildings.json.
 */
import fs from "node:fs";
import { createTexturedKit, publishTextured } from "./textured-kit.mjs";

const TAG = "ruins-v1";
const only = process.argv.slice(2);
const PLAN = "src/lib/fps/br/location-buildings.json";
const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));

const STONE = "mayastone",
  MOSS = "mossstone",
  FLAG = "flagstone",
  GLYPH = "glyphs";
const WHITE = [1, 1, 1];
/** Far LOD tints (the textures' average colours). */
const FAR_STONE = [0.4, 0.39, 0.33],
  FAR_MOSS = [0.26, 0.33, 0.17];

/** Boxes are [x0, y0, z0, x1, y1, z1]. */
const overlaps = (a, b) =>
  a[0] < b[3] - 1e-6 &&
  b[0] < a[3] - 1e-6 &&
  a[1] < b[4] - 1e-6 &&
  b[1] < a[4] - 1e-6 &&
  a[2] < b[5] - 1e-6 &&
  b[2] < a[5] - 1e-6;
/** A box with the cuts taken out of it: the pieces that remain (axis-aligned). */
function carve(b, cuts) {
  let pieces = [b];
  for (const h of cuts) {
    const next = [];
    for (const p of pieces) {
      if (!overlaps(p, h)) {
        next.push(p);
        continue;
      }
      const rest = [...p];
      for (let a = 0; a < 3; a++) {
        if (rest[a] < h[a]) {
          const q = [...rest];
          q[a + 3] = h[a];
          next.push(q);
          rest[a] = h[a];
        }
        if (rest[a + 3] > h[a + 3]) {
          const q = [...rest];
          q[a] = h[a + 3];
          next.push(q);
          rest[a + 3] = h[a + 3];
        }
      }
    }
    pieces = next;
  }
  return merge(pieces);
}
/** Boxes that share a whole face joined into one (fewer faces, fewer collision boxes). */
function merge(list) {
  const out = list.map((b) => [...b]);
  const eq = (a, b) => Math.abs(a - b) < 1e-6;
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < out.length && !changed; i++)
      for (let j = i + 1; j < out.length && !changed; j++) {
        const p = out[i],
          q = out[j];
        for (let a = 0; a < 3 && !changed; a++) {
          const o = [0, 1, 2].filter((x) => x !== a);
          if (!o.every((x) => eq(p[x], q[x]) && eq(p[x + 3], q[x + 3]))) continue;
          if (eq(p[a + 3], q[a])) p[a + 3] = q[a + 3];
          else if (eq(q[a + 3], p[a])) p[a] = q[a];
          else continue;
          out.splice(j, 1);
          changed = true;
        }
      }
  }
  return out;
}

/**
 * A corbel-vaulted passage or room: x0..x1 × z0..z1 (the vault spans the narrower side), walls
 * straight up to `spring`, then `steps` courses each `cr` high closing in by `ci` a side.
 */
function vault(x0, z0, x1, z1, y0, spring, { steps = 3, cr = 0.38, ci = 0.32, cap = 0.5 } = {}) {
  const out = [[x0, y0, z0, x1, spring, z1]];
  const alongX = x1 - x0 >= z1 - z0;
  let a0 = alongX ? z0 : x0,
    a1 = alongX ? z1 : x1;
  let y = spring;
  for (let s = 0; s < steps; s++) {
    if (a1 - a0 - 2 * ci < cap) break;
    a0 += ci;
    a1 -= ci;
    out.push(alongX ? [x0, y, a0, x1, y + cr, a1] : [a0, y, z0, a1, y + cr, z1]);
    y += cr;
  }
  return out;
}

/**
 * The middle LOD (performance, owner 2026-11-17: "lagg optimizations as the other worlds
 * buildings"): "solid", each mass drawn uncut (the big monuments, their near LOD out to 220 m:
 * past that a doorway is a few pixels); "openings", only the cuts that open onto the outside
 * (arches, doors, windows as shallow niches; the houses, near LOD to 100 m). Rooms, galleries,
 * stairs inside, floors and rubble are the near LOD's alone.
 */
function kit(mid = "solid") {
  const k = createTexturedKit();
  const far = createTexturedKit();
  /**
   * A solid mass with `cuts` taken out: stone sides, a mossy top where `mossTop`, no bottom on
   * the ground. Collision is the pieces.
   */
  const draw = (b, pieces, m, top, tint, lod) => {
    for (const p of pieces) {
      const skip = [];
      if (p[1] <= 0.001) skip.push("bottom");
      // The top: mossy where it is the mass's top, plain where a cut's floor or ceiling.
      if (p[4] >= b[4] - 1e-6 && top !== m) {
        skip.push("top");
        k.quad(
          [p[0], p[4], p[2]],
          [p[0], p[4], p[5]],
          [p[3], p[4], p[5]],
          [p[3], p[4], p[2]],
          top,
          tint,
          { n: [0, 1, 0], lod },
        );
      }
      k.box(p, m, tint, { skip, lod, collide: lod === 0 });
    }
  };
  const mass = (
    b,
    cuts = [],
    { m = STONE, top = MOSS, tint = WHITE, farTint = FAR_STONE } = {},
  ) => {
    draw(b, carve(b, cuts), m, top, tint, 0);
    const e = 1e-6;
    const outer =
      mid === "solid"
        ? []
        : cuts.filter(
            (c) =>
              overlaps(b, c) &&
              (c[0] <= b[0] + e ||
                c[3] >= b[3] - e ||
                c[2] <= b[2] + e ||
                c[5] >= b[5] - e ||
                c[4] >= b[4] - e),
          );
    draw(b, carve(b, outer), m, top, tint, "mid");
    far.box(b, "paint", farTint, { collide: false });
  };
  /** A floor of flagstones (drawn, a thin collision slab under it). */
  const floor = (x0, z0, x1, z1, y = 0.04) => {
    k.quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], FLAG, WHITE, { n: [0, 1, 0], lod: 0 });
    k.box([x0, y - 0.3, z0, x1, y, z1], STONE, WHITE, { visible: false });
  };
  /**
   * A straight stair of solid steps (each from `base` up to its tread), along +z or −z (dir),
   * x0..x1 wide, from z `a` rising `rise` with risers `r` and treads `t`. Returns its end.
   */
  const stair = (x0, x1, a, dir, y, rise, { r = 0.25, t = 0.3, base = 0, m = STONE, lod = 1 } = {}) => {
    const n = Math.round(rise / r);
    const rr = rise / n;
    for (let s = 0; s < n; s++) {
      const za = a + dir * s * t,
        zb = a + dir * (s + 1) * t;
      const top = y + (s + 1) * rr;
      k.box(
        [x0, base, Math.min(za, zb), x1, top, Math.max(za, zb)],
        m,
        WHITE,
        { lod, ...(base <= 0.001 ? { skip: ["bottom"] } : {}) },
      );
    }
    return a + dir * n * t;
  };
  /** The same along x. */
  const stairX = (z0, z1, a, dir, y, rise, { r = 0.25, t = 0.3, base = 0, m = STONE } = {}) => {
    const n = Math.round(rise / r);
    const rr = rise / n;
    for (let s = 0; s < n; s++) {
      const xa = a + dir * s * t,
        xb = a + dir * (s + 1) * t;
      const top = y + (s + 1) * rr;
      k.box(
        [Math.min(xa, xb), base, z0, Math.max(xa, xb), top, z1],
        m,
        WHITE,
        base <= 0.001 ? { skip: ["bottom"] } : {},
      );
    }
    return a + dir * n * t;
  };
  /**
   * A sloped balustrade (alfarda) beside a stair along z: from (zFoot, yFoot) to (zTop, yTop),
   * x0..x1, `h` above the stair's line; drawn as slanted quads, solid as a staircase.
   */
  const alfarda = (x0, x1, zFoot, yFoot, zTop, yTop, h = 0.8) => {
    const A = [zFoot, yFoot + h],
      B = [zTop, yTop + h];
    for (const x of [x0, x1])
      k.quad([x, 0, zFoot], [x, A[1], zFoot], [x, B[1], zTop], [x, 0, zTop], STONE, WHITE, {
        n: [x === x0 ? -1 : 1, 0, 0],
      });
    k.quad([x0, A[1], zFoot], [x1, A[1], zFoot], [x1, B[1], zTop], [x0, B[1], zTop], MOSS, WHITE, {
      facing: [0, 1, Math.sign(zFoot - zTop)],
    });
    k.quad([x0, 0, zFoot], [x1, 0, zFoot], [x1, A[1], zFoot], [x0, A[1], zFoot], STONE, WHITE, {
      n: [0, 0, Math.sign(zFoot - zTop)],
    });
    const n = Math.max(1, Math.ceil(Math.abs(zTop - zFoot) / 0.6));
    for (let s = 0; s < n; s++) {
      const za = zFoot + ((zTop - zFoot) * s) / n,
        zb = zFoot + ((zTop - zFoot) * (s + 1)) / n;
      const y = yFoot + ((yTop - yFoot) * (s + 0.5)) / n + h;
      k.box([x0, 0, Math.min(za, zb), x1, y, Math.max(za, zb)], STONE, WHITE, { visible: false });
    }
  };
  /** A frieze band of carved glyphs round a box's sides (drawn only, 3 cm proud). */
  const frieze = (x0, z0, x1, z1, y0, y1) => {
    const e = 0.03;
    k.box([x0 - e, y0, z0 - e, x1 + e, y1, z1 + e], GLYPH, WHITE, {
      collide: false,
      skip: ["top", "bottom"],
    });
  };
  /** Fallen blocks: a few loose stones by a ruin (seeded). */
  const rubble = (cx, cz, r, count, seed, y0 = 0) => {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2,
        d = rnd() * r;
      const x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      const w = 0.5 + rnd() * 0.7,
        h = 0.3 + rnd() * 0.4,
        dd = 0.4 + rnd() * 0.5;
      k.box(
        [x - w / 2, y0, z - dd / 2, x + w / 2, y0 + h, z + dd / 2],
        rnd() < 0.5 ? STONE : MOSS,
        WHITE,
        {
          skip: ["bottom"],
        },
      );
    }
  };
  return { k, far, mass, floor, stair, stairX, alfarda, frieze, rubble };
}

/**
 * Weathering: chunks gone from a square tier's top edges (`count` per side, seeded), avoiding
 * the spans in `keep` ([a0, a1, side] along x on the side +1 = +z, −1 = −z).
 */
function erode(h, y0, y1, seed, count, keep = []) {
  let s = seed * 7919 + 13;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out = [];
  for (const [axis, side] of [
    ["x", 1],
    ["x", -1],
    ["z", 1],
    ["z", -1],
  ])
    for (let i = 0; i < count; i++) {
      const a = (rnd() * 2 - 1) * (h - 1.5),
        len = 0.8 + rnd() * 2.2,
        dep = 0.4 + rnd() * 0.7,
        dh = 0.4 + rnd() * Math.min(1.4, y1 - y0 - 0.6);
      if (
        axis === "x" &&
        keep.some(([k0, k1, sd]) => sd === side && a + len / 2 > k0 && a - len / 2 < k1)
      )
        continue;
      const e = side * h;
      out.push(
        axis === "x"
          ? [
              a - len / 2,
              y1 - dh,
              Math.min(e, e - side * dep),
              a + len / 2,
              y1 + 0.01,
              Math.max(e, e - side * dep),
            ]
          : [
              Math.min(e, e - side * dep),
              y1 - dh,
              a - len / 2,
              Math.max(e, e - side * dep),
              y1 + 0.01,
              a + len / 2,
            ],
      );
    }
  return out;
}

const publish = async (id, K, entry, foot) => {
  plan[id] = { foot, aprons: [] };
  if (only.length && !only.includes(id)) return;
  // Open doorways, never doors: the ruins' entrances are authored as none (add_models.mjs puts
  // them in collision.entrances, so door inference finds nothing to hang).
  fs.writeFileSync(`art/br/procedural/${id}.entrances.json`, "[]\n");
  await publishTextured(id, K.k, K.far, {
    tag: TAG,
    source: "art/blender/br/build_ruins.mjs",
    textures: "Original work (procedural): art/blender/br/make_ruins_textures.py",
    texture: 512,
    ...entry,
  });
};

// ---------------------------------------------------------------- the great pyramid
// Six tiers, a broad front stair with its balustrades up to the temple on top (three doorways,
// a vaulted room, a roof comb). Inside the base: a tunnel right through it west to east, the
// burial chamber in the middle, and an inner stair from the chamber up to a vaulted room on the
// second tier whose doorway opens onto the south terrace.
{
  const K = kit();
  const { k, mass, floor, stair, alfarda, frieze } = K;
  const TIERS = 6,
    TH = 3.2,
    B0 = 18,
    IN = 2.4;
  const half = (t) => B0 - IN * t;
  const topY = TIERS * TH; // 19.2
  // The cuts in the body.
  const tunnel = [...vault(-B0 - 0.5, -0.9, B0 + 0.5, 0.9, 0, 2.4)];
  const chamber = vault(-4, -4, 4, 4, 0, 3.2, { steps: 4, ci: 0.6, cr: 0.45 });
  // The inner stair: from the chamber's back wall (z −4) south, up a tier to the upper room.
  const SW = 0.9;
  const stairRise = 2 * TH; // 6.4
  const stairRun = Math.round(stairRise / 0.25) * 0.3; // 7.68
  const shaft = [[-SW, 0, -4 - stairRun - 0.01, SW, stairRise + 2.4, -3.9]];
  const upper = vault(-3, -13.6, 3, -4 - stairRun + 0.3, stairRise, stairRise + 2.6, {
    steps: 3,
    ci: 0.5,
  });
  const upperDoor = [[-0.8, stairRise, -half(2) - 0.5, 0.8, stairRise + 2.3, -13.5]];
  const cuts = [...tunnel, ...chamber, ...shaft, ...upper, ...upperDoor];
  for (let t = 0; t < TIERS; t++) {
    const h = half(t);
    // The core plain, the crown (its top 1.6 m) weathered: chunks gone from its edges.
    const crown = (t + 1) * TH - 1.6;
    mass([-h, t * TH, -h, h, crown, h], cuts, { top: STONE });
    mass(
      [-h, crown, -h, h, (t + 1) * TH, h],
      [...cuts, ...erode(h, crown, (t + 1) * TH, 100 + t, t < TIERS - 1 ? 4 : 2, [[-5.7, 5.7, 1]])],
    );
    // A projecting moulding along each tier's top edge.
    K.k.box(
      [-h - 0.12, (t + 1) * TH - 0.35, -h - 0.12, h + 0.12, (t + 1) * TH - 0.05, h + 0.12],
      STONE,
      WHITE,
      {
        collide: false,
        skip: ["top"],
      },
    );
  }
  floor(-B0, -0.9, B0, 0.9);
  floor(-4, -4, 4, 4);
  // The inner stair, up from the chamber floor.
  stair(-SW, SW, -4, -1, 0, stairRise, { r: 0.25, t: 0.3, lod: 0 });
  floor(-3, -13.6, 3, -4 - stairRun + 0.3, stairRise + 0.04);
  // A sarcophagus in the chamber, a stone bench round it.
  k.box([-1.1, 0, -0.6, 1.1, 1.0, 0.6], GLYPH, WHITE, { skip: ["bottom"], lod: 0 });
  k.box([-1.25, 1.0, -0.75, 1.25, 1.18, 0.75], MOSS, WHITE, { lod: 0 });
  for (const [x0, x1] of [
    [-4, -3.4],
    [3.4, 4],
  ])
    for (const [z0, z1] of [
      [-3.4, -1.3],
      [1.3, 3.4],
    ])
      k.box([x0, 0, z0, x1, 0.5, z1], STONE, WHITE, { skip: ["bottom"], lod: 0 });
  // The front stair (+z): 9 m wide from the ground to the top platform's edge, balustrades.
  const zTop = half(TIERS - 1); // 6
  const steps = Math.round(topY / 0.3);
  const run = steps * 0.3;
  const zFoot = zTop + run;
  for (let s = 0; s < steps; s++) {
    const z1 = zFoot - s * 0.3,
      z0 = z1 - 0.3;
    k.box([-4.5, 0, z0, 4.5, (s + 1) * (topY / steps), z1], STONE, WHITE, { skip: ["bottom"] });
  }
  for (const [x0, x1] of [
    [-5.6, -4.5],
    [4.5, 5.6],
  ])
    alfarda(x0, x1, zFoot, 0, zTop, topY, 0.7);
  // The temple on top: walls round a vaulted room, three doorways to the front, a frieze, the
  // roof comb over the back wall.
  const T0 = topY,
    WALL = 4.0,
    TX = 5,
    TZ0 = -5,
    TZ1 = 3.5;
  const room = vault(-3.8, -3.8, 3.8, 2.3, T0, T0 + 2.6, { steps: 3, ci: 0.55, cr: 0.4 });
  const doors = [-2.7, 0, 2.7].map((x) => [x - 0.6, T0, 2.2, x + 0.6, T0 + 2.4, TZ1 + 0.1]);
  mass([-TX, T0, TZ0, TX, T0 + WALL + 0.6, TZ1], [...room, ...doors]);
  frieze(-TX, TZ0, TX, TZ1, T0 + WALL - 0.5, T0 + WALL + 0.4);
  floor(-3.8, -3.8, 3.8, 2.3, T0 + 0.04);
  // The roof comb: a pierced crest over the back wall.
  const comb = [];
  for (const x of [-2.8, -0.9, 1.0, 2.9])
    comb.push([x - 0.45, T0 + WALL + 1.4, -5, x + 0.45, T0 + WALL + 2.8, -3]);
  mass([-4, T0 + WALL + 0.6, -4.6, 4, T0 + WALL + 4.4, -3.6], comb, { top: MOSS });
  K.frieze(-4, -4.6, 4, -3.6, T0 + WALL + 3.4, T0 + WALL + 4.2);
  K.rubble(12, 22, 6, 9, 11);
  K.rubble(-20, -8, 5, 7, 12);
  await publish(
    "ruin-pyramid",
    K,
    {
      title: "Great pyramid (Maya temple)",
      use: "Forgotten Ruins: the great pyramid, six tiers, the temple on top, a tunnel through its base, the burial chamber and an inner stair to the south terrace (procedural, 2026-11-17)",
      class: "building",
      ring: "building",
      size: [2 * B0 + 1, T0 + WALL + 4.4, zFoot + B0],
    },
    [2 * B0 + 1, 2 * zFoot],
  );
}

// ---------------------------------------------------------------- small temples
/**
 * A small stepped temple: `tiers` tiers of `th` on a `bx` × `bz` base, each set in by `inset`,
 * a front stair `sw` wide, a temple of `rooms` on top (three doorways, a vaulted room) or, when
 * `ruined`, its walls broken off with the vault fallen in.
 */
function smallTemple({ tiers, th, bx, bz, inset, sw, ruined, seed, comb }) {
  const K = kit();
  const { k, mass, floor, alfarda, frieze } = K;
  const hx = (t) => bx / 2 - inset * t,
    hz = (t) => bz / 2 - inset * t;
  const topY = tiers * th;
  for (let t = 0; t < tiers; t++) {
    const crown = (t + 1) * th - Math.min(1.2, th * 0.5);
    mass([-hx(t), t * th, -hz(t), hx(t), crown, hz(t)], [], { top: STONE });
    mass(
      [-hx(t), crown, -hz(t), hx(t), (t + 1) * th, hz(t)],
      erode(Math.min(hx(t), hz(t)), crown, (t + 1) * th, seed + t, 2, [
        [-sw / 2 - 1.2, sw / 2 + 1.2, 1],
      ]),
    );
  }
  // The front stair over the tiers' fronts.
  const zTop = hz(tiers - 1);
  const steps = Math.round(topY / 0.28);
  const zFoot = zTop + steps * 0.3;
  for (let s = 0; s < steps; s++) {
    const z1 = zFoot - s * 0.3;
    k.box([-sw / 2, 0, z1 - 0.3, sw / 2, ((s + 1) * topY) / steps, z1], STONE, WHITE, {
      skip: ["bottom"],
    });
  }
  for (const [x0, x1] of [
    [-sw / 2 - 0.9, -sw / 2],
    [sw / 2, sw / 2 + 0.9],
  ])
    alfarda(x0, x1, zFoot, 0, zTop, topY, 0.6);
  // The temple.
  const TX = hx(tiers - 1) - 0.8,
    TZ0 = -hz(tiers - 1) + 0.8,
    TZ1 = hz(tiers - 1) - 1.6;
  const H = 3.6;
  const room = vault(-TX + 0.9, TZ0 + 0.9, TX - 0.9, TZ1 - 0.9, topY, topY + 2.5, {
    steps: 3,
    ci: 0.45,
  });
  const doors = (TX > 3.5 ? [-2.4, 0, 2.4] : [0]).map((x) => [
    x - 0.6,
    topY,
    TZ1 - 1.0,
    x + 0.6,
    topY + 2.3,
    TZ1 + 0.1,
  ]);
  const broken = [];
  if (ruined) {
    // The vault fallen in, the walls broken off at different heights.
    broken.push([-TX - 1, topY + 2.2, TZ0 - 1, TX + 1, topY + H + 1, TZ1 + 1]);
    broken.push(...erode(Math.max(TX, (TZ1 - TZ0) / 2), topY + 0.9, topY + 2.2, seed + 50, 3));
  }
  mass([-TX, topY, TZ0, TX, topY + H, TZ1], [...room, ...doors, ...broken]);
  if (!ruined) frieze(-TX, TZ0, TX, TZ1, topY + H - 0.9, topY + H - 0.1);
  floor(-TX + 0.9, TZ0 + 0.9, TX - 0.9, TZ1 - 0.9, topY + 0.04);
  if (comb && !ruined) {
    const holes = [];
    for (let x = -TX + 1.6; x < TX - 1.2; x += 1.8)
      holes.push([x - 0.4, topY + H + 0.9, TZ0 - 1, x + 0.4, topY + H + 2.1, TZ0 + 2]);
    mass([-TX + 0.8, topY + H, TZ0 + 0.3, TX - 0.8, topY + H + 3.2, TZ0 + 1.1], holes);
  }
  K.rubble(bx / 2 + 1, 0, 3, 6, seed + 70);
  if (ruined) K.rubble(0, (TZ0 + TZ1) / 2, 2.2, 8, seed + 71, topY);
  return {
    K,
    size: [bx + 1, topY + H + (comb ? 3.2 : 0), zFoot + bz / 2],
    foot: [bx + 2.8, 2 * zFoot],
  };
}
{
  const t = smallTemple({
    tiers: 4,
    th: 2.4,
    bx: 20,
    bz: 18,
    inset: 1.8,
    sw: 5,
    seed: 300,
    comb: true,
  });
  await publish(
    "ruin-temple-a",
    t.K,
    {
      title: "Maya temple (roof comb)",
      use: "Forgotten Ruins: a four-tier temple, its front stair, a vaulted room with three doorways and a pierced roof comb (procedural, 2026-11-17)",
      class: "building",
      ring: "building",
      size: t.size,
    },
    t.foot,
  );
}
{
  const t = smallTemple({
    tiers: 3,
    th: 2.2,
    bx: 16,
    bz: 14,
    inset: 1.6,
    sw: 4,
    seed: 400,
    ruined: true,
  });
  await publish(
    "ruin-temple-b",
    t.K,
    {
      title: "Maya temple (fallen)",
      use: "Forgotten Ruins: a three-tier temple whose vault has fallen in, broken walls on top (procedural, 2026-11-17)",
      class: "building",
      ring: "building",
      size: t.size,
    },
    t.foot,
  );
}

// ---------------------------------------------------------------- the palace
// On a platform with a broad front stair: a long gallery of piers before five vaulted rooms,
// an inner stair in the east room up to the roof terrace, the upper gallery on the back half
// (its piers facing the terrace), and an outer stair at the west end up onto its roof.
{
  const K = kit();
  const { k, mass, floor, stair, frieze } = K;
  const PX = 27,
    PZ0 = -11,
    PZ1 = 11,
    PH = 2.4;
  mass([-PX, 0, PZ0, PX, PH, PZ1], erode(11, PH - 1.0, PH, 500, 3, [[-8.5, 8.5, 1]]), {
    top: FLAG,
  });
  // The platform's front stair.
  const fs_ = Math.round(PH / 0.3);
  for (let s = 0; s < fs_; s++) {
    const z1 = PZ1 + (fs_ - s) * 0.4;
    k.box([-8, 0, z1 - 0.4, 8, ((s + 1) * PH) / fs_, z1], STONE, WHITE, { skip: ["bottom"] });
  }
  // Ground storey: x ±24, z −9..5, from the platform up 4.8, its roof 0.5 more.
  const GX = 24,
    GZ0 = -9,
    GZ1 = 5,
    G0 = PH,
    G1 = PH + 4.8,
    R1 = G1 + 0.5;
  const gallery = vault(-GX + 0.8, 1.4, GX - 0.8, GZ1 - 0.6, G0, G0 + 3.0, { steps: 3, ci: 0.4 });
  const openings = [];
  const nOpen = 9,
    pier = 1.5;
  const span = (2 * (GX - 0.8) - (nOpen + 1) * pier) / nOpen;
  for (let i = 0; i < nOpen; i++) {
    const x0 = -GX + 0.8 + pier + i * (span + pier);
    openings.push([x0, G0, GZ1 - 0.8, x0 + span, G0 + 3.0, GZ1 + 0.2]);
  }
  const rooms = [],
    doors = [];
  const nRooms = 5,
    rw = (2 * (GX - 0.8) - (nRooms - 1) * 0.9) / nRooms;
  for (let i = 0; i < nRooms; i++) {
    const x0 = -GX + 0.8 + i * (rw + 0.9);
    rooms.push(...vault(x0, GZ0 + 0.8, x0 + rw, 0.6, G0, G0 + 3.0, { steps: 3, ci: 0.45 }));
    doors.push([x0 + rw / 2 - 0.75, G0, 0.4, x0 + rw / 2 + 0.75, G0 + 2.4, 1.6]);
  }
  // The inner stair: in the east room, along −z from its front, up through the roof.
  const ex0 = -GX + 0.8 + 4 * (rw + 0.9),
    ex1 = ex0 + rw;
  const sx0 = ex1 - 1.8,
    sx1 = ex1 - 0.2;
  const rise = R1 - G0;
  const sRun = Math.round(rise / 0.25) * 0.3;
  // (Its foot 1.2 m off the front wall: room to step onto it.)
  const S0 = -0.8;
  const well = [[sx0, G0 + 2.0, S0 - sRun - 0.01, sx1, R1 + 0.1, S0 + 0.01]];
  // A side door to the west room too, from the platform's west end.
  doors.push([-GX - 0.1, G0, -4.8, -GX + 0.9, G0 + 2.4, -3.2]);
  mass([-GX, G0, GZ0, GX, R1, GZ1], [...gallery, ...openings, ...rooms, ...doors, ...well]);
  frieze(-GX, GZ0, GX, GZ1, G1 - 1.0, G1 - 0.1);
  floor(-GX + 0.8, 1.4, GX - 0.8, GZ1 - 0.6, G0 + 0.04);
  for (let i = 0; i < nRooms; i++) {
    const x0 = -GX + 0.8 + i * (rw + 0.9);
    floor(x0, GZ0 + 0.8, x0 + rw, 0.6, G0 + 0.04);
  }
  stair(sx0, sx1, S0, -1, G0, rise, { r: 0.25, t: 0.3, base: G0, lod: 0 });
  // The roof terrace's parapet along the front, with gaps.
  for (const [a, b] of [
    [-GX, -8],
    [-5, 5],
    [8, GX],
  ])
    mass([a, R1, GZ1 - 0.5, b, R1 + 0.7, GZ1], [], { top: MOSS });
  // Upper storey: the back half, x −20..14 (the east end left open for the stair's head).
  const UX0 = -20,
    UX1 = 14,
    UZ0 = -9,
    UZ1 = -2,
    U1 = R1 + 4.0,
    UR = U1 + 0.5;
  const ugal = vault(UX0 + 0.8, UZ0 + 0.8, UX1 - 0.8, UZ1 - 0.7, R1, R1 + 2.6, {
    steps: 3,
    ci: 0.45,
  });
  const uopen = [];
  for (let x = UX0 + 2.6; x < UX1 - 2; x += 4.2)
    uopen.push([x, R1, UZ1 - 0.9, x + 2.4, R1 + 2.6, UZ1 + 0.1]);
  // Its west end broken: part of the vault fallen.
  const ubroken = [[UX0 - 0.1, R1 + 2.2, UZ0 - 0.1, UX0 + 7, UR + 0.1, UZ1 + 0.1]];
  mass([UX0, R1, UZ0, UX1, UR, UZ1], [...ugal, ...uopen, ...ubroken]);
  frieze(UX0 + 7, UZ0, UX1, UZ1, U1 - 0.8, U1 - 0.1);
  floor(UX0 + 0.8, UZ0 + 0.8, UX1 - 0.8, UZ1 - 0.7, R1 + 0.04);
  // The outer stair at the west end, from the terrace up onto the upper roof.
  stair(UX0 - 1.7, UX0, 3.6, -1, R1, UR - R1, { r: 0.25, t: 0.3, base: R1 });
  K.rubble(UX0 + 3, -5.5, 2.5, 10, 510, R1);
  K.rubble(-PX - 2, 6, 3, 7, 511);
  K.rubble(PX + 1.5, -6, 3, 7, 512);
  await publish(
    "ruin-palace",
    K,
    {
      title: "Maya palace",
      use: "Forgotten Ruins: the palace on its platform, a gallery of piers before five vaulted rooms, an inner stair to the roof terrace, the upper gallery and its roof (procedural, 2026-11-17)",
      class: "building",
      ring: "building",
      size: [2 * PX + 3, UR, PZ1 + fs_ * 0.4 - PZ0],
    },
    [2 * PX + 3, 2 * (PZ1 + fs_ * 0.4)],
  );
}

// ---------------------------------------------------------------- the tower
// Palenque's observation tower: four storeys with T-shaped windows on every side, a stair up
// each storey (alternating sides), the roof open behind a parapet.
{
  const K = kit();
  const { k, mass, floor, stair } = K;
  const X = 4.2,
    S = 3.3,
    N = 4,
    SL = 0.4,
    W = 0.7;
  const top = N * S;
  const cuts = [];
  for (let s = 0; s < N; s++) {
    const y0 = s * S,
      y1 = (s + 1) * S - SL;
    cuts.push(...vault(-X + W, -X + W, X - W, X - W, y0, y1 - 0.01, { steps: 0 }));
    // T windows on all four sides (not the ground floor's front: the door).
    for (const [ax, sd] of [
      ["z", 1],
      ["z", -1],
      ["x", 1],
      ["x", -1],
    ]) {
      if (s === 0 && ax === "z" && sd === 1) continue;
      const e = sd * X;
      const bar = [-0.9, y0 + 1.75, 0.9, y0 + 2.2],
        stem = [-0.35, y0 + 0.8, 0.35, y0 + 1.8];
      for (const [a0, b0, a1, b1] of [bar, stem])
        cuts.push(
          ax === "z"
            ? [a0, b0, Math.min(e, e - sd * (W + 0.1)), a1, b1, Math.max(e, e - sd * (W + 0.1))]
            : [Math.min(e, e - sd * (W + 0.1)), b0, a0, Math.max(e, e - sd * (W + 0.1)), b1, a1],
        );
    }
    // The well for the stair up from this storey.
    const even = s % 2 === 0;
    const run = Math.round(S / 0.25) * 0.3;
    const xa = even ? -X + W : X - W - 1.3,
      xb = xa + 1.3;
    const za = even ? -1.7 : 1.7 - run,
      zb = za + run;
    cuts.push([xa, y1 - 0.02, za - 0.01, xb, (s + 1) * S + 0.01, zb + 0.01]);
  }
  cuts.push([-0.8, 0, X - W - 0.1, 0.8, 2.4, X + 0.1]);
  mass([-X, 0, -X, X, top, X], cuts, { top: FLAG });
  // The parapet round the roof.
  for (const [a, b, c, d] of [
    [-X, -X, X, -X + 0.4],
    [-X, X - 0.4, X, X],
    [-X, -X + 0.4, -X + 0.4, X - 0.4],
    [X - 0.4, -X + 0.4, X, X - 0.4],
  ])
    mass([a, top, b, c, top + 1.0, d], [], { top: MOSS });
  // A crest on the roof (the tower's little temple roof).
  for (let s = 0; s < N; s++) {
    const y0 = s * S;
    // The floor, less the well of the stair up from the storey below.
    const below = s > 0 && (s - 1) % 2 === 0;
    const runB = Math.round(S / 0.25) * 0.3;
    const wx = below ? -X + W : X - W - 1.3,
      wz = below ? -1.7 : 1.7 - runB;
    for (const p of s === 0
      ? [[-X + W, 0, -X + W, X - W, 1, X - W]]
      : carve([-X + W, 0, -X + W, X - W, 1, X - W], [[wx, -1, wz - 0.01, wx + 1.3, 2, wz + runB + 0.01]]))
      floor(p[0], p[2], p[3], p[5], y0 + 0.04);
    const even = s % 2 === 0;
    const run = Math.round(S / 0.25) * 0.3;
    const xa = even ? -X + W : X - W - 1.3;
    stair(xa, xa + 1.3, even ? -1.7 : 1.7, even ? 1 : -1, y0, S, {
      r: 0.25,
      t: 0.3,
      base: y0,
      lod: 0,
    });
    // A rail round the well's open sides on the floor above (a low wall).
    const za = even ? -1.7 : 1.7 - run;
    const yA = (s + 1) * S;
    if (s < N - 1)
      k.box(
        even
          ? [xa + 1.3, yA, za, xa + 1.45, yA + 1.0, za + run - 1.0]
          : [xa - 0.15, yA, za + 1.0, xa, yA + 1.0, za + run],
        STONE,
        WHITE,
      );
  }
  K.rubble(5.5, 3, 2, 6, 610);
  await publish(
    "ruin-tower",
    K,
    {
      title: "Maya tower",
      use: "Forgotten Ruins: the observation tower, four storeys with T windows, a stair up each, the roof behind a parapet (procedural, 2026-11-17)",
      class: "building",
      ring: "building",
      size: [2 * X + 1, top + 1, 2 * X + 1],
    },
    [2 * X + 1, 2 * X + 1],
  );
}

// ---------------------------------------------------------------- the arch
// A corbel-arched gateway (Labná) through a block with a glyph frieze, broken walls each side.
{
  const K = kit();
  const { mass, floor, frieze } = K;
  const pass = vault(-1.6, -2.4, 1.6, 2.4, 0, 3.4, { steps: 5, ci: 0.28, cr: 0.36, cap: 0.4 });
  mass([-6, 0, -2, 6, 7.4, 2], [...pass, ...erode(2, 6.6, 7.4, 700, 2)]);
  frieze(-6, -2, 6, 2, 5.4, 6.4);
  floor(-1.6, -2, 1.6, 2);
  for (const [x0, x1, h, sd] of [
    [-14, -6, 3.2, 701],
    [6, 13, 2.6, 702],
  ])
    mass(
      [x0, 0, -0.6, x1, h, 0.6],
      erode(Math.abs(x1 - x0) / 2, h - 1.4, h, sd, 3).map((b) => {
        const c = (x0 + x1) / 2;
        return [b[0] + c, b[1], b[2], b[3] + c, b[4], b[5]];
      }),
    );
  K.rubble(-10, 2.5, 2.5, 8, 703);
  K.rubble(9, -2.5, 2, 6, 704);
  await publish(
    "ruin-arch",
    K,
    {
      title: "Maya arch",
      use: "Forgotten Ruins: a corbel-arched gateway with a glyph frieze, broken walls each side (procedural, 2026-11-17)",
      class: "structure",
      ring: "building",
      size: [27, 7.4, 4],
    },
    [27, 4],
  );
}

// ---------------------------------------------------------------- the ball court
// Two long banks either side of the playing alley: a bench, a sloped face up to the bank's top,
// a wall in the middle of each with its stone ring, stairs up the back.
{
  const K = kit();
  const { k, mass, stairX } = K;
  const L = 17,
    A = 5,
    BENCH = 1.0,
    SL0 = 6.2,
    SL1 = 8.4,
    TOP = 4.0,
    BACK = 13;
  for (const sd of [-1, 1]) {
    const X = (v) => sd * v;
    const lo = (a, b) => Math.min(X(a), X(b)),
      hi = (a, b) => Math.max(X(a), X(b));
    mass([lo(A, SL0), 0, -L, hi(A, SL0), BENCH, L], [], { top: STONE });
    // The slope: drawn as one slanted face, solid as a staircase inside it.
    k.quad(
      [X(SL0), BENCH, -L],
      [X(SL0), BENCH, L],
      [X(SL1), TOP, L],
      [X(SL1), TOP, -L],
      STONE,
      WHITE,
      {
        facing: [-sd, 0.6, 0],
      },
    );
    for (const z of [-L, L])
      k.quad(
        [X(SL0), BENCH, z],
        [X(SL1), BENCH, z],
        [X(SL1), TOP, z],
        [X(SL1), TOP, z],
        STONE,
        WHITE,
        {
          n: [0, 0, Math.sign(z)],
        },
      );
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = SL0 + ((SL1 - SL0) * i) / n,
        b = SL0 + ((SL1 - SL0) * (i + 1)) / n;
      k.box(
        [lo(a, b), BENCH, -L, hi(a, b), BENCH + ((TOP - BENCH) * (i + 1)) / n, L],
        STONE,
        WHITE,
        {
          visible: false,
        },
      );
    }
    k.box([lo(SL0, SL1), 0, -L, hi(SL0, SL1), BENCH, L], STONE, WHITE, { skip: ["bottom", "top"] });
    mass([lo(SL1, BACK), 0, -L, hi(SL1, BACK), TOP, L], erode(L, TOP - 0.8, TOP, 800 + sd, 0), {});
    // The wall with its ring, in the middle.
    mass([lo(SL1, SL1 + 0.8), TOP, -5, hi(SL1, SL1 + 0.8), TOP + 3.2, 5]);
    const ry = TOP + 2.0,
      rr = 0.75;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2,
        b = ((i + 1) / 10) * Math.PI * 2;
      const za = Math.cos(a) * rr,
        ya = Math.sin(a) * rr,
        zb = Math.cos(b) * rr,
        yb = Math.sin(b) * rr;
      k.box(
        [
          lo(SL1 - 0.25, SL1),
          ry + Math.min(ya, yb) - 0.09,
          Math.min(za, zb) - 0.09,
          hi(SL1 - 0.25, SL1),
          ry + Math.max(ya, yb) + 0.09,
          Math.max(za, zb) + 0.09,
        ],
        GLYPH,
        WHITE,
        { collide: false },
      );
    }
    // Stairs up the back.
    stairX(-3, 3, X(BACK + Math.round(TOP / 0.25) * 0.3), -sd, 0, TOP, { r: 0.25, t: 0.3 });
  }
  K.k.quad([-A, 0.03, -L], [-A, 0.03, L], [A, 0.03, L], [A, 0.03, -L], FLAG, WHITE, {
    n: [0, 1, 0],
  });
  K.rubble(0, L + 2, 4, 8, 820);
  const W = 2 * (BACK + Math.round(TOP / 0.25) * 0.3);
  await publish(
    "ruin-ballcourt",
    K,
    {
      title: "Maya ball court",
      use: "Forgotten Ruins: the ball court, two banks with sloped faces and stone rings either side of the alley, stairs up their backs (procedural, 2026-11-17)",
      class: "structure",
      ring: "building",
      size: [W, TOP + 3.2, 2 * L],
    },
    [W, 2 * L],
  );
}

// ---------------------------------------------------------------- the acropolis and its tunnels
// A raised platform: a grand stair up its front, broken rooms and an altar on top; inside, a
// tunnel through it west to east, two cross tunnels (one out the front, one out the back),
// vaulted chambers where they meet, and a stair from the east chamber up into an open shaft on
// the top.
{
  const K = kit();
  const { k, mass, floor, stair, alfarda } = K;
  const X = 22,
    Z = 17,
    H = 6.4;
  const T = 0.9;
  const cuts = [
    ...vault(-X - 0.5, -T, X + 0.5, T, 0, 2.4),
    ...vault(-12 - T, -Z - 0.5, -12 + T, Z + 0.5, 0, 2.4),
    ...vault(12 - T, -Z - 0.5, 12 + T, 0, 0, 2.4),
    ...vault(-15, -3, -9, 3, 0, 3.0, { steps: 3, ci: 0.6, cr: 0.4 }),
    ...vault(9, -3, 15, 3, 0, 3.0, { steps: 3, ci: 0.6, cr: 0.4 }),
  ];
  // The stair shaft from the east chamber: up along −z, open to the sky over its top half.
  const run = Math.round(H / 0.25) * 0.3;
  const shaft = [[13.2, 0, -3 - run - 0.01, 14.8, H + 0.1, -2.9]];
  // A dead-end gallery off the back tunnel (a tomb).
  cuts.push(...vault(12 - T, -Z + 2, 18, -Z + 5, 0, 2.2, { steps: 2 }));
  // Rooms on top: two broken ones.
  mass([-X, 0, -Z, X, H - 1.4, Z], [...cuts, ...shaft], { top: STONE });
  mass(
    [-X, H - 1.4, -Z, X, H, Z],
    [...shaft, ...erode(Math.min(X, Z), H - 1.4, H, 900, 4, [[-7, 7, 1]])],
  );
  floor(-X, -T, X, T);
  floor(-12 - T, -Z, -12 + T, Z);
  floor(12 - T, -Z, 12 + T, 0);
  floor(-15, -3, -9, 3);
  floor(9, -3, 15, 3);
  stair(13.2, 14.8, -3, -1, 0, H, { r: 0.25, t: 0.3, lod: 0 });
  // The grand stair (+z), 12 wide, with balustrades.
  const steps = Math.round(H / 0.3);
  const zFoot = Z + steps * 0.33;
  for (let s = 0; s < steps; s++) {
    const z1 = zFoot - s * 0.33;
    k.box([-6, 0, z1 - 0.33, 6, ((s + 1) * H) / steps, z1], STONE, WHITE, { skip: ["bottom"] });
  }
  for (const [x0, x1] of [
    [-7, -6],
    [6, 7],
  ])
    alfarda(x0, x1, zFoot, 0, Z, H, 0.6);
  // On top: two broken rooms (walls of uneven height) and an altar.
  for (const [cx, cz, w, d, sd] of [
    [-11, -8, 12, 8, 950],
    [10, 8, 9, 7, 951],
  ]) {
    const room = [
      [cx - w / 2 + 0.7, H, cz - d / 2 + 0.7, cx + w / 2 - 0.7, H + 4, cz + d / 2 - 0.7],
    ];
    const door = [[cx - 0.8, H, cz + d / 2 - 1, cx + 0.8, H + 2.4, cz + d / 2 + 0.1]];
    const ragged = erode(Math.max(w, d) / 2, H + 1.2, H + 3.0, sd, 3).map((b) => [
      b[0] + cx,
      b[1],
      b[2] + cz,
      b[3] + cx,
      b[4],
      b[5] + cz,
    ]);
    mass(
      [cx - w / 2, H, cz - d / 2, cx + w / 2, H + 3.0, cz + d / 2],
      [...room, ...door, ...ragged],
    );
  }
  k.box([-1.5, H, 1, 1.5, H + 1.0, 3], GLYPH, WHITE);
  k.box([-1.7, H + 1.0, 0.8, 1.7, H + 1.2, 3.2], MOSS, WHITE);
  K.rubble(-X - 2, 8, 3, 8, 960);
  K.rubble(X + 2, -9, 3, 8, 961);
  await publish(
    "ruin-acropolis",
    K,
    {
      title: "Maya acropolis (tunnels)",
      use: "Forgotten Ruins: the acropolis, a grand stair up to broken rooms and an altar; inside, tunnels through it with vaulted chambers, a tomb gallery and a stair up a shaft to the top (procedural, 2026-11-17)",
      class: "building",
      ring: "building",
      size: [2 * X + 4, H + 3, zFoot + Z],
    },
    [2 * X + 4, 2 * zFoot],
  );
}

// ---------------------------------------------------------------- broken walls
for (const [id, len, h, seed, corner] of [
  ["ruin-wall-long", 14, 3.2, 1000, 0],
  ["ruin-wall-short", 7, 2.4, 1010, 0],
  ["ruin-wall-corner", 9, 2.8, 1020, 6],
]) {
  const K = kit();
  const rag = (x0, x1, z0, z1, s) => {
    const cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    return erode(Math.max(x1 - x0, z1 - z0) / 2, h * 0.35, h, s, 4).map((b) => [
      b[0] + cx,
      b[1],
      b[2] + cz,
      b[3] + cx,
      b[4],
      b[5] + cz,
    ]);
  };
  K.mass(
    [-len / 2, 0, -0.55, len / 2, h, 0.55],
    [...rag(-len / 2, len / 2, -0.55, 0.55, seed), [-0.9, 0, -1, 0.9, 2.3, 1]]
      .slice(0, corner ? undefined : -1)
      .concat(corner ? [] : [[len / 2 - 3.2, 0, -1, len / 2 - 1.7, 2.2, 1]]),
  );
  if (corner)
    K.mass(
      [len / 2 - 1.1, 0, 0.55, len / 2, h * 0.85, corner],
      rag(len / 2 - 1.1, len / 2, 0.55, corner, seed + 1),
    );
  K.rubble(0, 1.6, len / 3, Math.round(len / 1.5), seed + 5);
  await publish(
    id,
    K,
    {
      title: "Maya wall (broken)",
      use: "Forgotten Ruins: a broken limestone wall, cover in the plaza and the jungle (procedural, 2026-11-17)",
      class: "structure",
      ring: "structure",
      texture: 256,
      size: [len, h, corner ? corner + 0.55 : 1.1],
    },
    [len, corner ? corner + 0.55 + 1.1 : 3],
  );
}

// ---------------------------------------------------------------- the plaza's paving
// 20 m squares of old flagstones a hand's breadth proud of the ground, a fifth of them gone
// (grass in their place), more at the edges. Drawn only: the ground under them is the walk.
{
  const K = kit();
  let s = 1200;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const T = 2.5,
    N = 8,
    H = 0.07;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const edge = Math.min(i, j, N - 1 - i, N - 1 - j) === 0;
      if (rnd() < (edge ? 0.35 : 0.14)) continue;
      const x0 = -10 + i * T,
        z0 = -10 + j * T;
      const h = 0.03 + 0.03 * rnd();
      K.k.quad([x0, h, z0], [x0, h, z0 + T], [x0 + T, h, z0 + T], [x0 + T, h, z0], FLAG, WHITE, {
        n: [0, 1, 0],
      });
    }
  K.far.box([-10, 0, -10, 10, H, 10], "paint", [0.6, 0.6, 0.52], { collide: false });
  await publish(
    "ruin-paving",
    K,
    {
      title: "Maya plaza paving",
      use: "Forgotten Ruins: the plaza's flagstones, 20 m squares with stones missing (procedural, 2026-11-17)",
      class: "structure",
      ring: "structure",
      texture: 256,
      size: [20, H * 1.4, 20],
    },
    [20, 20],
  );
}

// ---------------------------------------------------------------- stela and altar
{
  const K = kit();
  K.mass([-0.9, 0, -0.6, 0.9, 0.35, 0.6], [], { top: STONE });
  K.k.box([-0.6, 0.35, -0.3, 0.6, 3.6, 0.3], GLYPH, WHITE, { skip: ["bottom"] });
  K.k.box([-0.66, 3.6, -0.36, 0.66, 3.78, 0.36], MOSS, WHITE);
  // The round altar before it (an octagon of boxes).
  for (let a = 0; a < 4; a++) {
    const c = Math.cos((a * Math.PI) / 4) * 0.75,
      d = Math.sin((a * Math.PI) / 4) * 0.75;
    const w = Math.max(Math.abs(c), Math.abs(d)),
      v = Math.min(Math.abs(c), Math.abs(d)) + 0.3;
    K.k.box([-w, 0, 1.6 - v, w, 0.62, 1.6 + v], a % 2 ? MOSS : STONE, WHITE, { skip: ["bottom"] });
  }
  K.far.box([-0.6, 0, -0.3, 0.6, 3.6, 0.3], "paint", FAR_STONE, { collide: false });
  await publish(
    "ruin-stela",
    K,
    {
      title: "Maya stela and altar",
      use: "Forgotten Ruins: a carved stela with its round altar before it (procedural, 2026-11-17)",
      class: "structure",
      ring: "structure",
      texture: 256,
      size: [1.8, 3.78, 3.0],
    },
    [2, 5],
  );
}

// ---------------------------------------------------------------- the great temple
// The owner's references (2026-11-17: Ta Prohm's galleries and towers in the roots, Palenque's
// temples: "Build one major big temple with various levels and fun to be inside and explore").
// Two concentric enclosures of vaulted galleries round courts: the outer one at ground level
// (windows out, a colonnade into its court, a gate tower in the middle of each side), the
// inner one on a terrace (stairs up at its gates); the central sanctuary on a three-tier
// platform, its tower over a chamber with a stair up to a lookout room under its crown. Levels:
// the galleries, their roofs (stairs up from both courts), the platform (stairs from the inner
// court, bridges from the inner roof), the tower's chamber and its lookout; beneath, the crypt
// in the platform with tunnels in from the court. Part of the outer gallery has fallen in.
{
  const K = kit();
  const { k, mass, floor, stair, frieze } = K;
  /**
   * A side's box (u along the side, w across it, positive outward) turned onto the side:
   * 0 = +z, 1 = +x, 2 = −z, 3 = −x.
   */
  const side = (b, s) => {
    const [u0, y0, w0, u1, y1, w1] = b;
    const P = (u, w) => (s === 0 ? [u, w] : s === 1 ? [w, -u] : s === 2 ? [-u, -w] : [-w, u]);
    const a = P(u0, w0),
      c = P(u1, w1);
    return [Math.min(a[0], c[0]), y0, Math.min(a[1], c[1]), Math.max(a[0], c[0]), y1, Math.max(a[1], c[1])];
  };
  const all = (b) => [0, 1, 2, 3].map((s) => side(b, s));
  // Outer enclosure.
  const OA = 36,
    OW = 4,
    OR = 5.0;
  // Inner terrace and its gallery.
  const IT = 22,
    TH = 2.4,
    IA = 21,
    IW = 4,
    IR = TH + 4.6;
  // Central platform (three tiers) and tower.
  const CT = [11, 9.5, 8],
    CY = TH + 4.8;
  const cuts = [];
  // The outer gallery: a vaulted corridor all round, its gates' passages, a colonnade into the
  // court every 4 m, windows out every 6 m.
  cuts.push(...all([-(OA - 0.6), 0, OA - OW + 0.6, OA - 0.6, 2.9, OA - 0.6]));
  for (const [y, i] of [
    [2.9, 0.35],
    [3.25, 0.7],
    [3.6, 1.05],
  ])
    cuts.push(...all([-(OA - 0.6), y, OA - OW + 0.6 + i, OA - 0.6, y + 0.35, OA - 0.6 - i]));
  for (let u = -OA + 4; u <= OA - 4; u += 4)
    if (Math.abs(u) > 7) cuts.push(...all([u - 1.1, 0, OA - OW - 0.1, u + 1.1, 2.6, OA - OW + 0.7]));
  for (let u = -OA + 6; u <= OA - 6; u += 6)
    if (Math.abs(u) > 8) cuts.push(...all([u - 0.5, 1.1, OA - 0.7, u + 0.5, 2.1, OA + 0.1]));
  // The inner gallery on its terrace, the same way.
  cuts.push(...all([-(IA - 0.6), TH, IA - IW + 0.6, IA - 0.6, TH + 2.8, IA - 0.6]));
  for (const [y, i] of [
    [TH + 2.8, 0.35],
    [TH + 3.15, 0.7],
    [TH + 3.5, 1.05],
  ])
    cuts.push(...all([-(IA - 0.6), y, IA - IW + 0.6 + i, IA - 0.6, y + 0.35, IA - 0.6 - i]));
  for (let u = -IA + 4; u <= IA - 4; u += 4)
    if (Math.abs(u) > 6) cuts.push(...all([u - 1.0, TH, IA - IW - 0.1, u + 1.0, TH + 2.5, IA - IW + 0.7]));
  for (let u = -IA + 5; u <= IA - 5; u += 5)
    if (Math.abs(u) > 6) cuts.push(...all([u - 0.45, TH + 1.1, IA - 0.7, u + 0.45, TH + 2.0, IA + 0.1]));
  // Gate passages through both galleries (and the gate towers over them).
  cuts.push(...all([-1.6, 0, OA - OW - 4, 1.6, 3.4, OA + 4]));
  cuts.push(...all([-1.2, 0.2, OA - OW - 4, 1.2, 3.9, OA + 4]));
  cuts.push(...all([-1.3, TH, IA - IW - 3, 1.3, TH + 3.0, IA + 2]));
  // The inner roof's walk goes on through each inner gate tower (a passage at roof level).
  cuts.push(...all([-5.2, IR, IA - IW + 0.8, 5.2, IR + 2.4, IA - 0.8]));
  // …and on the east and west it opens onto the bridges over to the platform.
  for (const s of [1, 3]) cuts.push(side([-1.6, IR, IA - IW - 0.3, 1.6, IR + 2.4, IA - IW + 1.0], s));
  // The outer roof's walk goes on through the outer gate towers.
  cuts.push(...all([-7.2, OR, OA - OW + 0.6, 7.2, OR + 2.4, OA - 0.6]));
  // The fallen stretch: the outer gallery's roof gone along the north-east, its wall broken.
  const fallen = [side([8, 3.3, OA - OW - 0.1, 24, OR + 6, OA + 0.1], 1), side([12, 1.8, OA - 0.7, 17, OR + 1, OA + 0.1], 1)];
  // The galleries' masses: each side's strip runs past one corner and stops short of the
  // other (a pinwheel), so the corners are built once.
  const ring = (a, w, y0, y1, extra) => {
    for (let s = 0; s < 4; s++) mass(side([-a, y0, a - w, a - w, y1, a], s), [...cuts, ...extra]);
  };
  ring(OA, OW, 0, OR, [...fallen, ...erode(OA, OR - 0.8, OR, 2000, 6, [[-8, 8, 1]])]);
  // The inner terrace (solid, the inner court on it) and its gallery.
  mass([-IT, 0, -IT, IT, TH, IT], [...cuts], { top: FLAG });
  ring(IA, IW, TH, IR, erode(IA, IR - 0.7, IR, 2010, 4, [[-7, 7, 1]]));
  // Parapet on the inner gallery's roof (its outer edge), broken at the gate towers.
  for (let s = 0; s < 4; s++)
    for (const [a, b] of [
      [-IA, -5.5],
      [5.5, IA - 0.5],
    ])
      mass(side([a, IR, IA - 0.5, b, IR + 0.7, IA], s), [], { top: MOSS });
  // Floors: the galleries, the courts.
  for (let s = 0; s < 4; s++) {
    const b = side([-(OA - 0.6), 0, OA - OW + 0.6, OA - OW + 0.6 + 2.8, 0, OA - 0.6], s);
    floor(b[0], b[2], b[3], b[5]);
  }
  floor(-OA + OW, -OA + OW, OA - OW, OA - OW, 0.03);
  // Gate towers: outer (taller, over the passage, side rooms) and inner.
  for (let s = 0; s < 4; s++) {
    const g = [-7, 0, OA - 7, 7, 8.4, OA + 3];
    const rooms = [side([-6.2, 0, OA - 6.2, -2.4, 3.2, OA + 2.2], s), side([2.4, 0, OA - 6.2, 6.2, 3.2, OA + 2.2], s)];
    const doors = [side([-2.5, 0, OA - 3, -1.5, 2.4, OA - 1.8], s), side([1.5, 0, OA - 3, 2.5, 2.4, OA - 1.8], s)];
    mass(side(g, s), [...cuts, ...rooms, ...doors]);
    const t = side([-7, 6.8, OA - 7, 7, 7.8, OA + 3], s);
    frieze(t[0], t[2], t[3], t[5], 6.8, 7.8);
    // Its stepped crown.
    for (let i = 0; i < 3; i++) {
      const h = 5.6 - i * 1.6,
        d = 4 - i * 1.0;
      mass(side([-h, 8.4 + i * 1.8, OA - 2 - d, h, 8.4 + (i + 1) * 1.8, OA - 2 + d], s), []);
    }
    // The inner gate tower.
    mass(side([-5, TH, IA - IW, 5, TH + 6.6, IA + 1], s), [...cuts]);
    for (let i = 0; i < 2; i++)
      mass(side([-3.6 + i * 1.2, TH + 6.6 + i * 1.6, IA - 3.5 + i * 0.8, 3.6 - i * 1.2, TH + 8.2 + i * 1.6, IA - 0.5 - i * 0.8], s), []);
    // Stairs from the outer court onto the terrace at the inner gate.
    for (let k2 = 0; k2 < 8; k2++) {
      const w1 = IT + 2.4 - k2 * 0.3;
      k.box(side([-2.4, 0, w1 - 0.3, 2.4, (k2 + 1) * 0.3, w1], s), STONE, WHITE, { skip: ["bottom"] });
    }
    // Stairs up onto the outer gallery's roof (in the outer court, against its wall) and onto
    // the inner gallery's roof (in the inner court).
    for (let k2 = 0; k2 < Math.round(OR / 0.25); k2++) {
      const u0 = 9 + k2 * 0.3;
      k.box(side([u0, 0, OA - OW - 1.6, u0 + 0.3, (k2 + 1) * (OR / Math.round(OR / 0.25)), OA - OW], s), STONE, WHITE, { skip: ["bottom"] });
    }
    const ir = IR - TH;
    for (let k2 = 0; k2 < Math.round(ir / 0.25); k2++) {
      const u0 = -8 - k2 * 0.3;
      k.box(side([u0 - 0.3, TH, IA - IW - 1.6, u0, TH + (k2 + 1) * (ir / Math.round(ir / 0.25)), IA - IW], s), STONE, WHITE);
    }
  }
  // The central platform: three tiers, stairs up from the inner court north and south,
  // bridges from the inner gallery's roof east and west; the crypt inside with tunnels in from
  // the east and west.
  const crypt = vault(-4, -4, 4, 4, TH, TH + 2.6, { steps: 3, ci: 0.6, cr: 0.4 });
  const tunnels = [side([-0.8, TH, 3.9, 0.8, TH + 2.3, 11.6], 1), side([-0.8, TH, 3.9, 0.8, TH + 2.3, 11.6], 3)];
  for (let t = 0; t < 3; t++) {
    const h = CT[t];
    mass([-h, TH + t * 1.6, -h, h, TH + (t + 1) * 1.6, h], [...crypt, ...tunnels]);
  }
  floor(-4, -4, 4, 4, TH + 0.04);
  for (const s of [0, 2])
    for (let k2 = 0; k2 < 16; k2++) {
      const w1 = CT[2] + 4.8 - k2 * 0.3;
      k.box(side([-2, TH, w1 - 0.3, 2, TH + (k2 + 1) * 0.3, w1], s), STONE, WHITE);
    }
  for (const s of [1, 3]) {
    k.box(side([-1.6, CY - 0.35, CT[2] - 0.2, 1.6, CY - 0.05, IA - IW + 0.1], s), STONE, WHITE);
    for (const w of [12.5, 15.2]) k.box(side([-1.2, TH, w - 0.4, -0.6, CY - 0.35, w + 0.4], s), STONE, WHITE);
    for (const w of [12.5, 15.2]) k.box(side([0.6, TH, w - 0.4, 1.2, CY - 0.35, w + 0.4], s), STONE, WHITE);
  }
  // The tower: a chamber (doors south, north and east, the stair up the west wall and along the
  // south), the lookout room in its crown with a window on every side.
  const TX = 4.5,
    BODY = CY + 6,
    TT = 2.6;
  const flightRun = 12 * 0.3;
  const towerCuts = [
    [-3.5, CY, -3.5, 3.5, BODY - 0.3, 3.5],
    [-0.7, CY, -TX - 0.1, 0.7, CY + 2.6, -3.4],
    [TX - 1.1, CY, -0.7, TX + 0.1, CY + 2.6, 0.7],
    [2.2, CY, 3.4, 3.2, CY + 2.6, TX + 0.1],
    // The well over the second flight, up into the lookout room.
    [-1.9, BODY - 0.35, 2.1, -1.9 + flightRun + 0.1, BODY + 1.9, 3.5],
    // The lookout room.
    [-2.9, BODY, -2.9, 2.9, BODY + TT - 0.4, 2.9],
  ];
  for (const s of [0, 1, 2, 3]) towerCuts.push(side([-0.5, BODY + 0.5, 2.7, 0.5, BODY + 1.8, 3.8], s));
  mass([-TX, CY, -TX, TX, BODY, TX], towerCuts, { top: STONE });
  frieze(-TX, -TX, TX, TX, BODY - 1.1, BODY - 0.2);
  for (let i = 0; i < 4; i++) {
    const h = TX - 0.8 * (i + 1);
    mass([-h, BODY + i * TT, -h, h, BODY + (i + 1) * TT, h], i === 0 ? towerCuts : [], { top: i === 3 ? MOSS : STONE });
  }
  floor(-3.5, -3.5, 3.5, 3.5, CY + 0.04);
  // The stair: up the west wall (north to south… along +z), a landing in the corner, along the
  // south wall (+x) to the lookout room's floor.
  stair(-3.5, -2.3, -1.8, 1, CY, 3.0, { r: 0.25, t: 0.3, base: CY, lod: 0 });
  k.box([-3.5, CY, 1.8, -1.9, CY + 3.0, 3.5], STONE, WHITE, { lod: 0 });
  for (let s2 = 0; s2 < 12; s2++) {
    const x0 = -1.9 + s2 * 0.3;
    k.box([x0, CY, 2.1, x0 + 0.3, CY + 3.0 + (s2 + 1) * 0.25, 3.5], STONE, WHITE, { lod: 0 });
  }
  // Rubble in the courts and the fallen gallery.
  K.rubble(25, 18, 5, 14, 2050);
  K.rubble(-26, -24, 4, 10, 2051);
  K.rubble(OA - OW - 3, -16, 3, 10, 2052);
  K.rubble(-14, 14, 3, 6, 2053, TH);
  await publish(
    "ruin-great-temple",
    K,
    {
      title: "Great temple (Angkor and Maya)",
      use: "Forgotten Ruins: the great temple, two enclosures of vaulted galleries with gate towers, the inner on a terrace, the central sanctuary on its platform (tower, lookout, crypt and tunnels), roofs to walk, a fallen stretch (procedural, 2026-11-17)",
      class: "building",
      ring: "building",
      size: [2 * (OA + 3), BODY + 4 * TT, 2 * (OA + 3)],
    },
    [2 * (OA + 3), 2 * (OA + 3)],
  );
}

// ---------------------------------------------------------------- the temple town
// The owner's references (2026-11-17: "should be like a ruins temple town not just 1-3 small
// single temples"; the arcaded colonial ruins with a pediment, the galleries in the roots).

/**
 * An arcaded house: a plinth with steps along the front, `bays` arches (stepped heads) onto a
 * veranda, rooms behind it with doorways, and when `storeys` is 2 the same again upstairs (a
 * stair up the end room; the roof long gone, the upper rooms open to the sky, a pediment over
 * the middle bays). One storey: a flat roof with a parapet, an outer stair up the side.
 */
function arcadeHouse({ bays, storeys, seed }) {
  const K = kit("openings");
  const { k, mass, floor, stair, frieze } = K;
  const BAY = 4.2,
    W = 0.6,
    P = 0.9;
  const X = (bays * BAY) / 2 + W,
    Z0 = -5.6,
    Z1 = 5.6;
  const SH = 4.2;
  const top = P + storeys * SH;
  // The plinth and its steps along the front.
  mass([-X - 0.4, 0, Z0 - 0.4, X + 0.4, P, Z1 + 0.4], [], { top: STONE });
  for (let i = 0; i < 3; i++)
    k.box([-X + 1, 0, Z1 + 0.4 + (2 - i) * 0.35, X - 1, (i + 1) * 0.3, Z1 + 0.4 + (3 - i) * 0.35], STONE, WHITE, {
      skip: ["bottom"],
    });
  const cuts = [];
  const rooms = Math.max(2, Math.round(bays / 2));
  const rw = (2 * (X - W) - (rooms - 1) * 0.4) / rooms;
  for (let st = 0; st < storeys; st++) {
    const y0 = P + st * SH,
      // (Two storeys: the top one's roof has fallen, its rooms open to the sky.)
      y1 = storeys === 2 && st === 1 ? y0 + SH + 0.2 : y0 + SH - 0.35;
    // The arches.
    for (let b = 0; b < bays; b++) {
      const xc = -X + W + BAY * (b + 0.5);
      cuts.push([xc - 1.4, y0, Z1 - W - 0.1, xc + 1.4, y0 + 2.6, Z1 + 0.1]);
      cuts.push([xc - 1.1, y0 + 2.6, Z1 - W - 0.1, xc + 1.1, y0 + 3.0, Z1 + 0.1]);
      cuts.push([xc - 0.6, y0 + 3.0, Z1 - W - 0.1, xc + 0.6, y0 + 3.25, Z1 + 0.1]);
    }
    // The veranda and the rooms behind its wall (doorways), windows out the back.
    cuts.push([-X + W, y0, 2.2, X - W, y1, Z1 - W]);
    for (let r = 0; r < rooms; r++) {
      const x0 = -X + W + r * (rw + 0.4);
      cuts.push([x0, y0, Z0 + W, x0 + rw, y1, 1.6]);
      cuts.push([x0 + rw / 2 - 0.6, y0, 1.5, x0 + rw / 2 + 0.6, y0 + 2.4, 2.3]);
      cuts.push([x0 + rw / 2 - 0.5, y0 + 1.0, Z0 - 0.1, x0 + rw / 2 + 0.5, y0 + 2.2, Z0 + W + 0.1]);
    }
  }
  // Upstairs: a stair up the east room (its foot clear of the front wall), the well over it.
  const ex1 = X - W,
    sx0 = ex1 - 1.3;
  const run = Math.round(SH / 0.25) * 0.3;
  const s0 = 1.0;
  if (storeys === 2) cuts.push([sx0, P + SH - 0.4, s0 - run - 0.01, ex1, P + SH + 0.1, s0 - run + 3.6]);
  // The roof: gone upstairs (two storeys: the walls end raggedly), flat over one.
  const ragged = storeys === 2 ? erode(X, top - 1.6, top, seed, 5) : [];
  mass([-X, P, Z0, X, top, Z1], [...cuts, ...ragged]);
  if (storeys === 2) {
    // The upper floor's open sky: no roof slab (the top storey's rooms were cut to y1).
    // A pediment over the middle bays (a triangle on the front wall).
    const pw = Math.min(X - 1, BAY * 1.6);
    k.quad([-pw, top - 0.3, Z1 + 0.02], [pw, top - 0.3, Z1 + 0.02], [0, top + 1.8, Z1 + 0.02], [0, top + 1.8, Z1 + 0.02], GLYPH, WHITE, {
      n: [0, 0, 1],
    });
    k.quad([-pw, top - 0.3, Z1 - W - 0.02], [pw, top - 0.3, Z1 - W - 0.02], [0, top + 1.8, Z1 - W - 0.02], [0, top + 1.8, Z1 - W - 0.02], STONE, WHITE, {
      n: [0, 0, -1],
    });
    // The upper floor (the slab between the storeys) with the stair's well.
    stair(sx0, ex1, s0, -1, P, SH, { r: 0.25, t: 0.3, base: P, lod: 0 });
  } else {
    // Parapet round the roof, an outer stair up the east end.
    for (const b of [
      [-X, top, Z0, X, top + 0.7, Z0 + 0.4],
      [-X, top, Z1 - 0.4, X, top + 0.7, Z1],
      [-X, top, Z0 + 0.4, -X + 0.4, top + 0.7, Z1 - 0.4],
      [X - 0.4, top, Z0 + 0.4, X, top + 0.7, -2.4],
    ])
      mass(b, [], { top: MOSS });
    // The outer stair: from the ground up the east end to the roof's open corner.
    const n = Math.round(top / 0.25);
    for (let i = 0; i < n; i++) {
      const z = 5.0 - i * 0.3;
      k.box([X + 0.4, 0, z - 0.3, X + 1.8, ((i + 1) * top) / n, z], STONE, WHITE, {
        skip: ["bottom"],
      });
    }
  }
  frieze(-X, Z0, X, Z1, P + SH - 0.9, P + SH - 0.4);
  for (let st = 0; st < storeys; st++) {
    floor(-X + W, 2.2, X - W, Z1 - W, P + st * SH + 0.04);
    for (let r = 0; r < rooms; r++) {
      const x0 = -X + W + r * (rw + 0.4);
      if (st === 1 && r === rooms - 1) floor(x0, Z0 + W, sx0, 1.6, P + SH + 0.04);
      else floor(x0, Z0 + W, x0 + rw, 1.6, P + st * SH + 0.04);
    }
  }
  K.rubble(X - 2, Z0 - 2, 2, 5, seed + 3);
  return { K, X, Z0, Z1, top };
}
for (const [id, bays, storeys, seed, title] of [
  ["ruin-arcade-a", 5, 2, 3000, "Arcaded house (two storeys)"],
  ["ruin-arcade-b", 7, 1, 3100, "Arcaded gallery (one storey)"],
  ["ruin-arcade-c", 3, 2, 3200, "Arcaded house (small, two storeys)"],
]) {
  const t = arcadeHouse({ bays, storeys, seed });
  const w = 2 * (t.X + (storeys === 1 ? 2 : 0.5)),
    d = 2 * (t.Z1 + 1.6);
  await publish(
    id,
    t.K,
    {
      title,
      use: "Forgotten Ruins: the temple town's arcaded houses, arches onto a veranda, rooms behind, upstairs or a roof to climb (procedural, 2026-11-17)",
      class: "building",
      ring: "dwelling",
      size: [w, t.top + 2, t.Z1 - t.Z0 + 2],
    },
    [w, d],
  );
}

// Small stone houses: one or two rooms on a low platform, the vault fallen in.
for (const [id, w, d, two, seed] of [
  ["ruin-house-a", 8, 6.5, false, 3300],
  ["ruin-house-b", 11, 7.5, true, 3400],
]) {
  const K = kit("openings");
  const X = w / 2,
    Z = d / 2,
    P = 0.4,
    H = 3.2;
  K.mass([-X - 0.5, 0, -Z - 0.5, X + 0.5, P, Z + 0.5], [], { top: STONE });
  for (let i = 0; i < 2; i++)
    K.k.box([-1.2, 0, Z + 0.5 + (1 - i) * 0.3, 1.2, (i + 1) * 0.2, Z + 0.5 + (2 - i) * 0.3], STONE, WHITE, {
      skip: ["bottom"],
    });
  const cuts = [[-X + 0.6, P, -Z + 0.6, X - 0.6, P + H + 1, Z - 0.6]];
  cuts.push([-0.6, P, Z - 0.7, 0.6, P + 2.3, Z + 0.1]);
  cuts.push([X - 0.7, P + 1.0, -0.5, X + 0.1, P + 2.0, 0.5]);
  if (two) cuts.push([-X - 0.1, P + 1.0, -0.5, -X + 0.7, P + 2.0, 0.5]);
  const parts = [[-X, P, -Z, X, P + H, Z]];
  K.mass(parts[0], [...cuts, ...erode(Math.max(X, Z), P + 1.2, P + H, seed, 3)]);
  if (two)
    K.mass(
      [X * 0.4 - 0.2, P, -Z + 0.6, X * 0.4 + 0.2, P + H - 0.6, Z - 0.6],
      [[X * 0.4 - 0.3, P, -0.6, X * 0.4 + 0.3, P + 2.3, 0.6]],
    );
  K.floor(-X + 0.6, -Z + 0.6, X - 0.6, Z - 0.6, P + 0.04);
  K.rubble(-X + 1.4, -Z + 1.4, 0.6, 3, seed + 7, P);
  await publish(
    id,
    K,
    {
      title: "Maya stone house (fallen)",
      use: "Forgotten Ruins: the temple town's stone houses, rooms open to the sky (procedural, 2026-11-17)",
      class: "building",
      ring: "dwelling",
      texture: 256,
      size: [w + 1, P + H, d + 2],
    },
    [w + 1, d + 2.4],
  );
}

// A shrine tower (prasat): a room on a stepped base, the door to the front, its crown in tiers.
{
  const K = kit();
  const B = 1.2,
    X = 3.2;
  K.mass([-4.2, 0, -4.2, 4.2, B, 4.2], [], { top: MOSS });
  for (let i = 0; i < 4; i++)
    K.k.box([-1.2, 0, 4.2 + (3 - i) * 0.3, 1.2, ((i + 1) * B) / 4, 4.2 + (4 - i) * 0.3], STONE, WHITE, {
      skip: ["bottom"],
    });
  const room = [
    [-2.2, B, -2.2, 2.2, B + 3.2, 2.2],
    [-1.8, B + 3.2, -1.8, 1.8, B + 3.7, 1.8],
    [-1.3, B + 3.7, -1.3, 1.3, B + 4.2, 1.3],
    [-0.7, B, 2.0, 0.7, B + 2.4, X + 0.1],
  ];
  K.mass([-X, B, -X, X, B + 5, X], room);
  K.frieze(-X, -X, X, X, B + 4.1, B + 4.9);
  for (let i = 0; i < 3; i++) {
    const h = X - 0.7 * (i + 1);
    K.mass([-h, B + 5 + i * 1.5, -h, h, B + 5 + (i + 1) * 1.5, h], [], { top: i === 2 ? MOSS : STONE });
  }
  K.floor(-2.2, -2.2, 2.2, 2.2, B + 0.04);
  await publish(
    "ruin-shrine",
    K,
    {
      title: "Shrine tower (prasat)",
      use: "Forgotten Ruins: a shrine tower in the temple town, a room on a stepped base, its crown in tiers (procedural, 2026-11-17)",
      class: "building",
      ring: "dwelling",
      texture: 256,
      size: [8.4, B + 9.5, 9.6],
    },
    [8.4, 10],
  );
}

fs.writeFileSync(
  PLAN,
  "{\n" +
    Object.entries(plan)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, v]) => ` ${JSON.stringify(id)}: ${JSON.stringify(v)}`)
      .join(",\n") +
    "\n}\n",
);
