/** Map audit: share of final circles on the southern island and on land, per first-circle reach. */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import type { WorldMeta } from "@/lib/fps/br/world";
import { planZone, setZoneFirstReach } from "@/lib/fps/br/zone";
const f = readFileSync("public/fps/br/height.v1.hf");
const hf = await decodeHeightfield(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength));
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
for (const reach of process.argv.slice(2).map(Number)) {
  setZoneFirstReach(reach);
  let island = 0,
    north = 0,
    seaFirst = 0;
  const cells = new Set<string>();
  for (let s = 1; s <= 1000; s++) {
    const z = planZone(meta, s, (x, y) => hf.heightAt(x, y));
    const c1 = z.circles[1]!,
      fin = z.circles.at(-1)!;
    if (fin.z > 2650) island++;
    if (fin.z < -3000) north++;
    // Share of the first circle that is water (sampled).
    let w = 0,
      n = 0;
    for (let a = 0; a < 24; a++)
      for (const r of [0.3, 0.6, 0.9]) {
        n++;
        if (hf.heightAt(c1.x + Math.cos(a) * c1.r * r, c1.z + Math.sin(a) * c1.r * r) < 0.5) w++;
      }
    if (w / n > 0.35) seaFirst++;
    cells.add(`${Math.floor((fin.x + 5000) / 1000)},${Math.floor((fin.z + 5000) / 1000)}`);
  }
  console.log(
    reach,
    "island finals",
    island / 10,
    "% north finals",
    north / 10,
    "% first circle >35% water",
    seaFirst / 10,
    "% cells",
    cells.size,
  );
}
