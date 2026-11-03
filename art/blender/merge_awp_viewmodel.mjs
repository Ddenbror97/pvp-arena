/**
 * Build the AWP first-person viewmodels: the Blender-built rifle (awp/build_awp_viewmodel.py)
 * on each team's shipped first-person arm rig.
 *
 *   node merge_awp_viewmodel.mjs <awp-rifle.glb> <ak-source.glb> <m4-source.glb> <out-dir>
 *     → <out-dir>/awp-terrorist.glb (Terrorist arms: snow-camo jacket sleeve, from the AK GLB)
 *     → <out-dir>/awp-police.glb    (Police arms: duty sleeve + watch, from the M4A1 GLB)
 *
 * <ak-source.glb> / <m4-source.glb> are the decompressed shipped ak47-authored.glb and
 * m4a1-authored.glb (`npx gltf-transform copy`). They are only read. From each the AWP keeps the
 * arm mesh, skin, bones, accessories (sleeves, watch) and the rig-level grip frames exactly; the
 * runtime fits the hands procedurally against those frames. The team rifle (Gun_ak47 /
 * Gun_m4a1) and the AK-only markers (SpareMagazine, VGripMount) are dropped.
 *
 * Placement: the AWP is moved along the bore (AWP_GRIP_ALIGN) so its pistol grip — lofted in
 * Blender from the AK grip sections the right hand is posed on — lands in the right hand with
 * the trigger under the index finger; the bore stays on the rig's bore line (Y = 0). The rifle's
 * own GripR/GripL empties are consumed here: GripR must coincide with the rig's GripR (checked),
 * GripL becomes the rig's support-hand point on the fore-end. Then: arm rig unchanged
 * (check_rig_unchanged.mjs), required nodes present and unique, meshopt + WebP.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, dedup, meshopt, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { mat4, vec3, quat } from "gl-matrix";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Rifle-local shift along the bore (−Z toward the muzzle) that lands the grip in the right hand. */
export const AWP_GRIP_ALIGN = [0, 0, -0.44];

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [rifleGlb, akSource, m4Source, outDir] = process.argv.slice(2);
if (!outDir) {
  console.error(
    "usage: merge_awp_viewmodel.mjs <awp-rifle.glb> <ak-source.glb> <m4-source.glb> <out-dir>",
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
    out: "awp-terrorist.glb",
    source: akSource,
    fp: "FP_ak47",
    gun: "Gun_ak47",
    dress: ["ArmSleeve", "ArmWatch", "JacketSleeve"],
  },
  {
    out: "awp-police.glb",
    source: m4Source,
    fp: "FP_m4a1",
    gun: "Gun_m4a1",
    dress: ["ArmSleeve", "ArmWatch", "PoliceSleeve", "JacketWatch"],
  },
];
/** Node names the runtime (authored-viewmodel.ts and the AWP gameplay code) looks up. */
const REQUIRED = [
  "FPArms",
  "FPRig",
  "Hand_L",
  "Hand_R",
  "GripL",
  "GripR",
  "Gun_awp",
  "AWP",
  "Bolt",
  "BoltHandle",
  "BoltKnob",
  "Magazine",
  "MagazineGrip",
  "Trigger",
  "MuzzleDeviceTip",
  "EjectionPort",
  "MagRelease",
  "ScopeEye",
  "ScopeObjective",
  "FPAccessories",
];

