/**
 * Vegetation streaming cost on the CPU (Phase 1): a camera walks/drives/flies across the island
 * for 60 s at 60 fps and every vegetation update is timed (selection, cell generation, buffer
 * refills). No GPU involved.
 *
 *   npx tsx scripts/br/bench-vegetation.ts [speed m/s = 6] [turn rad/s = 0.6]
 */
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { decodeHeightfield } from "../../src/lib/fps/br/heightfield";
import { decodeLandCover } from "../../src/lib/fps/br/landcover";
import { vegetationWorld } from "../../src/lib/fps/br/vegetation";
import { createVegetation } from "../../src/lib/fps/br/vegetation-renderer";
const b = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const hf = await decodeHeightfield(b("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(b("public/fps/br/landcover.v1.lc"));
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8"));
const veg = createVegetation(vegetationWorld(hf, cover, meta));
const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.5, 14000);
const speed = Number(process.argv[2] ?? 6),
  turn = Number(process.argv[3] ?? 0.6);
let x = -2000,
  z = -1500,
  yaw = 0;
const times: number[] = [];
for (let f = 0; f < 3600; f++) {
  x += (Math.sin(yaw) * speed) / 60;
  z -= (Math.cos(yaw) * speed) / 60;
  yaw += (turn / 60) * Math.sin(f / 200);
  cam.position.set(x, hf.heightAt(x, z) + 1.7, z);
  cam.rotation.set(0, -yaw, 0, "YXZ");
  const a = performance.now();
  veg.update(cam);
  times.push(performance.now() - a);
}
const first = times[0];
times.sort((p, q) => p - q);
const q = (v: number) => times[Math.floor((times.length - 1) * v)]!.toFixed(2);
console.log({
  speed,
  first: first!.toFixed(1),
  p50: q(0.5),
  p95: q(0.95),
  p99: q(0.99),
  max: q(1),
  stats: veg.stats(),
});
