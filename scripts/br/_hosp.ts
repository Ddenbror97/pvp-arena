import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WORLD_ASSETS } from "@/lib/fps/br/world";
const buf = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const poi = meta.pois.find((p: any) => p.id === "central-hospital");
console.log("poi", JSON.stringify(poi));
const near = island.layout.filter((p) => Math.hypot(p.x - poi.x, p.z - poi.z) < 260);
const counts = new Map<string, number>();
for (const p of near) counts.set(p.model, (counts.get(p.model) ?? 0) + 1);
console.log([...counts].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" "));
const big = near.filter((p) => { const m = models.models?.[p.model] ?? models[p.model]; const b = m?.bounds ?? m?.lod0?.bounds; return true; });
for (const p of near) if (/ind-|hospital|warehouse|terminal|fire-station|brick-shop|helipad/.test(p.model)) {
  const boxes = collision.models[p.model]; let b=[1e9,1e9,1e9,-1e9,-1e9,-1e9]; for (const x of boxes??[]) for (let k=0;k<3;k++){b[k]=Math.min(b[k]!,x[k]!);b[k+3]=Math.max(b[k+3]!,x[k+3]!);}
  console.log(p.model.padEnd(16), "dx", (p.x-poi.x).toFixed(0), "dz", (p.z-poi.z).toFixed(0), "y", p.y.toFixed(1), "turn", p.turn, "size", (b[3]!-b[0]!).toFixed(0), (b[4]!-b[1]!).toFixed(0), (b[5]!-b[2]!).toFixed(0), "boxes", boxes?.length);
}
