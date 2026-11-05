/**
 * Inventory icons (scripts/br/icons/render.mjs): every battle royale item rendered once, lit like
 * a product shot on a transparent background. Guns, attachments, grenades and worn gear are the
 * game's own models; ammunition, medical items, plates and the tablet are small studio models
 * built here (the world shows simpler stand-ins for them on the floor).
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ITEMS, type ItemId } from "@/lib/fps/br/items";
import { WORLD_RIFLES } from "@/lib/fps/model-assets";
import { createCharacter } from "@/lib/fps/authored-character";
import { createWeaponKit } from "@/lib/fps/weapon";

const SIZE = 512;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(SIZE, SIZE);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const key = new THREE.DirectionalLight(0xffffff, 2.4);
const rim = new THREE.DirectionalLight(0xbcd2ff, 1.4);
scene.add(key, rim, new THREE.HemisphereLight(0xf2f4ff, 0x30302a, 0.6));
const camera = new THREE.PerspectiveCamera(18, 1, 0.01, 100);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const load = (url: string) => loader.loadAsync(url).then((g) => g.scene);

// ------------------------------------------------------------------ studio models

const mat = (color: number, rough = 0.6, metal = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A decal on a box face (+Z unless turned), a hair in front of it. */
function decal(w: number, h: number, map: THREE.Texture, at: THREE.Vector3, turnY = 0) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map, roughness: 0.75, transparent: true }),
  );
  m.position.copy(at);
  m.rotation.y = turnY;
  return m;
}

function ammoBox(title: string, sub: string, body: number, ink: string, paper: string) {
  const g = new THREE.Group();
  const w = 0.26,
    h = 0.13,
    d = 0.13;
  g.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.008), mat(body, 0.55, 0.35)));
  // The lid's lip and the carry handle.
  const lip = new THREE.Mesh(
    new RoundedBoxGeometry(w + 0.006, 0.018, d + 0.006, 2, 0.004),
    mat(body, 0.5, 0.4),
  );
  lip.position.y = h / 2 - 0.02;
  g.add(lip);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.006, 8, 24, Math.PI),
    mat(0x22231f, 0.45, 0.6),
  );
  handle.position.y = h / 2;
  g.add(handle);
  const label = canvasTexture(512, 256, (c) => {
    c.fillStyle = paper;
    c.fillRect(0, 0, 512, 256);
    c.strokeStyle = ink;
    c.lineWidth = 10;
    c.strokeRect(16, 16, 480, 224);
    c.fillStyle = ink;
    c.textAlign = "center";
    c.font = "800 92px system-ui, sans-serif";
    c.fillText(title, 256, 128);
    c.font = "700 50px system-ui, sans-serif";
    c.fillText(sub, 256, 200);
  });
  g.add(decal(w * 0.82, h * 0.62, label, new THREE.Vector3(0, -0.008, d / 2 + 0.0015)));
  const side = canvasTexture(256, 256, (c) => {
    c.fillStyle = paper;
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = ink;
    c.textAlign = "center";
    c.font = "800 90px system-ui, sans-serif";
    c.fillText("30", 128, 150);
  });
  g.add(decal(d * 0.6, h * 0.5, side, new THREE.Vector3(w / 2 + 0.0015, -0.008, 0), Math.PI / 2));
  return g;
}

function medkit() {
  const g = new THREE.Group();
  const w = 0.3,
    h = 0.2,
    d = 0.1;
  g.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, 0.02), mat(0xc0282b, 0.38, 0.05)));
  const seam = new THREE.Mesh(
    new RoundedBoxGeometry(w + 0.004, h + 0.004, 0.012, 3, 0.006),
    mat(0x8e1c1f, 0.5),
  );
  g.add(seam);
  const cross = canvasTexture(256, 256, (c) => {
    c.fillStyle = "#f4f2ee";
    c.beginPath();
    c.roundRect(88, 24, 80, 208, 14);
    c.roundRect(24, 88, 208, 80, 14);
    c.fill();
  });
  g.add(decal(0.11, 0.11, cross, new THREE.Vector3(0, 0, d / 2 + 0.0015)));
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.008, 10, 28, Math.PI),
    mat(0x2a2a2c, 0.4, 0.3),
  );
  handle.position.y = h / 2;
  g.add(handle);
  for (const x of [-0.1, 0.1]) {
    const latch = new THREE.Mesh(
      new RoundedBoxGeometry(0.03, 0.03, 0.016, 2, 0.004),
      mat(0xd9d9d6, 0.3, 0.8),
    );
    latch.position.set(x, h / 2 - 0.03, d / 2);
    g.add(latch);
  }
  return g;
}

