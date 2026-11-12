/**
 * Z-fighting audit of a shipped map GLB, and the fix (owner, 2026-11-12: "flicker … on the frames
 * on the walls", both 5v5 maps). Two faces in the same plane that overlap and can both be seen
 * (facing the same way, or either drawn double-sided) fight for the depth test: which of them
 * a pixel shows depends on rounding, on the graphics card and on the order they were drawn in,
 * so the surface flickers as the camera moves.
 *
 *   node art/blender/map06/find_coplanar.mjs <map.glb> [--gap=0.02] [--top=25] [--why=a,b]
 *        [--layers=<mapId>:src/lib/fps/maps/depth-layers.json] [--plan=plan.json]
 *
 * Every triangle is taken to world space (node transforms and GPU instances applied) and
 * overlapping pairs in one plane, or within `--gap` metres of it (the kits lay trim and decals
 * a few millimetres proud of a wall, which the depth buffer cannot tell apart at range), are
 * found exactly: the overlap is the two triangles clipped against each other.
 *
 * A pair is left alone where the fight cannot be seen: two blended decals (they do not write
 * depth, so they are drawn one over the other in a fixed order), or two faces of one material
 * that put the same texture and the same vertex colour on the overlap (doubled faces).
 *
 * Of the rest, one face is laid on the other: the one in front, or, where they are exactly
 * coplanar, the one from the smaller island (an island is the triangles of one mesh that lie in
 * one plane and join edge to edge: one side of a wall, a strip of trim, a frame). Every triangle
 * gets a depth layer one above everything it is laid on (most get none), and `--layers` writes,
 * per mesh, which triangles are on which layer. The game draws those with a polygon offset
 * (src/lib/fps/maps/depth-layers.ts). Layers are per triangle and not per mesh because a mesh
 * here is "all the sandstone of a zone": a wall and the frame laid on it are often the same
 * mesh, and the order between two meshes differs from place to place.
 *
 * `--plan` writes the order between the triangles for the check that draws the map
 * (scripts/fps/map-capture/flicker.mjs).
 */
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, unweld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { mat4, quat, vec3 } from "gl-matrix";

const file = process.argv[2];
const opt = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const GAP = Number(opt("gap", 0.02));
/** Overlap (m²) for a pair of islands to count. */
const MIN_AREA = 0.002;
/**
 * Planes this close (m) are one plane. It is a small number on purpose: each mesh is stored on
 * its own grid, so faces modelled in one plane come out up to a few tenths of a millimetre
 * apart, and from close by the one in front is the one drawn. It has to stay the one on top.
 */
const FLAT = 2e-5;
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(file);
// Unwelding keeps the triangle order: triangle k of the shipped index buffer is vertices 3k…3k+2.
await doc.transform(dequantize(), unweld());

