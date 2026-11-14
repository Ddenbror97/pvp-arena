/**
 * Procedural buildings with real surfaces (Blackwater Prison, owner 2026-11-14: "the flagship
 * … realistic"): the procedural kit's boxes and drawn-only quads, but each part names a
 * material (a texture in art/br/blackwater/tex, mapped in world metres by the face's axis: no
 * stretching on any wall, floor or stair) and keeps a tint (vertex colour, multiplied in). One
 * draw per material per LOD; the GLB carries its own textures (JPEG, 512–1024 px).
 *
 * Collision is axis-aligned boxes only (the game's solids). Slanted walls (the keep's rounded
 * ends) are drawn as quads and given a staircase of boxes inside their thickness (`slab`).
 *
 * Model space: metres, pivot at the bottom centre, front +z at turn 0.
 */
import fs from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const TEX = "art/br/blackwater/tex";
/** Materials: texture, metres per tile, roughness, metalness; `null` texture: tint only. */
export const MATERIALS = {
  stone: { tex: "sandstone", tile: 3.2, rough: 0.92 },
  rubble: { tex: "rubble", tile: 2.6, rough: 0.95 },
  plaster: { tex: "plaster", tile: 2.4, rough: 0.9 },
  concrete: { tex: "concrete", tile: 3.0, rough: 0.92 },
  floor: { tex: "floor", tile: 3.0, rough: 0.9 },
  cobble: { tex: "cobble", tile: 2.2, rough: 0.95 },
  tiles: { tex: "tiles", tile: 2.5, rough: 0.9 },
  rust: { tex: "rust", tile: 1.6, rough: 0.7, metal: 0.4 },
  wood: { tex: "wood", tile: 2.0, rough: 0.8 },
  paint: { tex: null, rough: 0.85 },
  glass: { tex: null, rough: 0.15, glass: true },
};

