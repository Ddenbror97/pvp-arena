import { DEFAULT_MAP, type GameMap } from "./maps/registry";
import type { MatchState, Seat } from "./protocol";

export function isDefeatedView(state: MatchState, seat: Seat | null, spectate: boolean) {
  return (
    !spectate &&
    seat !== null &&
    state.players[seat].hp <= 0 &&
    (state.phase === "round-end" || state.phase === "completed")
  );
}

/** Cosmetic only: the authoritative eliminated player remains unchanged. */
export function deathSupport(x: number, feetY: number, z: number, map: GameMap = DEFAULT_MAP) {
  let floor = 0;
  for (const box of map.boxes) {
    const top = box.y + box.h / 2;
    if (top <= feetY + 0.01 && Math.abs(x - box.x) < box.w / 2 && Math.abs(z - box.z) < box.d / 2)
      floor = Math.max(floor, top);
  }
  return floor;
}

/**
 * Where to draw an eliminated player. With `clipMs` (the character plays the death animation,
 * death-clip.ts) the body stays upright on the floor and `progress` runs through the animation;
 * without it, the rigid fallback: an accelerating fall backwards that settles.
 */
export function deathPose(elapsedMs: number, feetY: number, floorY: number, clipMs = 0) {
  if (clipMs > 0) {
    const seconds = Math.max(0, elapsedMs) / 1000;
    return {
      progress: Math.max(0, Math.min(1, elapsedMs / clipMs)),
      pitch: 0,
      roll: 0,
      height: Math.max(floorY, feetY - 7 * seconds * seconds),
      backward: 0,
    };
  }
  const progress = Math.max(0, Math.min(1, elapsedMs / 850));
  // Accelerate into the fall, then settle rather than tipping like a rigid sign.
  const eased = progress * progress * (3 - 2 * progress);
  const pitch = (eased * Math.PI) / 2;
  const seconds = Math.max(0, elapsedMs) / 1000;
  return {
    progress: eased,
    pitch,
    roll: Math.sin(progress * Math.PI) * 0.06,
    height: Math.max(floorY, feetY - 7 * seconds * seconds) + 0.22 * Math.sin(pitch),
    backward: eased * 0.28,
  };
}
