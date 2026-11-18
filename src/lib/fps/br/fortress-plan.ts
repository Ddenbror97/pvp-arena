/**
 * The Old Fortress's buildings (art/blender/br/build_fortress.mjs) where they stand, in the
 * fortress's frame: metres from its centre (x east, z south), y up from the ledge (the base's
 * foot, the POI's pad height); turns as in layout.ts. layout.ts places them, the dressing
 * (the owner's downloads) and the torches round them.
 *
 * The base is 172 × 152 m and BASE high (the courtyard on top). Round towers stand on its
 * corners, square towers astride the walls, all on the ledge; the walls, the keep and the
 * courtyard's buildings on the courtyard.
 */
export const FORT_BASE = 10;
type Part = readonly [model: string, x: number, y: number, z: number, turn: 0 | 1 | 2 | 3];
const B = FORT_BASE;

export const FORTRESS: readonly Part[] = [
  ["fort-base", 0, 0, 0, 0],
  // Round towers on the corners (each turned so its door faces the courtyard).
  ["fort-tower-round", -86, 0, -76, 0],
  ["fort-tower-round", 86, 0, -76, 3],
  ["fort-tower-round", 86, 0, 76, 2],
  ["fort-tower-round", -86, 0, 76, 1],
  // Square towers astride the walls; the south one over the sally port.
  ["fort-tower-square", -44, 0, -76, 2],
  ["fort-tower-square", 44, 0, -76, 2],
  ["fort-tower-square", -44, 0, 76, 0],
  ["fort-tower-square", 44, 0, 76, 0],
  ["fort-tower-sally", 0, 0, 76, 0],
  ["fort-tower-square", -86, 0, 0, 3],
  ["fort-tower-square", 86, 0, -20, 1],
  ["fort-gatehouse", 0, 0, -76, 2],
  // The curtain walls between them (on the courtyard; their outer faces flush with the base's).
  ["fort-wall-28", -64, B, -74.25, 2],
  ["fort-wall-24", -26, B, -74.25, 2],
  ["fort-wall-24", 26, B, -74.25, 2],
  ["fort-wall-28", 64, B, -74.25, 2],
  ["fort-wall-28", -64, B, 74.25, 0],
  ["fort-wall-32g", -22, B, 74.25, 0],
  ["fort-wall-32", 22, B, 74.25, 0],
  ["fort-wall-28", 64, B, 74.25, 0],
  ["fort-wall-62", -84.25, B, -37, 3],
  ["fort-wall-62s", -84.25, B, 37, 3],
  ["fort-wall-42", 84.25, B, -47, 1],
  ["fort-wall-28s", 84.25, B, 0, 1],
  ["fort-wall-breach", 84.25, B, 27, 1],
  ["fort-wall-28", 84.25, B, 54, 1],
  // The courtyard.
  ["fort-keep", 0, B, 8, 0],
  ["fort-hall", -74.25, B, -38, 0],
  ["fort-barracks", 74.25, B, -46, 0],
  ["fort-chapel", 48, B, 52, 0],
  ["fort-stables", -63.5, B, 65, 0],
  ["fort-cellar-stair", 38.9, B, -37.7, 0],
  ["fort-cellar-stair", -39.1, B, 32.3, 0],
  // The ways in: the bridge to the gate, the breach's rubble, the scaffold.
  ["fort-bridge", 0, 0, -94.65, 0],
  ["fort-rubble", 86, 0, 27, 0],
  ["fort-scaffold", -21.05, 0, 80, 0],
];
