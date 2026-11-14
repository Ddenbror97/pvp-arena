import type { Placement } from "./layout";
import skylinePlan from "./skyline-plan.json";
import type { WorldMeta } from "./world";

/**
 * Skyline Residences (owner, 2026-11-13: "build something diffrent, like high sky skrepers not
 * to high but should be highest building in the map so far. enterble, floors,rooms,elevator
 * working, like a apartment condiminium luxery small one"): two luxury towers and their
 * clubhouse on the pad the owner ringed between Central Hospital and Redstone Quarry
 * (build_world.py "skyline").
 *
 * Each tower is a stack of art/blender/br/build_condo.mjs storeys, 3.6 m apart: the lobby, the
 * residential floors, a roof. The stair and the lift run through every storey at the same
 * place, so a tower's lift is the column of its storeys (lifts.ts).
 */
export const SKYLINE = {
  storey: skylinePlan.storey,
  towers: [
    // The tall tower (A): the lobby, 13 residential floors, the helipad roof (≈ 55 m).
    { id: "a", dx: -28, dz: -22, floors: 13, roof: "condo-roof-a" },
    // Tower B: the lobby, 10 floors, the pool deck (≈ 44 m).
    { id: "b", dx: 30, dz: -8, floors: 10, roof: "condo-roof-b" },
  ],
  club: { dx: -2, dz: 30 },
} as const;

type Poi = WorldMeta["pois"][number];
/** A storey's walking level above its placement (the slab). */
const FLOOR = skylinePlan.floor;

/**
 * One condo tower anywhere (Downtown's high-rises, 2026-11-13): the lobby at `y0`, `floors`
 * residential storeys, the roof, each furnished like Skyline's (the lift and the stair run
 * through the column, lifts.ts). (x, z) is the tower's centre in world metres; turn 0.
 */
export function condoTower(
  poiId: string,
  out: Placement[],
  x: number,
  y0: number,
  z: number,
  floors: number,
  roof: "condo-roof-a" | "condo-roof-b",
) {
  const storeys: Placement[] = [];
  const at = (model: string, k: number) =>
    storeys.push({
      model,
      x: +x.toFixed(2),
      y: +(y0 + k * SKYLINE.storey).toFixed(2),
      z: +z.toFixed(2),
      turn: 0,
      poi: poiId,
    });
  at("condo-lobby", 0);
  for (let k = 1; k <= floors; k++) at("condo-floor", k);
  at(roof, floors + 1);
  out.push(...storeys);
  for (const p of storeys) {
    const put: Put = (model, fx, fz, turn = 0, up = 0) =>
      out.push({
        model,
        x: +(p.x + fx).toFixed(2),
        y: +(p.y + FLOOR + up).toFixed(2),
        z: +(p.z + fz).toFixed(2),
        turn: (turn & 3) as Turn,
        poi: poiId,
      });
    if (p.model === "condo-floor") furnishFloor(put);
    else if (p.model === "condo-lobby") furnishLobby(put);
    else if (p.model === "condo-roof-b") furnishPoolDeck(put);
    else if (p.model === "condo-roof-a") put("heli-ambulance", 0, 6.2, 1, 0.03);
  }
}

/** The towers' storeys as placements (bottom up): lobby, floors, roof. */
export function skylineTowers(poi: Poi): Placement[] {
  const y0 = poi.padHeight ?? 0;
  const out: Placement[] = [];
  for (const t of SKYLINE.towers) {
    const at = (model: string, k: number) =>
      out.push({
        model,
        x: +(poi.x + t.dx).toFixed(2),
        y: +(y0 + k * SKYLINE.storey).toFixed(2),
        z: +(poi.z + t.dz).toFixed(2),
        turn: 0,
        poi: poi.id,
      });
    at("condo-lobby", 0);
    for (let k = 1; k <= t.floors; k++) at("condo-floor", k);
    at(t.roof, t.floors + 1);
  }
  return out;
}

type Turn = Placement["turn"];
/** Furniture in a storey's own frame (x across, z towards the balconies; walking level). */
type Put = (model: string, x: number, z: number, turn?: number, up?: number) => void;

