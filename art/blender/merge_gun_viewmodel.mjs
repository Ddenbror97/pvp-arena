/**
 * Build the first-person viewmodels of a Blender-built gun (MP5, Desert Eagle) on each team's
 * shipped first-person arm rig, as merge_awp_viewmodel.mjs does for the AWP.
 *
 *   node merge_gun_viewmodel.mjs <mp5|deagle> <gun.glb> <ak-source.glb> <m4-source.glb> <out-dir>
 *     → <out-dir>/<gun>-terrorist.glb (Terrorist arms: snow-camo jacket sleeve, from the AK GLB)
 *     → <out-dir>/<gun>-police.glb    (Police arms: duty sleeve + watch, from the M4A1 GLB)
 *
 * <ak-source.glb> / <m4-source.glb> are the decompressed shipped ak47-authored.glb and
 * m4a1-authored.glb (`npx gltf-transform copy`); they are only read. From each the gun keeps
 * the arm mesh, skin, bones, accessories (sleeves, watch) and the rig-level grip frames exactly;
 * the runtime fits the hands procedurally against those frames. The team rifle and the AK-only
 * markers (SpareMagazine, VGripMount) are dropped.
 *
 * Placement is done in Blender (the gun's root carries the translation that lands its pistol
 * grip in the right hand); here the gun's GripR must coincide with the rig's (checked), and its
 * GripL becomes the rig's support-hand point. Then: arm rig unchanged (check_rig_unchanged.mjs),
 * required nodes present and unique, materials and textures prefixed, meshopt + WebP.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, dedup, meshopt, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { vec3, quat } from "gl-matrix";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Per gun: its root node in the Blender GLB, the nodes the runtime reads, texture sizes. */