const r3 = (v) => +v.toFixed(3);
function triNormal(a, b, c) {
  const u = [0, 1, 2].map((k) => b[k] - a[k]),
    v = [0, 1, 2].map((k) => c[k] - a[k]);
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

export function createTexturedKit() {
  const parts = [];
  /** Collision boxes that are not drawn (slanted walls' staircases, invisible rails). */
  const solids = [];
  /**
   * A box. `m` material, `tint` [r,g,b] (multiplies the texture), `collide`, `lod` (0: only the
   * nearest LOD, interiors; 1: the shell, near LODs), `skip`: faces not drawn ("top", "bottom",
   * "x0", "x1", "z0", "z1").
   */
  const box = (
    b,
    m,
    tint = [1, 1, 1],
    { collide = true, lod = 1, visible = true, skip = [] } = {},
  ) => {
    const bb = [
      Math.min(b[0], b[3]),
      Math.min(b[1], b[4]),
      Math.min(b[2], b[5]),
      Math.max(b[0], b[3]),
      Math.max(b[1], b[4]),
      Math.max(b[2], b[5]),
    ].map(r3);
    if (bb[3] - bb[0] < 1e-3 || bb[4] - bb[1] < 1e-3 || bb[5] - bb[2] < 1e-3) return;
    if (visible) parts.push({ b: bb, m, tint, lod, skip });
    if (collide) solids.push(bb);
  };
  /** A drawn-only quad a→b→c→d (counter-clockwise seen from the side it shows), lit by `n`. */
  const quad = (
    a,
    b,
    c,
    d,
    m,
    tint = [1, 1, 1],
    { lod = 1, n = null, facing = null, both = false } = {},
  ) => {
    // Wound to face `facing` (default: `n`), whatever order the corners came in: the side a
    // face is drawn from is its winding (three culls back faces), its light is `n`.
    const want = facing ?? n;
    let q = [a, b, c, d];
    if (want) {
      const g = triNormal(a, b, c[0] === b[0] && c[1] === b[1] && c[2] === b[2] ? d : c);
      if (g[0] * want[0] + g[1] * want[1] + g[2] * want[2] < 0) q = [d, c, b, a];
    }
    parts.push({ q: q.map((p) => p.map(r3)), m, tint, lod, n });
    if (both)
      parts.push({
        q: [...q].reverse().map((p) => p.map(r3)),
        m,
        tint,
        lod,
        n: n && n.map((v) => -v),
      });
  };
  /**
   * A slanted wall: from (x0, z0) to (x1, z1) on the plan, `t` thick (centred on that line),
   * y0..y1, both faces and the top drawn, collision a staircase of boxes inside it.
   */
  const slab = (
    x0,
    z0,
    x1,
    z1,
    t,
    y0,
    y1,
    m,
    tint = [1, 1, 1],
    { lod = 1, collide = true, inner = null } = {},
  ) => {
    const dx = x1 - x0,
      dz = z1 - z0,
      L = Math.hypot(dx, dz);
    const nx = -dz / L,
      nz = dx / L;
    const h = t / 2;
    const A = [x0 + nx * h, z0 + nz * h],
      B = [x1 + nx * h, z1 + nz * h],
      C = [x1 - nx * h, z1 - nz * h],
      D = [x0 - nx * h, z0 - nz * h];
    // +n side, -n side, top (the ends are hidden in the next wall).
    quad([A[0], y0, A[1]], [A[0], y1, A[1]], [B[0], y1, B[1]], [B[0], y0, B[1]], m, tint, {
      lod,
      n: [nx, 0, nz],
    });
    quad([C[0], y0, C[1]], [C[0], y1, C[1]], [D[0], y1, D[1]], [D[0], y0, D[1]], inner ?? m, tint, {
      lod,
      n: [-nx, 0, -nz],
    });
    quad([A[0], y1, A[1]], [D[0], y1, D[1]], [C[0], y1, C[1]], [B[0], y1, B[1]], m, tint, {
      lod,
      n: [0, 1, 0],
    });
    if (collide) {
      const n = Math.max(1, Math.ceil(L / Math.max(t * 0.8, 0.4)));
      for (let k = 0; k < n; k++) {
        const ta = k / n,
          tb = (k + 1) / n;
        const xa = x0 + dx * ta,
          za = z0 + dz * ta,
          xb = x0 + dx * tb,
          zb = z0 + dz * tb;
        solids.push(
          [
            Math.min(xa, xb) - h * 0.75,
            y0,
            Math.min(za, zb) - h * 0.75,
            Math.max(xa, xb) + h * 0.75,
            y1,
            Math.max(za, zb) + h * 0.75,
          ].map(r3),
        );
      }
    }
  };
  /**
   * A horizontal polygon (convex or star-shaped from its first point) at y, drawn facing up
   * (`down`: a ceiling, drawn facing down but lit as if up), collision boxes in `strip` m strips
   * from y - thick to y.
   */
  const poly = (
    pts,
    y,
    m,
    tint = [1, 1, 1],
    { lod = 1, collide = true, thick = 0.3, down = false, strip = 1.0 } = {},
  ) => {
    const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i],
        q = pts[(i + 1) % pts.length];
      // Triangles fanned from the centroid, each as a degenerate quad (d = c), wound to face up
      // (or down: a ceiling, still lit as if it faced up).
      quad([c[0], y, c[1]], [p[0], y, p[1]], [q[0], y, q[1]], [q[0], y, q[1]], m, tint, {
        lod,
        n: [0, 1, 0],
        facing: down ? [0, -1, 0] : [0, 1, 0],
      });
    }
    if (!collide) return;
    const xs = pts.map((p) => p[0]);
    const lo = Math.min(...xs),
      hi = Math.max(...xs);
    for (let x = lo; x < hi - 1e-3; x += strip) {
      const xa = x,
        xb = Math.min(hi, x + strip);
      // The polygon's z extent over the strip (sampled at its ends and middle).
      let z0 = Infinity,
        z1 = -Infinity;
      for (const xs_ of [xa + 1e-3, (xa + xb) / 2, xb - 1e-3]) {
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i],
            q = pts[(i + 1) % pts.length];
          if ((p[0] - xs_) * (q[0] - xs_) > 0 || p[0] === q[0]) continue;
          const z = p[1] + ((q[1] - p[1]) * (xs_ - p[0])) / (q[0] - p[0]);
          z0 = Math.min(z0, z);
          z1 = Math.max(z1, z);
        }
      }
      if (z1 > z0) solids.push([xa, y - thick, z0, xb, y, z1].map(r3));
    }
  };
  /** A sloped bar (a rail, a stringer) between two points, drawn only. */
  const beam = (a, b, w, h, m, tint = [1, 1, 1], { lod = 1 } = {}) => {
    const dx = b[0] - a[0],
      dz = b[2] - a[2];
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (w / 2),
      nz = (dx / len) * (w / 2);
    const c = (p, sx, sy) => [p[0] + sx * nx, p[1] + (sy * h) / 2, p[2] + sx * nz];
    const v = [
      c(a, -1, -1),
      c(a, 1, -1),
      c(a, 1, 1),
      c(a, -1, 1),
      c(b, -1, -1),
      c(b, 1, -1),
      c(b, 1, 1),
      c(b, -1, 1),
    ];
    const mid = [0, 1, 2].map((k) => v.reduce((s, p) => s + p[k], 0) / 8);
    for (const f of [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [3, 7, 6, 2],
      [1, 2, 6, 5],
      [0, 4, 7, 3],
    ]) {
      let [p, q, r, s] = f.map((i) => v[i]);
      const u = [0, 1, 2].map((k) => q[k] - p[k]),
        w2 = [0, 1, 2].map((k) => s[k] - p[k]);
      const n = [
        u[1] * w2[2] - u[2] * w2[1],
        u[2] * w2[0] - u[0] * w2[2],
        u[0] * w2[1] - u[1] * w2[0],
      ];
      const ctr = [0, 1, 2].map((k) => (p[k] + q[k] + r[k] + s[k]) / 4);
      if (n[0] * (ctr[0] - mid[0]) + n[1] * (ctr[1] - mid[1]) + n[2] * (ctr[2] - mid[2]) < 0)
        [q, s] = [s, q];
      quad(p, q, r, s, m, tint, { lod });
    }
  };
  /** Straight stair flight along x or z: `steps` boxes rising `rise` in total, `w` wide. */
  const flight = (axis, a0, a1, c0, c1, y, rise, steps, m, tint = [1, 1, 1], { lod = 0 } = {}) => {
    const run = (a1 - a0) / steps,
      r = rise / steps;
    for (let k = 0; k < steps; k++) {
      const pa = a0 + k * run,
        pb = a0 + (k + 1) * run,
        top = y + (k + 1) * r;
      const lo = Math.max(y, top - 0.35);
      box(axis === "x" ? [pa, lo, c0, pb, top, c1] : [c0, lo, pa, c1, top, pb], m, tint, { lod });
    }
  };

  /** Triangles per material for LODs >= maxLod. UVs in world metres by the face's main axis. */
  const geometry = (maxLod) => {
    const by = new Map();
    const bucket = (m) => {
      if (!by.has(m)) by.set(m, { pos: [], nrm: [], uv: [], col: [] });
      return by.get(m);
    };
    const put = (g, verts, n, tint, tile) => {
      const ax = Math.abs(n[0]),
        ay = Math.abs(n[1]),
        az = Math.abs(n[2]);
      for (const v of verts) {
        g.pos.push(...v);
        g.nrm.push(...n);
        g.col.push(...tint, 1);
        const [u, w] =
          ay >= ax && ay >= az ? [v[0], v[2]] : ax >= az ? [v[2], -v[1]] : [v[0], -v[1]];
        g.uv.push(u / tile, w / tile);
      }
    };
    const normal = (a, b, d) => {
      const u = [0, 1, 2].map((k) => b[k] - a[k]),
        v = [0, 1, 2].map((k) => d[k] - a[k]);
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(...n) || 1;
      return n.map((x) => x / l);
    };
    for (const p of parts) {
      if (p.lod < maxLod) continue;
      const g = bucket(p.m);
      const tile = MATERIALS[p.m]?.tile ?? 3;
      if (p.q) {
        const [a, b, c, d] = p.q;
        let n = p.n;
        if (!n) {
          n = normal(a, b, d);
          if (!Number.isFinite(n[0]) || Math.hypot(...n) < 0.5) n = normal(a, b, c);
        }
        put(g, [a, b, c, a, c, d], n, p.tint, tile);
        continue;
      }
      const [x0, y0, z0, x1, y1, z1] = p.b;
      const faces = [
        ["top", [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]],
        ["bottom", [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]],
        ["z1", [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]],
        ["z0", [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]],
        ["x1", [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]],
        ["x0", [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]],
      ];
      for (const [name, a, b, c, d, n] of faces) {
        if (p.skip.includes(name)) continue;
        // A face turned down indoors renders near black: lit as if it faced up (a ceiling).
        put(g, [a, b, c, a, c, d], name === "bottom" ? [0, 1, 0] : n, p.tint, tile);
      }
    }
    return by;
  };
  return { parts, solids, box, quad, slab, poly, beam, flight, geometry };
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

