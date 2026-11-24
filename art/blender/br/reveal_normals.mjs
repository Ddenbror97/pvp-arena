/**
 * Window reveals lit as the wall they cut through (owner, 2026-11-24: "the open windows edges
 * still flicker this white line while running/moving").
 *
 * A window or door cut through a wall leaves its sill's top and its head's underside: faces as
 * deep as the wall (0.3 m) and lying flat. From the street, 30–50 m off at eye height, such a face
 * is a tenth or two of a pixel tall, so 4× MSAA catches it on some frames and misses it on
 * others; lit from above (or below) it is far brighter (or darker) than the wall beside it, so
 * the sill and the head of every opening blinked as a white line while the player moved.
 * Found on the owner's RTX 2050 (gpu-bench, the Bauhaus apartment block from 40 m, walking):
 * picking the triangle under each blinking pixel gave the walls' plaster caps first.
 *
 * Each such cap (a flat face between a wall's two faces, at most `THIN` apart) takes the normal
 * of the wall's outer face. It is then lit like the wall: a sliver of it, or none, looks the
 * same. Up close the sill reads a little flatter. Geometry, collision and colour are unchanged.
 * Writes `<id>.<tag>.lod<N>.glb` and points the manifest's LODs at them.
 *
 *   node art/blender/br/reveal_normals.mjs <manifest.json> --only=apartment [--dry] [--tag=reveal-v1]
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune, unweld, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { modelFile } from "./model-files.mjs";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const dir = "public/fps/br/models";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const TAG = args.find((a) => a.startsWith("--tag="))?.slice(6) ?? "reveal-v1";
const manifestArg = args.find((a) => !a.startsWith("--"));
const ONLY = args
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
if (!manifestArg || !ONLY) throw new Error("usage: reveal_normals.mjs <manifest.json> --only=a,b");
const manifestFile = path.join(dir, manifestArg);
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
/** A cap at most this deep (m): a wall's thickness, not a slab or a floor. */
const THIN = 0.4;
/** Same plane (m). */
const EPS = 0.012;

