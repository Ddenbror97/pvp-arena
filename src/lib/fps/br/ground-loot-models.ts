import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ItemId } from "./items";

export type GroundLootKind = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
};

type Piece = [THREE.BufferGeometry, number];
const block = (w: number, h: number, d: number, x = 0, y = 0, z = 0) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const tube = (r: number, length: number, x = 0, y = 0, z = 0) =>
  new THREE.CylinderGeometry(r, r, length, 12).rotateX(Math.PI / 2).translate(x, y, z);

/** One opaque, vertex-coloured draw for all the seams, webbing and metal pieces. */
function solid(pieces: Piece[], roughness = 0.8, metalness = 0): GroundLootKind {
  const geometries = pieces.map(([source, hex]) => {
    const g = source.index ? source.toNonIndexed() : source;
    if (g !== source) source.dispose();
    g.deleteAttribute("uv");
    const color = new THREE.Color(hex);
    const colors = new Float32Array(g.getAttribute("position").count * 3);
    for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const geometry = mergeGeometries(geometries)!;
  for (const g of geometries) g.dispose();
  geometry.computeBoundingBox();
  geometry.translate(0, -geometry.boundingBox!.min.y, 0);
  return {
    geometry,
    material: new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness }),
  };
}

function ammoLabel(sniper: boolean) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = sniper ? "#bba986" : "#444b31";
  g.fillRect(0, 0, c.width, c.height);
  // Deterministic ink wear and paper/paint grain; no animated noise or extra texture fetch.
  for (let i = 0; i < 1800; i++) {
    const x = (Math.imul(i + 1, 73856093) >>> 0) % 512;
    const y = (Math.imul(i + 1, 19349663) >>> 0) % 256;
    g.fillStyle = i % 2 ? "#ffffff08" : "#0000000c";
    g.fillRect(x, y, 1 + (i % 3), 1);
  }
  g.fillStyle = sniper ? "#29251c" : "#d4c99e";
  g.font = "bold 38px monospace";
  g.fillText(sniper ? "SNIPER" : "RIFLE", 26, 57);
  g.font = "bold 30px monospace";
  g.fillText(sniper ? ".338 MATCH" : "5.56 / 7.62", 26, 101);
  g.font = "22px monospace";
  g.fillText("30 ROUNDS", 26, 143);
  g.fillText("LOT 07-116   BALL", 26, 179);
  g.fillRect(26, 202, 440, 2);
  g.font = "16px monospace";
  g.fillText("KEEP DRY  /  FIELD AMMUNITION", 26, 231);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function ammo(sniper: boolean): GroundLootKind {
  const h = sniper ? 0.095 : 0.135;
  const paint = sniper ? 0xa28d69 : 0x41482f;
  const edge = sniper ? 0x756448 : 0x2b3021;
  const pieces: Piece[] = [
    [new RoundedBoxGeometry(0.245, h, 0.135, 2, 0.005).translate(0, h / 2, 0), paint],
    [block(0.254, 0.009, 0.144, 0, h - 0.004), edge],
    [block(0.25, 0.008, 0.14, 0, 0.004), edge],
  ];
  if (!sniper) {
    // Folded steel ribs, hinged lid, spring latch and a folded carrying handle.
    for (const x of [-0.082, 0.082]) {
      pieces.push([block(0.005, h - 0.03, 0.004, x, h / 2, 0.069), 0x555d3b]);
      pieces.push([block(0.005, h - 0.03, 0.004, x, h / 2, -0.069), 0x555d3b]);
    }
    pieces.push([block(0.028, 0.045, 0.009, 0, h - 0.02, 0.075), 0x33372b]);
    pieces.push([block(0.07, 0.006, 0.008, 0, h + 0.007, -0.017), 0x242822]);
    for (const x of [-0.034, 0.034])
      pieces.push([block(0.006, 0.006, 0.027, x, h + 0.007, -0.004), 0x34392b]);
    for (const x of [-0.075, 0.075])
      pieces.push([tube(0.004, 0.026, x, h - 0.002, -0.068).rotateY(Math.PI / 2), 0x65664e]);
  } else {
    pieces.push([block(0.002, h - 0.015, 0.137, 0.08, h / 2), 0x8c7959]);
    // Two rounds beside the carton: brass cases and copper projectile tips.
    for (const x of [-0.043, -0.021]) {
      pieces.push([tube(0.006, 0.067, x, 0.007, 0.092), 0xa18339]);
      pieces.push([
        new THREE.ConeGeometry(0.0058, 0.022, 10).rotateX(Math.PI / 2).translate(x, 0.007, 0.136),
        0x9b6544,
      ]);
    }
  }
  const body = solid(pieces, sniper ? 0.86 : 0.65, sniper ? 0.05 : 0.25);
  const label = new THREE.PlaneGeometry(0.17, 0.078)
    .toNonIndexed()
    .rotateX(-Math.PI / 2)
    .translate(0, h + 0.001, sniper ? 0 : 0.016);
  label.deleteAttribute("uv1");
  // Vertex colours keep one body draw; the small stencil is one additional shared draw.
  body.geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(
      new Float32Array(body.geometry.getAttribute("position").count * 2),
      2,
    ),
  );
  label.setAttribute(
    "color",
    new THREE.BufferAttribute(
      new Float32Array(label.getAttribute("position").count * 3).fill(1),
      3,
    ),
  );
  const geometry = mergeGeometries([body.geometry, label], true)!;
  body.geometry.dispose();
  label.dispose();
  return {
    geometry,
    material: [
      body.material as THREE.Material,
      new THREE.MeshStandardMaterial({ map: ammoLabel(sniper), roughness: 0.85 }),
    ],
  };
}

