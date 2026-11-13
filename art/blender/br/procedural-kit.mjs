/**
 * Shared pieces for the procedural buildings (build_townhouse.mjs; build_apartment.mjs predates
 * it): coloured boxes with collision and LOD flags, walls with door/window holes, the GLB writer
 * (one vertex-coloured draw per LOD) and the models.json entry. Model space: metres, pivot at the
 * bottom centre, front +z at turn 0.
 */
import fs from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

export const COLOURS = {
  plaster: [0.93, 0.92, 0.89],
  brick: [0.55, 0.3, 0.24],
  inner: [0.84, 0.81, 0.75],
  floor: [0.5, 0.38, 0.27],
  stair: [0.6, 0.6, 0.58],
  glass: [0.13, 0.18, 0.24],
  roof: [0.55, 0.55, 0.53],
  rail: [0.2, 0.2, 0.21],
  wood: [0.42, 0.29, 0.18],
  bed: [0.45, 0.52, 0.62],
  sofa: [0.27, 0.36, 0.28],
  counter: [0.72, 0.72, 0.7],
  shelf: [0.36, 0.33, 0.3],
  siding: [0.66, 0.6, 0.5],
  navy: [0.16, 0.22, 0.36],
  steel: [0.55, 0.57, 0.6],
  sign: [0.85, 0.75, 0.3],
};