/** One primitive of one node: what the game draws as one mesh. */
const prims = [];
let sources = 0;
const tris = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const world = node.getWorldMatrix();
  const batch = node.getExtension("EXT_mesh_gpu_instancing");
  const mats = [];
  if (batch) {
    const T = batch.getAttribute("TRANSLATION"),
      R = batch.getAttribute("ROTATION"),
      S = batch.getAttribute("SCALE");
    const n = (T ?? R ?? S).getCount();
    for (let i = 0; i < n; i++) {
      const m = mat4.fromRotationTranslationScale(
        mat4.create(),
        R ? quat.normalize(quat.create(), R.getElement(i, [])) : quat.create(),
        T ? T.getElement(i, []) : [0, 0, 0],
        S ? S.getElement(i, []) : [1, 1, 1],
      );
      mats.push(mat4.multiply(m, world, m));
    }
  } else mats.push(world);
  for (const p of mesh.listPrimitives()) {
    if (p.getMode() !== 4) continue;
    const mat = p.getMaterial();
    const pos = p.getAttribute("POSITION");
    const uv = p.getAttribute("TEXCOORD_0");
    const col = p.getAttribute("COLOR_0");
    const idx = p.getIndices();
    const count = idx ? idx.getCount() : pos.getCount();
    const prim = {
      // The mesh as the game knows it: node name (as three's loader cleans it) and material.
      id: `${node
        .getName()
        .replace(/\s/g, "_")
        .replace(/[\[\]\.:\/]/g, "")}|${mat?.getName() ?? ""}`,
      name: `${node.getName() || mesh.getName()}${batch ? "[]" : ""} (${mat?.getName() ?? ""})`,
      instanced: !!batch,
      material: mat,
      twoSided: !!mat?.getDoubleSided(),
      blend: mat?.getAlphaMode() === "BLEND",
      /** First triangle's number among all source triangles. */
      base: sources,
      n: Math.floor(count / 3),
      /** Island of each source triangle (index into `islands`), -1 for a degenerate one. */
      island: new Int32Array(Math.floor(count / 3)).fill(-1),
      /** The triangles of the first instance, by source index (for the islands). */
      first: [],
    };
    prims.push(prim);
    sources += prim.n;
    for (const [mi, m] of mats.entries())
      for (let i = 0; i + 2 < count; i += 3) {
        const at = [0, 1, 2].map((k) => (idx ? idx.getScalar(i + k) : i + k));
        const v = at.map((k) => vec3.transformMat4([], pos.getElement(k, []), m));
        const n = vec3.cross([], vec3.sub([], v[1], v[0]), vec3.sub([], v[2], v[0]));
        const len = vec3.length(n);
        if (len < 2e-4) continue;
        vec3.scale(n, n, 1 / len);
        const t = {
          prim,
          src: i / 3,
          v,
          n,
          d: vec3.dot(n, v[0]),
          area: len / 2,
          uv: uv ? at.map((k) => uv.getElement(k, [])) : null,
          col: col ? at.map((k) => col.getElement(k, []).slice(0, 3)) : null,
        };
        tris.push(t);
        if (mi === 0) prim.first.push(t);
      }
  }
}
const ids = new Map();
for (const p of prims) ids.set(p.id, (ids.get(p.id) ?? 0) + 1);
const ambiguous = new Set([...ids].filter(([, n]) => n > 1).map(([id]) => id));

// Islands: triangles of one primitive that share an edge and face the same way.
const islands = [];
for (const prim of prims) {
  const parent = new Map();
  const find = (a) => {
    while (parent.get(a) !== a) {
      parent.set(a, parent.get(parent.get(a)));
      a = parent.get(a);
    }
    return a;
  };
  const edges = new Map();
  const q = (v) => v.map((c) => Math.round(c * 1e4)).join();
  for (const t of prim.first) {
    parent.set(t, t);
    const k = t.v.map(q);
    for (let e = 0; e < 3; e++) {
      const key = [k[e], k[(e + 1) % 3]].sort().join("|");
      (edges.get(key) ?? edges.set(key, []).get(key)).push(t);
    }
  }
  for (const list of edges.values())
    for (let i = 1; i < list.length; i++)
      for (let j = 0; j < i; j++)
        if (vec3.dot(list[i].n, list[j].n) > 0.9995) parent.set(find(list[i]), find(list[j]));
  const index = new Map();
  for (const t of prim.first) {
    const root = find(t);
    if (!index.has(root)) {
      index.set(root, islands.length);
      islands.push({ area: 0 });
    }
    prim.island[t.src] = index.get(root);
    islands[index.get(root)].area += t.area;
  }
}

/** The two in-plane axes of a triangle's plane (the dominant axis of its normal dropped). */
function axes(n) {
  const a = n.map(Math.abs);
  const ax = a[0] > a[1] ? (a[0] > a[2] ? 0 : 2) : a[1] > a[2] ? 1 : 2;
  return [0, 1, 2].filter((k) => k !== ax);
}
/**
 * The overlap of two (nearly) coplanar triangles: `t` clipped by the edges of `u`, in the plane
 * (points as [a, b] on the two in-plane axes), or null where they do not overlap.
 */
