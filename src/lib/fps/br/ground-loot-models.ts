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

/**
 * Ammunition on the floor: the rifle and pistol rounds in steel cans (the pistol cans smaller,
 * banded blue for 9 mm, red for .50 AE), the sniper's in a carton; each its own stencil.
 */
type AmmoKind = "rifle" | "sniper" | "9mm" | "50ae" | "12g";
const AMMO_STYLE: Record<
  AmmoKind,
  {
    paper: string;
    ink: string;
    title: string;
    calibre: string;
    rounds: number;
    paint: number;
    edge: number;
    rib: number;
  }
> = {
  rifle: {
    paper: "#444b31",
    ink: "#d4c99e",
    title: "RIFLE",
    calibre: "5.56 / 7.62",
    rounds: 30,
    paint: 0x41482f,
    edge: 0x2b3021,
    rib: 0x555d3b,
  },
  sniper: {
    paper: "#bba986",
    ink: "#29251c",
    title: "SNIPER",
    calibre: ".338 MATCH",
    rounds: 30,
    paint: 0xa28d69,
    edge: 0x756448,
    rib: 0x8c7959,
  },
  // Pistol calibres come in the rifle's steel can, smaller, with a coloured calibre band and
  // the gun they fit stencilled on the label (owner, 2026-11-09: like the rifle ammo box).
  "9mm": {
    paper: "#d6dde2",
    ink: "#13283c",
    title: "9MM  MP5",
    calibre: "9x19 PARABELLUM",
    rounds: 30,
    paint: 0x3d4630,
    edge: 0x282e20,
    rib: 0x2f6aa3,
  },
  "50ae": {
    paper: "#ead6bd",
    ink: "#3a1210",
    title: ".50 AE  DEAGLE",
    calibre: "MAGNUM",
    rounds: 14,
    paint: 0x4b4430,
    edge: 0x302b1e,
    rib: 0xa3322a,
  },
  // Shotgun shells: the same can, banded amber (the Deagle's band is red).
  "12g": {
    paper: "#ecdcae",
    ink: "#3a2408",
    title: "12 GA  SPAS-12",
    calibre: "00 BUCKSHOT",
    rounds: 16,
    paint: 0x47452f,
    edge: 0x2d2c1e,
    rib: 0xc98a1c,
  },
};

function ammoLabel(kind: AmmoKind) {
  const st = AMMO_STYLE[kind];
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = st.paper;
  g.fillRect(0, 0, c.width, c.height);
  // Deterministic ink wear and paper/paint grain; no animated noise or extra texture fetch.
  for (let i = 0; i < 1800; i++) {
    const x = (Math.imul(i + 1, 73856093) >>> 0) % 512;
    const y = (Math.imul(i + 1, 19349663) >>> 0) % 256;
    g.fillStyle = i % 2 ? "#ffffff08" : "#0000000c";
    g.fillRect(x, y, 1 + (i % 3), 1);
  }
  g.fillStyle = st.ink;
  g.font = "bold 38px monospace";
  g.fillText(st.title, 26, 57);
  g.font = "bold 30px monospace";
  g.fillText(st.calibre, 26, 101);
  g.font = "22px monospace";
  g.fillText(`${st.rounds} ROUNDS`, 26, 143);
  g.fillText("LOT 07-116   BALL", 26, 179);
  g.fillRect(26, 202, 440, 2);
  g.font = "16px monospace";
  g.fillText("KEEP DRY  /  FIELD AMMUNITION", 26, 231);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function ammo(kind: AmmoKind): GroundLootKind {
  const st = AMMO_STYLE[kind];
  // The sniper's rounds come in a carton; the rifle and pistol rounds in a steel can (the
  // pistol cans smaller, banded in their calibre colour).
  const sniper = kind === "sniper";
  const [w, d, h] =
    kind === "rifle"
      ? [0.245, 0.135, 0.135]
      : kind === "sniper"
        ? [0.245, 0.135, 0.095]
        : kind === "9mm" || kind === "12g"
          ? [0.205, 0.115, 0.112]
          : [0.185, 0.108, 0.102];
  const paint = st.paint;
  const edge = st.edge;
  const pieces: Piece[] = [
    [new RoundedBoxGeometry(w, h, d, 2, 0.005).translate(0, h / 2, 0), paint],
    [block(w + 0.009, 0.009, d + 0.009, 0, h - 0.004), edge],
    [block(w + 0.005, 0.008, d + 0.005, 0, 0.004), edge],
  ];
  if (!sniper) {
    // Folded steel ribs, hinged lid, spring latch and a folded carrying handle.
    const ribX = w * 0.335,
      ribColor = kind === "rifle" ? st.rib : 0x555d3b;
    for (const x of [-ribX, ribX]) {
      pieces.push([block(0.005, h - 0.03, 0.004, x, h / 2, d / 2 + 0.0015), ribColor]);
      pieces.push([block(0.005, h - 0.03, 0.004, x, h / 2, -d / 2 - 0.0015), ribColor]);
    }
    pieces.push([block(0.028, 0.045, 0.009, 0, h - 0.02, d / 2 + 0.0075), 0x33372b]);
    pieces.push([block(0.07, 0.006, 0.008, 0, h + 0.007, -d * 0.126), 0x242822]);
    for (const x of [-0.034, 0.034])
      pieces.push([block(0.006, 0.006, 0.027, x, h + 0.007, -0.004), 0x34392b]);
    for (const x of [-w * 0.306, w * 0.306])
      pieces.push([
        tube(0.004, 0.026, x, h - 0.002, -d / 2 - 0.0005).rotateY(Math.PI / 2),
        0x65664e,
      ]);
    // The calibre band painted round a pistol-ammunition can, readable from any side.
    if (kind !== "rifle") pieces.push([block(w + 0.003, 0.016, d + 0.003, 0, h * 0.42), st.rib]);
  } else {
    pieces.push([block(0.002, h - 0.015, 0.137, 0.08, h / 2), st.rib]);
    // Two long rounds beside the carton: brass cases and copper projectile tips.
    const [r, len] = [0.006, 0.067];
    for (const x of [-0.043, -0.021]) {
      pieces.push([tube(r, len, x, r + 0.001, 0.07 + len / 2), 0xa18339]);
      pieces.push([
        new THREE.ConeGeometry(r * 0.97, len * 0.33, 10)
          .rotateX(Math.PI / 2)
          .translate(x, r + 0.001, 0.07 + len + len * 0.16),
        0x9b6544,
      ]);
    }
  }
  const body = solid(pieces, sniper ? 0.86 : 0.65, sniper ? 0.05 : 0.25);
  const label = new THREE.PlaneGeometry(w * 0.69, d * 0.58)
    .toNonIndexed()
    .rotateX(-Math.PI / 2)
    .translate(0, h + 0.001, sniper ? 0 : d * 0.12);
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
      new THREE.MeshStandardMaterial({ map: ammoLabel(kind), roughness: 0.85 }),
    ],
  };
}

