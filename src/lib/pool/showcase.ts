import { freshTable } from "@/lib/pool/rules";

/**
 * Stable rack for the lobby preview. The cue stays on the kitchen side and
 * aims into the rack, so the stick lies across the open room instead of
 * running under the games panel.
 */
const SEED = Uint8Array.from({ length: 32 }, (_, i) => (i * 13 + 7) & 255);

export const SHOWCASE_BALLS = freshTable(SEED).balls;

/** Aims from the kitchen spot toward the rack. */
export const SHOWCASE_AIM = 0;

/**
 * Lightest preview power that still reaches the rack. A softer shot stops
 * on the cloth, so the aim guide would not draw the ghost ball.
 */
export const SHOWCASE_POWER = 2_800;