function bandage() {
  const g = new THREE.Group();
  const gauze = canvasTexture(256, 256, (c) => {
    c.fillStyle = "#f1ece0";
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = "rgba(150,140,120,0.35)";
    c.lineWidth = 2;
    for (let i = 0; i < 256; i += 8) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 256);
      c.stroke();
      c.beginPath();
      c.moveTo(0, i);
      c.lineTo(256, i);
      c.stroke();
    }
    c.fillStyle = "rgba(60,120,200,0.55)";
    c.fillRect(0, 122, 256, 10);
  });
  gauze.wrapS = gauze.wrapT = THREE.RepeatWrapping;
  const cloth = new THREE.MeshStandardMaterial({ map: gauze, roughness: 0.95 });
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 40, 1, true), cloth);
  roll.rotation.z = Math.PI / 2;
  g.add(roll);
  const ends = new THREE.MeshStandardMaterial({ color: 0xe6dfcf, roughness: 0.95 });
  for (const s of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.05, 40), ends);
    end.rotation.y = (s * Math.PI) / 2;
    end.position.x = s * 0.04;
    g.add(end);
  }
  // The loose end lying out in front.
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), cloth);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, -0.049, 0.04);
  g.add(tail);
  return g;
}

function plate() {
  const w = 0.25,
    h = 0.32,
    cut = 0.06;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2 - cut);
  s.lineTo(w / 2 - cut, h / 2);
  s.lineTo(-w / 2 + cut, h / 2);
  s.lineTo(-w / 2, h / 2 - cut);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 3,
  });
  geo.center();
  // A slight curve across the width, as real plates have.
  const p = geo.attributes.position!;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - p.getX(i) * p.getX(i) * 1.1);
  geo.computeVertexNormals();
  // One plate type: black, with a stencilled marking.
  const face = canvasTexture(256, 328, (c) => {
    c.fillStyle = "#1d1f22";
    c.fillRect(0, 0, 256, 328);
    c.fillStyle = "rgba(255,255,255,0.035)";
    for (let y = 0; y < 328; y += 6) c.fillRect(0, y, 256, 2);
    c.fillStyle = "rgba(220,224,228,0.55)";
    c.textAlign = "center";
    c.font = "800 30px system-ui, sans-serif";
    c.fillText("ARMOUR", 128, 214);
    c.fillText("PLATE", 128, 250);
  });
  face.repeat.set(1 / w, 1 / h);
  face.offset.set(0.5, 0.5);
  geo.translate(0, 0, 0); // UVs are shape units (metres) about the centre
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: face, roughness: 0.62, metalness: 0.2 }),
  );
}

function tablet() {
  const g = new THREE.Group();
  g.add(
    new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.19, 0.022, 3, 0.012), mat(0x2a2d30, 0.5, 0.2)),
  );
  const screen = canvasTexture(512, 352, (c) => {
    c.fillStyle = "#0d1a12";
    c.fillRect(0, 0, 512, 352);
    c.strokeStyle = "#5fcf63";
    c.lineWidth = 3;
    for (let i = 1; i < 6; i++) {
      c.beginPath();
      c.arc(256, 176, i * 34, 0, Math.PI * 2);
      c.globalAlpha = 0.5;
      c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = "#8fe27f";
    c.font = "800 40px system-ui, sans-serif";
    c.fillText("TACTICAL", 24, 56);
  });
  const s = new THREE.Mesh(
    new THREE.PlaneGeometry(0.235, 0.155),
    new THREE.MeshStandardMaterial({
      map: screen,
      emissive: 0xffffff,
      emissiveMap: screen,
      emissiveIntensity: 0.7,
      roughness: 0.25,
    }),
  );
  s.position.z = 0.0115;
  g.add(s);
  return g;
}

