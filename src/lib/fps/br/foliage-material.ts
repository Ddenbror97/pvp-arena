import type { MeshStandardMaterial } from "three";

/** Leaf cards are cutouts, not stacked transparent panes. Keep bark/materials untouched. */
export function prepareFoliageMaterial(material: MeshStandardMaterial) {
  if (!material.map || (!material.transparent && material.alphaTest <= 0)) return;
  material.transparent = false;
  material.depthWrite = true;
  material.alphaTest = Math.max(material.alphaTest, 0.35);
  material.alphaToCoverage = true;
  material.roughness = Math.max(material.roughness, 0.85);
  material.metalness = 0;
  material.userData["brFoliage"] = true;
}
