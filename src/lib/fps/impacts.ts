import * as THREE from "three";
import type { Vector } from "./collision";
import { decalDepthOffset } from "./maps/depth-layers";

/**
 * Bullet impacts on the world, for all three games (owner, 2026-11-25: "when players shooting
 * into a object wall/water there is a realistic effect on the wall/object/water … realistic
 * holes into the wall or rings on the water").
 *
 *  - Holes: a decal per surface, drawn once into a canvas: on stone and concrete a black bore
 *    in a crater of chipped, paler material with hairline cracks running out; on wood a dark
 *    bore with the grain torn along it; on metal a bright, dented ring round a dark puncture;
 *    in the ground a dark scuffed pock. Each turned at random and sized a little differently,
 *    lit by the scene (Lambert), kept until the pool comes round again.
 *  - Debris: chips and grit thrown off the surface and falling, a dust puff that drifts and
 *    fades (stone, ground), splinters (wood), sparks with short tails (metal).
 *  - Water: rings running out from where the bullet went in (a light crest, a dark trough
 *    behind it, two of them) and a thin spout of droplets that falls back.
 *
 * Fixed pools: continuous automatic fire never allocates. Holes, particles and rings each draw
 * in one call per kind, and nothing draws when nothing is live.
 */
export type ImpactSurface = "concrete" | "metal" | "wood" | "ground" | "water";
export type ImpactHit = { point: Vector; normal: Vector; surface: ImpactSurface | string };

const KINDS = ["concrete", "wood", "metal", "ground"] as const;
type MarkKind = (typeof KINDS)[number];
const PARTICLES = 384,
  RIPPLES = 32,
  /** Rings' life (s). */
  RIPPLE_S = 1.3;