/**
 * The Extended Magazine on the floor: a long curved polymer rifle magazine lying on its side,
 * a round showing in the feed lips and the tan extension sleeve at the base (it reads as "more
 * rounds" next to the guns' own magazines). A stand-in until a downloaded model replaces it.
 */
function extendedMagazine(): GroundLootKind {
  const pieces: Piece[] = [];
  const body = 0x1f2124,
    rib = 0x2c2f33,
    sleeve = 0xa8834a;
  const t = 0.028, // thickness (lying on its side: y)
    w = 0.064; // front-to-back depth (z)
  // Eight segments along a gentle arc (the AK-style curve), feed end first.
  const segments = 8,
    length = 0.3,
    bend = 0.42; // total turn, radians
  let x = -length / 2,
    z = 0,
    a = -bend / 2;
  const step = length / segments;
  for (let i = 0; i < segments; i++) {
    const cx = x + (Math.cos(a) * step) / 2,
      cz = z + (Math.sin(a) * step) / 2;
    const last = i >= segments - 2;
    pieces.push([
      block(step * 1.04, t, w)
        .rotateY(-a)
        .translate(cx, t / 2, cz),
      last ? sleeve : body,
    ]);
    // A moulded rib across each body segment.
    if (!last)
      pieces.push([
        block(0.006, t + 0.003, w * 0.86)
          .rotateY(-a)
          .translate(cx, t / 2, cz),
        rib,
      ]);
    x += Math.cos(a) * step;
    z += Math.sin(a) * step;
    a += bend / segments;
  }
  // Floor plate, wider than the body, at the extended end.
  pieces.push([
    block(0.016, t + 0.008, w + 0.012)
      .rotateY(-a)
      .translate(x, (t + 0.008) / 2, z),
    0x15171a,
  ]);
  // Feed lips and the top round's brass case and copper tip.
  const fx = -length / 2;
  pieces.push([block(0.03, t * 0.6, w * 0.7, fx - 0.004, t * 0.5, 0.004), 0x34373b]);
  pieces.push([
    new THREE.CylinderGeometry(0.0055, 0.0055, 0.036, 10)
      .rotateZ(Math.PI / 2)
      .translate(fx - 0.006, t + 0.005, -0.008),
    0xb08d3c,
  ]);
  pieces.push([
    new THREE.ConeGeometry(0.0053, 0.014, 10)
      .rotateZ(Math.PI / 2)
      .translate(fx - 0.031, t + 0.005, -0.008),
    0x9b6544,
  ]);
  return solid(pieces, 0.62, 0.05);
}

/** Ammo and wearable gear are authored once, then instanced, never cloned per pickup. */
export function groundGear(): Map<ItemId, GroundLootKind> {
  const out = new Map<ItemId, GroundLootKind>([
    ["ammo-rifle", ammo("rifle")],
    ["ammo-sniper", ammo("sniper")],
    ["ammo-9mm", ammo("9mm")],
    ["ammo-50ae", ammo("50ae")],
    ["ammo-12g", ammo("12g")],
    ["mag-ext", extendedMagazine()],
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
