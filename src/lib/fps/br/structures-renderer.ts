import * as THREE from "three";
import { DEPTH_PULL, pullDepth } from "./depth-bias";
import {
  BRIDGE,
  DAM,
  STRAIT,
  STRAIT_BRIDGES,
  bridgeApproaches,
  bridgeSpans,
  damBase,
  inSpillway,
} from "./bridges";
import type { Heightfield } from "./heightfield";
import { GROUND, GROUND_TILE_GLSL, groundTileUniforms, type GroundLayer } from "./terrain";
import { lotHeight } from "./layout";
import { drawnGround, LOT_LIFT, pavedHeight, RUNWAY_LIFT } from "./paved";
import { createRoadGrade, ROAD_GRADE } from "./road-grade";
import { islandWalls } from "./walls";
import { WORLD_HALF, type WorldMeta } from "./world";

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

export function createStructures(
  meta: WorldMeta,
  hf: Heightfield,
  /** Paved lots (layout.ts pavedLots): quads by their corners' (x, z). */
  lots: number[][] = [],
): StructuresControls {
  const root = new THREE.Group();
  root.name = "br-structures";
  const runways = runwayMesh(meta, hf, lots);
  // The bridges' road takes the same asphalt (owner, 2026-11-18: "add some texture to the road
  // on the bridges instead of just begin blank grey"): one set of uniforms for both.
  const bridges = bridgeMesh(
    meta,
    hf,
    (runways.material as THREE.Material).userData["ground"] as RoadUniforms,
  );
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

/** The roads' rise over far ground (m): none within `from`, then `perMetre` of the distance. */
export const ROAD_LIFT = { from: 400, perMetre: 0.0016, max: 8 } as const;
/**
 * The road skirts' feet: this far below the ground (m), and this far out from the edge: a
 * shoulder sloping into the ground, not a wall (a wall's asphalt grain ran in vertical streaks).
 */
const SKIRT_DEPTH = 0.4;
const SKIRT_OUT = 0.8;

type RoadUniforms = {
  uGroundA: { value: THREE.DataArrayTexture };
  uOn: { value: number };
  uRange: { value: number };
  uLayer: { value: number };
  uScale: { value: number };
  uTint: { value: THREE.Vector3 };
  uFar: { value: THREE.Vector3 };
} & ReturnType<typeof groundTileUniforms>;

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
  /** Draw the end faces at a and at b (a run of segments needs only its two outer ends). */
  ends: [boolean, boolean] = [true, true],
) {
  // corners: 4 ground-plane points in order (a-left, a-right, b-right, b-left); y0 bottom, y1 top.
  const top = corners.map(([x, z], i) => [x, y1[i]!, z]);
  const bot = corners.map(([x, z], i) => [x, y0[i]!, z]);
  pushQuad(pos, col, top[0]!, top[3]!, top[2]!, top[1]!, colour);
  pushQuad(pos, col, bot[0]!, bot[1]!, bot[2]!, bot[3]!, colour);
  for (let i = 0; i < 4; i++) {
    if ((i === 0 && !ends[0]) || (i === 2 && !ends[1])) continue;
    const j = (i + 1) % 4;
    pushQuad(pos, col, bot[i]!, bot[j]!, top[j]!, top[i]!, colour);
  }
}