/** One GLB: a primitive per material, textures embedded once per file. */
/** A texture's JPEG at most `size` px (the source files are 512 or 1024). */
const resized = new Map();
async function textureBytes(tex, size) {
  const key = `${tex}@${size ?? "full"}`;
  if (!resized.has(key)) {
    const src = fs.readFileSync(`${TEX}/${tex}.jpg`);
    const meta = await sharp(src).metadata();
    resized.set(
      key,
      size && meta.width > size
        ? { bytes: await sharp(src).resize(size, size).jpeg({ quality: 82 }).toBuffer(), px: size }
        : { bytes: src, px: meta.width },
    );
  }
  return resized.get(key);
}

export async function writeTexturedGlb(
  file,
  byMaterial,
  name,
  { textures = true, size = null } = {},
) {
  if (!textures) {
    // The far LOD: one draw (its tints carry the colours).
    const one = { pos: [], nrm: [], uv: [], col: [] };
    for (const g of byMaterial.values()) for (const k of Object.keys(one)) one[k].push(...g[k]);
    byMaterial = new Map([["paint", one]]);
  }
  const doc = new Document();
  const buf = doc.createBuffer();
  const mesh = doc.createMesh(name);
  const images = new Map();
  let tris = 0;
  for (const [m, g] of [...byMaterial.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!g.pos.length) continue;
    const spec = MATERIALS[m] ?? MATERIALS.paint;
    const mat = doc
      .createMaterial(`${name}-${m}`)
      .setBaseColorFactor(spec.glass ? [0.62, 0.74, 0.8, 0.3] : [1, 1, 1, 1])
      .setRoughnessFactor(spec.rough ?? 0.9)
      .setMetallicFactor(spec.metal ?? 0);
    if (spec.glass) mat.setAlphaMode("BLEND").setDoubleSided(true);
    if (spec.tex && textures) {
      if (!images.has(spec.tex)) {
        const t = await textureBytes(spec.tex, size);
        images.set(spec.tex, {
          tex: doc.createTexture(spec.tex).setImage(t.bytes).setMimeType("image/jpeg"),
          px: t.px,
        });
      }
      mat.setBaseColorTexture(images.get(spec.tex).tex);
    }
    const prim = doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        doc.createAccessor().setType("VEC3").setArray(new Float32Array(g.pos)).setBuffer(buf),
      )
      .setAttribute(
        "NORMAL",
        doc.createAccessor().setType("VEC3").setArray(new Float32Array(g.nrm)).setBuffer(buf),
      )
      .setAttribute(
        "COLOR_0",
        doc.createAccessor().setType("VEC4").setArray(new Float32Array(g.col)).setBuffer(buf),
      )
      .setMaterial(mat);
    if (spec.tex && textures)
      prim.setAttribute(
        "TEXCOORD_0",
        doc.createAccessor().setType("VEC2").setArray(new Float32Array(g.uv)).setBuffer(buf),
      );
    mesh.addPrimitive(prim);
    tris += g.pos.length / 9;
  }
  doc.createScene().addChild(doc.createNode(name).setMesh(mesh));
  await doc.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(file, doc);
  return {
    tris,
    draws: mesh.listPrimitives().length,
    kB: Math.round(fs.statSync(file).size / 1024),
    // (Uncompressed RGBA in memory, as process_assets.mjs counts it: 1 MB for 512 px.)
    textureMB: +[...images.values()].reduce((s, t) => s + (t.px / 512) ** 2, 0).toFixed(2),
  };
}