/** Ammo and wearable gear are authored once, then instanced, never cloned per pickup. */
export function groundGear(): Map<ItemId, GroundLootKind> {
  const out = new Map<ItemId, GroundLootKind>([
    ["ammo-rifle", ammo(false)],
    ["ammo-sniper", ammo(true)],
  ]);
  for (const level of [1, 2, 3] as const) {
    const cloth = [0x565c40, 0x746448, 0x303938][level - 1]!;
    const dark = [0x343b28, 0x4d402d, 0x1f2525][level - 1]!;
    // Plate carrier laid on its back: shaped shoulders, neck opening, MOLLE rows and pouches.
    const shape = new THREE.Shape();
    shape.moveTo(-0.19, -0.24);
    shape.lineTo(0.19, -0.24);
    shape.lineTo(0.22, 0.13);
    shape.lineTo(0.14, 0.24);
    shape.lineTo(0.07, 0.24);
    shape.lineTo(0.055, 0.17);
    shape.lineTo(-0.055, 0.17);
    shape.lineTo(-0.07, 0.24);
    shape.lineTo(-0.14, 0.24);
    shape.lineTo(-0.22, 0.13);
    shape.closePath();
    const carrier = new THREE.ExtrudeGeometry(shape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.01,
      bevelSegments: 1,
      steps: 1,
    })
      .rotateX(-Math.PI / 2)
      .translate(0, 0.012, 0);
    const vest: Piece[] = [[carrier, cloth]];
    for (const z of [-0.13, -0.07, -0.01, 0.05])
      vest.push([block(0.32, 0.006, 0.018, 0, 0.064, z), dark]);
    for (const x of [-0.107, 0, 0.107]) {
      vest.push([block(0.085, 0.035, 0.135, x, 0.074, 0.13), dark]);
      vest.push([block(0.077, 0.005, 0.028, x, 0.095, 0.067), cloth]);
    }
    out.set(`vest-${level}`, solid(vest));
    // Soft bag face-up, with an outlined pocket, compression straps, handle and buckles.
    const bagH = 0.12 + level * 0.025;
    const bag = new THREE.BoxGeometry(0.29, bagH, 0.39, 2, 2, 2);
    const pos = bag.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      // Rounded cloth silhouette without a high-poly subdivision or extra shader.
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      pos.setXYZ(i, x * (Math.abs(z) > 0.18 ? 0.88 : 1), y, z * (Math.abs(x) > 0.13 ? 0.93 : 1));
    }
    bag.computeVertexNormals();
    bag.translate(0, bagH / 2 + 0.01, 0);
    const backpack: Piece[] = [
      [bag, cloth],
      [block(0.23, 0.035, 0.22, 0, bagH + 0.013, 0.035), dark],
      [block(0.22, 0.004, 0.006, 0, bagH + 0.033, -0.063), 0x212721],
      [block(0.085, 0.01, 0.012, 0, bagH - 0.01, -0.207), dark],
    ];
    for (const x of [-0.09, 0.09]) {
      backpack.push([block(0.024, 0.007, 0.4, x, bagH + 0.037, 0), cloth]);
      backpack.push([block(0.035, 0.009, 0.025, x, bagH + 0.044, 0.12), 0x292c26]);
    }
    out.set(`backpack-${level}`, solid(backpack, 0.95));
  }
  return out;
}

