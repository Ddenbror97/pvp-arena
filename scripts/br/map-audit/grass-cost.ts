/**
 * What the ground grass costs the frame loop at a run and in a car: the time of each frame's
 * grass update (scattering cells ahead, rebuilding the instance buffers), the worst frames, and
 * how much is uploaded. A meadow, 60 frames a second, on this machine's clock.
 *   npx tsx scripts/br/map-audit/grass-cost.ts
 */
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createGrass, GRASS_RANGE, parseGrassKit } from "@/lib/fps/br/grass";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const kit = parseGrassKit(
  JSON.parse(readFileSync("public/fps/br/grass/grass-v1.json", "utf8")),
  buffer("public/fps/br/grass/grass-v1.bin"),
  new THREE.Texture(),
);
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(
  hf,
  cover,
  meta,
  JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8")),
);
const [x0, z0] = (process.argv[2] ?? "-600,300").split(",").map(Number) as [number, number];
for (const [what, v] of [
  ["sprint 6.5 m/s", 6.5],
  ["car 30 m/s", 30],
] as const) {
  const grass = createGrass(
    { hf, cover, meta, supportAt: (x, z, r, y) => island.solid.supportAt(x, z, r, y) },
    kit,
    GRASS_RANGE.standard,
  );
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 5000);
  const place = (x: number) => {
    camera.position.set(x, hf.heightAt(x, z0) + 1.6, z0);
    camera.lookAt(x + 10, hf.heightAt(x, z0) + 1.2, z0);
    camera.updateMatrixWorld();
  };
  // The frames' own clock (60 a second), so the scatter's time budget is the real one.
  let now = 0;
  const real = performance.now.bind(performance);
  let offset = 0;
  performance.now = () => now + (real() - offset);
  place(x0);
  offset = real();
  grass.update(camera, null);
  const ms: number[] = [],
    rebuildMs: number[] = [];
  let rebuilds = grass.stats().rebuilds;
  let uploaded = 0;
  const versions = new Map<THREE.BufferAttribute, number>();
  for (let f = 0; f < 600; f++) {
    now += 1000 / 60;
    place(x0 + (v * f) / 60);
    offset = real();
    grass.update(camera, null);
    ms.push(real() - offset);
    const rebuilt = grass.stats().rebuilds;
    if (rebuilt !== rebuilds) rebuildMs.push(ms[ms.length - 1]!);
    rebuilds = rebuilt;
    for (const m of grass.root.children as THREE.Mesh[])
      for (const name of ["iPose", "iShape", "iTint"]) {
        const a = m.geometry.getAttribute(name) as THREE.BufferAttribute;
        if (versions.get(a) !== a.version) {
          if (versions.has(a)) uploaded += a.updateRanges.reduce((s, r) => s + r.count, 0) * 4;
          versions.set(a, a.version);
        }
      }
  }
  performance.now = real;
  const sorted = [...ms].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
  const st = grass.stats();
  console.log(
    `${what}: ${st.instances} clumps in ${st.cells} cells; update mean ${(ms.reduce((s, x) => s + x, 0) / ms.length).toFixed(2)} ms, p95 ${q(0.95).toFixed(2)}, p99 ${q(0.99).toFixed(2)}, worst ${q(1).toFixed(2)}; frames over 4 ms: ${ms.filter((m) => m > 4).length} of ${ms.length}; ${rebuildMs.length} rebuilds (${(rebuildMs.length / 10).toFixed(1)} a second), mean ${(rebuildMs.reduce((s, x) => s + x, 0) / Math.max(1, rebuildMs.length)).toFixed(2)} ms a frame with one; uploaded ${(uploaded / 10 / 1e6).toFixed(1)} MB a second`,
  );
  grass.dispose();
}