// ------------------------------------------------------------------ framing and rendering

/** Camera direction per item (from the object towards the camera). */
type Shot = { object: THREE.Object3D; dir: THREE.Vector3; up?: THREE.Vector3 };

function render({ object, dir }: Shot) {
  scene.add(object);
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const d = dir.clone().normalize();
  const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.copy(sphere.center).addScaledVector(d, dist);
  camera.near = dist / 20;
  camera.far = dist * 4;
  camera.updateProjectionMatrix();
  camera.lookAt(sphere.center);
  // Key light high and to the camera's left, rim from behind.
  const right = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize();
  key.position
    .copy(sphere.center)
    .addScaledVector(d, 2)
    .addScaledVector(right, -1.5)
    .add(new THREE.Vector3(0, 2.5, 0));
  key.target.position.copy(sphere.center);
  rim.position
    .copy(sphere.center)
    .addScaledVector(d, -2)
    .add(new THREE.Vector3(0, 1, 0))
    .addScaledVector(right, 1.2);
  rim.target.position.copy(sphere.center);
  key.target.updateMatrixWorld();
  rim.target.updateMatrixWorld();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(object);
  return url;
}

/**
 * Centre a model; with `align`, first turn it so its longest side runs along x, its middle side
 * along y and its thinnest towards the camera (a gun or muzzle device in profile). `turn`
 * (degrees, TURNS) then flips it the right way round.
 */
function profile(model: THREE.Object3D, turn: THREE.Euler, align = false) {
  const g = new THREE.Group();
  g.add(model);
  if (align) {
    model.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const axes = [
      { v: new THREE.Vector3(1, 0, 0), s: size.x },
      { v: new THREE.Vector3(0, 1, 0), s: size.y },
      { v: new THREE.Vector3(0, 0, 1), s: size.z },
    ].sort((a, b) => b.s - a.s);
    const basis = new THREE.Matrix4().makeBasis(axes[0]!.v, axes[1]!.v, axes[2]!.v);
    const det = basis.determinant();
    if (det < 0) basis.makeBasis(axes[0]!.v, axes[1]!.v, axes[2]!.v.clone().negate());
    model.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(basis).invert());
  }
  model.quaternion.premultiply(new THREE.Quaternion().setFromEuler(turn));
  g.updateMatrixWorld(true);
  const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
  model.position.sub(c);
  return g;
}

function findNode(root: THREE.Object3D, raw: string) {
  // GLTFLoader sanitises node names ("Sight 1" → "Sight_1").
  const name = THREE.PropertyBinding.sanitizeNodeName(raw);
  let hit: THREE.Object3D | undefined;
  root.traverse((o) => {
    if (!hit && o.name === name) hit = o;
  });
  if (!hit) throw new Error(`no node ${name}`);
  return hit;
}

const SIDE = new THREE.Vector3(0.12, 0.1, 1);
const THREE_QUARTER = new THREE.Vector3(0.9, 0.75, 1.2);

