/**
 * Mouse look and movement keys as the three PvPStrike clients read them (1v1, Defuse the Bomb,
 * Battle Royale): one pitch limit, one way to turn, one way to read the movement keys.
 */
export const PITCH_LIMIT = 1.45;

export const clampPitch = (pitch: number) => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));

/** Yaw brought into [-π, π). */
export const wrapYaw = (yaw: number) =>
  ((((yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

/** The view after a mouse movement of (dx, dy) pixels at `look` radians a pixel. */
export function mouseLook(yaw: number, pitch: number, dx: number, dy: number, look: number) {
  return { yaw: yaw - dx * look, pitch: clampPitch(pitch - dy * look) };
}

export type MoveBinds = { forward: string; back: string; left: string; right: string };
export const WASD: MoveBinds = { forward: "KeyW", back: "KeyS", left: "KeyA", right: "KeyD" };

/** Forward and strafe (-1, 0 or 1 each) from the held keys. */
export function moveAxes(keys: ReadonlySet<string>, binds: MoveBinds = WASD) {
  return {
    forward: Number(keys.has(binds.forward)) - Number(keys.has(binds.back)),
    strafe: Number(keys.has(binds.right)) - Number(keys.has(binds.left)),
  };
}
