/**
 * Map audit: drive a vehicle straight over each bridge (stepVehicle at the server's tick) and
 * report how its height, pitch and roll jump step to step (jitter), and any stop.
 *   node scripts/br/map-audit/run.mjs bridgedrive [bridge id] [kind]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { stepVehicle, type Vehicle, type VehicleKind } from "@/lib/fps/br/vehicles";
import { bridgeSpans } from "@/lib/fps/br/bridges";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const only = process.argv[2];
const kind = (process.argv[3] ?? "sedan") as VehicleKind;
const DT = 50;
for (const span of bridgeSpans(meta, hf)) {
  if (only && span.id !== only) continue;
  for (const dirn of [1, -1]) {
    const pts = dirn > 0 ? span.points : [...span.points].reverse();
    const [ax, , az] = pts[0]!,
      [bx, , bz] = pts[pts.length - 1]!;
    const L = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / L,
      uz = (bz - az) / L;
    // Start on the deck's centre line, a few metres in (BACK=n m before it: on the road).
    const back = Number(process.env.BACK ?? -3);
    const x0 = ax - ux * back,
      z0 = az - uz * back;
    const v: Vehicle = {
      id: 1,
      kind,
      condition: "good" as Vehicle["condition"],
      x: x0,
      y: pts[0]![1] + 0.05,
      z: z0,
      yaw: Math.atan2(-ux, -uz),
      speed: 0,
      pitch: 0,
      roll: 0,
      health: 1000,
      maxHealth: 1000,
      driver: 1,
      destroyed: false,
    };
    const ys: number[] = [],
      ps: number[] = [],
      rs: number[] = [];
    let crashes = 0,
      t = 0,
      stuck = 0;
    while (t < 60000) {
      const along = (v.x - ax) * ux + (v.z - az) * uz;
      if (along > L + Number(process.env.AFTER ?? -3)) break;
      // Steer back to the axis.
      const lat = -(v.x - ax) * uz + (v.z - az) * ux;
      const want = Math.atan2(-ux, -uz);
      let dy = want - v.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      void dy;
      void lat;
      const strafe = 0;
      const imp = stepVehicle(isl.solid as never, meta, v, { forward: 1, strafe }, DT);
      if (imp > 0) {
        crashes++;
        if (crashes < 4)
          console.log(
            "  crash at along",
            along.toFixed(1),
            "lat",
            lat.toFixed(2),
            "y",
            v.y.toFixed(2),
          );
      }
      if (Math.abs(v.speed) < 0.5 && t > 3000) stuck++;
      if (
        along > -10 - Number(process.env.BACK ?? 0) &&
        along < L + 10 + Number(process.env.AFTER ?? 0)
      ) {
        ys.push(v.y);
        ps.push(v.pitch);
        rs.push(v.roll);
        const m = ys.length;
        if (process.env.TRACE && m > 2 && Math.abs(ys[m - 1]! - 2 * ys[m - 2]! + ys[m - 3]!) > 0.05)
          console.log(
            "  bump at along",
            along.toFixed(1),
            "lat",
            lat.toFixed(2),
            "y",
            v.y.toFixed(2),
            "ground",
            hf.heightAt(v.x, v.z).toFixed(2),
            "x,z",
            v.x.toFixed(1),
            v.z.toFixed(1),
          );
      }
      t += DT;
    }
    // Jitter: the second difference of height (a smooth climb has ~0), and pitch/roll steps.
    let jy = 0,
      jp = 0,
      jr = 0,
      n = 0;
    for (let i = 2; i < ys.length; i++) {
      jy = Math.max(jy, Math.abs(ys[i]! - 2 * ys[i - 1]! + ys[i - 2]!));
      jp = Math.max(jp, Math.abs(ps[i]! - ps[i - 1]!));
      jr = Math.max(jr, Math.abs(rs[i]! - rs[i - 1]!));
      n++;
    }
    console.log(
      `${span.id} ${dirn > 0 ? "a→b" : "b→a"} ${kind}: ${n} steps, max |d²y| ${jy.toFixed(3)} m, max |Δpitch| ${(jp * 57.3).toFixed(2)}°, max |Δroll| ${(jr * 57.3).toFixed(2)}°, crashes ${crashes}, stuck ${stuck}, end speed ${v.speed.toFixed(1)}`,
    );
  }
}
