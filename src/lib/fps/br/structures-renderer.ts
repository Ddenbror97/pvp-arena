import * as THREE from "three";
import { BRIDGE, bridgeSpans, damBase } from "./bridges";
import type { Heightfield } from "./heightfield";
import { GROUND, type GroundLayer } from "./terrain";
import { islandWalls } from "./walls";
import type { WorldMeta } from "./world";

/**
 * Built infrastructure drawn from world data (no downloads): both strait bridges in one draw
 * (from the same spans as their collision boxes) and the runways as asphalt strips with centre
 * dashes and edge lines in one more draw, laid on the heightfield.
 */
export type StructuresControls = {
  root: THREE.Object3D;
  /** The asphalt ground texture on the roads and runways (near the camera, as the terrain). */
  setGround: (asphalt: GroundLayer | null, range: number) => void;
  dispose: () => void;
};

export function createStructures(meta: WorldMeta, hf: Heightfield): StructuresControls {
  const root = new THREE.Group();
  root.name = "br-structures";
  const bridges = bridgeMesh(meta, hf);
  const runways = runwayMesh(meta, hf);
  root.add(bridges, runways);
  return {
    root,
    setGround(asphalt, range) {
      const u = (runways.material as THREE.Material).userData["ground"] as RoadUniforms;
      if (asphalt) {
        u.uGroundA.value = asphalt.albedo;
        u.uLayer.value = asphalt.layer;
        u.uScale.value = asphalt.scale;
        u.uTint.value.copy(asphalt.tint);
        u.uFar.value.copy(asphalt.far);
      }
      u.uRange.value = Math.max(1, range);
      u.uOn.value = asphalt || u.uOn.value ? (range > 0 ? 1 : 0) : 0;
    },
    dispose() {
      for (const m of [bridges, runways]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
  };
}

type RoadUniforms = {
  uGroundA: { value: THREE.DataArrayTexture };
  uOn: { value: number };
  uRange: { value: number };
  uLayer: { value: number };
  uScale: { value: number };
  uTint: { value: THREE.Vector3 };
  uFar: { value: THREE.Vector3 };
};

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
      // Road surface over a concrete slab (a dam: the wall down to the ground, as collided).
      const base = span.solid ? damBase(hf, ring(half, -half)) : 0;
      prism(
        pos,
        col,
        ring(half, -half),
        span.solid
          ? [base, base, base, base]
          : [
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
    if (span.solid) continue;
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
  // Free-standing walls (Blackwater Prison): concrete runs with a darker coping, same draw.
  const coping: [number, number, number] = [0.33, 0.32, 0.31];
  for (const w of islandWalls(meta)) {
    const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const sx = (-(w.b[1] - w.a[1]) / len) * (w.thickness / 2),
      sz = ((w.b[0] - w.a[0]) / len) * (w.thickness / 2);
    const corners: Array<[number, number]> = [
      [w.a[0] + sx, w.a[1] + sz],
      [w.a[0] - sx, w.a[1] - sz],
      [w.b[0] - sx, w.b[1] - sz],
      [w.b[0] + sx, w.b[1] + sz],
    ];
    const at = (y: number): [number, number, number, number] => [y, y, y, y];
    prism(pos, col, corners, at(w.base), at(w.top - 0.4), concrete);
    prism(pos, col, corners, at(w.top - 0.4), at(w.top), coping);
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
        // Each edge at least as high as the centreline: the carriageway is graded level across,
        // but the terrain's 3.9 m grid blends the roadside ditch into the edge samples, and a
        // ribbon sagging below its own crown let a strip of grass show down the middle.
        const p = (t: number, off: number) => {
          const x = ax + dx * t + sx * off,
            z = az + dz * t + sz * off;
          const centre = hf.heightAt(ax + dx * t, az + dz * t);
          return [x, Math.max(hf.heightAt(x, z), centre) + lift, z];
        };
        pushQuad(pos, col, p(t0, half), p(t1, half), p(t1, -half), p(t0, -half), road);
      }
      // Round joint where the road bends (over ~10°): a small fan fills the notch between the
      // two segments. Gentle curves need none (keeps the road mesh small).
      const prev = r.points[k - 1];
      const bend =
        prev &&
        Math.abs(
          Math.atan2(
            (ax - prev[0]) * (bz - az) - (az - prev[1]) * (bx - ax),
            (ax - prev[0]) * (bx - ax) + (az - prev[1]) * (bz - az),
          ),
        );
      if (prev && bend! > 0.17) {
        const [px, pz] = [ax, az];
        const y = (x: number, z: number) => Math.max(hf.heightAt(x, z), hf.heightAt(px, pz)) + lift;
        const n = 6;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2,
            a1 = ((i + 1) / n) * Math.PI * 2;
          const x0 = px + Math.cos(a0) * half,
            z0 = pz + Math.sin(a0) * half,
            x1 = px + Math.cos(a1) * half,
            z1 = pz + Math.sin(a1) * half;
          for (const v of [
            [px, y(px, pz), pz],
            [x1, y(x1, z1), z1],
            [x0, y(x0, z0), z0],
          ]) {
            pos.push(v[0]!, v[1]!, v[2]!);
            col.push(...road);
          }
        }
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
  // Asphalt grain near the camera (the terrain's ground texture, setGround): the dark surfaces
  // take it fully, the paint a little; the mean colour stays the vertex colour.
  const uniforms: RoadUniforms = {
    uGroundA: { value: new THREE.DataArrayTexture(new Uint8Array([128, 128, 128, 255]), 1, 1, 1) },
    uOn: { value: 0 },
    uRange: { value: GROUND.range },
    uLayer: { value: 0 },
    uScale: { value: 0.2 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uFar: { value: new THREE.Vector3(0.25, 0.25, 0.25) },
  };
  uniforms.uGroundA.value.needsUpdate = true;
  material.userData["ground"] = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRoadWorld;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvRoadWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        precision highp sampler2DArray;
        uniform sampler2DArray uGroundA;
        uniform float uOn, uRange, uLayer, uScale;
        uniform vec3 uTint, uFar;
        varying vec3 vRoadWorld;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          float near = uOn * (1.0 - smoothstep(uRange * 0.6, uRange, distance(vRoadWorld, cameraPosition)));
          if (near > 0.0) {
            vec3 t = texture(uGroundA, vec3(vRoadWorld.xz * uScale, uLayer)).rgb;
            t = t * t * uTint / max(uFar, vec3(1e-3));
            float dark = 1.0 - smoothstep(0.25, 0.45, dot(diffuseColor.rgb, vec3(0.3333)));
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * t, near * mix(0.3, 1.0, dark));
          }
        }`,
      );
  };
  material.customProgramCacheKey = () => "br-roads-v1";
  const mesh = new THREE.Mesh(g, material);
  mesh.name = "br-runways";
  return mesh;
}

/**
 * Power-line wires between consecutive poles of the layout (layout.ts powerLines pushes them in
 * order along each road; wildlands pushes the high-voltage pylons in order along each line): a
 * wire from every insulator tip to the matching tip (same height, nearest) of the next pole,
 * sagging mid-span, in one line draw. Wires are cosmetic: no collision, and too thin to hide
 * anything.
 */
export function createPowerLines(
  layout: ReadonlyArray<{ model: string; x: number; y: number; z: number; turn: number }>,
): { root: THREE.Object3D; dispose: () => void } {
  // Tips listed in pairs, one pair per crossarm level: a wire runs from each tip to the
  // nearest tip of the same level on the next pole of the line (of any of its models).
  const LINES: Array<{
    models: Record<string, Array<[number, number, number]>>;
    sag: number;
    maxSpan: number;
  }> = [
    {
      models: {
        "power-pole": [
          [-0.9, 8.75, 0],
          [0.9, 8.75, 0],
        ],
        // The transformer pole's crossarm insulators (pole-transformer.lod0.glb).
        "pole-transformer": [
          [-1.75, 9.05, -0.29],
          [1.75, 9.05, -0.29],
        ],
      },
      sag: 0.6,
      maxSpan: 70,
    },
    // The pylon's insulator ends (pylon.lod0.glb): two arms each side, at 16.4 m and 24.7 m.
    {
      models: {
        pylon: [
          [-6.8, 16.4, 0],
          [6.8, 16.4, 0],
          [-6.0, 24.7, 0],
          [6.0, 24.7, 0],
        ],
      },
      sag: 5,
      maxSpan: 420,
    },
  ];
  const SEGMENTS = 8;
  const tip = (
    p: { x: number; y: number; z: number; turn: number },
    t: [number, number, number],
  ) => {
    const a = (p.turn * Math.PI) / 2;
    // three.js rotation about +y by a: x' = x cos a + z sin a, z' = -x sin a + z cos a.
    return [
      p.x + t[0] * Math.cos(a) + t[2] * Math.sin(a),
      p.y + t[1],
      p.z - t[0] * Math.sin(a) + t[2] * Math.cos(a),
    ] as const;
  };
  const pos: number[] = [];
  for (const line of LINES) {
    const poles = layout.filter((p) => p.model in line.models);
    for (let k = 0; k + 1 < poles.length; k++) {
      const a = poles[k]!,
        b = poles[k + 1]!;
      if (Math.hypot(b.x - a.x, b.z - a.z) > line.maxSpan) continue;
      const tipsA = line.models[a.model]!,
        tipsB = line.models[b.model]!;
      for (const [i, t] of tipsA.entries()) {
        // Keep each wire on its own side and level: the nearest tip of the same crossarm level
        // on the next pole.
        const ta = tip(a, t);
        let tb: readonly [number, number, number] | null = null;
        for (const [j, u] of tipsB.entries())
          if (j >> 1 === i >> 1) {
            const c = tip(b, u);
            if (
              !tb ||
              Math.hypot(c[0] - ta[0], c[2] - ta[2]) < Math.hypot(tb[0] - ta[0], tb[2] - ta[2])
            )
              tb = c;
          }
        if (!tb) continue;
        for (let s = 0; s < SEGMENTS; s++) {
          for (const f of [s / SEGMENTS, (s + 1) / SEGMENTS])
            pos.push(
              ta[0] + (tb[0] - ta[0]) * f,
              ta[1] + (tb[1] - ta[1]) * f - line.sag * 4 * f * (1 - f),
              ta[2] + (tb[2] - ta[2]) * f,
            );
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  // A wire is a centimetre thick: past a few hundred metres it is invisible, but a GL line is
  // always a pixel wide, so from the plane every road drew a black stroke across the map
  // (owner, 2026-11-08). The wires fade out between 120 m and 350 m.
  const material = new THREE.LineBasicMaterial({
    color: 0x1c1c1c,
    transparent: true,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vWireDist;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvWireDist = -mvPosition.z;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWireDist;")
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.a *= 1.0 - smoothstep(120.0, 350.0, vWireDist);",
      );
  };
  material.customProgramCacheKey = () => "br-power-lines-fade";
  const lines = new THREE.LineSegments(g, material);
  lines.name = "br-power-lines";
  lines.matrixAutoUpdate = false;
  return {
    root: lines,
    dispose() {
      g.dispose();
      material.dispose();
    },
  };
}
