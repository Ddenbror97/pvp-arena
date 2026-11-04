/**
 * Car-park furniture for the Island Superstore (owner, 2026-11-04): painted parking bays and a
 * lot light, so the paved lots read as car parks from the ground and from the air.
 *
 *   node art/blender/br/build_lot.mjs        (run from the repo root)
 *
 * lot-lines: a double row of 13 bays (2.8 × 5.2 m), 36.4 × 10.6 m, painted on the pad (no
 * collision). lot-light: a 9 m pole with two lamp heads (the pole collides). Original work.
 */
import { createKit, publish } from "./procedural-kit.mjs";

const PAINT = [0.92, 0.91, 0.86];
const lines = createKit();
const BAYS = 13,
  W = 2.8,
  L = 5.2;
const half = (BAYS * W) / 2;
for (let i = 0; i <= BAYS; i++) {
  const x = -half + i * W;
  for (const s of [-1, 1])
    lines.box([x - 0.06, 0, s > 0 ? 0.08 : -L, x + 0.06, 0.05, s > 0 ? L : -0.08], PAINT, {
      collide: false,
      lod: 2,
    });
}
lines.box([-half, 0, -0.08, half, 0.05, 0.08], [0.85, 0.72, 0.2], { collide: false, lod: 2 });
// Far away: the centre line and every other stripe (a quarter of the triangles).
const linesFar = createKit();
linesFar.box([-half, 0, -0.08, half, 0.05, 0.08], [0.85, 0.72, 0.2], { lod: 2 });
for (let i = 0; i <= BAYS; i += 2) {
  const x = -half + i * W;
  linesFar.box([x - 0.08, 0, -L, x + 0.08, 0.05, L], PAINT, { lod: 2 });
}
await publish("lot-lines", lines, linesFar, {
  title: "Car park bay markings",
  source: "art/blender/br/build_lot.mjs",
  use: "painted parking bays on the superstore lots",
  class: "small",
  ring: "small",
  size: [BAYS * W, 0.05, 2 * L],
});

const light = createKit();
const POLE = [0.42, 0.43, 0.45];
light.box([-0.15, 0, -0.15, 0.15, 9, 0.15], POLE);
light.box([-0.4, 0, -0.4, 0.4, 0.5, 0.4], [0.6, 0.6, 0.58]);
light.box([-1.8, 8.8, -0.08, 1.8, 9.0, 0.08], POLE, { collide: false });
for (const s of [-1, 1])
  light.box([s * 1.8 - 0.45, 8.55, -0.3, s * 1.8 + 0.45, 8.85, 0.3], [0.95, 0.93, 0.8], {
    collide: false,
  });
const lightFar = createKit();
lightFar.box([-0.15, 0, -0.15, 0.15, 9, 0.15], POLE, { lod: 2 });
lightFar.box([-2.2, 8.6, -0.2, 2.2, 9.0, 0.2], POLE, { lod: 2 });
await publish("lot-light", light, lightFar, {
  title: "Car park light",
  source: "art/blender/br/build_lot.mjs",
  use: "lot lights on the superstore car parks",
  class: "prop",
  ring: "prop",
  size: [4.5, 9, 0.8],
});