const report = [];
for (const id of ONLY) {
  const model = manifest.models[id];
  if (!model) throw new Error(`no model ${id}`);
  for (const [level, lod] of model.lods.entries()) {
    if (lod.farFacade) continue;
    const doc = await io.read(modelFile(lod.file));
    await doc.transform(dequantize(), unweld());
    const tris = [];
    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const m = node.getWorldMatrix();
      const w = (v) => [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
      ];
      for (const p of mesh.listPrimitives()) {
        if (p.getMode() !== 4) continue;
        const mat = p.getMaterial();
        if (mat && mat.getAlphaMode() !== "OPAQUE") continue;
        const pos = p.getAttribute("POSITION");
        if (!p.getAttribute("NORMAL")) continue;
        for (let i = 0; i + 2 < pos.getCount(); i += 3) {
          const v = [0, 1, 2].map((k) => w(pos.getElement(i + k, [])));
          const u = v[1].map((x, k) => x - v[0][k]),
            q = v[2].map((x, k) => x - v[0][k]);
          let n = [u[1] * q[2] - u[2] * q[1], u[2] * q[0] - u[0] * q[2], u[0] * q[1] - u[1] * q[0]];
          const len = Math.hypot(...n);
          if (len < 1e-6) continue;
          n = n.map((x) => x / len);
          tris.push({ p, i, v, n, m });
        }
      }
    }
    // The walls' faces: planes x = c (normal ±x) and z = c (normal ±z), each with its y span and
    // its span along the wall (z for an x plane, x for a z plane).
    const planes = { 0: new Map(), 2: new Map() };
    const centre = [0, 0, 0];
    for (const t of tris) for (const v of t.v) for (const k of [0, 1, 2]) centre[k] += v[k];
    for (const k of [0, 1, 2]) centre[k] /= tris.length * 3;
    const range = (t, k) => [Math.min(...t.v.map((v) => v[k])), Math.max(...t.v.map((v) => v[k]))];
    for (const t of tris)
      for (const ax of [0, 2])
        if (Math.abs(t.n[ax]) > 0.99) {
          const key = Math.round(t.v[0][ax] / EPS);
          const span = planes[ax].get(key) ?? [];
          span.push([...range(t, 1), Math.sign(t.n[ax]), ...range(t, 2 - ax)]);
          planes[ax].set(key, span);
        }
    /**
     * A wall face on plane `ax` = c facing `sign`, overlapping heights [y0, y1] and [a0, a1] along,
     * at least `wide` long.
     */
    const faceAt = (ax, c, sign, y0, y1, a0, a1, wide = 0) => {
      for (const dk of [-1, 0, 1])
        for (const [sy0, sy1, s, sa0, sa1] of planes[ax].get(Math.round(c / EPS) + dk) ?? [])
          if (
            s === sign &&
            sy1 >= y0 - EPS &&
            sy0 <= y1 + EPS &&
            sa1 >= a0 - EPS &&
            sa0 <= a1 + EPS &&
            sa1 - sa0 >= wide - EPS
          )
            return true;
      return false;
    };
    /** Between a wall's two faces across `ax`: thin enough, the wall's faces on both planes. */
    const across = (t, ax) => {
      const [lo, hi] = range(t, ax);
      return hi - lo <= THIN && hi - lo >= 0.05 ? [lo, hi] : null;
    };
    const outwardOf = (ax, lo, hi) => {
      const o = Math.abs(hi - centre[ax]) > Math.abs(lo - centre[ax]) ? 1 : -1;
      return ax === 0 ? [o, 0, 0] : [0, 0, o];
    };
    const found = new Map(); // tri -> outward normal (world)
    // 1. Sills and heads: flat faces between a wall's two faces, gathered into strips along the
    //    wall, where the wall goes on above a sill (or below a head) beside the strip: the
    //    opening's jambs. A wall's top (a parapet's, a garden wall's), a plank or a beam has no
    //    wall beside it above (below), and keeps its normal.
    const strips = new Map();
    for (const t of tris) {
      if (Math.abs(t.n[1]) < 0.99) continue;
      const y = t.v[0][1];
      for (const ax of [0, 2]) {
        const lh = across(t, ax);
        if (!lh) continue;
        const [a0, a1] = range(t, 2 - ax);
        if (!faceAt(ax, lh[0], -1, y, y, a0, a1) || !faceAt(ax, lh[1], 1, y, y, a0, a1)) continue;
        const key = [
          ax,
          Math.round(lh[0] / EPS),
          Math.round(lh[1] / EPS),
          Math.round(y / EPS),
          Math.sign(t.n[1]),
        ].join("|");
        const list = strips.get(key) ?? [];
        list.push({ t, a0, a1, ax, lo: lh[0], hi: lh[1], y, up: t.n[1] > 0 });
        strips.set(key, list);
        break;
      }
    }
    const REACH = 0.6;
    /** The wall beside an opening: a pier at least this long (a shelf's upright is not). */
    const PIER = 0.3;
    const sills = [];
    for (const list of strips.values()) {
      list.sort((p, q) => p.a0 - q.a0);
      for (let i = 0; i < list.length;) {
        let j = i,
          end = list[i].a1;
        while (j + 1 < list.length && list[j + 1].a0 <= end + EPS)
          end = Math.max(end, list[++j].a1);
        const { ax, lo, hi, y, up } = list[i];
        const yy = up ? y + 0.2 : y - 0.2;
        const a0 = list[i].a0 - REACH,
          a1 = end + REACH;
        if (faceAt(ax, lo, -1, yy, yy, a0, a1, PIER) && faceAt(ax, hi, 1, yy, yy, a0, a1, PIER)) {
          for (let k = i; k <= j; k++) found.set(list[k].t, outwardOf(ax, lo, hi));
          if (up)
            sills.push({ ax, lo, hi, y, a0: list[i].a0, a1: end, out: outwardOf(ax, lo, hi) });
        } else if (process.env.REVEAL_DEBUG)
          console.log(
            `  kept ${up ? "top" : "underside"} y=${y.toFixed(2)} ax=${ax} ${lo.toFixed(2)}..${hi.toFixed(2)} along ${list[i].a0.toFixed(2)}..${end.toFixed(2)} (${j - i + 1} tris)`,
          );
        i = j + 1;
      }
    }
    // 2. Tops level with a sill just inside it (a kitchen worktop, a desk along the window wall):
    //    seen from the street through the opening they run on from the sill as one line, as thin.
    //    They take the sill's normal. (Within 4 m of the wall.)
    let flush = 0;
    const tops = tris.filter((t) => t.n[1] > 0.99);
    /** Another top touching this one a step up or down (a flight of stairs), or a floor's at its level. */
    const stepBeside = (t) => {
      const [x0, x1] = range(t, 0),
        [z0, z1] = range(t, 2);
      const y = t.v[0][1];
      return tops.some((o) => {
        if (o === t || found.has(o)) return false;
        const dy = Math.abs(o.v[0][1] - y);
        // A step up or down, or a floor or roof going on at the same level.
        if (dy < 0.01) {
          const [p0, p1] = range(o, 0),
            [q0, q1] = range(o, 2);
          if ((p1 - p0) * (q1 - q0) < 1) return false;
          // (Not the other half of its own top.)
          if (p0 >= x0 - EPS && p1 <= x1 + EPS && q0 >= z0 - EPS && q1 <= z1 + EPS) return false;
        } else if (dy < 0.08 || dy > 0.4) return false;
        const [p0, p1] = range(o, 0),
          [q0, q1] = range(o, 2);
        return p0 <= x1 + 0.05 && p1 >= x0 - 0.05 && q0 <= z1 + 0.05 && q1 >= z0 - 0.05;
      });
    };
    /** A sill at a floor's level inside (a door's threshold, a window to the floor): no worktop. */
    const floorLevel = (sl) =>
      (sl.floor ??= tops.some((o) => {
        if (found.has(o) || Math.abs(o.v[0][1] - sl.y) > 0.03) return false;
        const [c0, c1] = range(o, sl.ax),
          [a0, a1] = range(o, 2 - sl.ax);
        if ((c1 - c0) * (a1 - a0) < 3) return false;
        const inner = sl.out[sl.ax] > 0 ? [sl.lo - 4.0, sl.lo + EPS] : [sl.hi - EPS, sl.hi + 4.0];
        return c1 >= inner[0] && c0 <= inner[1] && a1 >= sl.a0 && a0 <= sl.a1;
      }));
    for (const t of tris) {
      if (t.n[1] < 0.99 || found.has(t)) continue;
      const y = t.v[0][1];
      for (const sl of sills) {
        if (Math.abs(y - sl.y) > 0.03 || floorLevel(sl)) continue;
        const [c0, c1] = range(t, sl.ax);
        const [b0, b1] = range(t, 2 - sl.ax);
        // A worktop's depth, not a floor's or a landing's; and no step beside it.
        if (c1 - c0 > 4.0 || Math.min(c1 - c0, b1 - b0) > 0.7 || stepBeside(t)) continue;
        // On the inner side of the wall: the side towards the model's middle.
        const inner = sl.out[sl.ax] > 0 ? [sl.lo - 4.0, sl.lo + EPS] : [sl.hi - EPS, sl.hi + 4.0];
        if (c0 < inner[0] || c1 > inner[1]) continue;
        const [a0, a1] = range(t, 2 - sl.ax);
        if (a1 < sl.a0 - EPS || a0 > sl.a1 + EPS) continue;
        found.set(t, sl.out);
        if (process.env.REVEAL_DEBUG)
          console.log(
            `  level y=${y.toFixed(2)} ${sl.ax ? "z" : "x"} ${c0.toFixed(2)}..${c1.toFixed(2)} along ${a0.toFixed(2)}..${a1.toFixed(2)}`,
          );
        flush++;
        break;
      }
    }
    // 3. Jambs: upright faces across a wall's thickness, facing along it into an opening, with
    //    the wall's two faces running on from them at least WIDE on the far side, and the
    //    opening's other jamb facing them across it (a post's or a beam's end has neither).
    const WIDE = 0.4;
    /** The wall's face on plane `ax` = c facing `sign`, at height y, reaching from b = c0 to c1. */
    const wallFrom = (ax, c, sign, y, from, dir) => {
      for (const dk of [-1, 0, 1])
        for (const [sy0, sy1, sg, sa0, sa1] of planes[ax].get(Math.round(c / EPS) + dk) ?? []) {
          if (sg !== sign || y < sy0 - EPS || y > sy1 + EPS) continue;
          // A face that runs from the jamb (within EPS) away from the opening for WIDE.
          if (
            dir < 0
              ? Math.abs(sa1 - from) < EPS && sa1 - sa0 >= WIDE - EPS
              : Math.abs(sa0 - from) < EPS && sa1 - sa0 >= WIDE - EPS
          )
            return true;
        }
      return false;
    };
    const candidates = new Map();
    for (const t of tris)
      for (const b of [0, 2]) {
        if (Math.abs(t.n[b]) < 0.99) continue;
        const ax = 2 - b;
        const lh = across(t, ax);
        if (!lh) continue;
        const c = t.v[0][b];
        const s = Math.sign(t.n[b]);
        const [y0, y1] = range(t, 1);
        if (y1 - y0 < 0.05) continue;
        const ym = (y0 + y1) / 2;
        // The wall lies on the side away from the jamb's normal.
        if (!wallFrom(ax, lh[0], -1, ym, c, -s) || !wallFrom(ax, lh[1], 1, ym, c, -s)) continue;
        const key = [b, Math.round(lh[0] / EPS), Math.round(lh[1] / EPS)].join("|");
        const list = candidates.get(key) ?? [];
        list.push({ t, c, s, y0, y1, ax, lo: lh[0], hi: lh[1] });
        candidates.set(key, list);
      }
    let jambs = 0;
    for (const list of candidates.values())
      for (const j of list) {
        const other = list.some(
          (o) =>
            o.s === -j.s &&
            (o.c - j.c) * j.s >= 0.2 &&
            (o.c - j.c) * j.s <= 8 &&
            o.y1 >= j.y0 - EPS &&
            o.y0 <= j.y1 + EPS,
        );
        if (!other) continue;
        if (!found.has(j.t)) jambs++;
        found.set(j.t, outwardOf(j.ax, j.lo, j.hi));
      }
    let caps = 0;
    for (const [t, out] of found) {
      // The world normal back into the node's space (rotation and uniform scale only).
      const m = t.m;
      const s = Math.hypot(m[0], m[1], m[2]) || 1;
      const ln = [
        (m[0] * out[0] + m[1] * out[1] + m[2] * out[2]) / s,
        (m[4] * out[0] + m[5] * out[1] + m[6] * out[2]) / s,
        (m[8] * out[0] + m[9] * out[1] + m[10] * out[2]) / s,
      ];
      const nor = t.p.getAttribute("NORMAL");
      for (let k = 0; k < 3; k++) nor.setElement(t.i + k, ln);
      caps++;
    }
    report.push(
      `${id} lod${level}: ${caps} faces (${caps - jambs - flush} sills/heads, ${flush} level with a sill, ${jambs} jambs)`,
    );
    if (dry || !caps) continue;
    await doc.transform(
      prune({ keepAttributes: true }),
      weld(),
      meshopt({ encoder: MeshoptEncoder, level: "medium", quantizePosition: 16 }),
    );
    const file = `/fps/br/models/${id}.${TAG}.lod${level}.glb`;
    await io.write("public" + file, doc);
    model.lods[level] = { ...lod, file, kB: Math.round(fs.statSync("public" + file).size / 1024) };
  }
}
if (!dry) fs.writeFileSync(manifestFile, JSON.stringify(manifest));
console.log(report.join("\n"));
