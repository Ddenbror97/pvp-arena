/**
 * Window audit of the island's buildings (owner, 2026-11-23: "Add glass windows to
 * apartments/buildings who does not have any windows at all … also fix buildings with a window
 * but no glass, it looks like glass but there is nothing there. audit all buldings").
 *
 * Every building (manifest class building, hero, and the dwelling/shop/outbuilding rings) is
 * looked at from outside, as a player would: rays on a 12 cm grid straight in through each of
 * its four sides (model space), from the ground to its roof. What each ray meets first:
 *
 *  - glass: a see-through face (blended material, transmission, alpha under 0.9, or a material
 *    named glass/window/pane);
 *  - wall: anything else, at about the facade's depth;
 *  - a hole: nothing, or a face well behind the wall round it (more than 0.6 m: through the
 *    wall into a room, not a recess).
 *
 * Holes framed by wall on both sides and above are openings: windows when there is wall below
 * them too (a sill), doors when they reach the ground or a floor. Each opening is grown to its
 * rectangle and checked against the model's collision (does a box fill it: shots and players
 * stopped by nothing you can see). Writes art/br/build/window-audit.json and prints a table:
 *
 *   node art/blender/br/audit_windows.mjs [models.<rev>.json] [--only=id,id]
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { modelFile } from "./model-files.mjs";

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });

const dir = "public/fps/br/models";
const manifestName =
  process.argv.find((a) => a.endsWith(".json") && !a.startsWith("--")) ?? "models.jungle-v1.json";
const manifest = JSON.parse(fs.readFileSync(path.join(dir, manifestName), "utf8"));
const collisionName = manifestName.replace("models.", "collision.");
const collision = fs.existsSync(path.join(dir, collisionName))
  ? JSON.parse(fs.readFileSync(path.join(dir, collisionName), "utf8")).models
  : {};
const only = process.argv
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");

const STEP = 0.12;
/** A hole: the first hit this far behind the wall round it (m), or none. */
const THROUGH = 0.6;
/** How far to look for the wall round a hole (m). */
const REACH = 3;

export const isBuilding = (e) =>
  e.class === "building" ||
  e.class === "hero" ||
  ["dwelling", "shop", "outbuilding"].includes(e.ring);

/** Triangles of a GLB in model space, each with whether its material is see-through. */
export async function loadTriangles(file) {
  const doc = await io.read(file);
  const out = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      const name = (mat?.getName() ?? "").toLowerCase();
      const alpha = mat ? mat.getBaseColorFactor()[3] : 1;
      const glass =
        !!mat &&
        (mat.getAlphaMode() === "BLEND" ||
          alpha < 0.9 ||
          !!mat.getExtension("KHR_materials_transmission") ||
          /glass|window|pane|vidrio|glas\b/.test(name));
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const idx = prim.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      const v = [0, 0, 0];
      const at = (i) => {
        pos.getElement(idx ? idx.getScalar(i) : i, v);
        return [0, 1, 2].map((r) => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r]);
      };
      for (let t = 0; t + 2 < n; t += 3)
        out.push({ P: [at(t), at(t + 1), at(t + 2)], glass, mat: name });
    }
  }
  return out;
}

/** Ray (origin o, unit dir d) against a triangle: distance or Infinity (both faces). */
function hit(o, d, P) {
  const [a, b, c] = P;
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-12) return Infinity;
  const inv = 1 / det;
  const s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv;
  if (u < -1e-6 || u > 1 + 1e-6) return Infinity;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const w = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
  if (w < -1e-6 || u + w > 1 + 1e-6) return Infinity;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-4 ? t : Infinity;
}

/**
 * The four sides of a model: for each, the grid of first hits looking in.
 * side: { name, axis (the facade runs along x or z), inward unit dir, u range, the plane }.
 */