function bridgeMesh(meta: WorldMeta, hf: Heightfield, ground?: RoadUniforms) {
  const pos: number[] = [],
    col: number[] = [];
  const concrete: [number, number, number] = [0.42, 0.41, 0.39],
    asphalt: [number, number, number] = [0.16, 0.16, 0.17],
    rail: [number, number, number] = [0.55, 0.55, 0.53],
    steel: [number, number, number] = [0.3, 0.32, 0.34],
    // The dam: matched by eye to the spillway model's weathered concrete and crest road as lit.
    damConcrete: [number, number, number] = [0.4, 0.39, 0.36],
    damRoad: [number, number, number] = [0.3, 0.3, 0.29],
    joint: [number, number, number] = [0.29, 0.285, 0.265];
  for (const span of bridgeSpans(meta, hf)) {
    const [sx, sz] = span.side;
    const half = span.width / 2;
    const foot: number[] = [];
    if (span.solid) {
      const segBase = (k: number) => {
        const [xa, , za] = span.points[k]!,
          [xb, , zb] = span.points[k + 1]!;
        return damBase(hf, [
          [xa + sx * half, za + sz * half],
          [xa - sx * half, za - sz * half],
          [xb - sx * half, zb - sz * half],
          [xb + sx * half, zb + sz * half],
        ]);
      };
      const last = span.points.length - 2;
      for (let k = 0; k < span.points.length; k++)
        foot.push(Math.min(segBase(Math.max(0, k - 1)), segBase(Math.min(last, k))));
    }
    // A dam's wall leaves its spillway section to the model (bridges.ts DAM).
    const segStep = span.length / (span.points.length - 1);
    const shown = (k: number) =>
      k >= 0 &&
      k + 1 < span.points.length &&
      !(span.solid && inSpillway(span.length, (k + 0.5) * segStep));
    for (let k = 0; k + 1 < span.points.length; k++) {
      if (!shown(k)) continue;
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
      // Only the span's two outer ends are faces: the ends between segments lie inside the
      // wall, edge-on to every view, and showed as bright dashes along each joint (owner,
      // 2026-11-10: "a wall renders weird at the dam").
      const ends: [boolean, boolean] = [!shown(k - 1), !shown(k + 1)];
      const wall = span.solid ? damConcrete : concrete;
      // Road surface over a concrete slab (a dam: the wall down to the ground, as collided).
      // The wall's foot is one height per sample point, shared by the two segments that meet
      // there (the lower of their collision bases). A foot per segment left neighbouring faces
      // with edges of different lengths on the same line, and the sky showed through between
      // them as dashed white lines (owner, 2026-11-10).
      prism(
        pos,
        col,
        ring(half, -half),
        span.solid
          ? [foot[k]!, foot[k]!, foot[k + 1]!, foot[k + 1]!]
          : [
              y0 - BRIDGE.thickness,
              y0 - BRIDGE.thickness,
              y1 - BRIDGE.thickness,
              y1 - BRIDGE.thickness,
            ],
        [y0 - 0.05, y0 - 0.05, y1 - 0.05, y1 - 0.05],
        wall,
        ends,
      );
      prism(
        pos,
        col,
        ring(half - BRIDGE.railWidth, -half + BRIDGE.railWidth),
        [y0 - 0.05, y0 - 0.05, y1 - 0.05, y1 - 0.05],
        [y0, y0, y1, y1],
        span.solid ? damRoad : asphalt,
        ends,
      );
      // A dam's battered downstream face: from the plumb apron's foot out to the ground.
      if (span.solid) {
        const d = span.down;
        const face = (j: number) => {
          const [x, y, z] = span.points[j]!;
          const shoulder = y - DAM.apron;
          // (Down to the lowest ground out to its toe, as its collision tiers: bridges.ts.)
          let low = foot[j]!;
          for (const o of [half, half + 10, half + 25, half + 40])
            low = Math.min(low, hf.heightAt(x + sx * d * o, z + sz * d * o) - 1);
          const toe = Math.min(low, shoulder);
          const reach = half + (shoulder - toe) * DAM.slope;
          return {
            top: [x + sx * d * half, shoulder, z + sz * d * half],
            toe: [x + sx * d * reach, toe, z + sz * d * reach],
            under: [x + sx * d * half, toe, z + sz * d * half],
          };
        };
        const f0 = face(k),
          f1 = face(k + 1);
        pushQuad(pos, col, f0.top, f1.top, f1.toe, f0.toe, wall);
        // The section where the wall's run ends (the abutments, the spillway's sides).
        for (const [end, f] of [
          [ends[0], f0],
          [ends[1], f1],
        ] as const)
          if (end) pushQuad(pos, col, f.top, f.toe, f.under, f.under, wall);
        // Joints between the monoliths every 15 m: a darker band down the face.
        const j0 = Math.floor((k * segStep) / 15),
          j1 = Math.floor(((k + 1) * segStep) / 15);
        if (j0 !== j1) {
          // (Lifted a few centimetres off the face, out and up, so it never z-fights.)
          const p = (a: number[], b: number[], w: number) => [
            a[0]! + (b[0]! - a[0]!) * w + sx * d * 0.05,
            a[1]! + (b[1]! - a[1]!) * w + 0.05,
            a[2]! + (b[2]! - a[2]!) * w + sz * d * 0.05,
          ];
          pushQuad(
            pos,
            col,
            p(f0.top, f1.top, 0.3),
            p(f0.top, f1.top, 0.7),
            p(f0.toe, f1.toe, 0.7),
            p(f0.toe, f1.toe, 0.3),
            joint,
          );
        }
      }
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
          ends,
        );
      }
      // The strait bridges' steel edge girders (the stays land on them), under the rail line.
      if (STRAIT_BRIDGES.has(span.id))
        for (const sign of [1, -1]) {
          const lo = -0.25 - STRAIT.girderDepth;
          prism(
            pos,
            col,
            ring(sign * half, sign * STRAIT.girder),
            [y0 + lo, y0 + lo, y1 + lo, y1 + lo],
            [y0 - 0.25, y0 - 0.25, y1 - 0.25, y1 - 0.25],
            steel,
            ends,
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
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  if (ground) {
    // The asphalt grain on the decks' road: the faces that look up and are asphalt-dark take it
    // fully; the light concrete and steel a trace of it (as on the roads), walls and undersides
    // none (projected from above, the grain would run in streaks down them).
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, ground);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vRoadWorld;\nvarying float vUp;",
        )
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvRoadWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUp = normalize(mat3(modelMatrix) * objectNormal).y;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>\n${ROAD_GRAIN_UNIFORMS}\nvarying float vUp;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>\n${roadGrainGlsl("smoothstep(0.7, 0.9, abs(vUp))")}`,
        );
    };
    material.customProgramCacheKey = () => "br-bridges-v3";
  }
  const mesh = new THREE.Mesh(g, material);
  mesh.name = "br-bridges";
  return mesh;
}

/**
 * The paved surfaces' rise over the ground (m). A road running onto a runway dips `under` as
 * it nears the runway's edge and lies that much lower beneath it: 7 cm under the runway's
 * surface (two greys in one plane z-fight).
 */
export const PAVED_LIFT = { road: ROAD_GRADE.lift, runway: RUNWAY_LIFT, under: 0.05 } as const;
/**
 * A paved surface's height at a point: the highest ground within 2 m of it, `lift` up. A
 * function of the position alone (as layout.ts lotHeight is for the lots): two pieces of road
 * that overlap (a junction, a joint, a road end on another road) come to the same height
 * there, and with the ground's own normal at each vertex they shade the same, so whichever
 * the depth test picks, the picture is the same. No crest between two vertices (3.5 × 4 m
 * apart at most, under the terrain's 3.9 m grid) pokes through.
 */
export { pavedHeight };
/** Road cells this far inside a runway (m) are not drawn: the road ends under its edge. */
const RUNWAY_INSET = 2.5;
/** The steepest a paved vertex's normal leans (rise over run): a 1-in-2 hill. */
const PAVED_SLOPE = 0.5;
/** Bends up to this (radians) are mitred into one strip; sharper ones are a round joint. */
const MITRE_MAX = 0.7;
/** Road and runway vertices along and across: at most this far apart (m). */
const ROAD_STEP = 4;

/**
 * The roads, runways and paved lots in one draw (owner, 2026-11-16: "still some flicker /
 * render issues on roads in different camera angles / positions, audit and fix across the
 * map"). The audit of the mesh as it was (tests/br-road-surfaces.test.ts keeps its measures):
 *
 *  - every polyline segment was its own strip, overlapping its neighbours 1.75 m at each joint
 *    with heights and face normals of its own: 30 % of the road surface lay under another
 *    piece of road, 240,000 m² of it within a centimetre: two faces lit a little differently
 *    trading places as the camera moved. Each road is now one strip with its vertices shared
 *    (bends mitred), heights and normals are functions of the position alone (pavedHeight, the
 *    ground's normal), so where roads still overlap (junctions, round joints) they are the
 *    same surface;
 *  - the runways' paint lay 1 cm over the asphalt and roads crossed the runways in their plane
 *    (932 m² within a centimetre, two greys): the paint is now cells of the runway's own grid,
 *    the runways ride 6 cm over the roads and the roads end under them;
 *  - the runways were 10 × 50–60 m quads: the ground rose through them (0.7 m at the military
 *    runway) and through 994 m² of road; none now (5 m and 3.5 × 4 m cells);
 *  - the skirts were a darker grey lit as walls: from the air a dark line along each road's
 *    near edge, crawling. They are the road's colour and lit as the road.
 */
function runwayMesh(meta: WorldMeta, hf: Heightfield, lots: number[][] = []) {
  const pos: number[] = [],
    col: number[] = [],
    nor: number[] = [],
    skirt: number[] = [],
    paintAt: number[] = [],
    index: number[] = [];
  const asphalt: [number, number, number] = [0.13, 0.13, 0.14],
    road: [number, number, number] = [0.2, 0.2, 0.21];
  const heightAt = hf.heightAt.bind(hf);
  const n3 = { x: 0, y: 1, z: 0 };
  type V = [number, number, number];
  // Roads take the road grade (road-grade.ts: along the centreline, level across, leaning
  // into a side slope by half a metre at most); runways and their aprons the paved height.
  /**
   * The ground as the terrain draws it (its cells are two triangles, split either way between
   * its levels of detail): the higher of the two, which can stand a few centimetres over the
   * bilinear height. Paved surfaces are laid over this.
   */
  const drawn = drawnGround(hf);
  const grade = createRoadGrade(meta, drawn);
  const surface = (x: number, z: number, lift: number) => pavedHeight(drawn, x, z, lift);
  const roadSurface = (x: number, z: number, lift: number) =>
    (grade.at(x, z) ?? pavedHeight(drawn, x, z, 0)) + lift;
  /**
   * A runway vertex's place for its paint (RUNWAY_PAINT_GLSL): across (m from the centre line),
   * along (m from its start), the runway's half width and length. Zero width: not a runway.
   */
  let painting: [number, number, number, number] = [0, 0, 0, 0];
  /** A vertex (its normal the ground's there); `foot`: a skirt's foot, never lifted. */
  const add = (v: V, colour: [number, number, number], foot = false) => {
    pos.push(v[0], v[1], v[2]);
    paintAt.push(...painting);
    col.push(colour[0], colour[1], colour[2]);
    // (No steeper than PAVED_SLOPE: beside a cliff the ground's normal is the cliff's, and the
    // road there would be lit as a wall.)
    hf.normalAt(v[0], v[2], n3);
    const slope = Math.hypot(n3.x, n3.z) / n3.y;
    const k = slope > PAVED_SLOPE ? PAVED_SLOPE / slope : 1;
    const l = Math.hypot(n3.x * k, n3.y, n3.z * k);
    nor.push((n3.x * k) / l, n3.y / l, (n3.z * k) / l);
    skirt.push(foot ? 1 : 0);
    return skirt.length - 1;
  };
  /**
   * A skirt's foot for the edge vertex v: SKIRT_OUT out from it towards (ox, oz), SKIRT_DEPTH
   * under the ground there.
   */
  const addFoot = (v: V, colour: [number, number, number], ox: number, oz: number) => {
    const l = Math.hypot(ox - v[0], oz - v[2]) || 1;
    const x = v[0] + ((ox - v[0]) / l) * SKIRT_OUT,
      z = v[2] + ((oz - v[2]) / l) * SKIRT_OUT;
    return add([x, Math.min(heightAt(x, z), v[1]) - SKIRT_DEPTH, z], colour, true);
  };
  const px = (i: number) => pos[i * 3]!,
    pz = (i: number) => pos[i * 3 + 2]!;
  /** Vertices i, j, k, l as a cell facing up (whichever way round they came). */
  const face = (i: number, j: number, k: number, l: number) => {
    const up = (pz(j) - pz(i)) * (px(k) - px(i)) - (px(j) - px(i)) * (pz(k) - pz(i)) > 0;
    if (up) index.push(i, j, k, i, k, l);
    else index.push(i, l, k, i, k, j);
  };
  /**
   * A skirt down the edge i → j to the feet fi, fj (owner, 2026-11-16: "asphalt roads need to
   * lay correctly on the ground, it's a wide gap under it on most roads"): past ROAD_LIFT.from
   * the vertex shader lifts the surface with its distance, and from the ground the lifted edge
   * showed the lit ground under it. The top is the edge (lifted with it); the feet are never
   * lifted and stand below the ground. Turned to face (ox, oz), a point on the outer side.
   */
  const skirtFace = (i: number, j: number, fi: number, fj: number, ox: number, oz: number) => {
    const outward = (pz(j) - pz(i)) * (ox - px(i)) - (px(j) - px(i)) * (oz - pz(i)) > 0;
    if (outward) index.push(i, j, fj, i, fj, fi);
    else index.push(j, i, fi, j, fi, fj);
  };
  /** A cell of its own (four vertices): a, b, c, d round it. */
  const quad = (a: V, b: V, c: V, d: V, colour: [number, number, number]) => {
    face(add(a, colour), add(b, colour), add(c, colour), add(d, colour));
  };
  const skirtDown = (a: V, b: V, ox: number, oz: number, colour: [number, number, number]) => {
    // (Both feet the same way out: square to the edge, on (ox, oz)'s side.)
    const ex = b[0] - a[0],
      ez = b[2] - a[2];
    const side = ez * (ox - a[0]) - ex * (oz - a[2]) > 0 ? 1 : -1;
    const [nx, nz] = [ez * side, -ex * side];
    skirtFace(
      add(a, colour),
      add(b, colour),
      addFoot(a, colour, a[0] + nx, a[2] + nz),
      addFoot(b, colour, b[0] + nx, b[2] + nz),
      ox,
      oz,
    );
  };

  // ---- runways: a grid of cells (2.5 m along, 3.5 m across at most), the paint as cells of its own.
  const strips = meta.runways.map((r) => {
    const [ax, az] = r.a,
      [bx, bz] = r.b;
    const length = Math.hypot(bx - ax, bz - az);
    return { ax, az, dx: (bx - ax) / length, dz: (bz - az) / length, length, half: r.width / 2 };
  });
  /** How far inside a runway (x, z) is, from its nearest edge (m; negative outside them all). */
  const intoRunway = (x: number, z: number) => {
    let most = -Infinity;
    for (const r of strips) {
      const t = (x - r.ax) * r.dx + (z - r.az) * r.dz,
        o = -(x - r.ax) * r.dz + (z - r.az) * r.dx;
      most = Math.max(most, Math.min(t, r.length - t, r.half - Math.abs(o)));
    }
    return most;
  };
  /** Inside a runway (`inset` m in from its edges)? Roads end there. */
  const onRunway = (x: number, z: number, inset: number) => intoRunway(x, z) > inset;
  /**
   * A road's rise at (x, z): from a runway's edge inwards it dips by `under` over 2.5 m (the
   * road's cells stop under the runway, RUNWAY_INSET).
   */
  const roadLift = (x: number, z: number) =>
    PAVED_LIFT.road - PAVED_LIFT.under * Math.min(1, Math.max(0, intoRunway(x, z) / 2.5));
  const layRunways = () => {
    for (const r of strips) {
      const { ax, az, dx, dz, length, half } = r;
      const sx = -dz,
        sz = dx;
      const p = (t: number, off: number): V => {
        const x = ax + dx * t + sx * off,
          z = az + dz * t + sz * off;
        return [x, surface(x, z, PAVED_LIFT.runway), z];
      };
      /** A runway cell, its paint drawn per pixel from where it is on the runway. */
      const cell = (a: V, b: V, c: V, d: V) => {
        const at = (v: V) => {
          const rx = v[0] - ax,
            rz = v[2] - az;
          painting = [rx * sx + rz * sz, rx * dx + rz * dz, half, length];
          return add(v, asphalt);
        };
        face(at(a), at(b), at(c), at(d));
        painting = [0, 0, 0, 0];
      };
      // Across: the edge lines (1 to 1.6 m in from each edge) and the centre line's 0.9 m.
      const marks = [-half, -half + 1, -half + 1.6, -0.45, 0.45, half - 1.6, half - 1, half];
      const across: number[] = [];
      for (let i = 0; i + 1 < marks.length; i++) {
        const n = Math.max(1, Math.ceil((marks[i + 1]! - marks[i]!) / 3.5));
        for (let k = 0; k < n; k++) across.push(marks[i]! + ((marks[i + 1]! - marks[i]!) * k) / n);
      }
      across.push(half);
      // Along: 2.5 m steps (the dashes, 25 m of every 50 from 40 m in, start and end on them).
      let row = across.map((o) => p(0, o));
      for (let t0 = 0; t0 < length - 1e-6; t0 += 2.5) {
        const t1 = Math.min(length, t0 + 2.5);
        const next = across.map((o) => p(t1, o));
        for (let i = 0; i + 1 < across.length; i++)
          cell(row[i + 1]!, next[i + 1]!, next[i]!, row[i]!);
        const last = across.length - 1;
        const mx = ax + dx * t0,
          mz = az + dz * t0;
        skirtDown(row[last]!, next[last]!, mx + sx * half * 2, mz + sz * half * 2, asphalt);
        skirtDown(row[0]!, next[0]!, mx - sx * half * 2, mz - sz * half * 2, asphalt);
        if (t0 === 0)
          for (let i = 0; i + 1 < across.length; i++)
            skirtDown(row[i]!, row[i + 1]!, ax - dx * 10, az - dz * 10, asphalt);
        if (t1 === length)
          for (let i = 0; i + 1 < across.length; i++)
            skirtDown(
              next[i]!,
              next[i + 1]!,
              ax + dx * (length + 10),
              az + dz * (length + 10),
              asphalt,
            );
        row = next;
      }
    }
  };

  // ---- roads: one strip a road (plus the roads onto the bridges: bridges.ts bridgeApproaches),
  // three vertices across (edge, centreline, edge), following the (road-smoothed) terrain.
  type Station = { x: number; z: number; sx: number; sz: number };
  const roadPoint = (s: Station, off: number): V => {
    const x = s.x + s.sx * off,
      z = s.z + s.sz * off;
    return [x, roadSurface(x, z, roadLift(x, z)), z];
  };
  const strip = (stations: Station[], half: number) => {
    let before: Station | null = null;
    let was: [V, V, V] | null = null;
    /** The row's vertices: edge, centreline, edge, and the feet under both edges. */
    let ids: number[] | null = null;
    for (const s of stations) {
      const row: [V, V, V] = [roadPoint(s, half), roadPoint(s, 0), roadPoint(s, -half)];
      const now = [
        add(row[0], road),
        add(row[1], road),
        add(row[2], road),
        addFoot(row[0], road, row[0][0] + s.sx, row[0][2] + s.sz),
        addFoot(row[2], road, row[2][0] - s.sx, row[2][2] - s.sz),
      ];
      if (before && was) {
        const mx = (s.x + before.x) / 2,
          mz = (s.z + before.z) / 2;
        // Under a runway: not drawn (the road's end reaches under the runway's edge).
        if (!onRunway(mx, mz, RUNWAY_INSET)) {
          if (ids) {
            face(ids[0]!, now[0]!, now[1]!, ids[1]!);
            face(ids[1]!, now[1]!, now[2]!, ids[2]!);
            skirtFace(
              ids[0]!,
              now[0]!,
              ids[3]!,
              now[3]!,
              mx + s.sx * half * 2,
              mz + s.sz * half * 2,
            );
            skirtFace(
              ids[2]!,
              now[2]!,
              ids[4]!,
              now[4]!,
              mx - s.sx * half * 2,
              mz - s.sz * half * 2,
            );
          }
        }
      }
      before = s;
      was = row;
      ids = now;
    }
  };
  /** A round joint at a sharp bend: a disc of the road's width over the notch. */
  const disc = (x: number, z: number, half: number) => {
    if (onRunway(x, z, RUNWAY_INSET)) return;
    const centre: V = [x, roadSurface(x, z, roadLift(x, z)), z];
    const n = 10;
    const rim: V[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rx = x + Math.cos(a) * half,
        rz = z + Math.sin(a) * half;
      rim.push([rx, roadSurface(rx, rz, roadLift(rx, rz)), rz]);
    }
    const c = add(centre, road);
    const tops = rim.map((v) => add(v, road)),
      feet = rim.map((v) => addFoot(v, road, v[0] * 2 - x, v[2] * 2 - z));
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      // (Counter-clockwise seen from above: the angle runs from +x towards +z.)
      index.push(c, tops[k]!, tops[i]!);
      skirtFace(
        tops[i]!,
        tops[k]!,
        feet[i]!,
        feet[k]!,
        x + (px(tops[i]!) - x) * 2,
        z + (pz(tops[i]!) - z) * 2,
      );
    }
  };
  const layRoads = () => {
    for (const r of [...meta.roads, ...bridgeApproaches(meta)]) {
      const half = r.width / 2;
      // (Points less than a centimetre apart are one point.)
      const pts: Array<readonly [number, number]> = [];
      for (const q of r.points) {
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(q[0]! - last[0], q[1]! - last[1]) >= 0.01) pts.push([q[0]!, q[1]!]);
      }
      if (pts.length < 2) continue;
      const dir = (k: number) => {
        const [ax, az] = pts[k]!,
          [bx, bz] = pts[k + 1]!;
        const l = Math.hypot(bx - ax, bz - az);
        return [(bx - ax) / l, (bz - az) / l, l] as const;
      };
      let stations: Station[] = [];
      for (let k = 0; k + 1 < pts.length; k++) {
        const [ax, az] = pts[k]!;
        const [dx, dz, length] = dir(k);
        const sx = -dz,
          sz = dx;
        // The run's first point: back half a half-width, so the end reaches into its junction.
        if (!stations.length)
          stations.push(
            { x: ax - dx * half * 0.5, z: az - dz * half * 0.5, sx, sz },
            { x: ax, z: az, sx, sz },
          );
        // 4 m steps (were 8): over a crest or through a cutting that was never graded, the
        // ground rose above a long quad's middle and buried the road (owner, 2026-11-11: "broken
        // roads", a strip of rock across the asphalt).
        const n = Math.max(1, Math.ceil(length / ROAD_STEP));
        for (let i = 1; i < n; i++)
          stations.push({ x: ax + (dx * length * i) / n, z: az + (dz * length * i) / n, sx, sz });
        const [bx, bz] = pts[k + 1]!;
        const next = k + 2 < pts.length ? dir(k + 1) : null;
        const bend = next ? Math.acos(Math.max(-1, Math.min(1, dx * next[0] + dz * next[1]))) : 0;
        if (next && bend <= MITRE_MAX) {
          // A mitre: the cross-section along the bisector, widened to keep the road's width.
          const mx = sx - next[1],
            mz = sz + next[0];
          const ml = Math.hypot(mx, mz);
          const widen = 1 / Math.cos(bend / 2);
          stations.push({ x: bx, z: bz, sx: (mx / ml) * widen, sz: (mz / ml) * widen });
        } else {
          // The run ends: on past its last point (the road's end, or a sharp bend's round joint).
          stations.push(
            { x: bx, z: bz, sx, sz },
            { x: bx + dx * half * 0.5, z: bz + dz * half * 0.5, sx, sz },
          );
          strip(stations, half);
          stations = [];
          if (next) disc(bx, bz, half);
        }
      }
    }
  };
  // The roadside stops' lots, laid on the ground in 2 m cells. Each corner's height depends on
  // its position alone (layout.ts lotHeight), so neighbours share their corners' heights with
  // no seam for the grass to show through.
  // (2 cm over the layout's lot height: its 2 m cells over the ground as drawn.)
  const lotY = (x: number, z: number) => lotHeight(drawn, x, z) + LOT_LIFT;
  const layLots = () => {
    for (const c of lots) {
      const v = (i: number): V => [c[i]!, lotY(c[i]!, c[i + 1]!), c[i + 1]!];
      quad(v(0), v(2), v(4), v(6), road);
    }
  };
  layRunways();
  layRoads();
  layLots();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("skirt", new THREE.Float32BufferAttribute(skirt, 1));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("paintAt", new THREE.Float32BufferAttribute(paintAt, 4));
  g.setIndex(index);
  // The attributes hold copies. Emptied, because the material's onBeforeCompile below closes
  // over this function's scope and would keep both lists (34 MB of numbers) for the whole match.
  pos.length = col.length = skirt.length = nor.length = paintAt.length = 0;
  index.length = 0;
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
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
    ...groundTileUniforms(),
  };
  uniforms.uGroundA.value.needsUpdate = true;
  material.userData["ground"] = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vRoadWorld;\nattribute float skirt;\nattribute vec4 paintAt;\nvarying vec4 vPaintAt;",
      )
      // Far ground is drawn from every 2nd, 4th or 8th height sample (terrain.ts CDLOD) and
      // rises over a road laid 8 cm above the full heightfield: 1.7 % of the road surface at
      // 0.9–1.8 km and 5.4 % at 1.8–3.7 km was under it, as breaks in the roads from the air
      // (render audit 2026-11-15). The road rises with its distance from the eye instead:
      // nothing within ${ROAD_LIFT.from} m, then ${ROAD_LIFT.perMetre * 1000} mm a metre (about a pixel at most, seen edge on).
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed.y += (1.0 - skirt) * clamp((distance(transformed, cameraPosition) - ${ROAD_LIFT.from.toFixed(1)}) * ${ROAD_LIFT.perMetre.toFixed(5)}, 0.0, ${ROAD_LIFT.max.toFixed(1)});`,
      )
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvRoadWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPaintAt = paintAt;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        ${ROAD_GRAIN_UNIFORMS}
        varying vec4 vPaintAt;
        ${RUNWAY_PAINT_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        if (vPaintAt.z > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${RUNWAY_PAINT.colour.map((c) => c.toFixed(2)).join(", ")}), runwayPaint(vPaintAt));
        ${roadGrainGlsl("1.0")}`,
      )
      // Lit by the ground's normal from either side (owner, 2026-11-18: "the black line that
      // renders on the edge of the roads cross the map in some camera angels only"). The
      // material is double-sided and three turns the normal over on a face seen from behind;
      // the skirts on one side of every road are wound the other way, so from the road that
      // skirt's sliver above the ground was lit as facing down: a black line along that edge.
      .replace(
        "#include <normal_fragment_begin>",
        "#include <normal_fragment_begin>\nnormal = normalize(vNormal);\nnonPerturbedNormal = normal;",
      );
  };
  material.customProgramCacheKey = () => "br-roads-v10";
  // Over the ground without drawing over the foot of what stands on it (depth-bias.ts).
  pullDepth(material, DEPTH_PULL.paved);
  const mesh = new THREE.Mesh(g, material);
  mesh.name = "br-runways";
  return mesh;
}

/**
 * The runways' paint (owner, 2026-11-18: "the white lines of the airfields asfalt at
 * island/military still render/flicker"). It was cells of their own colour: hard-edged
 * geometry. Seen along the runway the 0.6 m edge lines and the 0.9 m centre dashes are a
 * fraction of a pixel tall from a few hundred metres, and each pixel's samples caught the line
 * or missed it as the camera moved (MSAA's four samples cannot cover a line that thin), so the
 * far paint broke up and crawled. Now each pixel takes the share of its own footprint that is
 * painted (a box filter from the screen-space derivatives of its place on the runway): far off
 * a line fades into the asphalt as a steady grey instead of popping between white and black.
 * Edge lines 1–1.6 m in from each edge; the centre line's 0.9 m dashes, 25 m of every 50 from
 * 40 m in to 40 m before the end.
 */
export const RUNWAY_PAINT = {
  colour: [0.8, 0.8, 0.78],
  edgeIn: [1, 1.6],
  centreHalf: 0.45,
  dash: { from: 40, period: 50, length: 25 },
} as const;
const RUNWAY_PAINT_GLSL = `
  // The share of [u - w/2, u + w/2] inside [a, b].
  float paintCover(float u, float w, float a, float b) {
    return clamp((min(u + 0.5 * w, b) - max(u - 0.5 * w, a)) / w, 0.0, 1.0);
  }
  // The painted length of the dashes from the first dash's start up to x (from ≤ x ≤ end).
  float dashLength(float x, float from, float end) {
    float r = clamp(x, from, end) - from;
    return floor(r / ${RUNWAY_PAINT.dash.period.toFixed(1)}) * ${RUNWAY_PAINT.dash.length.toFixed(1)} + min(mod(r, ${RUNWAY_PAINT.dash.period.toFixed(1)}), ${RUNWAY_PAINT.dash.length.toFixed(1)});
  }
  // p: across, along, half width, length.
  float runwayPaint(vec4 p) {
    float wo = max(length(vec2(dFdx(p.x), dFdy(p.x))), 1e-3);
    float wt = max(length(vec2(dFdx(p.y), dFdy(p.y))), 1e-3);
    float inner = p.z - ${RUNWAY_PAINT.edgeIn[1].toFixed(2)}, outer = p.z - ${RUNWAY_PAINT.edgeIn[0].toFixed(2)};
    float edge = paintCover(p.x, wo, inner, outer) + paintCover(p.x, wo, -outer, -inner);
    float end = p.w - ${RUNWAY_PAINT.dash.from.toFixed(1)};
    float along = (dashLength(p.y + 0.5 * wt, ${RUNWAY_PAINT.dash.from.toFixed(1)}, end) - dashLength(p.y - 0.5 * wt, ${RUNWAY_PAINT.dash.from.toFixed(1)}, end)) / wt;
    float centre = paintCover(p.x, wo, -${RUNWAY_PAINT.centreHalf.toFixed(2)}, ${RUNWAY_PAINT.centreHalf.toFixed(2)}) * along;
    return clamp(edge + centre, 0.0, 1.0);
  }
`;

/** The asphalt grain's uniforms and the world position it is drawn from (roadGrainGlsl). */
const ROAD_GRAIN_UNIFORMS = `precision highp sampler2DArray;
        uniform sampler2DArray uGroundA;
        uniform float uOn, uRange, uLayer, uScale;
        uniform vec3 uTint, uFar;
        varying vec3 vRoadWorld;
        ${GROUND_TILE_GLSL}`;
/**
 * The asphalt grain over a paved surface's colour (after <color_fragment>): the terrain's
 * asphalt near the camera, enlarged copies of it beyond. `weight`: a GLSL expression (0–1) for
 * how much of it a fragment takes (the bridges: their up-facing road only).
 */
function roadGrainGlsl(weight: string) {
  return `
        {
          float GRAIN_W = ${weight};
          float near = uOn * (GRAIN_W) * (1.0 - smoothstep(uRange * 0.6, uRange, distance(vRoadWorld, cameraPosition)));
          // Gradients taken outside the branch: inside it the mip level is undefined on the
          // ring where the texture starts, which drew a dashed line across the road there.
          vec3 rdx3 = dFdx(vRoadWorld), rdy3 = dFdy(vRoadWorld);
          // (The surface's plane from the two: exact even when they are per 2 × 2 block.)
          groundFootprint(vRoadWorld, normalize(cross(rdx3, rdy3)), rdx3, rdy3);
          float grazing = smoothstep(${GROUND.grazeFrom}, ${GROUND.grazeTo}, max(length(rdx3.xz), length(rdy3.xz)));
          // Hand off to the two fixed-scale wear textures when the fine aggregate
          // becomes subpixel, including on the runway seen from walking height.
          near *= 1.0 - grazing;
          vec2 rdx = rdx3.xz * uScale, rdy = rdy3.xz * uScale;
          float dark = 1.0 - smoothstep(0.25, 0.45, dot(diffuseColor.rgb, vec3(0.3333)));
          if (near > 0.0) {
            vec3 t = groundTile(uGroundA, vec3(vRoadWorld.xz * uScale, uLayer), rdx, rdy, uScale, true, 0.0);
            t = t * uTint / max(uFar, vec3(1e-3));
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * t, near * mix(0.3, 1.0, dark));
          }
          // Beyond that, and from the parachute (owner, 2026-11-11: roads must be crisp from
          // 500 m too): the same asphalt enlarged, as the terrain's mid field does for the
          // ground. From up there a road was a flat grey ribbon; this gives it the patches
          // and wear a pixel can still resolve. Two fixed scales, the second turned.
          float camD = distance(vRoadWorld, cameraPosition);
          float far = uOn * (GRAIN_W) * (1.0 - near / max(GRAIN_W, 1e-3)) * (1.0 - smoothstep(${ROAD_FAR.range * 0.55}.0, ${ROAD_FAR.range}.0, camD));
          if (far > 0.0) {
            vec2 p = vRoadWorld.xz * uScale;
            // Two regimes cross-faded by distance (never a scale that slides): the tile a few
            // times enlarged for the middle distance, and much enlarged from the air, where a
            // pixel is half a metre and anything finer is a cloudy wash.
            float high = smoothstep(${ROAD_FAR.airFrom.toFixed(1)}, ${ROAD_FAR.airTo.toFixed(1)}, camD);
            mat2 m = mat2(0.8, -0.6, 0.6, 0.8);
            vec3 t = vec3(0.0);
            if (high < 1.0) {
              vec3 ta = textureGrad(uGroundA, vec3(p / ${ROAD_FAR.scaleA.toFixed(1)}, uLayer), rdx / ${ROAD_FAR.scaleA.toFixed(1)}, rdy / ${ROAD_FAR.scaleA.toFixed(1)}).rgb;
              vec3 tb = textureGrad(uGroundA, vec3(m * p / ${ROAD_FAR.scaleB.toFixed(1)} + 0.37, uLayer), m * rdx / ${ROAD_FAR.scaleB.toFixed(1)}, m * rdy / ${ROAD_FAR.scaleB.toFixed(1)}).rgb;
              t += (1.0 - high) * 0.5 * (ta * ta + tb * tb);
            }
            if (high > 0.0) {
              vec3 ta = textureGrad(uGroundA, vec3(p / ${ROAD_FAR.airA.toFixed(1)} + 0.11, uLayer), rdx / ${ROAD_FAR.airA.toFixed(1)}, rdy / ${ROAD_FAR.airA.toFixed(1)}).rgb;
              vec3 tb = textureGrad(uGroundA, vec3(m * p / ${ROAD_FAR.airB.toFixed(1)} + 0.63, uLayer), m * rdx / ${ROAD_FAR.airB.toFixed(1)}, m * rdy / ${ROAD_FAR.airB.toFixed(1)}).rgb;
              t += high * 0.5 * (ta * ta + tb * tb);
            }
            t = t * uTint / max(uFar, vec3(1e-3));
            float wearContrast = ${ROAD_FAR.strength.toFixed(2)} * (1.0 + grazing * (1.0 - high));
            t = clamp(mix(vec3(1.0), t, wearContrast), 0.5, 1.65);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * t, far * mix(0.3, 1.0, dark));
          }
        }`;
}

/** Roads beyond the near asphalt: the tile at two enlarged scales, out to `range` metres. */
const ROAD_FAR = {
  range: 2400,
  scaleA: 3,
  scaleB: 8,
  /** From the air: the enlarged scales, and the distances (m) they come in over. */
  airA: 14,
  airB: 33,
  airFrom: 220,
  airTo: 520,
  strength: 1.25,
} as const;

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
