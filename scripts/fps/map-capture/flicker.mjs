/**
 * Z-fighting sweep of a map: views over the walkable floor (`views.json`: [[x, y, z, yaw,
 * pitch], ...], see sweep-views.ts), every triangle drawn in a colour of its own
 * (window.flicker in entry.ts). Counts the pixels where two faces are at exactly the same depth
 * (ties) and where they are too close for the depth buffer (near-ties: patches that change owner
 * when the camera moves half a millimetre), and prints the pairs of meshes they are between.
 *
 *   node scripts/fps/map-capture/flicker.mjs <mapId> <views.json> <plan.json> <out.json>
 *        [--no-layers] [--compare] [--raw] [--chromium=/path]
 *
 * `<plan.json>` is find_coplanar.mjs's `--plan` for the same GLB: the triangle numbers, and
 * which face it laid on which. `--no-layers` draws the map without the depth layers
 * (src/lib/fps/maps/depth-layers.ts), as it was before them. `--compare` also checks what the
 * layers changed: each view once more without them, and every pixel that went to another face
 * is either one the plan ordered (the fix at work) or one it did not, which is listed: a face
 * pulled over something that stood clear of it.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [mapId, viewsFile, planFile, outFile] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith("--"));
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const layers = !process.argv.includes("--no-layers");
const compare = process.argv.includes("--compare");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const views = JSON.parse(fs.readFileSync(viewsFile, "utf8"));
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
const bundle = await build({
  entryPoints: [path.join(ROOT, "scripts/fps/map-capture/entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  loader: { ".webp": "empty", ".png": "empty" },
  logLevel: "error",
});
const js = bundle.outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><html><body style='margin:0'><script type=module src='/capture.js'></script></body></html>",
    );
  if (url === "/capture.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  res.writeHead(200, { "content-type": "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
  ],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.flicker === "function");
const slim = {
  meshes: Object.fromEntries(
    Object.entries(plan.meshes).map(([id, m]) => [id, { base: m.base, triangles: m.triangles }]),
  ),
};
const result = await page.evaluate(
  ([id, v, p, on, cmp]) => window.flicker(id, v, 640, 360, p, on, cmp),
  [mapId, views, slim, layers, compare],
);

// Owner → mesh. Owners 1…planned are the plan's triangles (number + 1), then the other meshes.
const bases = Object.values(plan.meshes).sort((a, b) => a.base - b.base);
const meshOf = (owner) => {
  if (owner > result.planned)
    return { name: result.others[owner - result.planned - 1], blend: false };
  let lo = 0,
    hi = bases.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (bases[mid].base <= owner - 1) lo = mid;
    else hi = mid - 1;
  }
  return bases[lo];
};
const key = (a, b) => `${a}~${b}`;
const ordered = new Set(plan.orders.map(([over, under]) => key(over + 1, under + 1)));
const unsettled = new Set(
  plan.unsettled.flatMap(([a, b]) => [key(a + 1, b + 1), key(b + 1, a + 1)]),
);
/** Rows [p, q, n, worst, at] summed per pair of meshes. */
const byMesh = (rows, directed = false) => {
  const out = new Map();
  for (const [p, q, n, worst, at] of rows) {
    const a = meshOf(p),
      b = meshOf(q);
    if (!directed && a.blend && b.blend) continue; // two decals: drawn in order, no depth fight
    const names = directed ? [a.name, b.name] : [a.name, b.name].sort();
    const k = names.join(directed ? "  →  " : "  ×  ");
    const e = out.get(k) ?? out.set(k, { n: 0, worst: 0, at: -1, faces: 0 }).get(k);
    e.n += n;
    e.faces++;
    if (worst > e.worst) {
      e.worst = worst;
      e.at = at;
    }
  }
  return [...out].sort((x, y) => y[1].n - x[1].n);
};
const total = (list) => list.reduce((s, [, e]) => s + e.n, 0);
const show = (list, top = 20) => {
  for (const [k, e] of list.slice(0, top))
    console.log(
      `${String(e.n).padStart(8)} px (worst ${e.worst} at ${JSON.stringify(views[e.at].map((n) => +n.toFixed(2)))})  ${k}`,
    );
};
const alike = new Set(plan.alike.map(([a, b]) => key(a + 1, b + 1)));
// Two faces of one material with the same texture and shade on the overlap: a tie nobody sees.
const seen = (rows) => rows.filter(([p, q]) => !alike.has(key(Math.min(p, q), Math.max(p, q))));
const pixels = (rows) => rows.reduce((s, r) => s + r[2], 0);
const ties = byMesh(seen(result.ties)),
  near = byMesh(seen(result.near).filter(([, , , worst]) => worst >= 12));
