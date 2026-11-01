/**
 * LOST TRAIL tree skeletons from EZ-Tree (MIT, https://github.com/dgreenheck/ez-tree): trunk,
 * branches and leaf cards as OBJ, per archetype × seed × detail level. Blender
 * (build_trail.py) adds buttress roots, moss, lianas, tropical bark/leaf materials and places
 * them as GPU instances.
 *
 *   node generate_trees.mjs <out_dir>      (needs @dgreenheck/ez-tree@1.1.0 + three)
 *
 * Units are metres after Blender's per-archetype scale. "near" is for trees beside the
 * playable area; "far" (fewer ring segments, fewer and larger leaves) for the background.
 */
import "./shim.mjs";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
const { Tree, Billboard } = await import("@dgreenheck/ez-tree");

const OUT = process.argv[2] ?? "build/trees";
fs.mkdirSync(OUT, { recursive: true });

/** Rainforest archetypes (EZ-Tree options merged over its defaults). */
const ARCHETYPES = {
  // Emergent kapok-like giant: very tall clean trunk, crown only at the top.
  emergent: {
    branch: {
      levels: 3,
      angle: { 1: 72, 2: 55, 3: 50 },
      children: { 0: 7, 1: 5, 2: 4 },
      force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.012 },
      gnarliness: { 0: 0.04, 1: 0.18, 2: 0.25, 3: 0.05 },
      length: { 0: 30, 1: 10, 2: 5.5, 3: 1.6 },
      radius: { 0: 1.15, 1: 0.42, 2: 0.55, 3: 0.6 },
      sections: { 0: 14, 1: 8, 2: 6, 3: 4 },
      segments: { 0: 12, 1: 7, 2: 5, 3: 3 },
      start: { 1: 0.74, 2: 0.25, 3: 0.3 },
      taper: { 0: 0.72, 1: 0.7, 2: 0.7, 3: 0.7 },
    },
    leaves: { count: 7, size: 2.4, sizeVariance: 0.6, angle: 35, start: 0.1 },
  },
  // Tall straight hardwood with a mid-height crown.
  hardwood: {
    branch: {
      levels: 3,
      angle: { 1: 65, 2: 55, 3: 45 },
      children: { 0: 8, 1: 5, 2: 4 },
      force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.015 },
      gnarliness: { 0: 0.06, 1: 0.2, 2: 0.3, 3: 0.05 },
      length: { 0: 22, 1: 8, 2: 4.5, 3: 1.4 },
      radius: { 0: 0.8, 1: 0.45, 2: 0.55, 3: 0.6 },
      sections: { 0: 12, 1: 8, 2: 6, 3: 4 },
      segments: { 0: 10, 1: 6, 2: 5, 3: 3 },
      start: { 1: 0.6, 2: 0.25, 3: 0.3 },
      taper: { 0: 0.72, 1: 0.7, 2: 0.7, 3: 0.7 },
    },
    leaves: { count: 6, size: 2.1, sizeVariance: 0.6, angle: 30, start: 0.1 },
  },
  // Broad, spreading canopy tree (umbrella crown).
  broad: {
    branch: {
      levels: 3,
      angle: { 1: 82, 2: 60, 3: 50 },
      children: { 0: 6, 1: 6, 2: 4 },
      force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.02 },
      gnarliness: { 0: 0.1, 1: 0.22, 2: 0.3, 3: 0.05 },
      length: { 0: 16, 1: 11, 2: 5, 3: 1.4 },
      radius: { 0: 0.9, 1: 0.5, 2: 0.55, 3: 0.6 },
      sections: { 0: 10, 1: 9, 2: 6, 3: 4 },
      segments: { 0: 10, 1: 7, 2: 5, 3: 3 },
      start: { 1: 0.55, 2: 0.2, 3: 0.3 },
      taper: { 0: 0.7, 1: 0.7, 2: 0.7, 3: 0.7 },
    },
    leaves: { count: 6, size: 2.3, sizeVariance: 0.6, angle: 35, start: 0.1 },
  },
  // Slender secondary-growth tree for the midstory.
  slender: {
    branch: {
      levels: 2,
      angle: { 1: 55, 2: 50 },
      children: { 0: 9, 1: 5 },
      force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.02 },
      gnarliness: { 0: 0.08, 1: 0.25, 2: 0.3 },
      length: { 0: 11, 1: 4, 2: 1.6 },
      radius: { 0: 0.3, 1: 0.5, 2: 0.6 },
      sections: { 0: 10, 1: 6, 2: 4 },
      segments: { 0: 7, 1: 5, 2: 3 },
      start: { 1: 0.5, 2: 0.3 },
      taper: { 0: 0.75, 1: 0.7, 2: 0.7 },
    },
    leaves: { count: 8, size: 1.5, sizeVariance: 0.5, angle: 30, start: 0.2 },
  },
  // Twisted jungle tree with a low, gnarled crown.
  twisted: {
    branch: {
      levels: 3,
      angle: { 1: 60, 2: 55, 3: 50 },
      children: { 0: 6, 1: 4, 2: 4 },
      force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.005 },
      gnarliness: { 0: 0.3, 1: 0.35, 2: 0.35, 3: 0.1 },
      length: { 0: 10, 1: 7, 2: 3.5, 3: 1.2 },
      radius: { 0: 0.7, 1: 0.5, 2: 0.55, 3: 0.6 },
      sections: { 0: 12, 1: 8, 2: 6, 3: 4 },
      segments: { 0: 9, 1: 6, 2: 5, 3: 3 },
      start: { 1: 0.35, 2: 0.25, 3: 0.3 },
      taper: { 0: 0.65, 1: 0.7, 2: 0.7, 3: 0.7 },
    },
    leaves: { count: 6, size: 1.9, sizeVariance: 0.6, angle: 35, start: 0.1 },
  },
};
/** Detail levels: fewer ring segments/sections and fewer, larger leaf cards with distance. */
function detailLevel(o, detail) {
  const f = { near: [0.8, 0.8, 0.62, 1.2], far: [0.5, 0.55, 0.36, 1.55] }[detail];
  for (const k of Object.keys(o.branch.segments)) o.branch.segments[k] = Math.max(3, Math.round(o.branch.segments[k] * f[0]));
  for (const k of Object.keys(o.branch.sections)) o.branch.sections[k] = Math.max(3, Math.round(o.branch.sections[k] * f[1]));
  o.leaves.count = Math.max(2, Math.round(o.leaves.count * f[2]));
  o.leaves.size *= f[3];
  if (detail === "far") {
    o.leaves.billboard = Billboard.Single;
    // Drop the finest twig level; its parent level carries larger leaf clusters instead.
    if (o.branch.levels > 2) {
      o.branch.levels -= 1;
      o.leaves.count = Math.max(3, Math.round(o.leaves.count * 2.2));
      o.leaves.size *= 1.35;
    }
  }
}
const merge = (dst, src) => {
  for (const [k, v] of Object.entries(src))
    if (v && typeof v === "object" && !Array.isArray(v)) merge((dst[k] ??= {}), v);
    else dst[k] = v;
};

