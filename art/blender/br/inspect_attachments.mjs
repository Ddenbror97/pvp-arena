// Prints the world-space bounds of each accessory in the pack (Y-up), to pick orientations.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/core";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
for (const n of doc.getRoot().listNodes()) {
  if (!n.listChildren().some((c) => c.getMesh())) continue;
  const b = getBounds(n);
  const size = b.max.map((v, k) => +(v - b.min[k]).toFixed(3));
  const c = b.max.map((v, k) => +((v + b.min[k]) / 2).toFixed(2));
  console.log(
    n.getName().padEnd(16),
    "size",
    size.join(" "),
    "centre",
    c.join(" "),
    n
      .listChildren()
      .map((x) => x.getName())
      .join(","),
  );
}