function overlap(t, u) {
  const [i, j] = axes(t.n);
  let poly = t.v.map((v) => [v[i], v[j]]);
  const Q = u.v.map((v) => [v[i], v[j]]);
  const turn =
    (Q[1][0] - Q[0][0]) * (Q[2][1] - Q[0][1]) - (Q[1][1] - Q[0][1]) * (Q[2][0] - Q[0][0]) > 0
      ? 1
      : -1;
  for (let e = 0; e < 3 && poly.length; e++) {
    const a = Q[e],
      b = Q[(e + 1) % 3];
    const side = (p) => turn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const next = [];
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k],
        q = poly[(k + 1) % poly.length];
      const sp = side(p),
        sq = side(q);
      if (sp >= 0) next.push(p);
      if (sp >= 0 !== sq >= 0) {
        const f = sp / (sp - sq);
        next.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
      }
    }
    poly = next;
  }
  if (poly.length < 3) return null;
  let area = 0;
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k],
      q = poly[(k + 1) % poly.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  return { poly, area: Math.abs(area) / 2 };
}
/** A triangle's per-vertex values (`uv` or `col`) at in-plane point `p`. */
function valueAt(t, values, p) {
  const [i, j] = axes(t.n);
  const [a, b, c] = t.v.map((v) => [v[i], v[j]]);
  const det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  const wb = ((p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1])) / det;
  const wc = ((b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1])) / det;
  return values[0].map((x, k) => x + (values[1][k] - x) * wb + (values[2][k] - x) * wc);
}
/**
 * Do two faces of one material show the same thing over their overlap? The same texture
 * coordinates up to whole repeats (every map texture repeats) and the same vertex colour.
 */
function looksTheSame(t, u, poly) {
  if (!t.uv !== !u.uv || !t.col !== !u.col) return false;
  let shift = null;
  for (const p of poly) {
    if (t.uv) {
      const a = valueAt(t, t.uv, p),
        b = valueAt(u, u.uv, p);
      const d = [a[0] - b[0], a[1] - b[1]];
      shift ??= d.map(Math.round);
      if (Math.abs(d[0] - shift[0]) > 0.01 || Math.abs(d[1] - shift[1]) > 0.01) return false;
    }
    if (t.col) {
      const a = valueAt(t, t.col, p),
        b = valueAt(u, u.col, p);
      if (a.some((x, k) => Math.abs(x - b[k]) > 0.03)) return false;
    }
  }
  return true;
}
/** A triangle's plane at in-plane point `p`: the coordinate on the dropped axis. */
function heightAt(t, p, [i, j] = axes(t.n)) {
  const k = 3 - i - j;
  return (t.d - t.n[i] * p[0] - t.n[j] * p[1]) / t.n[k];
}
// Buckets: by the normal (up to sign), by 4 m cells of the plane under the triangle's bounds (so
// a small face on a large wall is found wherever it sits), and by where the plane stands at the
// middle of that cell. Two faces a fraction of a degree apart are metres apart at the far end
// of the map and still cross on the wall they share, so the offset is taken where they are.
const CELL = Math.max(0.02, GAP * 2);
const TILE = 4;
const grid = new Map();
const flip = (t) => {
  const s =
    Math.abs(t.n[0]) > 0.5
      ? Math.sign(t.n[0])
      : Math.abs(t.n[1]) > 0.5
        ? Math.sign(t.n[1])
        : Math.sign(t.n[2]);
  return s || 1;
};
/** Every bucket a triangle's normal may round into: its own, and the next where it is near the line. */
const normalsOf = (t) => {
  const s = flip(t);
  const options = t.n.map((c) => [
    ...new Set([0, -0.45, 0.45].map((nudge) => Math.round(c * s * 30 + nudge))),
  ]);
  const out = [];
  for (const a of options[0])
    for (const b of options[1]) for (const c of options[2]) out.push([a, b, c].join());
  return out;
};
/** The cells under a triangle, each with the plane's height at the cell's middle (in CELLs). */
const tilesOf = (t) => {
  const ij = axes(t.n);
  const [i, j] = ij;
  const lo = [Math.min(...t.v.map((v) => v[i])), Math.min(...t.v.map((v) => v[j]))],
    hi = [Math.max(...t.v.map((v) => v[i])), Math.max(...t.v.map((v) => v[j]))];
  const out = [];
  for (let a = Math.floor(lo[0] / TILE); a <= Math.floor(hi[0] / TILE); a++)
    for (let b = Math.floor(lo[1] / TILE); b <= Math.floor(hi[1] / TILE); b++)
      out.push([
        `${i}${j}|${a},${b}`,
        Math.round(heightAt(t, [(a + 0.5) * TILE, (b + 0.5) * TILE], ij) / CELL),
      ]);
  return out;
};
tris.forEach((t, n) => (t.n_ = n));
for (const t of tris) {
  t.tiles = tilesOf(t);
  t.normal = [flip(t) * 30].map((s) => t.n.map((c) => Math.round(c * s))).join();
  for (const normal of normalsOf(t))
    for (const [tile, h] of t.tiles) {
      const k = `${normal}|${tile}|${h}`;
      (grid.get(k) ?? grid.set(k, []).get(k)).push(t);
    }
}
/** Triangle of the file, whatever instance: the unit a layer is given to. */
const node = (t) => t.prim.base + t.src;
/**
 * Per pair of triangles that fight (lower number first): the area where the first lies in front
 * of the second (`ahead`), behind it, and where they are exactly coplanar (`flat`).
 */
