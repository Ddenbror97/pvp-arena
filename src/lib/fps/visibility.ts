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
  const events = frame.state.events.map((event) => {
    const { audio, hit, ...rest } = event;
    let cue = audio;
    if (audio?.position) {
      const own = frame.state.players[seat],
        dx = audio.position.x - own.x,
        dz = audio.position.z - own.z,
        distance = Math.hypot(dx, dz);
      const blocked =
        distance > 0.2 &&
        !!traceWorld(
          { x: own.x, y: own.y + eyeHeight(own), z: own.z },
          { x: dx / distance, y: 0, z: dz / distance },
          Math.max(0, distance - 0.1),
        );
      const range = audio.kind === "shot" ? 48 : 16,
        scale =
          event.seat === seat
            ? 1
            : Math.pow(Math.max(0, 1 - distance / range), 1.5) * (blocked ? 0.4 : 1);
      const pan = distance > 0.1 ? (dx * Math.cos(own.yaw) - dz * Math.sin(own.yaw)) / distance : 0;
      const { position: _position, ...details } = audio;
      cue = {
        ...details,
        gain: Math.round(scale * 16) / 16,
        pan: event.seat === seat ? 0 : Math.round(Math.max(-1, Math.min(1, pan)) * 8) / 8,
        occluded: !!blocked,
      };
    }
    return {
      ...rest,
      ...(cue ? { audio: cue } : {}),
      ...(hit && (visible || hit.victim === seat) ? { hit } : {}),
    };
  });
  if (visible)
    return { ...frame, state: { ...frame.state, events }, visibility: { A: true, B: true } };
  const enemy = frame.state.players[remote];
  return {
    ...frame,
    visibility: { A: seat === "A", B: seat === "B" },
    state: {
      ...frame.state,
      events,
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
          recoilPitch: 0,
          recoilYaw: 0,
          recoilUpdatedAt: 0,
          stepDistance: 0,
          triggerHeld: false,
        },
      },
    },
  };
}