/** One apartment (west s = −1, east s = 1): the kitchen, dining, the lounge, bedroom, bath. */
function apartment(put: Put, s: number) {
  // A turn facing +x for s = 1 (east), −x for the west flat (models face +z at turn 0).
  const out = s > 0 ? 1 : 3,
    inn = s > 0 ? 3 : 1;
  // Kitchen run along the bedroom partition, the island and its stools.
  put("kitchen-run", s * 8.65, -2.55, 0);
  put("island-counter", s * 8.6, 0.2, 1);
  for (const x of [7.9, 8.6, 9.3]) put("bar-stool", s * x, 1.05);
  // Dining under a chandelier.
  put("dining-set", s * 8.6, 3.6, 1);
  put("chandelier", s * 8.6, 3.6, 0, 1.3);
  // The lounge round a rug: the sofa facing the TV on the core wall, armchairs either side.
  put("rug", s * 8.6, 7.8, 1);
  put("sofa-luxury", s * 11.2, 7.8, inn);
  put("glass-table", s * 8.9, 7.8, 0);
  put("lux-tv", s * 4.85, 7.8, out, 1.0);
  put("armchair", s * 8.4, 9.9, 2);
  put("armchair", s * 8.4, 5.7, 0);
  put("floor-lamp", s * 12.1, 10.1);
  put("monstera", s * 12.1, 5.4);
  put("plant-small", s * 5.3, 10.1);
  // The bedroom: the bed's head on the north wall, the wardrobe on the bathroom's wall.
  put("bed-set", s * 10.6, -9.3, 0);
  put("closet", s * 8.05, -8.7, s > 0 ? 1 : 3);
  put("floor-lamp", s * 12.2, -4.0);
  // The bathroom: the vanity, toilet, washer and shower on the north wall; the bath.
  put("bath-set", s * 6.2, -10.1, 0);
  put("bathtub", s * 5.25, -6.6, 1);
}

/** A residential storey: both apartments and the sky lounge. */
function furnishFloor(put: Put) {
  apartment(put, -1);
  apartment(put, 1);
  // The sky lounge (south of the core): books, a sofa to the view, armchairs, plants.
  put("bookcase", -2.4, 1.95, 0);
  put("sofa-modern", 0, 5.4, 0);
  put("coffee-table", 0, 6.8, 0);
  put("armchair", -2.6, 7.4, 1);
  put("armchair", 2.6, 7.4, 3);
  put("monstera", -3.5, 10.1);
  put("monstera", 3.5, 10.1);
  put("floor-lamp", 3.5, 2.0);
}

/** The ground floor: the concierge and the piano (west hall), the lounge (east). */
function furnishLobby(put: Put) {
  put("concierge-desk", -9.6, 0.5, 1);
  put("office-chair", -10.6, 0.5, 1);
  put("grand-piano", -9.2, 7.4, 1);
  put("chandelier", -6.5, 2.5, 0, 1.3);
  put("chandelier", 6.5, 2.5, 0, 1.3);
  for (const [x, z] of [
    [-12.2, -10.2],
    [-12.2, 10.2],
    [12.2, 10.2],
    [-5.1, 10.2],
    [5.1, 10.2],
  ] as const)
    put("monstera", x, z);
  put("rug", 8.6, 4.5, 0);
  put("sofa-luxury", 8.6, 2.6, 0);
  put("sofa-luxury", 8.6, 6.6, 2);
  put("coffee-table", 8.6, 4.6, 0);
  put("armchair", 11.6, 4.6, 3);
  put("bookcase", 10.9, -10.1, 0);
  put("floor-lamp", 6.0, -10.0);
  put("sofa-modern", 8.6, -6.5, 0);
}

/** The clubhouse: the gym (west), the lounge and bar (east), the pool terrace. */
function furnishClub(put: Put) {
  for (const x of [-12.5, -10, -7.5]) put("treadmill", x, -6.4, 0);
  put("weight-set", -3.6, -6.4, 0);
  put("weight-set", -12.6, 4.5, 1);
  put("monstera", -14.2, 7.2);
  put("pool-table", 6.5, 0, 0);
  put("pub-counter", 11.5, -5.6, 0);
  for (const x of [10, 11.5, 13]) put("bar-stool", x, -4.0);
  put("fridge-steel", 14.1, -7.1, 3);
  put("sofa-luxury", 11.5, 5.5, 2);
  put("armchair", 8.6, 5.6, 1);
  put("lux-tv", 11.5, 7.6, 2, 1.1);
  put("monstera", 1.0, 7.2);
  // The terrace round the pool: loungers, parasols, a patio table, the jacuzzi, the ladder.
  for (const x of [-8, -5, -2, 2, 5, 8]) put("sunchair", x, 9.6, 0);
  for (const x of [-6.5, 0, 6.5]) put("lux-parasol", x, 10.1);
  put("patio-set", 12.6, 15, 0);
  put("jacuzzi", -12.9, 15.5, 0);
  put("pool-ladder", -9.6, 12.3, 0);
  put("pool-ladder", 9.6, 17.7, 2);
}