const conflicts = new Map();
/** Overlap per pair of meshes, for the report. */
const groups = new Map();
let pairs = 0,
  same = 0,
  blended = 0;
/** Pairs of triangles left alone because they look the same ("a~b", lower number first). */
const alike = new Set();
/** Overlapping blended triangles of one mesh, [later, earlier]: the later is drawn on top. */
const drawnAfter = [];
const done = new Set();
// Planes up to 1.8° apart are 12 cm apart at the middle of a cell and can still meet in it.
const REACH = Math.ceil(0.14 / CELL);
for (const t of tris)
  for (const [tile, h] of t.tiles)
    for (let dd = -REACH; dd <= REACH; dd++)
      for (const u of grid.get(`${t.normal}|${tile}|${h + dd}`) ?? []) {
        if (u.n_ <= t.n_) continue;
        const dot = vec3.dot(t.n, u.n);
        if (Math.abs(dot) < 0.9995) continue;
        // Opposite faces only fight when one of them is drawn from behind too.
        if (dot < 0 && !t.prim.twoSided && !u.prim.twoSided) continue;
        const id = t.n_ * tris.length + u.n_;
        if (done.has(id)) continue;
        done.add(id);
        const cut = overlap(t, u);
        if (!cut || cut.area < 1e-5) continue;
        if (node(t) === node(u)) continue; // one triangle, two instances
        // How far t stands in front of u (along t's normal) over the overlap itself.
        const ij = axes(t.n);
        const lift = t.n[3 - ij[0] - ij[1]];
        const apart = cut.poly.map((p) => (heightAt(t, p, ij) - heightAt(u, p, ij)) * lift);
        const nearest =
          Math.min(...apart) < 0 && Math.max(...apart) > 0 ? 0 : Math.min(...apart.map(Math.abs));
        if (nearest > GAP) continue;
        const gap = Math.max(...apart.map(Math.abs));
        // Two double-sided faces back to back with space between them (the two skins of a thin
        // prop): from either side the nearer one is the right one, and no order serves both.
        if (dot < 0 && t.prim.twoSided && u.prim.twoSided && gap > FLAT) continue;
        pairs++;
        if (t.prim.blend && u.prim.blend) {
          blended += cut.area;
          // Of one mesh, the later triangle is drawn over the earlier today. Keep that.
          if (t.prim === u.prim && !t.prim.instanced)
            drawnAfter.push([Math.max(node(t), node(u)), Math.min(node(t), node(u))]);
          continue;
        }
        if (t.prim.material === u.prim.material && looksTheSame(t, u, cut.poly)) {
          same += cut.area;
          alike.add(`${Math.min(node(t), node(u))}~${Math.max(node(t), node(u))}`);
          continue;
        }
        const [x, y] = node(t) < node(u) ? [t, u] : [u, t];
        const k = `${node(x)}~${node(y)}`;
        const c =
          conflicts.get(k) ?? conflicts.set(k, { x, y, ahead: 0, behind: 0, flat: 0 }).get(k);
        // How far x lies in front of y, for whoever can see both: along the shared normal, or,
        // of two faces back to back, on the front of the one drawn from one side only.
        const mean = (apart.reduce((s, v) => s + v, 0) / apart.length) * (x === t ? 1 : dot);
        const lead =
          dot > 0
            ? mean
            : x.prim.twoSided && y.prim.twoSided
              ? 0
              : mean * (y.prim.twoSided ? 1 : -1);
        if (gap <= FLAT) c.flat += cut.area;
        else if (lead > 0) c.ahead += cut.area;
        else c.behind += cut.area;
        const g = [t.prim.name, u.prim.name].sort().join("  ×  ");
        const e = groups.get(g) ?? groups.set(g, { n: 0, area: 0, gap: 0, flat: 0 }).get(g);
        e.n++;
        e.area += cut.area;
        e.gap = Math.max(e.gap, nearest);
        if (gap <= FLAT) e.flat += cut.area;
      }
