import { eyeHeight, stanceAmount } from "./map";

type VolumePose = { x: number; y: number; z: number; crouched?: boolean; stance?: number };

/** Shared combat envelope: positions are relative to server-owned feet coordinates. */
export function playerVolumes(player: VolumePose) {
  const stance = stanceAmount(player);
  const top = 1.4 * (1 - stance) + 0.8 * stance;
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

export function combatVolumes(player: VolumePose) {
  const stance = stanceAmount(player);
  const base = playerVolumes(player),
    legsTop = 0.6 * (1 - stance) + 0.3 * stance,
    stomachTop = 0.94 * (1 - stance) + 0.53 * stance,
    top = 1.4 * (1 - stance) + 0.8 * stance;
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
