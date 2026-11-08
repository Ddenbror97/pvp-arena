/**
 * Garden fences for the towns' house lots (owner, 2026-11-05: neighbourhoods like H1Z1's fenced
 * yards): a weathered board fence and a white picket fence, one 2.4 m section each.
 *
 *   node art/blender/br/build_yard_fence.mjs        (run from the repo root, art/blender deps)
 *
 * See-through and waist-high (1.15 m), without collision, like the farms' rail fence: a fence a
 * player cannot jump (0.9 m) would trap people in yards. Placed by the hundred, so the LODs are
 * cheap: boards and posts up close, one board panel and two posts mid-range, a single slab far.
 * Writes public/fps/br/models/{yard,picket}-fence.lod{0,1,2}.glb, their (empty) boxes files and
 * models.json entries. Original work.
 */
import { createKit, publish } from "./procedural-kit.mjs";

const L = 2.4; // section length (local x), centred
const H = 1.15;

function fence(id, colours, { boards, boardW, title, use }) {
  const [post, rail, ...boardColours] = colours;
  const half = L / 2;
  const frame = (k) => {
    // Posts at both ends, two rails behind the boards.
    for (const x of [-half + 0.06, half - 0.06])
      k.box([x - 0.06, 0, -0.06, x + 0.06, H + 0.05, 0.06], post, { collide: false, lod: 0 });
    for (const y of [0.25, H - 0.3])
      k.box([-half, y, -0.06, half, y + 0.08, -0.02], rail, { collide: false, lod: 0 });
  };
  // Up close: boards across the front with gaps between them (see-through), a few a little
  // shorter so a long run of sections does not read as one repeated tile.
  const near = createKit();
  frame(near);
  const step = (L - 0.16) / boards;
  for (let i = 0; i < boards; i++) {
    const x0 = -half + 0.08 + i * step + (step - boardW) / 2;
    const top = H - (i % 3 === 1 ? 0.06 : 0) - (i % 5 === 3 ? 0.04 : 0);
    near.box([x0, 0.04, -0.02, x0 + boardW, top, 0.0], boardColours[i % boardColours.length], {
      collide: false,
      lod: 0,
    });
  }
  // Mid range: the frame and one panel in place of the boards (the gaps are under a pixel).
  const mid = createKit();
  frame(mid);
  mid.box([-half + 0.12, 0.04, -0.02, half - 0.12, H - 0.03, 0.0], boardColours[0], {
    collide: false,
    lod: 0,
  });
  // Far: one slab.
  const far = createKit();
  far.box([-half, 0, -0.04, half, H, 0.0], boardColours[0], { lod: 2, collide: false });
  // publish() writes kit.geometry(0) and (1) for LOD0/LOD1 and the collision from kit.parts.
  const k = {
    parts: [],
    geometry: (lod) => (lod === 0 ? near.geometry(0) : mid.geometry(0)),
  };
  return publish(id, k, far, {
    title,
    source: "art/blender/br/build_yard_fence.mjs",
    use,
    class: "small",
    ring: "yard",
    size: [L, H + 0.05, 0.12],
  });
}

await fence(
  "yard-fence",
  [
    [0.3, 0.25, 0.2],
    [0.33, 0.28, 0.22],
    [0.47, 0.41, 0.33],
    [0.41, 0.35, 0.28],
    [0.52, 0.47, 0.4],
    [0.38, 0.33, 0.27],
  ],
  {
    boards: 9,
    boardW: 0.19,
    title: "Weathered board fence (yard)",
    use: "house-lot fences in the towns (see-through, no collision, like the rail fence)",
  },
);
await fence(
  "picket-fence",
  [
    [0.78, 0.77, 0.73],
    [0.74, 0.73, 0.69],
    [0.86, 0.85, 0.81],
    [0.81, 0.8, 0.76],
    [0.84, 0.83, 0.79],
  ],
  {
    boards: 13,
    boardW: 0.08,
    title: "White picket fence (yard)",
    use: "front gardens in the towns (see-through, no collision, like the rail fence)",
  },
);