async function shots(): Promise<Record<string, Shot>> {
  const out: Record<string, Shot> = {};
  const [ak, m4, awp, gear, att, nades] = await Promise.all([
    load(WORLD_RIFLES.ak),
    load(WORLD_RIFLES.m4),
    load(WORLD_RIFLES.awp),
    load("/fps/br/models/gear.glb"),
    load("/fps/br/models/attachments.glb"),
    load("/fps/models/grenades.glb"),
  ]);
  const turns = (window as unknown as { TURNS?: Record<string, number[]> }).TURNS ?? {};
  const eul = (id: string, def: number[]) => {
    const t = turns[id] ?? def;
    return new THREE.Euler(
      ...(t.map((v) => THREE.MathUtils.degToRad(v)) as [number, number, number]),
    );
  };
  out["ak47"] = { object: profile(ak, eul("ak47", [0, 0, 0]), true), dir: SIDE };
  out["m4"] = { object: profile(m4, eul("m4", [0, 180, 0]), true), dir: SIDE };
  out["awp"] = { object: profile(awp, eul("awp", [0, 180, 0]), true), dir: SIDE };
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    const d = ITEMS[id];
    if (d.category === "optic" || d.category === "muzzle")
      out[id] = {
        object: profile(
          findNode(att, (d as { mesh: string }).mesh).clone(),
          eul(id, [0, 0, 0]),
          d.category === "muzzle",
        ),
        dir: d.category === "optic" ? new THREE.Vector3(1, 0.35, 0.65) : SIDE,
      };
  }
  for (const [id, node] of [
    ["grenade-he", "GR_he"],
    ["grenade-smoke", "GR_smoke"],
    ["grenade-fire", "GR_fire"],
  ] as const)
    out[id] = {
      object: profile(findNode(nades, node).clone(), eul(id, [0, 0, 0])),
      dir: new THREE.Vector3(0.6, 0.35, 1),
    };
  for (const lv of [1, 2, 3] as const) {
    out[`helmet-${lv}`] = {
      object: profile(findNode(gear, `helmet-${lv}`).clone(), eul(`helmet-${lv}`, [0, 0, 0])),
      dir: new THREE.Vector3(-0.75, 0.45, -1),
    };
    out[`vest-${lv}`] = {
      object: profile(findNode(gear, `vest-${lv}`).clone(), eul(`vest-${lv}`, [0, 0, 0])),
      dir: new THREE.Vector3(-0.45, 0.04, -1),
    };
    out[`backpack-${lv}`] = {
      object: profile(findNode(gear, `backpack-${lv}`).clone(), eul(`backpack-${lv}`, [0, 0, 0])),
      dir: new THREE.Vector3(0.7, 0.3, 1),
    };
  }
  out["plate"] = { object: plate(), dir: new THREE.Vector3(0.55, 0.3, 1) };
  // The operators for the inventory's equipment panel (yours is the officer, bare-headed as in
  // the battle royale), at the ready with their rifle, from the front.
  const plain = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.8 });
  const weaponKit = createWeaponKit();
  for (const [id, seat] of [
    ["char-police", "A"],
    ["char-masked", "B"],
  ] as const) {
    const c = createCharacter(seat, plain, weaponKit, { worldRifle: true, bareHead: true });
    await c.ready;
    for (let i = 0; i < 40; i++)
      c.update(16, 10_000 + i * 16, 0, true, false, {
        primary: seat === "A" ? "m4" : "ak47",
      });
    c.root.updateMatrixWorld(true);
    out[id] = { object: c.root, dir: new THREE.Vector3(0.75, 0.06, -1) };
  }
  out["ammo-rifle"] = {
    object: ammoBox("RIFLE", "5.56 · 7.62", 0x4d5233, "#2b2d1c", "#e4dcb2"),
    dir: THREE_QUARTER,
  };
  out["ammo-sniper"] = {
    object: ammoBox("SNIPER", ".338 MAG", 0x34302a, "#2b2418", "#e9c56b"),
    dir: THREE_QUARTER,
  };
  out["medkit"] = { object: medkit(), dir: new THREE.Vector3(0.7, 0.5, 1.2) };
  out["bandage"] = { object: bandage(), dir: new THREE.Vector3(0.6, 0.8, 1.2) };
  out["tablet"] = { object: tablet(), dir: new THREE.Vector3(0.5, 0.45, 1.2) };
  return out;
}

const w = window as unknown as {
  ready: Promise<void>;
  icons: (only?: string[]) => Promise<Record<string, string>>;
};
w.ready = Promise.resolve();
w.icons = async (only) => {
  const all = await shots();
  const res: Record<string, string> = {};
  for (const [id, shot] of Object.entries(all))
    if (!only || only.includes(id)) res[id] = render(shot);
  return res;
};