/** The pool deck (tower B's roof): loungers along the pool, parasols, the jacuzzi. */
function furnishPoolDeck(put: Put) {
  for (const x of [-7, -4, -1, 2, 5]) put("sunchair", x, 2.6, 0);
  for (const x of [-5.5, 0.5, 6.5]) put("lux-parasol", x, 2.9);
  put("jacuzzi", 10.8, 7.8, 0);
  put("patio-set", -10.6, 1.6, 0);
  put("pool-ladder", -8.4, 4.8, 0);
}

/** The whole site: the towers, their furniture, the clubhouse, the grounds. */
export function skyline(poi: Poi, out: Placement[]) {
  const towers = skylineTowers(poi);
  out.push(...towers);
  const y0 = poi.padHeight ?? 0;
  const at = (model: string, dx: number, dz: number, turn: Turn = 0, dy = 0) =>
    out.push({
      model,
      x: +(poi.x + dx).toFixed(2),
      y: +(y0 + dy).toFixed(2),
      z: +(poi.z + dz).toFixed(2),
      turn,
      poi: poi.id,
    });
  // Furniture in a storey placed at p (all the storeys stand at turn 0).
  const inside =
    (p: Placement): Put =>
    (model, x, z, turn = 0, up = 0) =>
      out.push({
        model,
        x: +(p.x + x).toFixed(2),
        y: +(p.y + FLOOR + up).toFixed(2),
        z: +(p.z + z).toFixed(2),
        turn: (turn & 3) as Turn,
        poi: poi.id,
      });
  for (const p of towers) {
    if (p.model === "condo-floor") furnishFloor(inside(p));
    else if (p.model === "condo-lobby") furnishLobby(inside(p));
    else if (p.model === "condo-roof-b") furnishPoolDeck(inside(p));
    else if (p.model === "condo-roof-a") inside(p)("heli-ambulance", 0, 6.2, 1, 0.03);
  }
  at("condo-club", SKYLINE.club.dx, SKYLINE.club.dz, 0);
  furnishClub(
    inside({
      model: "condo-club",
      x: poi.x + SKYLINE.club.dx,
      y: y0,
      z: poi.z + SKYLINE.club.dz,
      turn: 0,
      poi: poi.id,
    }),
  );
  grounds(at);
}

/**
 * The grounds: a walled garden round the towers (the gates south and west), birch avenues and
 * lamps along the walks, a fountain between the towers, benches, the residents' cars.
 */
function grounds(at: (model: string, dx: number, dz: number, turn?: Turn, dy?: number) => void) {
  const R = 78;
  // The wall, in 2.3 m lengths; gaps for the gates.
  const gates: Array<[number, number]> = [
    [0, R],
    [-R, 6],
  ];
  const run = (x0: number, z0: number, x1: number, z1: number, turn: Turn) => {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.3);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * t,
        z = z0 + (z1 - z0) * t;
      if (gates.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < 5)) continue;
      at("stone-wall", x, z, turn);
    }
  };
  run(-R, R, R, R, 0);
  run(-R, -R, R, -R, 0);
  run(-R, -R, -R, R, 1);
  run(R, -R, R, R, 1);
  // Gate posts (lamps) either side of each gate.
  for (const [gx, gz] of gates)
    for (const e of [-1, 1])
      if (gz === R) at("street-lamp", gx + e * 5.5, gz - 1, 0);
      else at("street-lamp", gx + 1, gz + e * 5.5, 1);
  // The fountain between the towers, benches round it, birches along the walks.
  at("fountain", 1, 4, 0);
  for (const [x, z, t] of [
    [-5, 4, 1],
    [7, 4, 3],
    [1, -2, 0],
  ] as const)
    at("bench", x, z, t);
  for (const z of [16, 26, 36, 46, 56, 66]) {
    at("tree-birch", -24, z);
    at("tree-birch", 22, z);
  }
  for (const x of [-60, -48, 52, 64]) for (const z of [-60, -40, 50, 66]) at("tree-oak", x, z);
  for (const [x, z] of [
    [-12, 14],
    [12, 14],
    [-52, 6],
    [-36, 6],
    [6, 66],
    [-6, 66],
  ] as const)
    at("street-lamp", x, z, 0);
  // Hedges along the towers' fronts.
  for (let x = -40; x <= -16; x += 1.6) at("bush-medium", x, -2.5);
  for (let x = 18; x <= 42; x += 1.6) at("bush-medium", x, 13.5);
  // The residents' cars, nose in along the east walk; a couple by the west gate.
  for (const z of [22, 28, 34, 40]) at("sports-car", 56, z, 3);
  at("car-sedan", 56, 46, 3);
  at("sports-car", -60, 18, 0);
  at("car-sedan", -54, 18, 0);
}