/** Recognisable geometry if the shared accessory download fails; never a coloured case. */
export function attachmentFallback(optic: boolean, long: boolean): GroundLootKind {
  const length = optic ? (long ? 0.27 : 0.09) : long ? 0.22 : 0.065;
  const radius = optic && long ? 0.027 : 0.021;
  const pieces: Piece[] = [[tube(radius, length, 0, radius, 0), 0x282c2c]];
  for (const z of [-length * 0.4, length * 0.4])
    pieces.push([tube(radius + 0.003, 0.008, 0, radius, z), 0x3a3e3e]);
  if (optic) {
    pieces.push([block(0.048, 0.018, length * 0.45, 0, 0.01), 0x242727]);
    pieces.push([tube(radius * 0.84, 0.001, 0, radius, length / 2 + 0.001), 0x395f67]);
    pieces.push([block(0.023, 0.013, 0.025, radius, radius, 0), 0x393d3b]);
  } else {
    pieces.push([tube(radius * 0.4, 0.002, 0, radius, length / 2 + 0.001), 0x0b0d0e]);
  }
  return solid(pieces, 0.55, 0.55);
}

/** Bake shared textured accessory parts into one instanced mesh, resting exactly on y=0. */
export function groundAttachment(
  source: THREE.Object3D,
  rest: "side" | "face-up" | "upright" = "side",
  longest?: number,
  maxHeight?: number,
): GroundLootKind | null {
  const object = source.clone(true);
  if (rest === "side") object.rotation.z += Math.PI / 2;
  if (rest === "face-up") object.rotation.x += Math.PI / 2;
  if (longest) {
    const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
    object.scale.multiplyScalar(longest / Math.max(size.x, size.y, size.z));
  }
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const centre = bounds.getCenter(new THREE.Vector3());
  const squash = maxHeight ? Math.min(1, maxHeight / (bounds.max.y - bounds.min.y)) : 1;
  const offset = new THREE.Matrix4().makeScale(1, squash, 1);
  offset.setPosition(-centre.x, -bounds.min.y * squash, -centre.z);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible || /_Aim_/.test(child.name)) return;
    const g = child.geometry.clone();
    for (const name of Object.keys(g.attributes))
      if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    if (!g.hasAttribute("normal")) g.computeVertexNormals();
    if (!g.hasAttribute("uv"))
      g.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2),
      );
    // Meshopt/KHR_mesh_quantization may store body UVs/normals as integers while
    // glass uses floats. Decode before transforming/merging, so neither precision
    // nor the common attribute layout depends on the source primitive.
    for (const name of ["position", "normal", "uv"]) {
      const a = g.getAttribute(name);
      const values = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) {
        values[i * a.itemSize] = a.getX(i);
        values[i * a.itemSize + 1] = a.getY(i);
        if (a.itemSize > 2) values[i * a.itemSize + 2] = a.getZ(i);
      }
      g.setAttribute(name, new THREE.BufferAttribute(values, a.itemSize));
    }
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(offset, child.matrixWorld));
    // Pack parts are single-material meshes; preserve their textured body and optical glass.
    if (Array.isArray(child.material)) {
      g.dispose();
      return;
    }
    const material = child.material.clone();
    if (material instanceof THREE.MeshStandardMaterial) {
      // These anodised/painted pickups use the island's hemisphere lighting, with no
      // reflection probe. Keep diffuse detail readable rather than rendering black metal.
      material.metalness = Math.min(material.metalness, 0.65);
      material.roughness = Math.max(material.roughness, 0.38);
    }
    materials.push(material);
    g.clearGroups();
    geometries.push(g);
  });
  if (!geometries.length) return null;
  const geometry = mergeGeometries(geometries, true);
  for (const g of geometries) g.dispose();
  if (!geometry) {
    for (const material of materials) material.dispose();
    return null;
  }
  return { geometry, material: materials.length === 1 ? materials[0]! : materials };
}
