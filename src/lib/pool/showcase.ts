import { TABLE_W } from "@/lib/pool/physics";
import { freshTable } from "@/lib/pool/rules";

/** Stable rack for the lobby preview. The cue sits on the right, aimed at the rack. */
const SEED = Uint8Array.from({ length: 32 }, (_, i) => (i * 13 + 7) & 255);

export const SHOWCASE_BALLS = freshTable(SEED).balls.map((ball) => ({
  ...ball,
  x: TABLE_W - ball.x,
}));

/** 180 degrees, so the cue aims from the right-hand spot into the rack. */
export const SHOWCASE_AIM = 180_000;