export function facades(tris, box) {
  const [x0, y0, z0, x1, y1, z1] = box;
  const sides = [
    { name: "front", along: 0, d: [0, 0, -1], plane: z1 + 0.5, u0: x0, u1: x1 },
    { name: "back", along: 0, d: [0, 0, 1], plane: z0 - 0.5, u0: x0, u1: x1 },
    { name: "left", along: 2, d: [1, 0, 0], plane: x0 - 0.5, u0: z0, u1: z1 },
    { name: "right", along: 2, d: [-1, 0, 0], plane: x1 + 0.5, u0: z0, u1: z1 },
  ];
  const out = [];
  for (const s of sides) {
    const nu = Math.max(1, Math.round((s.u1 - s.u0) / STEP)),
      nv = Math.max(1, Math.round((y1 - Math.max(0, y0)) / STEP));
    const v0 = Math.max(0, y0);
    // Bin the triangles by their extent on the facade's plane (0.6 m cells).
    const C = 0.6,
      cu = Math.ceil((s.u1 - s.u0) / C) + 1,
      cv = Math.ceil((y1 - v0) / C) + 1;
    const bins = Array.from({ length: cu * cv }, () => []);
    tris.forEach((t, i) => {
      const us = t.P.map((p) => p[s.along]),
        vs = t.P.map((p) => p[1]);
      const a0 = Math.max(0, Math.floor((Math.min(...us) - s.u0) / C)),
        a1 = Math.min(cu - 1, Math.floor((Math.max(...us) - s.u0) / C)),
        b0 = Math.max(0, Math.floor((Math.min(...vs) - v0) / C)),
        b1 = Math.min(cv - 1, Math.floor((Math.max(...vs) - v0) / C));
      for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) bins[b * cu + a].push(i);
    });
    const depth = new Float32Array(nu * nv).fill(Infinity);
    const glass = new Uint8Array(nu * nv);
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const u = s.u0 + (i + 0.5) * ((s.u1 - s.u0) / nu),
          v = v0 + (j + 0.5) * ((y1 - v0) / nv);
        const o = s.along === 0 ? [u, v, s.plane] : [s.plane, v, u];
        const bin =
          bins[
            Math.min(cv - 1, Math.floor((v - v0) / C)) * cu +
              Math.min(cu - 1, Math.floor((u - s.u0) / C))
          ];
        let best = Infinity,
          g = 0;
        for (const k of bin) {
          const t = hit(o, s.d, tris[k].P);
          if (t < best) {
            best = t;
            g = tris[k].glass ? 1 : 0;
          }
        }
        depth[j * nu + i] = best;
        glass[j * nu + i] = g;
      }
    out.push({ ...s, nu, nv, v0, du: (s.u1 - s.u0) / nu, dv: (y1 - v0) / nv, depth, glass });
  }
  return out;
}

/** The openings of a side: holes framed by wall left, right and above, grown to rectangles. */
export function openings(f) {
  const { nu, nv, depth, glass } = f;
  const reachU = Math.round(REACH / f.du),
    reachV = Math.round(REACH / f.dv);
  const at = (i, j) => depth[j * nu + i];
  // The wall round a sample in one direction: the first shallower, non-glass hit within reach.
  const wall = (i, j, di, dj, t) => {
    for (let k = 1; k <= (di ? reachU : reachV); k++) {
      const a = i + di * k,
        b = j + dj * k;
      if (a < 0 || b < 0 || a >= nu || b >= nv) return null;
      const w = at(a, b);
      if (w < t - THROUGH && !glass[b * nu + a]) return { k, w };
    }
    return null;
  };
  const kind = new Uint8Array(nu * nv); // 1 hole, 2 glass
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const g = glass[j * nu + i];
      const t = at(i, j);
      if (g) {
        kind[j * nu + i] = 2;
        continue;
      }
      if (t !== Infinity && !Number.isFinite(t)) continue;
      const L = wall(i, j, -1, 0, t),
        R = wall(i, j, 1, 0, t),
        U = wall(i, j, 0, 1, t);
      if (L && R && U) kind[j * nu + i] = 1;
    }
  // Connected parts → rectangles.
  const seen = new Uint8Array(nu * nv);
  const parts = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const k0 = kind[j * nu + i];
      if (!k0 || seen[j * nu + i]) continue;
      const stack = [[i, j]];
      seen[j * nu + i] = 1;
      let a0 = i,
        a1 = i,
        b0 = j,
        b1 = j,
        n = 0;
      const deep = [];
      while (stack.length) {
        const [a, b] = stack.pop();
        n++;
        a0 = Math.min(a0, a);
        a1 = Math.max(a1, a);
        b0 = Math.min(b0, b);
        b1 = Math.max(b1, b);
        deep.push(at(a, b));
        for (const [da, db] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const x = a + da,
            y = b + db;
          if (x < 0 || y < 0 || x >= nu || y >= nv) continue;
          if (seen[y * nu + x] || kind[y * nu + x] !== k0) continue;
          seen[y * nu + x] = 1;
          stack.push([x, y]);
        }
      }
      const w = (a1 - a0 + 1) * f.du,
        h = (b1 - b0 + 1) * f.dv;
      if (w < 0.35 || h < 0.35) continue;
      // Wall below (a sill) within 1.4 m: a window; else it reaches a floor: a door or an arch.
      let sill = 0;
      for (let a = a0; a <= a1; a++) {
        const t = at(a, b0);
        const below = wall(a, b0, 0, -1, t);
        if (below && below.k * f.dv < 1.4 && b0 * f.dv > 0.25) sill++;
      }
      // The facade's depth at the opening: the wall left and right of its middle row.
      const mid = Math.round((b0 + b1) / 2);
      const l = wall(a0, mid, -1, 0, at(a0, mid)),
        r = wall(a1, mid, 1, 0, at(a1, mid));
      parts.push({
        glass: k0 === 2,
        // (Glass is a window wherever it stands; a hole is one when it has a sill.)
        window: k0 === 2 || sill > (a1 - a0 + 1) * 0.6,
        u0: f.u0 + a0 * f.du,
        u1: f.u0 + (a1 + 1) * f.du,
        y0: f.v0 + b0 * f.dv,
        y1: f.v0 + (b1 + 1) * f.dv,
        fill: n / ((a1 - a0 + 1) * (b1 - b0 + 1)),
        face: Math.min(l?.w ?? Infinity, r?.w ?? Infinity),
        seeThrough: deep.filter((t) => t === Infinity).length / deep.length,
      });
    }
  return parts;
}

