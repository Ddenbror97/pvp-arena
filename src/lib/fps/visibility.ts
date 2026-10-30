import { traceWorld } from "./collision";
import { eyeHeight, PLAYER_RADIUS } from "./map";
import type { MatchState, Seat } from "./protocol";

type PublicState = Omit<MatchState, "server">;
/** Send a pose only when some of its combat silhouette has an unobstructed sight line. */
export function canSeeOpponent(state: PublicState, seat: Seat): boolean {
  if (state.phase !== "live") return true;
  const own = state.players[seat],
    enemy = state.players[seat === "A" ? "B" : "A"];
  const origin = { x: own.x, y: own.y + eyeHeight(own), z: own.z };
  const dx = enemy.x - own.x,
    dz = enemy.z - own.z,
    length = Math.hypot(dx, dz) || 1;
  const sideX = (dz / length) * PLAYER_RADIUS * 0.9,
    sideZ = (-dx / length) * PLAYER_RADIUS * 0.9;
  const heights = [eyeHeight(enemy) + 0.1, eyeHeight(enemy), eyeHeight(enemy) * 0.55];
  for (const height of heights)
    for (const side of [-1, 0, 1]) {
      const x = enemy.x + sideX * side - origin.x,
        y = enemy.y + height - origin.y,
        z = enemy.z + sideZ * side - origin.z,
        distance = Math.hypot(x, y, z);
      if (
        distance < 0.01 ||
        !traceWorld(
          origin,
          { x: x / distance, y: y / distance, z: z / distance },
          Math.max(0, distance - 0.025),
        )
      )
        return true;
    }
  return false;
}

/** Pure recipient projection. Never mutate the simulation or the delayed spectator history. */
export function snapshotForPlayer<T extends { state: PublicState }>(frame: T, seat: Seat) {
  const remote = seat === "A" ? "B" : "A",
    visible = canSeeOpponent(frame.state, seat);
  if (visible) return { ...frame, visibility: { A: true, B: true } };
  const enemy = frame.state.players[remote];
  return {
    ...frame,
    visibility: { A: seat === "A", B: seat === "B" },
    state: {
      ...frame.state,
      players: {
        ...frame.state.players,
        [remote]: {
          ...enemy,
          x: 0,
          y: 0,
          z: 0,
          yaw: 0,
          pitch: 0,
          velocityY: 0,
          crouched: false,
          ammo: 0,
          reserve: 0,
          reloadUntil: 0,
          lastShotAt: 0,
          lastSeq: -1,
          sprayCount: 0,
        },
      },
    },
  };
}
