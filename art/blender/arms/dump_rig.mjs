/**
 * Dump the FPRig joints of the shipped viewmodel GLB in glTF scene space (world matrices,
 * column-major) plus the skin's bind-space transform, for the arm build scripts.
 *   node arms/dump_rig.mjs <ak47-authored.glb> <out.json>
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { writeFileSync } from "node:fs";
import { mat4 } from "gl-matrix";

const [file, out] = process.argv.slice(2);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(file);
const skin = doc.getRoot().listSkins()[0];
const joints = skin.listJoints();
const ibm = skin.getInverseBindMatrices().getArray();
const result = { joints: {}, bindSpace: null };
joints.forEach((joint, i) => {
  const world = joint.getWorldMatrix();
  result.joints[joint.getName()] = { world: Array.from(world), index: i };
  if (joint.getName() === "Hand_L") {
    const m = mat4.multiply(mat4.create(), world, ibm.slice(i * 16, i * 16 + 16));
    result.bindSpace = Array.from(m);
  }
});
// Sanity: every joint's world * IBM should be the same bind-space transform.
let worst = 0;
joints.forEach((joint, i) => {
  const m = mat4.multiply(mat4.create(), joint.getWorldMatrix(), ibm.slice(i * 16, i * 16 + 16));
  worst = Math.max(worst, ...m.map((v, k) => Math.abs(v - result.bindSpace[k])));
});
result.bindSpaceConsistency = worst;
const arms = doc.getRoot().listNodes().find((n) => n.getName() === "FPArms");
result.armsNodeWorld = Array.from(arms.getWorldMatrix());
writeFileSync(out, JSON.stringify(result));
console.log("joints", joints.length, "bind-space consistency", worst);
console.log("bindSpace", result.bindSpace.map((v) => v.toFixed(3)).join(" "));
console.log("Hand_L world", result.joints.Hand_L.world.map((v) => v.toFixed(3)).join(" "));
