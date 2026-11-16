/**
 * Map audit: the roof edges a rope can be thrown from (rappel.ts rappelSite). Every collision
 * box whose top is a roof (well over the ground, wide enough to stand on) is tried at the
 * middle of each of its four edges, from a stand half a metre in, facing out.
 *   npx tsx scripts/br/map-audit/rappel-sites.ts [--near=x,z,r | --poi=id] [--list=20] [--roof=2.4] [--why=blocked]
 * (--roof: the lowest roof over the ground tried; --why: a few of the edges refused for a reason.)
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rappelDrop, rappelSite, type RappelSite } from "@/lib/fps/br/rappel";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const world = island.solid;
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const poi = (meta.pois as Array<{ id: string; x: number; z: number }>).find(
  (p) => p.id === arg("poi"),
);
const near = poi ? [poi.x, poi.z, 300] : arg("near")?.split(",").map(Number);

export type Stand = { x: number; y: number; z: number; yaw: number; site: RappelSite };
const stands: Stand[] = [];
const refused: Record<string, number> = {};
const sample = arg("why");
const lowest = Number(arg("roof") ?? 2.4);
let shown = 0;
let roofs = 0,
  tried = 0;
const b = world.boxes;
for (let i = 0; i < b.length / 6; i++) {
  const o = i * 6;
  const x0 = b[o]!,
    y1 = b[o + 4]!,
    z0 = b[o + 2]!,
    x1 = b[o + 3]!,
    z1 = b[o + 5]!;
  if (x1 - x0 < 3 || z1 - z0 < 3) continue;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  if (near && Math.hypot(cx - near[0]!, cz - near[1]!) > near[2]!) continue;
  if (y1 - hf.heightAt(cx, cz) < lowest) continue;
  roofs++;
  // Facing: yaw with forward = (−sin, −cos).
  for (const [nx, nz, yaw] of [
    [1, 0, -Math.PI / 2],
    [-1, 0, Math.PI / 2],
    [0, 1, Math.PI],
    [0, -1, 0],
  ] as const) {
    const x = nx ? (nx > 0 ? x1 : x0) - nx * 0.5 : cx,
      z = nz ? (nz > 0 ? z1 : z0) - nz * 0.5 : cz;
    // A place a player can stand: this box's top under the feet, room for the body.
    if (Math.abs(world.supportAt(x, z, 0.3, y1 + 0.05) - y1) > 0.01) continue;
    if (world.blocked(x, y1 + 0.02, z, 1.8, 0.3)) continue;
    tried++;
    const why: { reason?: string } = {};
    const site = rappelSite(world, x, y1, z, yaw, why);
    if (site) stands.push({ x, y: y1, z, yaw, site });
    else {
      refused[why.reason ?? "?"] = (refused[why.reason ?? "?"] ?? 0) + 1;
      if (sample === why.reason && shown++ < 12)
        console.log(JSON.stringify({ at: [+x.toFixed(2), +y1.toFixed(2), +z.toFixed(2)], yaw }));
    }
  }
}
const drops = stands.map((s) => rappelDrop(s.site)).sort((a, c) => a - c);
const q = (p: number) => drops[Math.min(drops.length - 1, Math.floor(drops.length * p))] ?? 0;
console.log(
  `${roofs} roof boxes, ${tried} edges stood at, ${stands.length} with a rope down: drop median ${q(0.5).toFixed(1)} m, p90 ${q(0.9).toFixed(1)}, highest ${q(1).toFixed(1)}; with a parapet ${stands.filter((s) => s.site.top - s.site.roof > 0.2).length}`,
);
console.log("no rope:", JSON.stringify(refused));
const hist = [2.5, 3, 3.5, 4.5, 6, 9, 15, 30, 200].map((hi, i, a) => {
  const lo = a[i - 1] ?? 0;
  return `${lo}-${hi} m: ${drops.filter((d) => d >= lo && d < hi).length}`;
});
console.log("drops:", hist.join(", "));
const pois = (meta.pois as Array<{ id: string; x: number; z: number }>).map((p) => ({
  id: p.id,
  n: stands.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) < 450).length,
}));
console.log(
  pois
    .filter((p) => p.n)
    .sort((a, c) => c.n - a.n)
    .map((p) => `${p.id} ${p.n}`)
    .join(", "),
);
const list = Number(arg("list") ?? 0);
if (list) {
  const pick = [...stands].sort((a, c) => rappelDrop(c.site) - rappelDrop(a.site));
  for (const s of pick.filter((_, i) => i % Math.max(1, Math.floor(pick.length / list)) === 0))
    console.log(
      JSON.stringify({
        at: [+s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2)],
        yaw: +s.yaw.toFixed(3),
        drop: +rappelDrop(s.site).toFixed(1),
        parapet: +(s.site.top - s.site.roof).toFixed(2),
        side: [s.site.sideMin, s.site.sideMax],
      }),
    );
}