/**
 * Write the three LODs (near: kit LOD 0 and 1; far: its own kit, tint only), the collision
 * boxes and the models.json entry.
 */
export async function publishTextured(id, kit, far, entry) {
  const OUT = "public/fps/br/models";
  const { tag, ...meta } = entry;
  const file = (i) => `${id}${tag ? `.${tag}` : ""}.lod${i}.glb`;
  // `texture`: the near LOD's largest texture (px); the middle LOD gets a quarter of its area.
  const { texture = 1024, ...info } = meta;
  const lods = [
    await writeTexturedGlb(`${OUT}/${file(0)}`, kit.geometry(0), id, { size: texture }),
    await writeTexturedGlb(`${OUT}/${file(1)}`, kit.geometry(1), id, {
      size: Math.min(256, texture / 2),
    }),
    await writeTexturedGlb(`${OUT}/${file(2)}`, far.geometry(0), id, { textures: false }),
  ];
  fs.mkdirSync("art/br/procedural", { recursive: true });
  fs.writeFileSync(`art/br/procedural/${id}.boxes.json`, JSON.stringify(kit.solids) + "\n");
  const manifestPath = `${OUT}/models.json`;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.models[id] = {
    author: "PvPSpinArena",
    licence: "Original work (procedural)",
    textures: "Poly Haven (CC0): the owner's downloads, art/br/blackwater/tex",
    class: "building",
    ring: "dwelling",
    scale: 1,
    ...info,
    sourceTris: lods[0].tris,
    lods: lods.map((l, i) => ({
      file: `/fps/br/models/${file(i)}`,
      tris: l.tris,
      draws: l.draws,
      textureMB: l.textureMB,
      kB: l.kB,
      size: entry.size,
    })),
  };
  manifest.models = Object.fromEntries(
    Object.entries(manifest.models).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  console.log(
    `${id}: ${lods.map((l) => `${l.tris} tris/${l.draws} draws/${l.kB} kB`).join(" · ")}, ${kit.solids.length} boxes`,
  );
}
