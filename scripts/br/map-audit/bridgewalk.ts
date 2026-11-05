/** Map audit: walk each bridge deck end to end with the server's movement, steering along it. */
import { readFileSync } from "node:fs";
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
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const world = buildIsland(hf, cover, meta, collision).solid;
const route = planeRoute(1);
for (const br of meta.bridges)
  for (const [from, to] of [
    [-0.08, 1.08],
    [1.08, -0.08],
  ] as const) {
    const at = (t: number) =>
      [br.a[0] + (br.b[0] - br.a[0]) * t, br.a[1] + (br.b[1] - br.a[1]) * t] as const;
    const b = newDropBody();
    b.phase = "ground";
    [b.x, b.z] = at(from);
    b.y = world.supportAt(b.x, b.z, PLAYER_RADIUS, hf.heightAt(b.x, b.z) + 0.5);
    b.grounded = true;
    let t = from,
      ticks = 0,
      maxY = b.y,
      minY = b.y;
    const dir = Math.sign(to - from);
    // Steer at a point 10 m further along the bridge axis than the body's own projection.
    const len = Math.hypot(br.b[0] - br.a[0], br.b[1] - br.a[1]);
    while (ticks < 9000) {
      const ux = (br.b[0] - br.a[0]) / len,
        uz = (br.b[1] - br.a[1]) / len;
      t = ((b.x - br.a[0]) * ux + (b.z - br.a[1]) * uz) / len;
      if (dir > 0 ? t >= to - 0.01 : t <= to + 0.01) break;
      const [tx, tz] = at(t + (dir * 10) / len);
      stepDrop(
        world,
        meta,
        route,
        b,
        { forward: 1, strafe: 0, yaw: Math.atan2(-(tx - b.x), -(tz - b.z)), sprint: true },
        1e9,
        TICK_MS,
      );
      maxY = Math.max(maxY, b.y);
      minY = Math.min(minY, b.y);
      ticks++;
    }
    console.log(
      br.id,
      from < to ? "a→b" : "b→a",
      "reached",
      dir > 0 ? t >= to - 0.01 : t <= to + 0.01,
      "s",
      ((ticks * TICK_MS) / 1000).toFixed(1),
      "y",
      minY.toFixed(1),
      maxY.toFixed(1),
      "phase",
      b.phase,
      "at",
      b.x.toFixed(1),
      b.z.toFixed(1),
    );
  }