const fmt = (v) => `[${[...v].map((x) => x.toFixed(4)).join(", ")}]`;
const report = {};
for (const variant of VARIANTS) {
  const target = await io.read(variant.source);
  const source = await io.read(rifleGlb);
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
  const awp = map.get(
    source
      .getRoot()
      .listNodes()
      .find((n) => n.getName() === "AWP"),
  );
  if (!awp) throw new Error("AWP root missing from the rifle GLB");
  for (const scene of root.listScenes())
    if (scene.listChildren().includes(awp)) scene.removeChild(awp);
  const gun = target.createNode("Gun_awp").setTranslation(AWP_GRIP_ALIGN).addChild(awp);
  fp.setName("FP_awp").addChild(gun);

  const drop = (node) => {
    for (const child of node.listChildren()) drop(child);
    node.dispose();
  };
  drop(byName(variant.gun));
  for (const name of ["SpareMagazine", "VGripMount"]) for (const node of named(name)) drop(node);

  // The rifle's grip frames: GripR must land on the rig's (the right hand is posed there once).
  const rifleGrip = (name) => awp.listChildren().find((n) => n.getName() === name);
  const awpGripR = rifleGrip("GripR"),
    awpGripL = rifleGrip("GripL");
  const gripDelta = vec3.distance(awpGripR.getWorldTranslation(), rigGripR.getWorldTranslation());
  const rotDelta = quat.getAngle(awpGripR.getWorldRotation(), rigGripR.getWorldRotation());
  if (gripDelta > 0.002 || rotDelta > 0.01)
    throw new Error(`AWP GripR off the rig's by ${gripDelta.toFixed(4)} / ${rotDelta} rad`);
  const supportPoint = awpGripL.getWorldTranslation();
  rigGripL.setTranslation(supportPoint);
  awpGripR.dispose();
  awpGripL.dispose();
  for (const scene of root.listScenes()) if (!originalScenes.has(scene)) scene.dispose();

  const [mainBuffer, ...extraBuffers] = root.listBuffers();
  for (const accessor of root.listAccessors()) accessor.setBuffer(mainBuffer);
  for (const buffer of extraBuffers) buffer.dispose();

  for (const name of [...REQUIRED, ...variant.dress]) {
    const count = named(name).length;
    if (count !== 1) throw new Error(`${variant.out}: node ${name} found ${count}×`);
  }
  // Only the AWP's own textures are (re-)encoded; the arm textures stay byte-identical.
  const awpTextures = new Set();
  const collect = (node) => {
    const mesh = node.getMesh();
    if (mesh)
      for (const prim of mesh.listPrimitives()) {
        const material = prim.getMaterial();
        const tex = material?.getBaseColorTexture();
        if (tex) awpTextures.add(tex);
      }
    for (const child of node.listChildren()) collect(child);
  };
  collect(awp);
  for (const tex of awpTextures) tex.setName(`awp_${tex.getName().replace(/^awp_/, "")}`);

  await target.transform(
    prune({ keepLeaves: true, keepAttributes: true }),
    dedup(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      quality: 88,
      pattern: /^awp_/,
      resize: [2048, 2048],
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const out = path.join(outDir, variant.out);
  await io.write(out, target);

  // Report: triangles (all / AWP), textures, file size, and the measured node positions.
  const tris = (meshes) =>
    meshes.reduce(
      (n, mesh) =>
        n + mesh.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0),
      0,
    );
  const awpMeshes = [];
  const walk = (node) => {
    if (node.getMesh()) awpMeshes.push(node.getMesh());
    node.listChildren().forEach(walk);
  };
  walk(gun);
  const positions = {};
  for (const name of [
    "GripR",
    "GripL",
    "Bolt",
    "BoltHandle",
    "BoltKnob",
    "Magazine",
    "MagazineGrip",
    "Trigger",
    "MuzzleDeviceTip",
    "EjectionPort",
    "MagRelease",
    "ScopeEye",
    "ScopeObjective",
  ])
    positions[name] = fmt(byName(name).getWorldTranslation());
  const textures = root
    .listTextures()
    .filter((t) => /^awp_/.test(t.getName()))
    .map((t) => `${t.getName()} ${t.getSize()?.join("x")} ${t.getMimeType()}`);
  report[variant.out] = {
    bytes: fs.statSync(out).size,
    triangles: tris(root.listMeshes()),
    awpTriangles: tris(awpMeshes),
    textures,
    gripRResidual: gripDelta,
    positions,
  };
  // The arm rig must be untouched: joints and skinned rest-pose arm geometry.
  const rig = execFileSync("node", [path.join(HERE, "check_rig_unchanged.mjs"), variant.source, out], {
    encoding: "utf8",
  });
  report[variant.out].rig = rig.trim().replace(/\s+/g, " ");
  const shift = Number(/jointShift: ([\d.e-]+)/.exec(rig)?.[1] ?? "NaN");
  if (!(shift < 1e-4)) throw new Error(`${variant.out}: arm rig moved (${rig})`);
  console.log(`AWP viewmodel → ${out}`);
}
console.log(JSON.stringify(report, null, 2));
