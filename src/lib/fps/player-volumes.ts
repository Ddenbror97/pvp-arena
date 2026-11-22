import { eyeHeight, stanceAmount } from "./map";

type VolumePose = {
  x: number;
  y: number;
  z: number;
  crouched?: boolean;
  stance?: number;
  /** Swimming (BR): `y` is the water's surface and the body lies in it (swim-stroke.ts). */
  swim?: boolean;
};

/**
 * A swimmer as drawn (swim-stroke.ts): the head just above the surface at the player's position,
 * the shoulders and upper back at the surface around it, the rest under water. No facing: the
 * boxes cover the upper body whichever way the swimmer lies; trailing legs are under water.
 */
export const SWIM_VOLUME = {
  head: 0.27,
  chest: [-0.3, 0.12],
  stomach: [-0.7, -0.3],
  legs: [-1.3, -0.7],
  width: 0.9,
} as const;

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
  if (player.swim) {
    const box = ([low, high]: readonly [number, number]) => ({
      center: { x: player.x, y: player.y + (low + high) / 2, z: player.z },
      size: { x: SWIM_VOLUME.width, y: high - low, z: SWIM_VOLUME.width },
    });
    return {
      head: {
        center: { x: player.x, y: player.y + SWIM_VOLUME.head, z: player.z },
        size: { x: 0.4, y: 0.4, z: 0.4 },
      },
      chest: box(SWIM_VOLUME.chest),
      stomach: box(SWIM_VOLUME.stomach),
      legs: box(SWIM_VOLUME.legs),
    };
  }
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
