import { eyeHeight } from "./map";

/** Shared combat envelope: positions are relative to server-owned feet coordinates. */
export function playerVolumes(player: { x: number; y: number; z: number; crouched?: boolean }) {
  const top = player.crouched ? 0.8 : 1.4;
  return {
    head: {
      center: { x: player.x, y: player.y + eyeHeight(player), z: player.z },
      size: { x: 0.4, y: 0.4, z: 0.4 },
    },
    // Include the boots: the old body box started 15–20 cm above the feet.
    body: {
      center: { x: player.x, y: player.y + top / 2, z: player.z },
      size: { x: 0.7, y: top, z: 0.7 },
    },
  };
}

export function combatVolumes(player: { x: number; y: number; z: number; crouched?: boolean }) {
  const base = playerVolumes(player),
    legsTop = player.crouched ? 0.3 : 0.6,
    stomachTop = player.crouched ? 0.53 : 0.94,
    top = player.crouched ? 0.8 : 1.4;
  const zone = (low: number, high: number) => ({
    center: { x: player.x, y: player.y + (low + high) / 2, z: player.z },
    size: { x: 0.7, y: high - low, z: 0.7 },
  });
  return {
    head: base.head,
    chest: zone(stomachTop, top),
    stomach: zone(legsTop, stomachTop),
    legs: zone(0, legsTop),
  };
}
