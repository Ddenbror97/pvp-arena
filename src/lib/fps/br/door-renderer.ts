import * as THREE from "three";
import { DOOR_THICKNESS, type Door, type DoorSet } from "./doors";

/**
 * Door panels in the buildings' doorways (doors.ts). Owner, 2026-11-08: "the doors work to open
 * but there is a gap and they don't fit; we need specific doors for houses". Each building's door
 * now wears its own picture (scripts/br/doors/bake.mjs: the painted door photographed off the
 * model's import, or a drawn house, shop, metal or plank door for procedural buildings) and fills
 * the whole opening, sill to head, inside a thin lining that covers the cut's edges through the
 * wall's thickness, so neither the closed door nor the open doorway shows a gap or the sky.
 *
 * Draws: the panels (one instanced mesh, the atlas) and the linings (one instanced mesh, each in
 * its door's rim colour), for the doors within DRAW_M of the camera, re-picked twice a second. A
 * door swings 90° inward on its hinge in about a quarter second. Presentation only: the server
 * owns which doors are open, and their collision (doors.ts) is unchanged.
 */
const DRAW_M = 260;
const MAX_DRAWN = 1600;
const SWING = Math.PI * 0.48;
const SPEED = 7; // rad/s

/** doors.v9.json: per model, per doorway (doors.ts order). */
export type DoorLookData = {
  atlas: [number, number];
  lining: number;
  models: Record<
    string,
    Array<{
      rect: [number, number, number, number];
      width: number;
      shift: number;
      y0: number;
      y1: number;
      out: 1 | -1;
      front: number;
      back: number;
      rim: [number, number, number];
    } | null>
  >;
};
export type DoorLook = { data: DoorLookData; atlas: THREE.Texture };

/** One door's fitted shape in the world (computed once, when first drawn). */
type Fit = {
  /** Opening centre at the sill, outward normal, the wall's right (seen from outside). */
  cx: number;
  cz: number;
  nx: number;
  nz: number;
  theta: number;
  width: number;
  y0: number;
  y1: number;
  front: number;
  back: number;
  lining: number;
  rect: [number, number, number, number] | null;
  rim: THREE.Color;
};

const turnXZ = (x: number, z: number, turn: number): [number, number] => {
  switch (turn & 3) {
    case 1:
      return [z, -x];
    case 2:
      return [-x, -z];
    case 3:
      return [-z, x];
    default:
      return [x, z];
  }
};

const FALLBACK_RIM = new THREE.Color(0x6e4b33);

function fitOf(d: Door, look: DoorLook | null): Fit {
  const v =
    d.model !== undefined && d.index !== undefined ? look?.data.models[d.model]?.[d.index] : null;
  if (!v) {
    // No picture for this doorway: the old plain panel in the opening.
    const [nx, nz] = d.along === "x" ? [0, 1] : [1, 0];
    return {
      cx: d.x,
      cz: d.z,
      nx,
      nz,
      theta: Math.atan2(nx, nz),
      width: d.width + 0.06,
      y0: d.y0,
      y1: Math.min(d.y1, d.y0 + 2.2),
      front: 0.06,
      back: 0.06,
      lining: 0,
      rect: null,
      rim: FALLBACK_RIM,
    };
  }
  const turn = d.turn ?? 0;
  // The doorway's axis in the model (the placement turns it).
  const modelAlong = turn & 1 ? (d.along === "x" ? "z" : "x") : d.along;
  const [sx, sz] = turnXZ(modelAlong === "x" ? v.shift : 0, modelAlong === "z" ? v.shift : 0, turn);
  const [nx, nz] = turnXZ(modelAlong === "x" ? 0 : v.out, modelAlong === "x" ? v.out : 0, turn);
  return {
    cx: d.x + sx,
    cz: d.z + sz,
    nx,
    nz,
    theta: Math.atan2(nx, nz),
    width: v.width,
    y0: d.y0,
    y1: d.y0 + (v.y1 - v.y0),
    front: v.front,
    back: v.back,
    lining: look!.data.lining,
    rect: v.rect,
    rim: new THREE.Color().setRGB(
      v.rim[0] / 255,
      v.rim[1] / 255,
      v.rim[2] / 255,
      THREE.SRGBColorSpace,
    ),
  };
}

