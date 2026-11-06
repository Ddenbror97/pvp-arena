import { WORLD_ASSETS } from "@/lib/fps/br/world";
/** Map audit: can a player who lands on a spot walk out of it? (argv: out.json, "x,z" …) */
import { readFileSync, writeFileSync } from "node:fs";
import { newDropBody, planeRoute, stepDrop } from "@/lib/fps/br/drop";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
import { PLAYER_RADIUS } from "@/lib/fps/map";
import { TICK_MS } from "@/lib/fps/simulation";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const world = buildIsland(hf, cover, meta, collision).solid;
const route = planeRoute(1);
const out = process.argv.slice(3).map((arg) => {
  const [x, z] = arg.split(",").map(Number) as [number, number];
  const escapes = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
    const b = newDropBody();
    b.phase = "ground";
    b.x = x;
    b.z = z;
    b.y = world.supportAt(x, z, PLAYER_RADIUS, 1e4);
    b.grounded = true;
    for (let t = 0; t < 30; t++)
      stepDrop(
        world,
        meta,
        route,
        b,
        { forward: 1, strafe: 0, yaw: (k / 8) * Math.PI * 2 },
        1e9,
        TICK_MS,
      );
    return +Math.hypot(b.x - x, b.z - z).toFixed(2);
  });
  return { at: [x, z], movedPerDirection: escapes, trapped: escapes.every((m) => m < 0.5) };
});
writeFileSync(process.argv[2]!, JSON.stringify(out));
console.log(JSON.stringify(out));
