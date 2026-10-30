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
