/** Prints the heightfield reference samples tests/br-world.test.ts pins (grid i, j and world 0, 0). */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
const f = readFileSync("public/fps/br/height.v1.hf");
const hf = await decodeHeightfield(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength));
const at = (i: number, j: number) => hf.heightAt(-5000 + i * hf.spacing, -5000 + j * hf.spacing);
for (const [i, j] of [
  [0, 0],
  [1280, 1280],
  [640, 300],
  [2000, 2100],
  [1234, 567],
])
  console.log(i, j, at(i, j).toFixed(2));
console.log("0,0 world", hf.heightAt(0, 0).toFixed(2));
