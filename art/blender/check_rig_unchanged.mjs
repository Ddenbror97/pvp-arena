/**
 * Prove the merge left the arm rig untouched: joint world positions and skinned rest-pose
 * arm geometry of <before.glb> vs <after.glb>. Prints max deltas; non-zero means investigate.
 *   node check_rig_unchanged.mjs <before.glb> <after.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { mat4, vec3 } from "gl-matrix";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
async function stats(file) {
  const d = await io.read(file), r = d.getRoot();
  const node = r.listNodes().find((n) => n.getName() === "FPArms");
  const skin = node.getSkin(), joints = skin.listJoints();
  const ibm = skin.getInverseBindMatrices();
  const jw = joints.map((j, i) => { const m = mat4.create(); mat4.multiply(m, j.getWorldMatrix(), ibm.getElement(i, [])); return m; });
  const p = node.getMesh().listPrimitives()[0];
  const pos = p.getAttribute("POSITION"), J = p.getAttribute("JOINTS_0"), W = p.getAttribute("WEIGHTS_0");
  const lo = [1e9,1e9,1e9], hi = [-1e9,-1e9,-1e9], sum = [0,0,0];
  for (let i = 0; i < pos.getCount(); i++) {
    const v = pos.getElement(i, []), j = J.getElement(i, []), w = W.getElement(i, []);
    const out = [0,0,0];
    for (let k = 0; k < 4; k++) { if (!w[k]) continue; const t = vec3.transformMat4([], v, jw[j[k]]); for (let a = 0; a < 3; a++) out[a] += t[a] * w[k]; }
    for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], out[a]); hi[a] = Math.max(hi[a], out[a]); sum[a] += out[a]; }
  }
  const named = Object.fromEntries(joints.map((j) => [j.getName(), j.getWorldTranslation()]));
  return { count: pos.getCount(), lo, hi, mean: sum.map((s) => s / pos.getCount()), named };
}
const [a, b] = await Promise.all(process.argv.slice(2).map(stats));
let maxJoint = 0;
for (const k of Object.keys(a.named)) maxJoint = Math.max(maxJoint, Math.hypot(...a.named[k].map((v, i) => v - b.named[k][i])));
const d = (x, y) => Math.max(...x.map((v, i) => Math.abs(v - y[i])));
console.log({ vertices: [a.count, b.count], jointShift: maxJoint, bboxShift: Math.max(d(a.lo, b.lo), d(a.hi, b.hi)), meanShift: d(a.mean, b.mean) });
