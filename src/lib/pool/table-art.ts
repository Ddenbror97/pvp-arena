import { TABLE_H, TABLE_W } from "./physics";

/**
 * Physics cloth on `src/assets/pool/table.webp` (1721×914).
 * Fit to the six holes in that art. A pocket centre lands within about 3px.
 * The cushion nose is inside this rectangle. pool-phys-v5 and later stop the ball there.
 * The art is wider than the 2:1 cloth, so it is drawn with separate X and Y
 * scales. Balls stay round because the view scale does not change.
 */
export const TABLE_CLOTH = {
  x: 77.28505182760468,
  y: 80.87554810263713,
  w: 1563.5965630114563,
  h: 718.2489037947256,
};

/** Image pixel for a physics point. Y grows down the art and up the table. */
export function tableArtPoint(tableX: number, tableY: number) {
  return {
    x: TABLE_CLOTH.x + (tableX / TABLE_W) * TABLE_CLOTH.w,
    y: TABLE_CLOTH.y + (1 - tableY / TABLE_H) * TABLE_CLOTH.h,
  };
}
