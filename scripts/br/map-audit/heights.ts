/** Map audit helper: terrain heights along short lines (argv: "x0,z0,x1,z1" …). */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
const f = readFileSync("public/fps/br/height.v1.hf");
const hf = await decodeHeightfield(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength));
for (const arg of process.argv.slice(2)) {
  const [x0, z0, x1, z1] = arg.split(",").map(Number) as [number, number, number, number];
  const hs: number[] = [];
  for (let k = 0; k <= 20; k++)
    hs.push(+hf.heightAt(x0 + ((x1 - x0) * k) / 20, z0 + ((z1 - z0) * k) / 20).toFixed(1));
  console.log(arg, hs.join(" "));
}