/** Whether a collision box fills most of an opening (model space). */
function blocked(boxes, side, o) {
  if (!boxes?.length) return 0;
  const face =
    side.along === 0
      ? side.plane + side.d[2] * (o.face + 0.15)
      : side.plane + side.d[0] * (o.face + 0.15);
  let covered = 0,
    total = 0;
  for (let u = o.u0 + 0.1; u < o.u1; u += 0.2)
    for (let y = o.y0 + 0.1; y < o.y1; y += 0.2) {
      total++;
      const p = side.along === 0 ? [u, y, face] : [face, y, u];
      if (
        boxes.some(
          (b) =>
            p[0] > b[0] && p[0] < b[3] && p[1] > b[1] && p[1] < b[4] && p[2] > b[2] && p[2] < b[5],
        )
      )
        covered++;
    }
  return total ? covered / total : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = {};
  const ids = Object.entries(manifest.models)
    .filter(([id, e]) => isBuilding(e) && (!only || only.includes(id)))
    .map(([id]) => id);
  for (const id of ids) {
    const e = manifest.models[id];
    const tris = await loadTriangles(modelFile(e.lods[0].file));
    if (!tris.length) continue;
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const t of tris)
      for (const p of t.P)
        for (let k = 0; k < 3; k++) {
          box[k] = Math.min(box[k], p[k]);
          box[k + 3] = Math.max(box[k + 3], p[k]);
        }
    const sides = facades(tris, box);
    const found = [];
    let wallArea = 0;
    for (const s of sides) {
      for (let k = 0; k < s.depth.length; k++)
        if (Number.isFinite(s.depth[k])) wallArea += s.du * s.dv;
      for (const o of openings(s))
        found.push({ side: s.name, ...o, blocked: blocked(collision[id], s, o) });
    }
    const windows = found.filter((o) => o.window);
    const r = {
      size: [box[3] - box[0], box[4] - box[1], box[5] - box[2]].map((v) => +v.toFixed(2)),
      tris: tris.length,
      glassTris: tris.filter((t) => t.glass).length,
      glassMats: [...new Set(tris.filter((t) => t.glass).map((t) => t.mat))],
      wallArea: +wallArea.toFixed(1),
      glazed: windows.filter((o) => o.glass).length,
      open: windows.filter((o) => !o.glass).length,
      openBlocked: windows.filter((o) => !o.glass && o.blocked > 0.5).length,
      doors: found.filter((o) => !o.window && !o.glass).length,
      openings: found.map((o) => ({
        ...o,
        ...Object.fromEntries(
          ["u0", "u1", "y0", "y1", "fill", "face", "seeThrough", "blocked"].map((k) => [
            k,
            +o[k].toFixed(2),
          ]),
        ),
      })),
    };
    report[id] = r;
    console.log(
      id.padEnd(22),
      `glazed ${String(r.glazed).padStart(3)}  open ${String(r.open).padStart(3)} (blocked ${String(r.openBlocked).padStart(3)})  doors ${String(r.doors).padStart(3)}  glassTris ${String(r.glassTris).padStart(5)}  ${r.size.join("x")}`,
    );
  }
  fs.mkdirSync("art/br/build", { recursive: true });
  fs.writeFileSync("art/br/build/window-audit.json", JSON.stringify(report, null, 1));
}