/** A seeded random, so a texture comes out the same every time. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return (s & 0xffffff) / 0x1000000;
  };
}

/** The hole's picture for one surface (RGBA, transparent round it). */
function markCanvas(kind: MarkKind) {
  const S = 128,
    c = S / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const g = canvas.getContext("2d")!;
  const rnd = seeded(KINDS.indexOf(kind) * 7919 + 17);
  const blob = (r: number, wobble: number, n = 18) => {
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2,
        rr = r * (1 - wobble / 2 + wobble * rnd());
      const x = c + Math.cos(a) * rr,
        y = c + Math.sin(a) * rr;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
  };
  if (kind === "concrete") {
    // Dust thrown round it, the chipped crater (paler: fresh material), its shaded inner wall,
    // the bore; hairline cracks.
    let gr = g.createRadialGradient(c, c, 10, c, c, 62);
    gr.addColorStop(0, "rgba(70,66,60,.55)");
    gr.addColorStop(1, "rgba(70,66,60,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    blob(34, 0.45, 22);
    g.fillStyle = "rgba(196,190,178,.85)";
    g.fill();
    blob(24, 0.35, 16);
    gr = g.createRadialGradient(c - 3, c - 3, 4, c, c, 24);
    gr.addColorStop(0, "rgba(40,37,33,1)");
    gr.addColorStop(0.6, "rgba(96,90,82,.95)");
    gr.addColorStop(1, "rgba(150,144,134,.9)");
    g.fillStyle = gr;
    g.fill();
    blob(9, 0.3, 12);
    g.fillStyle = "rgba(8,7,6,1)";
    g.fill();
    g.strokeStyle = "rgba(40,37,33,.45)";
    for (let i = 0; i < 4; i++) {
      let a = rnd() * Math.PI * 2,
        r = 22 + rnd() * 6,
        x = c + Math.cos(a) * r,
        y = c + Math.sin(a) * r;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        a += (rnd() - 0.5) * 0.9;
        r = 4 + rnd() * 6;
        x += Math.cos(a) * r;
        y += Math.sin(a) * r;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  } else if (kind === "wood") {
    // Fibres torn along the grain (vertical), dark round the bore.
    for (let i = 0; i < 26; i++) {
      const x = c + (rnd() - 0.5) * 34,
        len = 14 + rnd() * 30,
        y = c + (rnd() - 0.5) * 10;
      g.strokeStyle = rnd() < 0.5 ? "rgba(214,180,128,.85)" : "rgba(70,46,24,.8)";
      g.lineWidth = 1 + rnd() * 2.5;
      g.beginPath();
      g.moveTo(x, y - len);
      g.lineTo(x + (rnd() - 0.5) * 4, y + len);
      g.stroke();
    }
    const gr = g.createRadialGradient(c, c, 2, c, c, 20);
    gr.addColorStop(0, "rgba(10,7,4,1)");
    gr.addColorStop(0.45, "rgba(36,24,12,.95)");
    gr.addColorStop(1, "rgba(60,40,20,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(c, c, 14, 22, 0, 0, Math.PI * 2);
    g.fill();
  } else if (kind === "metal") {
    // A dented ring, bright where the paint is scraped off, soot round it, the puncture dark.
    let gr = g.createRadialGradient(c, c, 10, c, c, 46);
    gr.addColorStop(0, "rgba(30,26,22,.7)");
    gr.addColorStop(0.6, "rgba(60,50,40,.35)");
    gr.addColorStop(1, "rgba(60,50,40,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    blob(26, 0.25, 20);
    gr = g.createRadialGradient(c - 5, c - 5, 4, c, c, 26);
    gr.addColorStop(0, "rgba(250,250,248,1)");
    gr.addColorStop(0.55, "rgba(200,202,206,1)");
    gr.addColorStop(1, "rgba(120,122,128,.9)");
    g.fillStyle = gr;
    g.fill();
    // The lip of the dent, shaded on one side.
    g.strokeStyle = "rgba(40,40,44,.8)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(c, c, 15, 0.3, Math.PI * 1.3);
    g.stroke();
    blob(9, 0.35, 10);
    g.fillStyle = "rgba(6,6,8,1)";
    g.fill();
  } else {
    // The ground: a scuffed pock, darker soil thrown out round it.
    let gr = g.createRadialGradient(c, c, 4, c, c, 60);
    gr.addColorStop(0, "rgba(28,22,16,.95)");
    gr.addColorStop(0.35, "rgba(52,42,30,.75)");
    gr.addColorStop(1, "rgba(60,48,34,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2,
        r = 14 + rnd() * 40;
      g.fillStyle = `rgba(${40 + rnd() * 30},${32 + rnd() * 20},${22 + rnd() * 14},${0.3 + rnd() * 0.5})`;
      g.beginPath();
      g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 1 + rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
    gr = g.createRadialGradient(c, c, 0, c, c, 10);
    gr.addColorStop(0, "rgba(10,8,6,1)");
    gr.addColorStop(1, "rgba(10,8,6,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** What a hit's surface draws as. */
function markKind(surface: string): MarkKind | "water" {
  if (surface === "water") return "water";
  if (surface === "metal") return "metal";
  if (surface === "wood") return "wood";
  if (surface === "ground" || surface === "dirt" || surface === "grass") return "ground";
  return "concrete";
}

/** A soft round sprite for the particles. */
function dotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const g = canvas.getContext("2d")!,
    gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,.6)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

export type ImpactOptions = {
  /** Holes per surface kept (oldest replaced). */
  marks?: number;
  /** The hole material's depth treatment (default: the 1v1/5v5 decal polygon offset). */
  decalDepth?: (material: THREE.Material) => void;
  /** The water's surface under (x, z) near height y, or null (default: meshes named *water*). */
  waterAt?: (x: number, y: number, z: number) => number | null;
};

/**
 * The water a map draws, found once its meshes are in the scene: every upward face of a mesh
 * whose material is named for water, in a 1 m grid (a hit on the floor under a river is a hit
 * on the river: the 1v1 Lost Trail's river lies a little below its flat floor).
 */
function sceneWater(scene: THREE.Scene) {
  let built = -1,
    builtAt = -Infinity;
  const cells = new Map<number, number[]>();
  const tris: number[] = [];
  const key = (x: number, z: number) => (Math.floor(x) + 4096) * 8192 + (Math.floor(z) + 4096);
  const build = () => {
    cells.clear();
    tris.length = 0;
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh)
        return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!mats.some((m) => m && /water/i.test(m.name))) return;
      const pos = mesh.geometry.getAttribute("position");
      if (!pos) return;
      const index = mesh.geometry.getIndex();
      const n = index ? index.count : pos.count;
      mesh.updateWorldMatrix(true, false);
      for (let i = 0; i + 2 < n; i += 3) {
        const at = (k: number) => (index ? index.getX(i + k) : i + k);
        a.fromBufferAttribute(pos, at(0)).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(pos, at(1)).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(pos, at(2)).applyMatrix4(mesh.matrixWorld);
        const t = tris.length / 9;
        tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        const x0 = Math.floor(Math.min(a.x, b.x, c.x)),
          x1 = Math.floor(Math.max(a.x, b.x, c.x)),
          z0 = Math.floor(Math.min(a.z, b.z, c.z)),
          z1 = Math.floor(Math.max(a.z, b.z, c.z));
        if ((x1 - x0 + 1) * (z1 - z0 + 1) > 4096) continue;
        for (let x = x0; x <= x1; x++)
          for (let z = z0; z <= z1; z++) {
            const k = key(x, z),
              list = cells.get(k);
            if (list) list.push(t);
            else cells.set(k, [t]);
          }
      }
    });
  };
  return (x: number, y: number, z: number): number | null => {
    // (Once the map is in; again only if the scene's top level changed and not more than
    // every few seconds: the map is static, the players and effects come and go.)
    const t = performance.now();
    if (built !== scene.children.length && t - builtAt > 3000) {
      built = scene.children.length;
      builtAt = t;
      build();
    }
    const list = cells.get(key(x, z));
    if (!list) return null;
    for (const t of list) {
      const o = t * 9;
      const ax = tris[o]!,
        ay = tris[o + 1]!,
        az = tris[o + 2]!,
        bx = tris[o + 3]!,
        by = tris[o + 4]!,
        bz = tris[o + 5]!,
        cx = tris[o + 6]!,
        cy = tris[o + 7]!,
        cz = tris[o + 8]!;
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(d) < 1e-9) continue;
      const w0 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d,
        w1 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d,
        w2 = 1 - w0 - w1;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
      const h = w0 * ay + w1 * by + w2 * cy;
      // The floor a bullet struck may stand a little above the water drawn under it.
      if (y >= h - 0.3 && y <= h + 0.4) return h;
    }
    return null;
  };
}

/** Fixed pools: continuous automatic fire never allocates new meshes or listeners. */
export function createImpactEffects(scene: THREE.Scene, options: ImpactOptions = {}) {
  const MARKS = options.marks ?? 96;
  const waterAt = options.waterAt ?? sceneWater(scene);
  // ---- holes
  const plane = new THREE.PlaneGeometry(1, 1);
  const holes = {} as Record<
    MarkKind,
    { mesh: THREE.InstancedMesh; next: number; texture: THREE.Texture }
  >;
  for (const kind of KINDS) {
    const texture = markCanvas(kind);
    const material = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
      ...(options.decalDepth ? {} : decalDepthOffset(1)),
    });
    options.decalDepth?.(material);
    const mesh = new THREE.InstancedMesh(plane, material, MARKS);
    mesh.name = `impact-holes-${kind}`;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    scene.add(mesh);
    holes[kind] = { mesh, next: 0, texture };
  }
  // ---- particles (chips, dust, splinters, sparks, droplets): one Points, alpha and size each
  const dot = dotTexture();
  const positions = new Float32Array(PARTICLES * 3).fill(1e5),
    colors = new Float32Array(PARTICLES * 3),
    alphas = new Float32Array(PARTICLES),
    sizes = new Float32Array(PARTICLES);
  const velocity = new Float32Array(PARTICLES * 3),
    birth = new Float64Array(PARTICLES),
    life = new Float32Array(PARTICLES),
    drag = new Float32Array(PARTICLES),
    fall = new Float32Array(PARTICLES),
    grow = new Float32Array(PARTICLES),
    base = new Float32Array(PARTICLES);
  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    colAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
    alphaAttr = new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage),
    sizeAttr = new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("color", colAttr);
  geometry.setAttribute("aAlpha", alphaAttr);
  geometry.setAttribute("aSize", sizeAttr);
  const pointsMaterial = new THREE.PointsMaterial({
    size: 1,
    map: dot,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  pointsMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aAlpha;
        attribute float aSize;
        varying float vAlpha;`,
      )
      .replace("gl_PointSize = size;", "gl_PointSize = size * aSize; vAlpha = aAlpha;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vAlpha;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.a *= vAlpha;`,
      );
  };
  pointsMaterial.customProgramCacheKey = () => "impact-points";
  const points = new THREE.Points(geometry, pointsMaterial);
  points.name = "impact-particles";
  points.frustumCulled = false;
  points.visible = false;
  points.renderOrder = 3;
  scene.add(points);
  // ---- water rings
  const ringGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const ringLife = new THREE.InstancedBufferAttribute(new Float32Array(RIPPLES * 2), 2);
  ringLife.setUsage(THREE.DynamicDrawUsage);
  ringGeometry.setAttribute("aLife", ringLife);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xeef6ff,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  ringMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec2 aLife;
        varying vec2 vRingUv;
        varying vec2 vLife;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vRingUv = uv;
        vLife = aLife;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vRingUv;
        varying vec2 vLife;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          // Two rings running out from where it went in, each a light crest with a dark trough
          // inside it (a white ring alone is lost on water that mirrors a bright sky), lower
          // as they spread; a burst of white in the middle at first.
          float r = length((vRingUv - 0.5) * 2.0);
          float t = vLife.x;
          float fade = (1.0 - t) * (1.0 - t);
          float a1 = 0.12 + 0.85 * t, a2 = 0.6 * a1;
          float crest = (1.0 - smoothstep(0.0, 0.035, abs(r - a1))) * fade
            + (1.0 - smoothstep(0.0, 0.03, abs(r - a2))) * fade * 0.7;
          float trough = (1.0 - smoothstep(0.0, 0.06, abs(r - a1 + 0.07))) * fade
            + (1.0 - smoothstep(0.0, 0.05, abs(r - a2 + 0.05))) * fade * 0.6;
          float burst = (1.0 - smoothstep(0.0, 0.16, r)) * (1.0 - smoothstep(0.0, 0.25, t));
          float light = min(1.0, crest * 0.85 + burst);
          float dark = min(1.0, trough * 0.5);
          float a = max(light, dark) * (1.0 - smoothstep(0.92, 1.0, r));
          if (a < 0.01) discard;
          diffuseColor.rgb = mix(vec3(0.03, 0.08, 0.12), diffuseColor.rgb, light / max(light + dark, 0.001));
          diffuseColor.a *= a * vLife.y;
        }`,
      );
  };
  ringMaterial.customProgramCacheKey = () => "impact-rings";
  options.decalDepth?.(ringMaterial);
  const rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, RIPPLES);
  rings.name = "impact-rings";
  rings.count = 0;
  rings.frustumCulled = false;
  rings.visible = false;
  rings.renderOrder = 2;
  scene.add(rings);
  const ringLive = new Float32Array(RIPPLES * 5); // x, y, z, age, size
  let ringCount = 0;

  let particle = 0,
    activeUntil = 0;
  const dummy = new THREE.Object3D(),
    axis = new THREE.Vector3(0, 0, 1),
    normal = new THREE.Vector3(),
    spin = new THREE.Quaternion(),
    ringMatrix = new THREE.Matrix4();
  const spawn = (
    now: number,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    color: readonly number[],
    o: { life: number; size: number; alpha: number; drag?: number; fall?: number; grow?: number },
  ) => {
    const i = particle++ % PARTICLES,
      j = i * 3;
    positions[j] = x;
    positions[j + 1] = y;
    positions[j + 2] = z;
    velocity[j] = vx;
    velocity[j + 1] = vy;
    velocity[j + 2] = vz;
    colors[j] = color[0]!;
    colors[j + 1] = color[1]!;
    colors[j + 2] = color[2]!;
    birth[i] = now;
    life[i] = o.life;
    sizes[i] = o.size;
    base[i] = o.alpha;
    alphas[i] = o.alpha;
    drag[i] = o.drag ?? 0;
    fall[i] = o.fall ?? 9.8;
    grow[i] = o.grow ?? 0;
  };
  const rand = (a: number) => (Math.random() - 0.5) * 2 * a;

  return {
    emit(hit: ImpactHit, now: number) {
      let kind = markKind(hit.surface);
      normal.set(hit.normal.x, hit.normal.y, hit.normal.z);
      if (normal.lengthSq() < 1e-6) normal.set(0, 1, 0);
      normal.normalize();
      const { x, z } = hit.point;
      let y = hit.point.y;
      // A hit on the floor under a map's water is a hit on the water.
      if (kind !== "water" && normal.y > 0.7) {
        const level = waterAt(x, y, z);
        if (level !== null) {
          kind = "water";
          y = level;
        }
      }
      activeUntil = Math.max(activeUntil, now + 1600);
      points.visible = true;
      if (kind === "water") {
        if (ringCount === RIPPLES) {
          ringLive.copyWithin(0, 5, RIPPLES * 5);
          ringCount--;
        }
        ringLive.set([x, y + 0.01, z, 0, 0.9 + Math.random() * 0.5], ringCount++ * 5);
        rings.visible = true;
        // The spout: droplets thrown up and falling back, a little spray round its foot.
        for (let n = 0; n < 14; n++) {
          const up = 2.2 + Math.random() * 2.6;
          spawn(
            now,
            x + rand(0.04),
            y + 0.02,
            z + rand(0.04),
            rand(0.5),
            up,
            rand(0.5),
            [0.86, 0.92, 0.97],
            { life: 700 + Math.random() * 300, size: 0.035 + Math.random() * 0.03, alpha: 0.9 },
          );
        }
        for (let n = 0; n < 6; n++)
          spawn(
            now,
            x,
            y + 0.05,
            z,
            rand(0.6),
            0.6 + Math.random() * 0.5,
            rand(0.6),
            [0.9, 0.95, 1],
            { life: 450, size: 0.18, alpha: 0.35, drag: 3, fall: 1, grow: 0.4 },
          );
        return;
      }
      // The hole.
      const h = holes[kind];
      dummy.position.set(x + normal.x * 0.006, y + normal.y * 0.006, z + normal.z * 0.006);
      dummy.quaternion.setFromUnitVectors(axis, normal);
      spin.setFromAxisAngle(axis, Math.random() * Math.PI * 2);
      if (kind !== "wood") dummy.quaternion.multiply(spin);
      const size =
        (kind === "metal" ? 0.09 : kind === "wood" ? 0.13 : kind === "ground" ? 0.18 : 0.14) *
        (0.8 + Math.random() * 0.45);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      h.mesh.setMatrixAt(h.next++ % MARKS, dummy.matrix);
      h.mesh.count = Math.min(MARKS, h.next);
      h.mesh.instanceMatrix.needsUpdate = true;
      const px = x + normal.x * 0.02,
        py = y + normal.y * 0.02,
        pz = z + normal.z * 0.02;
      const out = (s: number, spread: number) =>
        [
          normal.x * s + rand(spread),
          normal.y * s + rand(spread) + spread * 0.4,
          normal.z * s + rand(spread),
        ] as const;
      if (kind === "metal") {
        for (let n = 0; n < 10; n++) {
          const [vx, vy, vz] = out(2.5 + Math.random() * 3, 2.5);
          spawn(now, px, py, pz, vx, vy, vz, [1, 0.72 + Math.random() * 0.2, 0.3], {
            life: 160 + Math.random() * 180,
            size: 0.025,
            alpha: 1,
            fall: 6,
          });
        }
        spawn(now, px, py, pz, 0, 0.2, 0, [0.6, 0.6, 0.62], {
          life: 400,
          size: 0.12,
          alpha: 0.35,
          drag: 2,
          fall: 0,
          grow: 0.5,
        });
        return;
      }
      const chip =
        kind === "wood"
          ? [0.62, 0.45, 0.25]
          : kind === "ground"
            ? [0.36, 0.29, 0.2]
            : [0.66, 0.63, 0.58];
      const dust =
        kind === "wood"
          ? [0.55, 0.45, 0.32]
          : kind === "ground"
            ? [0.48, 0.4, 0.3]
            : [0.72, 0.7, 0.66];
      // Chips and grit (splinters for wood), thrown out and falling.
      for (let n = 0; n < (kind === "ground" ? 10 : 8); n++) {
        const [vx, vy, vz] = out(1.5 + Math.random() * 2, 1.4);
        spawn(now, px, py, pz, vx, vy, vz, chip, {
          life: 450 + Math.random() * 350,
          size: kind === "wood" ? 0.03 : 0.022 + Math.random() * 0.018,
          alpha: 0.95,
        });
      }
      // The puff of dust off the face, drifting out and spreading as it fades.
      for (let n = 0; n < (kind === "ground" ? 5 : 3); n++) {
        const [vx, vy, vz] = out(0.6 + Math.random() * 0.5, 0.25);
        spawn(now, px, py, pz, vx, vy + (kind === "ground" ? 0.4 : 0.1), vz, dust, {
          life: 700 + Math.random() * 500,
          size: kind === "ground" ? 0.22 : 0.15,
          alpha: kind === "wood" ? 0.3 : 0.45,
          drag: 2.5,
          fall: -0.15,
          grow: 0.5,
        });
      }
    },
    update(dt: number, now: number) {
      if (!points.visible) return;
      if (now >= activeUntil && !ringCount) {
        points.visible = rings.visible = false;
        positions.fill(1e5);
        return;
      }
      const seconds = Math.min(dt, 50) / 1000;
      for (let i = 0; i < PARTICLES; i++) {
        const j = i * 3;
        const age = now - birth[i]!;
        if (!(birth[i]! > 0) || age >= life[i]!) {
          if (positions[j] !== 1e5) positions[j] = positions[j + 1] = positions[j + 2] = 1e5;
          continue;
        }
        const k = Math.max(0, 1 - drag[i]! * seconds);
        velocity[j] = velocity[j]! * k;
        velocity[j + 1] = velocity[j + 1]! * k - fall[i]! * seconds;
        velocity[j + 2] = velocity[j + 2]! * k;
        for (let c = 0; c < 3; c++)
          positions[j + c] = positions[j + c]! + velocity[j + c]! * seconds;
        const t = age / life[i]!;
        alphas[i] = base[i]! * (1 - t * t);
        if (grow[i]) sizes[i] = sizes[i]! * (1 + grow[i]! * seconds);
      }
      posAttr.needsUpdate =
        colAttr.needsUpdate =
        alphaAttr.needsUpdate =
        sizeAttr.needsUpdate =
          true;
      // Rings.
      let kept = 0;
      for (let i = 0; i < ringCount; i++) {
        const o = i * 5,
          age = ringLive[o + 3]! + seconds;
        if (age >= RIPPLE_S) continue;
        const k = kept * 5;
        if (k !== o) ringLive.copyWithin(k, o, o + 5);
        ringLive[k + 3] = age;
        const t = age / RIPPLE_S,
          size = (0.25 + 1.6 * t) * ringLive[k + 4]!;
        ringMatrix
          .makeScale(size, 1, size)
          .setPosition(ringLive[k]!, ringLive[k + 1]!, ringLive[k + 2]!);
        rings.setMatrixAt(kept, ringMatrix);
        ringLife.setXY(kept, t, 1);
        kept++;
      }
      ringCount = kept;
      rings.count = kept;
      rings.visible = kept > 0;
      if (kept) {
        rings.instanceMatrix.needsUpdate = true;
        ringLife.needsUpdate = true;
      }
    },
    reset() {
      for (const kind of KINDS) {
        holes[kind].mesh.count = 0;
        holes[kind].next = 0;
      }
      birth.fill(0);
      positions.fill(1e5);
      activeUntil = 0;
      ringCount = 0;
      rings.count = 0;
      points.visible = rings.visible = false;
    },
    dispose() {
      for (const kind of KINDS) {
        scene.remove(holes[kind].mesh);
        holes[kind].texture.dispose();
        (holes[kind].mesh.material as THREE.Material).dispose();
      }
      plane.dispose();
      scene.remove(points, rings);
      geometry.dispose();
      pointsMaterial.dispose();
      dot.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
    },
  };
}
