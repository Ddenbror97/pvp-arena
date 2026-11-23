import FILL from "./collision-fill.json";
import type { CollisionData } from "./static-world";

/**
 * Collision for what is drawn solid but had no box under it (owner, 2026-11-23: "make walls/
 * threes/rocks/objects bulletproof so people cant hax thro"; art/blender/br/fill_collision.mjs).
 * Each model's fill was made against its boxes as they were then; it is added only where the
 * model's boxes still match (`boxesFingerprint`), so a model whose collision is rebuilt later
 * (a cut window, a door) is never closed up by a stale fill.
 */
/** { [model]: { [fingerprint of its own boxes]: decodeBoxes text } } */
type Fill = Record<string, Record<string, string>>;

/** The same fingerprint art/blender/br/collision-fingerprint.mjs writes. */
export function boxesFingerprint(boxes: ArrayLike<ArrayLike<number>>): string {
  let s = 0;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]!;
    for (let k = 0; k < b.length; k++) s += b[k]! * (((i * 6 + k) % 7) + 1);
  }
  return `${boxes.length}:${Math.round(s * 1000)}`;
}

/**
 * encodeBoxes' text (art/blender/br/collision-fingerprint.mjs) as boxes, flat: x0, y0, z0, x1,
 * y1, z1 per box, in metres.
 */
export function decodeBoxes(text: string): Float32Array {
  const raw = atob(text);
  const out = new Float32Array(raw.length >> 1);
  for (let i = 0; i < out.length; i++) {
    const u = raw.charCodeAt(2 * i) | (raw.charCodeAt(2 * i + 1) << 8);
    out[i] = (u >= 0x8000 ? u - 0x10000 : u) / 100;
  }
  return out;
}

/**
 * Models whose fill stops bodies too: trunks and logs out in the open, with no door or stair
 * for it to block. A body walked through a palm or an orchard tree's trunk before.
 */
export const BODY_FILL = new Set([
  "bay-palm",
  "bay-palm-2",
  "bay-coconut-palm",
  "coconut-palm",
  "tall-tree",
  "orchard-tree",
  "bald-cypress",
  "rainforest-log",
  "rainforest-log-b",
]);

/**
 * The fill's boxes per model (flat, decodeBoxes), for the models whose boxes still match it.
 * `shot` stops shots and sight only (StaticWorld's `shotModels`): walking, doors, ladders,
 * grenades and loot keep the boxes they had, so the fill can't block a doorway or a stair.
 * `body` (BODY_FILL) stops bodies as well.
 */
export function collisionFill(
  collision: CollisionData,
  fill: Fill = FILL as Fill,
): { shot: Record<string, Float32Array>; body: Record<string, Float32Array> } {
  const shot: Record<string, Float32Array> = {},
    body: Record<string, Float32Array> = {};
  for (const [id, variants] of Object.entries(fill)) {
    const v = variants[boxesFingerprint(collision.models[id] ?? [])];
    if (v) (BODY_FILL.has(id) ? body : shot)[id] = decodeBoxes(v);
  }
  return { shot, body };
}