console.log(
  `${mapId}${layers ? "" : " without the depth layers"}: ${views.length} views, ${total(ties)} pixels at exactly equal depth (${ties.length} pairs of meshes), ${total(near)} pixels in near-tie patches (${near.length} pairs)`,
);
console.log(
  `  not counted: ${pixels(result.ties) - pixels(seen(result.ties))} tied pixels between doubled faces that look the same`,
);
console.log(
  `  ${result.tieLines} more tied pixels in single lines, along edges where two faces meet`,
);
if (result.stray)
  console.log(`  ${result.stray} pixels with no known owner (the ID colours did not survive)`);
if (layers) {
  // With the layers on, a tie that is left is one the plan could not settle, or did not find.
  const left = seen(result.ties);
  const of = (set) => pixels(left.filter(([p, q]) => set.has(key(p, q)) || set.has(key(q, p))));
  console.log(
    `  of the ties: ${of(ordered)} between faces the plan ordered, ${of(unsettled)} between faces it could not, ${pixels(left) - of(ordered) - of(unsettled)} between faces it did not find`,
  );
}
console.log("ties:");
show(ties);
console.log("near-ties:");
show(near);
// --raw: the pairs of triangles behind those lists (numbers as in the plan; ask
// find_coplanar.mjs --why=a,b what it made of a pair).
if (process.argv.includes("--raw")) {
  const state = (p, q) =>
    ordered.has(key(p, q)) || ordered.has(key(q, p))
      ? "ordered"
      : unsettled.has(key(p, q))
        ? "unsettled"
        : "not in the plan";
  for (const [name, rows] of [
    ["tie", seen(result.ties)],
    ["near-tie", seen(result.near)],
  ])
    for (const [p, q, n] of rows.sort((x, y) => y[2] - x[2]).slice(0, 12))
      console.log(
        `  ${name} ${p - 1},${q - 1}: ${n} px, ${state(p, q)}  ${meshOf(p).name}  ×  ${meshOf(q).name}`,
      );
}
const out = {
  mapId,
  layers,
  views: views.length,
  tiePixels: total(ties),
  nearPixels: total(near),
  tiePixelsInLines: result.tieLines,
  ties: ties.map(([pair, e]) => ({ pair, ...e, view: views[e.at] })),
  near: near.map(([pair, e]) => ({ pair, ...e, view: views[e.at] })),
};
if (compare) {
  const planned = [],
    against = [],
    same = [],
    other = [];
  for (const row of result.moved) {
    const [from, to] = row;
    if (ordered.has(key(to, from))) planned.push(row);
    else if (ordered.has(key(from, to))) against.push(row);
    else if (unsettled.has(key(from, to))) planned.push(row);
    else if (alike.has(key(Math.min(from, to), Math.max(from, to)))) same.push(row);
    else other.push(row);
  }
  const unplanned = byMesh(
    other.filter(([, , , worst]) => worst >= 12),
    true,
  );
  console.log(
    `what the layers changed: ${pixels(planned)} pixels went to the face the plan lays on top, ${pixels(against)} the other way, ${pixels(same)} to a face that looks the same, ${total(unplanned)} between faces the plan does not order (${unplanned.length} pairs of meshes); ${result.lines} more in single lines along corners`,
  );
  show(unplanned, 30);
  if (process.argv.includes("--raw"))
    for (const [from, to, n] of other.sort((x, y) => y[2] - x[2]).slice(0, 12))
      console.log(
        `  moved ${from - 1},${to - 1}: ${n} px  ${meshOf(from).name}  →  ${meshOf(to).name}`,
      );
  Object.assign(out, {
    movedAsPlanned: pixels(planned),
    movedAgainstPlan: pixels(against),
    movedToTheSameLook: pixels(same),
    movedInLines: result.lines,
    movedUnplanned: unplanned.map(([pair, e]) => ({ pair, ...e, view: views[e.at] })),
  });
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
// One view (a views file with a single entry): its picture beside the report.
const picture = await page.evaluate(() => window.flickerPicture);
if (picture)
  fs.writeFileSync(
    outFile.replace(/\.json$/, "") + ".png",
    Buffer.from(picture.split(",")[1], "base64"),
  );
await browser.close();
server.close();
