import * as THREE from "three";
import { BRIDGE, bridgeSpans } from "./bridges";
import type { Heightfield } from "./heightfield";
import type { WorldMeta } from "./world";

/**
 * Built infrastructure drawn from world data (no downloads): both strait bridges in one draw
 * (from the same spans as their collision boxes) and the runways as asphalt strips with centre
 * dashes and edge lines in one more draw, laid on the heightfield.
 */
export type StructuresControls = { root: THREE.Object3D; dispose: () => void };

export function createStructures(meta: WorldMeta, hf: Heightfield): StructuresControls {
  const root = new THREE.Group();
  root.name = "br-structures";
  const bridges = bridgeMesh(meta, hf);
  const runways = runwayMesh(meta, hf);
  root.add(bridges, runways);
  return {
    root,
    dispose() {
      for (const m of [bridges, runways]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
  };
}

/** Box from 8 corners into position/colour arrays (flat-shaded: non-indexed with normals). */
function pushQuad(
  pos: number[],
  col: number[],
  a: number[],
  b: number[],
  c: number[],
  d: number[],
  colour: [number, number, number],
) {
  for (const v of [a, b, c, a, c, d]) {
    pos.push(v[0]!, v[1]!, v[2]!);
    col.push(...colour);
  }
}

function prism(
  pos: number[],
  col: number[],
  corners: Array<[number, number]>,
  y0: [number, number, number, number],
  y1: [number, number, number, number],
  colour: [number, number, number],
) {
  // corners: 4 ground-plane points in order (a-left, a-right, b-right, b-left); y0 bottom, y1 top.
  const top = corners.map(([x, z], i) => [x, y1[i]!, z]);
  const bot = corners.map(([x, z], i) => [x, y0[i]!, z]);
  pushQuad(pos, col, top[0]!, top[3]!, top[2]!, top[1]!, colour);
  pushQuad(pos, col, bot[0]!, bot[1]!, bot[2]!, bot[3]!, colour);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    pushQuad(pos, col, bot[i]!, bot[j]!, top[j]!, top[i]!, colour);
  }
}

function bridgeMesh(meta: WorldMeta, hf: Heightfield) {
  const pos: number[] = [],
    col: number[] = [];
  const concrete: [number, number, number] = [0.42, 0.41, 0.39],
    asphalt: [number, number, number] = [0.16, 0.16, 0.17],
    rail: [number, number, number] = [0.55, 0.55, 0.53];
  for (const span of bridgeSpans(meta, hf)) {
    const [sx, sz] = span.side;
    const half = span.width / 2;
    for (let k = 0; k + 1 < span.points.length; k++) {
      const [x0, y0, z0] = span.points[k]!,
        [x1, y1, z1] = span.points[k + 1]!;
      const at = (x: number, z: number, off: number): [number, number] => [
        x + sx * off,
        z + sz * off,
      ];
      const ring = (off0: number, off1: number) => [
        at(x0, z0, off0),
        at(x0, z0, off1),
        at(x1, z1, off1),
        at(x1, z1, off0),
      ];
      // Road surface over a concrete slab.
      prism(
        pos,
        col,
        ring(half, -half),
        [
          y0 - BRIDGE.thickness,
          y0 - BRIDGE.thickness,
          y1 - BRIDGE.thickness,
          y1 - BRIDGE.thickness,
        ],
        [y0 - 0.05, y0 - 0.05, y1 - 0.05, y1 - 0.05],
        concrete,
      );
      prism(
        pos,
        col,
        ring(half - BRIDGE.railWidth, -half + BRIDGE.railWidth),
        [y0 - 0.05, y0 - 0.05, y1 - 0.05, y1 - 0.05],
        [y0, y0, y1, y1],
        asphalt,
      );
      for (const edge of [half, -half]) {
        const inner = edge - Math.sign(edge) * BRIDGE.railWidth;
        prism(
          pos,
          col,
          ring(edge, inner),
          [y0, y0, y1, y1],
          [
            y0 + BRIDGE.railHeight,
            y0 + BRIDGE.railHeight,
            y1 + BRIDGE.railHeight,
            y1 + BRIDGE.railHeight,
          ],
          rail,
        );
      }
    }
    const every = Math.round(BRIDGE.pierEvery / BRIDGE.step);
    for (let k = every; k < span.points.length - every / 2; k += every) {
      const [x, y, z] = span.points[k]!;
      const floor = Math.min(hf.heightAt(x, z), -1);
      const h = BRIDGE.pierSize / 2;
      const bottom = y - BRIDGE.thickness;
      prism(
        pos,
        col,
        [
          [x - h, z - h],
          [x + h, z - h],
          [x + h, z + h],
          [x - h, z + h],
        ],
        [floor, floor, floor, floor],
        [bottom, bottom, bottom, bottom],
        concrete,
      );
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
  );
  mesh.name = "br-bridges";
  return mesh;
}

function runwayMesh(meta: WorldMeta, hf: Heightfield) {
  const pos: number[] = [],
    col: number[] = [];
  const asphalt: [number, number, number] = [0.13, 0.13, 0.14],
    paint: [number, number, number] = [0.8, 0.8, 0.78];
  const lift = 0.08; // above the terrain (with polygon offset) so the strip never z-fights
  for (const r of meta.runways) {
    const [ax, az] = r.a,
      [bx, bz] = r.b;
    const length = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / length,
      dz = (bz - az) / length;
    const sx = -dz,
      sz = dx;
    const step = 10;
    const strip = (
      from: number,
      to: number,
      off0: number,
      off1: number,
      colour: [number, number, number],
      extra = 0,
    ) => {
      for (let s = from; s < to; s += step) {
        const e = Math.min(to, s + step);
        const p = (t: number, off: number) => {
          const x = ax + dx * t + sx * off,
            z = az + dz * t + sz * off;
          return [x, hf.heightAt(x, z) + lift + extra, z];
        };
        pushQuad(pos, col, p(s, off0), p(e, off0), p(e, off1), p(s, off1), colour);
      }
    };
    const half = r.width / 2;
    strip(0, length, half, -half, asphalt);
    // Edge lines and centre dashes (paint sits a few millimetres above the asphalt).
    strip(0, length, half - 1, half - 1.6, paint, 0.01);
    strip(0, length, -half + 1.6, -half + 1, paint, 0.01);
    for (let s = 40; s < length - 40; s += 50) strip(s, s + 25, 0.45, -0.45, paint, 0.01);
  }
  // Roads: asphalt ribbons along the centrelines, following the (road-smoothed) terrain.
  const road: [number, number, number] = [0.2, 0.2, 0.21];
  for (const r of meta.roads) {
    const half = r.width / 2;
    for (let k = 0; k + 1 < r.points.length; k++) {
      const [ax, az] = r.points[k]!,
        [bx, bz] = r.points[k + 1]!;
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 0.01) continue;
      // Mitre-free: each segment overlaps its neighbour a little so joints have no gaps.
      const dx = (bx - ax) / length,
        dz = (bz - az) / length;
      const sx = -dz,
        sz = dx;
      const n = Math.max(1, Math.ceil(length / 8));
      for (let i = 0; i < n; i++) {
        const t0 = (i / n) * length - (i === 0 ? half * 0.5 : 0),
          t1 = ((i + 1) / n) * length + (i === n - 1 ? half * 0.5 : 0);
        const p = (t: number, off: number) => {
          const x = ax + dx * t + sx * off,
            z = az + dz * t + sz * off;
          return [x, hf.heightAt(x, z) + lift, z];
        };
        pushQuad(pos, col, p(t0, half), p(t1, half), p(t1, -half), p(t0, -half), road);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.name = "br-runways";
  return mesh;
}