// --why=a,b: what the scan made of two triangles (numbers as flicker.mjs --raw prints them).
if (opt("why")) {
  const [a, b] = opt("why").split(",").map(Number);
  const [ta, tb] = [a, b].map((n) => tris.find((t) => node(t) === n));
  for (const t of [ta, tb])
    console.log(
      `triangle ${node(t)} of ${t.prim.name}: facing ${t.n.map((c) => c.toFixed(4))}, ${t.area.toFixed(3)} m², corners ${t.v.map((v) => v.map((c) => c.toFixed(3)).join(" ")).join(" | ")}`,
    );
  const cut = overlap(ta, tb);
  const ij = axes(ta.n);
  console.log(
    `  angle between them ${((Math.acos(Math.min(1, Math.abs(vec3.dot(ta.n, tb.n)))) * 180) / Math.PI).toFixed(3)}°, overlap ${cut ? cut.area.toFixed(4) : 0} m²` +
      (cut
        ? `, apart ${cut.poly.map((p) => ((heightAt(ta, p, ij) - heightAt(tb, p, ij)) * ta.n[3 - ij[0] - ij[1]] * 1000).toFixed(2)).join(" ")} mm, look the same: ${ta.prim.material === tb.prim.material && looksTheSame(ta, tb, cut.poly)}`
        : ""),
  );
  const c = conflicts.get(`${Math.min(a, b)}~${Math.max(a, b)}`);
  console.log(
    c
      ? `  counted: ahead ${c.ahead.toFixed(4)}, behind ${c.behind.toFixed(4)}, flat ${c.flat.toFixed(4)} m² (first: ${node(c.x)})`
      : "  not counted as a fight",
  );
}
const list = [...groups].sort((a, b) => b[1].area - a[1].area);
const sum = (m, f) => [...m.values()].reduce((s, e) => s + f(e), 0);
console.log(
  `${file}: ${tris.length} triangles, ${pairs} overlapping pairs within ${GAP * 1000} mm`,
);
console.log(
  `  ${sum(groups, (e) => e.area).toFixed(0)} m² can be seen fighting (${sum(groups, (e) => e.flat).toFixed(0)} m² exactly coplanar), between ${list.length} pairs of meshes`,
);
console.log(
  `  left alone: ${same.toFixed(0)} m² of doubled faces that look the same, ${blended.toFixed(0)} m² of decal on decal`,
);
for (const [g, e] of list.slice(0, Number(opt("top", 25))))
  console.log(
    `${String(e.n).padStart(6)} pairs ${e.area.toFixed(2).padStart(8)} m² (${e.flat.toFixed(2)} m² exactly coplanar)  gap ≤ ${(e.gap * 1000).toFixed(1)} mm  ${g}`,
  );
if (ambiguous.size)
  console.log(`meshes the game cannot tell apart (same node and material): ${[...ambiguous]}`);

