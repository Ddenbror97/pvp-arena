import { readFileSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import { AircraftClient } from "@/lib/fps/br/aircraft-client";
import {
  aircraftRow,
  aero,
  attitude,
  heightAboveGround,
  stepAircraft,
} from "@/lib/fps/br/aircraft";
import { aircraftSpawn } from "@/lib/fps/br/aircraft-world";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { buildIsland } from "@/lib/fps/br/island";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import type { CollisionData, StaticWorld } from "@/lib/fps/br/static-world";

const read = (path: string) => readFileSync(`public${path}`);
const buffer = (path: string) => {
  const b = read(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
let world: StaticWorld, meta: WorldMeta;
beforeAll(async () => {
  meta = JSON.parse(read(WORLD_ASSETS.meta).toString());
  const hf = await decodeHeightfield(buffer(WORLD_ASSETS.height));
  const cover = await decodeLandCover(buffer(WORLD_ASSETS.landcover));
  const collision = JSON.parse(read(WORLD_ASSETS.collision).toString()) as CollisionData;
  world = buildIsland(hf, cover, meta, collision).solid;
}, 60_000);

it.each(["mouse", "large drag", "arrows", "early pull"])(
  "takes off at Island Airfield with %s input",
  (mode) => {
    const a = aircraftSpawn(meta, world)!;
    const c = new AircraftClient();
    Object.assign(a, { engine: "running", rpm: 1, throttle: 1 });
    let pulled = false,
      maxPitch = 0;
    for (let i = 0; i < 900; i++) {
      const now = (i * 1000) / 30;
      c.apply(aircraftRow(a), 0, now);
      if (!pulled && (mode === "early pull" || aero(a).V >= 28)) {
        pulled = true;
        if (mode !== "arrows") {
          c.holdPitch(true);
          c.mouse(0, mode === "large drag" ? -400 : -100, 0.5);
        }
      }
      const wire = c.steer(
        {
          throttleUp: false,
          throttleDown: false,
          rollLeft: false,
          rollRight: false,
          rudderLeft: false,
          rudderRight: false,
          brake: false,
          pitchUp: mode === "arrows" && pulled,
        },
        1 / 30,
      );
      stepAircraft(world, meta, a, { ...wire, engine: false, brake: false }, now, 1000 / 30);
      maxPitch = Math.max(maxPitch, attitude(a).pitch);
    }
    expect(pulled).toBe(true);
    expect(a.grounded).toBe(false);
    expect(heightAboveGround(world, a)).toBeGreaterThan(25);
    expect(aero(a).V).toBeGreaterThan(30);
    expect(maxPitch).toBeLessThan((15 * Math.PI) / 180);
    expect(a.health).toBe(a.maxHealth);
  },
);