export function createKit() {
  /** Parts: [x0,y0,z0,x1,y1,z1], colour, collides?, lod (0: interior, 1: shell, 2: far). */
  const parts = [];
  /** `visible: false`: collision only (e.g. behind see-through bars). */
  const box = (b, colour, { collide = true, lod = 1, visible = true } = {}) =>
    parts.push({ b: b.map((v) => +v.toFixed(3)), colour, collide, lod, visible });
  /**
   * A wall along `axis` from a0 to a1, across c0..c1, y0..y1, with holes [h0, h1, yLow, yHigh,
   * glass?] along the axis.
   */
  const wall = (axis, a0, a1, c0, c1, y0, y1, holes, colour, opts = {}) => {
    const cuts = [a0, a1, ...holes.flatMap((h) => [h[0], h[1]])].sort((p, q) => p - q);
    for (let i = 0; i + 1 < cuts.length; i++) {
      const s0 = cuts[i],
        s1 = cuts[i + 1];
      if (s1 - s0 < 1e-3) continue;
      const mid = (s0 + s1) / 2;
      const hole = holes.find((h) => mid > h[0] && mid < h[1]);
      const spans = hole
        ? [
            [y0, hole[2]],
            [hole[3], y1],
          ]
        : [[y0, y1]];
      for (const [ya, yb] of spans) {
        if (yb - ya < 1e-3) continue;
        box(axis === "x" ? [s0, ya, c0, s1, yb, c1] : [c0, ya, s0, c1, yb, s1], colour, opts);
      }
      if (hole?.[4]) {
        const g = (c0 + c1) / 2;
        box(
          axis === "x"
            ? [s0, hole[2], g - 0.03, s1, hole[3], g + 0.03]
            : [g - 0.03, hole[2], s0, g + 0.03, hole[3], s1],
          COLOURS.glass,
          { collide: false, lod: opts.lod ?? 1 },
        );
      }
    }
  };
  /** A straight flight from (x0..x1, zStart) rising `rise` over `steps` towards zEnd, 0.3 m thick. */
  const flight = (x0, x1, zStart, zEnd, y, rise, steps) => {
    const run = (zEnd - zStart) / steps,
      r = rise / steps;
    for (let k = 0; k < steps; k++) {
      const za = zStart + k * run,
        zb = zStart + (k + 1) * run;
      const t = y + (k + 1) * r;
      box([x0, Math.max(y, t - 0.3), Math.min(za, zb), x1, t, Math.max(za, zb)], COLOURS.stair, {
        lod: 0,
      });
    }
  };
  /**
   * A straight bar between two points (a sloped handrail, a stair stringer), `w` wide and `h`
   * tall in section, its sides vertical. Drawn only: collision stays with axis-aligned boxes.
   */
  const beam = (a, b, w, h, colour, { lod = 1 } = {}) => {
    const dx = b[0] - a[0],
      dz = b[2] - a[2];
    const len = Math.hypot(dx, dz) || 1;
    // Horizontal unit normal to the bar (its width), and half the section height up.
    const nx = (-dz / len) * (w / 2),
      nz = (dx / len) * (w / 2);
    const c = (p, sx, sy) =>
      [p[0] + sx * nx, p[1] + (sy * h) / 2, p[2] + sx * nz].map((v) => +v.toFixed(3));
    const q = [
      c(a, -1, -1),
      c(a, 1, -1),
      c(a, 1, 1),
      c(a, -1, 1),
      c(b, -1, -1),
      c(b, 1, -1),
      c(b, 1, 1),
      c(b, -1, 1),
    ];
    parts.push({ q, colour, collide: false, lod, visible: true });
  };
  /** A ceiling face at height y over [x0, z0]–[x1, z1] (drawn only; see geometry). */
  const ceiling = (x0, y, z0, x1, z1, colour, { lod = 0 } = {}) =>
    parts.push({
      ceil: [x0, y, z0, x1, z1].map((v) => +v.toFixed(3)),
      colour,
      collide: false,
      lod,
    });
  /**
   * A drawn-only quad (corners a→b→c→d, counter-clockwise seen from where it shows), lit as if
   * its normal were `n` (default: its own). A stair flight's soffit, lit facing up like the
   * ceilings (a face turned down renders near black indoors).
   */
  const sheet = (a, b, c, d, colour, { lod = 0, n = null } = {}) =>
    parts.push({ sheet: [a, b, c, d].map((v) => v.map((x) => +x.toFixed(3))), n, colour, lod });
  /** `mode`: "opaque" leaves the window glass out, "glass" draws only it (publish's `glass`). */
  const geometry = (maxLod, mode) => {
    const pos = [],
      nrm = [],
      col = [];
    const quad = (a, b, c, d, n, colour) => {
      for (const v of [a, b, c, a, c, d]) {
        pos.push(...v);
        nrm.push(...n);
        col.push(...colour, 1);
      }
    };
    const face = (a, b, c, d, colour) => {
      const u = [0, 1, 2].map((k) => b[k] - a[k]),
        v = [0, 1, 2].map((k) => d[k] - a[k]);
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(...n) || 1;
      quad(
        a,
        b,
        c,
        d,
        n.map((x) => x / l),
        colour,
      );
    };
    for (const p of parts) {
      if (p.lod < maxLod || p.visible === false) continue;
      if (mode && (mode === "glass") !== (p.colour === COLOURS.glass)) continue;
      if (p.ceil) {
        // A ceiling: one face seen from below, lit as if it faced up (a down-facing face gets
        // only the ground's bounce light and renders near black indoors).
        const [x0, y, z0, x1, z1] = p.ceil;
        quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0], p.colour);
        continue;
      }
      if (p.sheet) {
        const [a, b, c, d] = p.sheet;
        if (p.n) quad(a, b, c, d, p.n, p.colour);
        else face(a, b, c, d, p.colour);
        continue;
      }
      if (p.q) {
        // Corners: start end 0..3 = (left low, right low, right high, left high), end 4..7.
        const q = p.q;
        // Each face wound counter-clockwise seen from outside; flipped when the bar runs the
        // other way round (its left side is then on the other hand).
        const faces = [
          [0, 3, 2, 1],
          [4, 5, 6, 7],
          [0, 1, 5, 4],
          [3, 7, 6, 2],
          [1, 2, 6, 5],
          [0, 4, 7, 3],
        ];
        const mid = [0, 1, 2].map((k) => q.reduce((s, v) => s + v[k], 0) / 8);
        for (const f of faces) {
          let [a, b, c, d] = f.map((i) => q[i]);
          const u = [0, 1, 2].map((k) => b[k] - a[k]),
            v = [0, 1, 2].map((k) => d[k] - a[k]);
          const n = [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0],
          ];
          const centre = [0, 1, 2].map((k) => (a[k] + b[k] + c[k] + d[k]) / 4);
          const out =
            n[0] * (centre[0] - mid[0]) + n[1] * (centre[1] - mid[1]) + n[2] * (centre[2] - mid[2]);
          if (out < 0) [b, d] = [d, b];
          face(a, b, c, d, p.colour);
        }
        continue;
      }
      const [x0, y0, z0, x1, y1, z1] = p.b;
      const c = p.colour;
      quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], c);
      quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], c);
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], c);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], c);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], c);
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], c);
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), col: new Float32Array(col) };
  };
  return { parts, box, beam, wall, flight, ceiling, sheet, geometry };
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
// Welded and meshopt-compressed like the downloaded models (decoded by three's MeshoptDecoder).
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
export async function writeGlb(file, g, name, glass = null) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const mat = doc
    .createMaterial(name)
    .setBaseColorFactor([1, 1, 1, 1])
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0);
  const primitive = (geo, material) =>
    doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        doc.createAccessor().setType("VEC3").setArray(geo.pos).setBuffer(buf),
      )
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(geo.nrm).setBuffer(buf))
      .setAttribute(
        "COLOR_0",
        doc.createAccessor().setType("VEC4").setArray(geo.col).setBuffer(buf),
      )
      .setMaterial(material);
  const mesh = doc.createMesh(name).addPrimitive(primitive(g, mat));
  // Window glass (publish's `glass`): a second, see-through draw.
  if (glass?.pos.length) {
    const pane = doc
      .createMaterial(`${name}-glass`)
      .setBaseColorFactor([0.62, 0.74, 0.8, 0.3])
      .setAlphaMode("BLEND")
      .setDoubleSided(true)
      .setRoughnessFactor(0.15)
      .setMetallicFactor(0);
    mesh.addPrimitive(primitive(glass, pane));
  }
  doc.createScene().addChild(doc.createNode(name).setMesh(mesh));
  await doc.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(file, doc);
  return {
    tris: (g.pos.length + (glass?.pos.length ?? 0)) / 9,
    kB: Math.round(fs.statSync(file).size / 1024),
  };
}