// The order. A triangle is over another where it lies in front of it. Where they are exactly
// coplanar, the one from the smaller island is the one laid on (a frame, a plinth, a strip of
// trim); within one island (faces doubled with another texture or shade), the one drawn later,
// which is the one a card that rounds both alike shows today. Instanced meshes and meshes the
// game cannot name are drawn whole, so their triangles stay on layer 0.
const fixed = (t) => t.prim.instanced || ambiguous.has(t.prim.id);
const islandArea = (t) => islands[t.prim.island[t.src]].area;
const edges = []; // over, under (triangle numbers), overlap area
for (const c of conflicts.values()) {
  const total = c.ahead + c.behind + c.flat;
  if (total < MIN_AREA) continue;
  let xOver;
  if (c.ahead + c.behind >= total / 2) xOver = c.ahead >= c.behind;
  else {
    const a = islandArea(c.x),
      b = islandArea(c.y);
    // Islands of one size (or one island): the later triangle.
    xOver = Math.abs(a - b) > 1e-6 * Math.max(a, b) ? a < b : false;
  }
  const [over, under] = xOver ? [c.x, c.y] : [c.y, c.x];
  edges.push({ over: node(over), under: node(under), w: total, stuck: fixed(over) });
}
// Largest overlaps first: where the orders contradict each other (a over b here, b over a
// through others there), the smallest overlap is the one left unsettled.
edges.sort((x, y) => y.w - x.w);
const below = new Map();
/** Triangle → the triangles it must not be on a lower layer than (see `drawnAfter`). */
const notBelow = new Map();
const reaches = (from, to, seen = new Set()) => {
  if (from === to) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  for (const n of below.get(from) ?? []) if (reaches(n, to, seen)) return true;
  for (const n of notBelow.get(from) ?? []) if (reaches(n, to, seen)) return true;
  return false;
};
const cuts = [];
const kept = [];
for (const e of edges) {
  if (e.stuck || reaches(e.under, e.over)) {
    cuts.push(e);
    continue;
  }
  (below.get(e.over) ?? below.set(e.over, new Set()).get(e.over)).add(e.under);
  kept.push(e);
}
// Blended decals do not fight each other, but the game draws a mesh's layers one after another
// (layer 0 first), so a decal drawn over another of its mesh must not end up on a lower layer.
let reordered = 0;
for (const [later, earlier] of drawnAfter) {
  if (reaches(earlier, later)) {
    reordered++;
    continue;
  }
  (notBelow.get(later) ?? notBelow.set(later, new Set()).get(later)).add(earlier);
}
/** Layer per triangle number (absent: 0). */
const layer = new Map();
const settle = (n) => {
  if (layer.has(n)) return layer.get(n);
  layer.set(n, 0);
  let l = 0;
  for (const m of below.get(n) ?? []) l = Math.max(l, settle(m) + 1);
  for (const m of notBelow.get(n) ?? []) l = Math.max(l, settle(m));
  layer.set(n, l);
  return l;
};
for (const n of [...below.keys(), ...notBelow.keys()]) settle(n);
const counts = {};
for (const l of layer.values()) if (l) counts[l] = (counts[l] ?? 0) + 1;
console.log(
  `layers: ${JSON.stringify(counts)} (triangles per layer above 0), ${kept.length} orders kept (${kept.reduce((s, e) => s + e.w, 0).toFixed(0)} m²), ${cuts.length} left unsettled (${cuts.reduce((s, e) => s + e.w, 0).toFixed(2)} m²)`,
);

/** Per mesh: its triangle count and, per layer above 0, the triangles as [start, count, …]. */
const table = {};
for (const prim of prims) {
  const byLayer = {};
  for (let t = 0; t < prim.n; t++) {
    const l = layer.get(prim.base + t);
    if (!l) continue;
    const runs = (byLayer[l] ??= []);
    if (runs.length && runs[runs.length - 2] + runs[runs.length - 1] === t) runs[runs.length - 1]++;
    else runs.push(t, 1);
  }
  if (Object.keys(byLayer).length) table[prim.id] = { triangles: prim.n, layers: byLayer };
}
const layers = opt("layers");
if (layers) {
  const [mapId, out] = layers.split(":");
  const all = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
  all[mapId] = Object.fromEntries(Object.entries(table).sort(([a], [b]) => (a < b ? -1 : 1)));
  // One mesh per line: the runs are long lists of numbers.
  fs.writeFileSync(
    out,
    "{\n" +
      Object.entries(all)
        .map(
          ([id, meshes]) =>
            ` ${JSON.stringify(id)}: {\n` +
            Object.entries(meshes)
              .map(([mesh, entry]) => `  ${JSON.stringify(mesh)}: ${JSON.stringify(entry)}`)
              .join(",\n") +
            "\n }",
        )
        .join(",\n") +
      "\n}\n",
  );
}
const plan = opt("plan");
if (plan)
  fs.writeFileSync(
    plan,
    JSON.stringify({
      // Triangles are numbered through the file: a mesh's first number, then its own order.
      meshes: Object.fromEntries(
        prims
          .filter((p) => !ambiguous.has(p.id))
          .map((p) => [p.id, { name: p.name, base: p.base, triangles: p.n, blend: p.blend }]),
      ),
      orders: kept.map((e) => [e.over, e.under, +e.w.toFixed(4)]),
      unsettled: cuts.map((e) => [e.over, e.under, +e.w.toFixed(4)]),
      alike: [...alike].map((k) => k.split("~").map(Number)),
    }),
  );
process.exit(0);