const exporter = new OBJExporter();
const stats = [];
for (const [name, spec] of Object.entries(ARCHETYPES))
  for (const seed of [11, 23, 37])
    for (const detail of ["near", "far"]) {
      const tree = new Tree();
      tree.options.seed = seed;
      tree.options.bark.textured = false;
      tree.options.leaves.billboard = Billboard.Double;
      tree.options.leaves.alphaTest = 0.5;
      merge(tree.options, structuredClone(spec));
      detailLevel(tree.options, detail);
      tree.generate();
      let tris = 0;
      tree.traverse((o) => {
        if (!o.isMesh) return;
        o.name = o.material?.map === undefined && o.geometry.attributes.uv ? o.name : o.name;
        tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      });
      // Name the two meshes so Blender can assign bark vs leaf materials.
      const meshes = [];
      tree.traverse((o) => o.isMesh && meshes.push(o));
      meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count);
      for (const m of meshes) m.name = m.material.alphaTest > 0 || m.material.transparent ? "leaves" : "bark";
      tree.updateMatrixWorld(true);
      const file = path.join(OUT, `${name}-${seed}-${detail}.obj`);
      fs.writeFileSync(file, exporter.parse(tree));
      stats.push({ name, seed, detail, tris: Math.round(tris) });
    }
console.table(stats);
fs.writeFileSync(path.join(OUT, "stats.json"), JSON.stringify(stats, null, 1));