/** Write the LODs, the collision boxes and the models.json entry of a procedural building. */
export async function publish(id, kit, far, entry) {
  const OUT = "public/fps/br/models";
  // `tag`: a rebuilt model gets new file names (`<id>.<tag>.lod<N>.glb`), so a browser or CDN
  // copy of the old files is never served for the new revision.
  const { tag, ...meta } = entry;
  const file = (i) => `${id}${tag ? `.${tag}` : ""}.lod${i}.glb`;
  const collision = kit.parts.filter((p) => p.collide && p.b).map((p) => p.b);
  const lods = [];
  // `glass`: the window panes drawn see-through (their own draw) in the near LODs.
  const { glass, ...rest } = meta;
  const near = (lod) =>
    glass
      ? writeGlb(`${OUT}/${file(lod)}`, kit.geometry(lod, "opaque"), id, kit.geometry(lod, "glass"))
      : writeGlb(`${OUT}/${file(lod)}`, kit.geometry(lod), id);
  lods.push(await near(0));
  lods.push(await near(1));
  lods.push(await writeGlb(`${OUT}/${file(2)}`, far.geometry(2), id));
  fs.mkdirSync("art/br/procedural", { recursive: true });
  fs.writeFileSync(`art/br/procedural/${id}.boxes.json`, JSON.stringify(collision) + "\n");
  const manifestPath = `${OUT}/models.json`;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.models[id] = {
    author: "PvPSpinArena",
    licence: "Original work (procedural)",
    class: "building",
    ring: "dwelling",
    scale: 1,
    ...rest,
    sourceTris: lods[0].tris,
    lods: lods.map((l, i) => ({
      file: `/fps/br/models/${file(i)}`,
      tris: l.tris,
      draws: glass && i < 2 ? 2 : 1,
      textureMB: 0,
      kB: l.kB,
      size: entry.size,
    })),
  };
  manifest.models = Object.fromEntries(
    Object.entries(manifest.models).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  console.log(
    `${id}: ${lods.map((l) => l.tris).join(" / ")} tris, ${collision.length} collision boxes`,
  );
}