export function createDoorRenderer(scene: THREE.Scene, set: DoorSet, look: DoorLook | null = null) {
  const n = set.doors.length;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const rects = new Float32Array(MAX_DRAWN * 4);
  const panelGeometry = box.clone();
  const rectAttr = new THREE.InstancedBufferAttribute(rects, 4);
  panelGeometry.setAttribute("aRect", rectAttr);
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: look ? 0xffffff : 0x6e4b33,
    map: look?.atlas ?? null,
    roughness: 0.78,
  });
  if (look)
    panelMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec4 aRect;")
        .replace(
          "#include <uv_vertex>",
          // Front and back faces show the door; the edges take a sliver of its side.
          "#include <uv_vertex>\nvec2 doorUv = abs(normal.z) > 0.5 ? uv : vec2(0.02, uv.y);\nvMapUv = aRect.xy + doorUv * aRect.zw;",
        );
    };
  panelMaterial.customProgramCacheKey = () => (look ? "br-door-atlas" : "br-door-plain");
  const panels = new THREE.InstancedMesh(panelGeometry, panelMaterial, MAX_DRAWN);
  const liningMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const linings = new THREE.InstancedMesh(box, liningMaterial, MAX_DRAWN * 3);
  linings.setColorAt(0, FALLBACK_RIM);
  for (const m of [panels, linings]) {
    m.count = 0;
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = "doors";
    scene.add(m);
  }
  const [aw, ah] = look?.data.atlas ?? [1, 1];
  const fits: Array<Fit | undefined> = new Array(n);
  const fit = (id: number) => (fits[id] ??= fitOf(set.doors[id]!, look));
  const angle = new Float32Array(n),
    target = new Float32Array(n);
  let drawn: number[] = [];
  const slot = new Int32Array(n).fill(-1);
  let pickedAt = -Infinity;
  const moving = new Set<number>();
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    pos = new THREE.Vector3(),
    scl = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);

  const write = (id: number) => {
    const s = slot[id]!;
    if (s < 0) return;
    const f = fit(id);
    const w = f.width - 2 * f.lining - 0.01,
      h = f.y1 - f.y0 - f.lining - 0.01;
    // Hinged on the left seen from outside; opening swings it inward.
    const rx = Math.cos(f.theta),
      rz = -Math.sin(f.theta);
    const hx = f.cx - (rx * w) / 2,
      hz = f.cz - (rz * w) / 2;
    const a = f.theta + angle[id]!;
    pos.set(hx + (Math.cos(a) * w) / 2, f.y0 + 0.005 + h / 2, hz - (Math.sin(a) * w) / 2);
    q.setFromAxisAngle(up, a);
    scl.set(w, h, DOOR_THICKNESS * 0.6);
    panels.setMatrixAt(s, m4.compose(pos, q, scl));
    panels.instanceMatrix.needsUpdate = true;
  };

  const lining = (k: number, f: Fit) => {
    const t = f.lining,
      depth = f.front + f.back + 0.02,
      shift = (f.front - f.back) / 2;
    const rx = Math.cos(f.theta),
      rz = -Math.sin(f.theta);
    const h = f.y1 - f.y0;
    q.setFromAxisAngle(up, f.theta);
    const put = (i: number, along: number, y: number, sx: number, sy: number) => {
      pos.set(f.cx + rx * along + f.nx * shift, y, f.cz + rz * along + f.nz * shift);
      scl.set(sx, sy, depth);
      linings.setMatrixAt(k * 3 + i, m4.compose(pos, q, scl));
      linings.setColorAt(k * 3 + i, f.rim);
    };
    put(0, -(f.width - t) / 2, f.y0 + h / 2, t, h);
    put(1, (f.width - t) / 2, f.y0 + h / 2, t, h);
    put(2, 0, f.y1 - t / 2, f.width, t);
  };

  const pick = (x: number, z: number) => {
    for (const id of drawn) slot[id] = -1;
    const near: Array<[number, number]> = [];
    for (const d of set.doors) {
      const dist = Math.hypot(d.x - x, d.z - z);
      if (dist < DRAW_M) near.push([dist, d.id]);
    }
    near.sort((a, b) => a[0] - b[0]);
    drawn = near.slice(0, MAX_DRAWN).map(([, id]) => id);
    let lined = 0;
    drawn.forEach((id, i) => {
      slot[id] = i;
      const f = fit(id);
      if (f.rect) {
        const [rx, ry, rw, rh] = f.rect;
        // Atlas rows run top-down; texture v runs bottom-up (flipY).
        rects.set([rx / aw, 1 - (ry + rh) / ah, rw / aw, rh / ah], i * 4);
      }
      write(id);
      if (f.lining > 0) lining(lined++, f);
    });
    panels.count = drawn.length;
    linings.count = lined * 3;
    rectAttr.needsUpdate = true;
    panels.instanceMatrix.needsUpdate = true;
    linings.instanceMatrix.needsUpdate = true;
    if (linings.instanceColor) linings.instanceColor.needsUpdate = true;
  };

  return {
    /** Door states from the server: every open id (first view), or changes (id · 2 + open). */
    apply(update: { open?: number[]; changes?: number[] } | undefined, open: Uint8Array) {
      if (!update) return;
      if (update.open) {
        open.fill(0);
        for (const id of update.open) if (id < n) open[id] = 1;
        for (let id = 0; id < n; id++) {
          target[id] = open[id] ? SWING : 0;
          angle[id] = target[id]!; // the first view: no animation
          write(id);
        }
      }
      for (const c of update.changes ?? []) {
        const id = c >> 1;
        if (id >= n) continue;
        open[id] = c & 1;
        target[id] = open[id] ? SWING : 0;
        moving.add(id);
      }
    },
    update(dtMs: number, now: number, camera: THREE.Vector3) {
      if (now - pickedAt > 500) {
        pickedAt = now;
        pick(camera.x, camera.z);
      }
      const step = (SPEED * dtMs) / 1000;
      for (const id of moving) {
        const a = angle[id]!,
          t = target[id]!;
        angle[id] = Math.abs(t - a) <= step ? t : a + Math.sign(t - a) * step;
        write(id);
        if (angle[id] === t) moving.delete(id);
      }
    },
    dispose() {
      for (const m of [panels, linings]) {
        scene.remove(m);
        m.dispose();
      }
      box.dispose();
      panelGeometry.dispose();
      panelMaterial.dispose();
      liningMaterial.dispose();
    },
  };
}