const GUNS = {
  mp5: {
    root: "MP5",
    required: [
      "Magazine",
      "MagazineGrip",
      "ChargingHandle",
      "ChargingKnob",
      "Trigger",
      "MuzzleDeviceTip",
      "EjectionPort",
      "MagRelease",
      "RearSightAperture",
      "FrontSightPost",
      "OpticMountGeometry",
      "RearSightGeometry",
    ],
    // 2K base colour; normals and metal/rough at 1K (a viewmodel shows them at grazing angles
    // where 1K is already finer than the screen).
    resize: { baseColor: 2048, other: 1024 },
  },
  deagle: {
    root: "DEAGLE",
    required: [
      "Magazine",
      "MagazineGrip",
      "ChargingHandle",
      "ChargingKnob",
      "Hammer",
      "Trigger",
      "MuzzleDeviceTip",
      "EjectionPort",
      "MagRelease",
      "SlideRelease",
      "RearSightAperture",
      "FrontSightPost",
    ],
    resize: { baseColor: 2048, other: 1024 },
  },
};

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [gunId, gunGlb, akSource, m4Source, outDir] = process.argv.slice(2);
const GUN = GUNS[gunId];
if (!GUN || !outDir) {
  console.error(
    "usage: merge_gun_viewmodel.mjs <mp5|deagle> <gun.glb> <ak-source.glb> <m4-source.glb> <out-dir>",
  );
  process.exit(2);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const VARIANTS = [
  {
    out: `${gunId}-terrorist.glb`,
    source: akSource,
    fp: "FP_ak47",
    gun: "Gun_ak47",
    dress: ["ArmSleeve", "ArmWatch", "JacketSleeve"],
  },
  {
    out: `${gunId}-police.glb`,
    source: m4Source,
    fp: "FP_m4a1",
    gun: "Gun_m4a1",
    dress: ["ArmSleeve", "ArmWatch", "PoliceSleeve", "JacketWatch"],
  },
];
const REQUIRED = [
  "FPArms",
  "FPRig",
  "Hand_L",
  "Hand_R",
  "GripL",
  "GripR",
  `Gun_${gunId}`,
  GUN.root,
  "FPAccessories",
  ...GUN.required,
];
const prefix = `${gunId}_`;

const fmt = (v) => `[${[...v].map((x) => x.toFixed(4)).join(", ")}]`;
const report = {};
for (const variant of VARIANTS) {
  const target = await io.read(variant.source);
  const source = await io.read(gunGlb);
  // Prefix the gun's materials and textures so nothing on the page shares their names (the
  // rifle finishes in rifle-materials.ts are looked up by material name).
  for (const m of source.getRoot().listMaterials())
    if (!m.getName().startsWith(prefix)) m.setName(prefix + m.getName());
  for (const t of source.getRoot().listTextures())
    t.setName(prefix + (t.getName() || t.getURI() || "tex").replace(/\.\w+$/, ""));
  const root = target.getRoot();
  const named = (name) => root.listNodes().filter((n) => n.getName() === name);
  const byName = (name) => named(name)[0];
  const originalScenes = new Set(root.listScenes());
  const fp = byName(variant.fp);
  if (!fp) throw new Error(`${variant.fp} root missing from ${variant.source}`);
  const rigGripR = byName("GripR");
  const rigGripL = byName("GripL");
  if (!rigGripR || !rigGripL) throw new Error("rig GripR/GripL missing");

  const map = mergeDocuments(target, source);
  const gunRoot = map.get(
    source
      .getRoot()
      .listNodes()
      .find((n) => n.getName() === GUN.root),
  );
  if (!gunRoot) throw new Error(`${GUN.root} root missing from the gun GLB`);
  for (const scene of root.listScenes())
    if (scene.listChildren().includes(gunRoot)) scene.removeChild(gunRoot);
  const gun = target.createNode(`Gun_${gunId}`).addChild(gunRoot);
  fp.setName(`FP_${gunId}`).addChild(gun);

  const drop = (node) => {
    for (const child of node.listChildren()) drop(child);
    node.dispose();
  };
  drop(byName(variant.gun));
  for (const name of ["SpareMagazine", "VGripMount"]) for (const node of named(name)) drop(node);

  const own = (name) => gunRoot.listChildren().find((n) => n.getName() === name);
  const gunGripR = own("GripR"),
    gunGripL = own("GripL");
  const gripDelta = vec3.distance(gunGripR.getWorldTranslation(), rigGripR.getWorldTranslation());
  const rotDelta = quat.getAngle(gunGripR.getWorldRotation(), rigGripR.getWorldRotation());
  if (gripDelta > 0.002 || rotDelta > 0.01)
    throw new Error(`${gunId} GripR off the rig's by ${gripDelta.toFixed(4)} / ${rotDelta} rad`);
  rigGripL.setTranslation(gunGripL.getWorldTranslation());
  gunGripR.dispose();
  gunGripL.dispose();
  for (const scene of root.listScenes()) if (!originalScenes.has(scene)) scene.dispose();

  const [mainBuffer, ...extraBuffers] = root.listBuffers();
  for (const accessor of root.listAccessors()) accessor.setBuffer(mainBuffer);
  for (const buffer of extraBuffers) buffer.dispose();

  for (const name of [...REQUIRED, ...variant.dress]) {
    const count = named(name).length;
    if (count !== 1) throw new Error(`${variant.out}: node ${name} found ${count}×`);
  }
  // Only the gun's own textures are re-encoded; the arm textures stay byte-identical.
  const isBase = new Set();
  for (const m of root.listMaterials())
    if (m.getName().startsWith(prefix) && m.getBaseColorTexture())
      isBase.add(m.getBaseColorTexture());
  for (const t of root.listTextures())
    if (t.getName().startsWith(prefix) && isBase.has(t))
      t.setName(t.getName().replace(prefix, `${prefix}base_`));
  await target.transform(
    prune({ keepLeaves: true, keepAttributes: true }),
    dedup(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      quality: 88,
      pattern: new RegExp(`^${prefix}base_`),
      resize: [GUN.resize.baseColor, GUN.resize.baseColor],
    }),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      quality: 90,
      pattern: new RegExp(`^${prefix}(?!base_)`),
      resize: [GUN.resize.other, GUN.resize.other],
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const out = path.join(outDir, variant.out);
  await io.write(out, target);

  const tris = (meshes) =>
    meshes.reduce(
      (n, mesh) =>
        n + mesh.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0),
      0,
    );
  const gunMeshes = [];
  const walk = (node) => {
    if (node.getMesh()) gunMeshes.push(node.getMesh());
    node.listChildren().forEach(walk);
  };
  walk(gun);
  const positions = {};
  for (const name of ["GripR", "GripL", ...GUN.required])
    if (byName(name)) positions[name] = fmt(byName(name).getWorldTranslation());
  const textures = root
    .listTextures()
    .filter((t) => t.getName().startsWith(prefix))
    .map((t) => `${t.getName()} ${t.getSize()?.join("x")} ${t.getMimeType()}`);
  report[variant.out] = {
    bytes: fs.statSync(out).size,
    triangles: tris(root.listMeshes()),
    gunTriangles: tris(gunMeshes),
    textures,
    gripRResidual: gripDelta,
    positions,
  };
  const rig = execFileSync(
    "node",
    [path.join(HERE, "check_rig_unchanged.mjs"), variant.source, out],
    {
      encoding: "utf8",
    },
  );
  report[variant.out].rig = rig.trim().replace(/\s+/g, " ");
  const shift = Number(/jointShift: ([\d.e-]+)/.exec(rig)?.[1] ?? "NaN");
  if (!(shift < 1e-4)) throw new Error(`${variant.out}: arm rig moved (${rig})`);
  console.log(`${gunId} viewmodel → ${out}`);
}
console.log(JSON.stringify(report, null, 2));
