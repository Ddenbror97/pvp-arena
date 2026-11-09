import { readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { buildIsland } from "@/lib/fps/br/island";
import type { WorldMeta } from "@/lib/fps/br/world";
import { turnPoint } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS } from "@/lib/fps/br/world";
it("dbg", async () => {
  const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8")) as CollisionData;
  const buf = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
  const hf = await decodeHeightfield(buf("public" + WORLD_ASSETS.height));
  const cover = await decodeLandCover(buf("public" + WORLD_ASSETS.landcover));
  const meta = JSON.parse(readFileSync("public" + WORLD_ASSETS.meta, "utf8")) as WorldMeta;
  const island = buildIsland(hf, cover, meta, collision);
  const world = withDoors(island.solid, island.doors, new Uint8Array(island.doors.doors.length).fill(1));
  const routes = JSON.parse(readFileSync("art/br/building-access-routes.json", "utf8")) as Array<[string, number[][]]>;
  const MODEL = process.env.MODEL!, X = +process.env.X!;
  const p = island.layout.find((q) => q.model === MODEL && Math.abs(q.x - X) < 0.1)!;
  const out: string[] = [];
  for (const [m, local] of routes.filter((r) => r[0] === MODEL)) {
    const pts = local.map(([x, z]) => { const q = turnPoint(x!, z!, p.turn); return [q[0] + p.x, q[1] + p.z]; });
    out.push(`placement ${JSON.stringify(p)} pts ${JSON.stringify(pts.map((q) => q.map((v) => +v.toFixed(2))))} ground ${pts.map(([x, z]) => hf.heightAt(x!, z!).toFixed(2))}`);
    out.push("near " + island.layout.filter((q) => Math.hypot(q.x - p.x, q.z - p.z) < 25 && q !== p).map((q) => `${q.model}@${q.x},${q.z} y${q.y} t${q.turn} ${q.poi}`).join(" | "));
    const body: BrBody = { x: pts[0]![0]!, z: pts[0]![1]!, y: hf.heightAt(pts[0]![0]!, pts[0]![1]!), grounded: true, crouched: false, velocityY: 0 };
    for (const [x, z] of pts.slice(1)) {
      for (let tick = 0; tick < 160 && Math.hypot(body.x - x!, body.z - z!) > 0.18; tick++) {
        stepBody(world, body, { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x!, body.z - z!) }, 34);
      }
      out.push(`to ${x!.toFixed(2)},${z!.toFixed(2)} at ${body.x.toFixed(2)} ${body.y.toFixed(2)} ${body.z.toFixed(2)} ground ${hf.heightAt(body.x, body.z).toFixed(2)}`);
    }
  }
  writeFileSync("/tmp/claude-0/-home-claude/6a16bbd3-946b-525c-a56d-aa69438e92da/scratchpad/rd/dbg.txt", out.join("\n"));
}, 120000);
