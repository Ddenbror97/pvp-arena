/** Map audit: doorways found per building model (doors.ts) and the island's door count. */
import { readFileSync } from "node:fs";
import { modelDoors } from "@/lib/fps/br/doors";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import type { CollisionData } from "@/lib/fps/br/static-world";
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync("public/fps/br/models/models.json", "utf8")).models;
for (const [id, m] of Object.entries(models) as [string, { class: string }][]) {
  if (m.class !== "building" && m.class !== "structure" && m.class !== "hero") continue;
  const t0 = performance.now();
  const d = modelDoors(collision, id);
  const spots = modelSpots(collision, id, "indoor", 2.5, 60).length;
  console.log(
    id.padEnd(20),
    `spots ${String(spots).padStart(3)} doors ${d.length}`,
    d
      .map((x) => `${x.along}${x.width}@(${x.x.toFixed(1)},${x.z.toFixed(1)}) y${x.y0}-${x.y1}`)
      .join(" "),
    `${(performance.now() - t0).toFixed(0)} ms`,
  );
}
