/**
 * Validate a built AK viewmodel GLB against what the runtime relies on.
 *   node validate_ak_viewmodel.mjs <ak47-authored.glb>
 * Exits non-zero on any failure; prints a triangle/size budget report.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { statSync } from "node:fs";

const file = process.argv[2];
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(file);
const nodes = new Map(doc.getRoot().listNodes().map((n) => [n.getName(), n]));
const failures = [];
const need = (ok, message) => ok || failures.push(message);

// Node contract used by authored-viewmodel.ts, fitted-rifle-hands.ts and authored-character.ts.
for (const name of [
  "FPRig", "FPArms", "Hand_L", "Hand_R", "GripL", "GripR", "Magazine", "MagazineGrip",
  "ChargingHandle", "MuzzleDeviceTip", "SteelTideAK47", "Gun_ak47",
  // Arms (art/blender/arms): accessories wrapped onto the forearms at runtime.
  "FPAccessories", "ArmSleeve", "ArmWatch",
]) need(nodes.has(name), `missing node ${name}`);
need(!nodes.has("SpareMagazine"), "spare magazine should be stripped");
need(doc.getRoot().listSkins().length === 1, "expected exactly one skin (FPArms)");

const RIFLE_BUDGET = 40000;
const ARMS_BUDGET = { FPArms: 16000, ArmSleeve: 16000, ArmWatch: 18000 };
const accessory = new Set();
nodes.get("FPAccessories")?.traverse((n) => accessory.add(n.getName()));
let rifleTris = 0;
const rows = [];
for (const [name, node] of nodes) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  let tris = 0;
  for (const p of mesh.listPrimitives()) {
    tris += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
    if (name === "FPArms" || accessory.has(name)) {
      need(!!p.getAttribute("NORMAL") && !!p.getAttribute("TEXCOORD_0"), `${name}: missing normals/UVs`);
    } else {
      need(!!p.getAttribute("TEXCOORD_1"), `${name}: no wear UV`);
      need(!!p.getAttribute("NORMAL"), `${name}: no normals`);
      const material = p.getMaterial()?.getName() ?? "";
      need(/^AK47/.test(material), `${name}: unexpected material ${material}`);
    }
  }
  if (name in ARMS_BUDGET) need(tris <= ARMS_BUDGET[name], `${name}: ${tris} tris > ${ARMS_BUDGET[name]}`);
  else if (!accessory.has(name)) rifleTris += tris;
  rows.push(`${name.padEnd(28)} ${String(Math.round(tris)).padStart(6)} tris`);
}
const gloves = nodes.get("FPArms")?.getMesh()?.listPrimitives()[0];
need(!!gloves?.getAttribute("TANGENT"), "FPArms: tangents are required for the glove normal map");
const gloveMaterial = gloves?.getMaterial();
need(!!gloveMaterial?.getBaseColorTexture() && !!gloveMaterial?.getNormalTexture(), "FPArms: glove PBR textures missing");
need(rifleTris <= RIFLE_BUDGET, `rifle ${rifleTris} tris > budget ${RIFLE_BUDGET}`);
console.log(rows.join("\n"));
console.log(`rifle total ${rifleTris} tris (budget ${RIFLE_BUDGET}); file ${(statSync(file).size / 1024).toFixed(0)} KiB`);
if (failures.length) {
  console.error("FAIL\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("OK");
