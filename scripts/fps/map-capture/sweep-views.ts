/**
 * Views for sweep.mjs: every standable spot of a 5v5 map's walk graph on a `STEP` m grid, at eye
 * height, in eight headings.  node node_modules/jiti/lib/jiti-cli.mjs sweep-views.ts <mapId> <out>
 */
import fs from "node:fs";
import { bombNav } from "../../../src/lib/fps/bomb/nav";
import { BOMB_MAPS, isBombMapId } from "../../../src/lib/fps/bomb/maps";

const [id, out] = process.argv.slice(2);
if (!isBombMapId(id) || !out) throw new Error("usage: sweep-views.ts <bomb map id> <out.json>");
const STEP = Number(process.env.STEP ?? 6);
const nav = bombNav(BOMB_MAPS[id].map);
const views: number[][] = [];
const taken = new Set<string>();
for (let n = 0; n < nav.x.length; n++) {
  const x = nav.x[n]!,
    y = nav.y[n]!,
    z = nav.z[n]!;
  const key = `${Math.round(x / STEP)}|${Math.round(z / STEP)}|${Math.round(y / 1.2)}`;
  if (taken.has(key)) continue;
  taken.add(key);
  for (let k = 0; k < 8; k++)
    views.push([x, +(y + 1.6).toFixed(2), z, +((k * Math.PI) / 4).toFixed(4), 0]);
}
fs.writeFileSync(out, JSON.stringify(views));
console.log(id, views.length / 8, "spots,", views.length, "views");
