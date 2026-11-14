/** node scripts/br/map-audit/run.mjs hdiff <other.hf> x z r: height differences round a point. */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const a = await decodeHeightfield(buf(process.argv[2]!));
const b = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const [x, z, r] = process.argv.slice(3).map(Number) as [number, number, number];
let max = 0,
  at = "";
for (let dz = -r; dz <= r; dz += 2)
  for (let dx = -r; dx <= r; dx += 2) {
    const d = Math.abs(a.heightAt(x + dx, z + dz) - b.heightAt(x + dx, z + dz));
    if (d > max) [max, at] = [d, `${x + dx},${z + dz}`];
  }
console.log("max diff", max.toFixed(2), "at", at);
