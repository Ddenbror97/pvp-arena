/**
 * Project Island (Battle Royale) world coordinates, shared by the server room, the client
 * renderer, the map UI and the art pipeline (art/br/build_world.py writes the same numbers).
 *
 *  - metres; origin at the map centre; +x east, +z south (three.js: -z is north); +y up;
 *    sea level is y = 0;
 *  - the playable square is [-5000, 5000] on x and z (10 x 10 km);
 *  - the map grid is columns A–J (west → east) by rows 1–10 (north → south), 1 km per cell,
 *    exactly the concept map's grid, so "Superstore E9" on the map is E9 in the world.
 */
export const WORLD_SIZE = 10_000;
export const WORLD_HALF = WORLD_SIZE / 2;
export const MAP_CELL = 1_000;
export const MAP_COLUMNS = "ABCDEFGHIJ";

/** Static data published with the world (public/fps/br/world.v1.json). */
export const WORLD_ASSETS = {
  revision: "building-access-v16",
  height: "/fps/br/height.v1.hf",
  landcover: "/fps/br/landcover.v1.lc",
  meta: "/fps/br/world.v1.json",
  // sites-v1 (the facades-v1 manifest, its mid-distance LODs of 54 models on the facade atlas,
  // with the 2026-11-11 location models added by add_models.mjs; "sites" because a
  // locations-v1 revision already existed) with the works halls' fit-outs measured again and
  // the lighthouse's keeper's house made enterable (art/br/fitout/halls.py, access-v12), and
  // the walls and railings beside every stair flight solid again
  // (art/blender/br/restore_stair_sides.mjs, access-v13).
  // Then (eastport-v1, add_models.mjs) the owner's 2026-11-11 downloads for Eastport and the
  // mountains: a fishing hut, two boats and three scanned rocks.
  // Then (estates-v1, add_models.mjs) the owner's downloads for the south-west coast and the
  // estates: two houses, a super yacht, a pool, a lifeguard tower and beach props; and
  // (access-v14, art/br/fitout/estates.py) the houses and the yacht made enterable.
  // Then (paint-v1, art/blender/br/paint_flat_models.mjs) the six untextured models painted:
  // the airfield hangar, field hangars, plane shelters, army tent, lookout and humvee; and
  // (zfix-v1, offset_coplanar.mjs) coplanar overlapping faces lifted apart in the buildings and
  // structures (the flicker on copings, parapets and trim). Render only: collision is access-v14's.
  // Then (superstore-v2, add_models.mjs) the Superstore's fit-out rebuilt (stair handrails, rails
  // on the mezzanine's open edges, the partition to the ceiling, the walls lined inside) and the
  // owner's 2026-11-11 store downloads placed in it (the `ss-*` models).
  // Then (strait-v1, add_models.mjs) the strait's bridges and shores: the cable-stayed bridges'
  // A-pylons, the bridgeheads' booths, lookouts and tetrapods, shore rocks, cliffs, revetments,
  // driftwood and wrecks.
  // Then (strait-v2) the bridgeheads' towers: a military guard tower at each mainland end and a
  // watchtower at each island end (the owner's downloads); and (access-v15,
  // art/br/fitout/strait.py) the guard tower's flights and cabin door and the watchtower's deck
  // made walkable (its ladder is climbed through ladders.ts).
  // Then (roadside-v1, add_models.mjs) the strait roads' stops: a roadside motel and its sign,
  // picnic shelters and payphones; and (access-v16, art/br/fitout/roadside.py) the motel's
  // eleven rooms, office, stairs and balcony made enterable.
  models: "/fps/br/models/models.access-v16.json",
  collision: "/fps/br/models/collision.access-v16.json",
} as const;

/** The buildings' fitted doors (scripts/br/doors/bake.mjs): render only, no physics. */
export const DOOR_ASSETS = {
  meta: "/fps/br/models/doors.v13.json",
  atlas: "/fps/br/models/doors.v13.webp",
} as const;

/** Refuse a partially deployed/cached pair instead of drawing a different world than physics. */
export function assertIslandRevision(...parts: Array<{ worldRevision?: string }>) {
  if (parts.some((p) => p.worldRevision !== WORLD_ASSETS.revision))
    throw new Error("Island assets version mismatch");
}

/** Land-cover classes in landcover.v1.lc (byte value = class id). */
export const LAND_COVER = [
  "water",
  "sand",
  "grass",
  "field",
  "forest",
  "rock",
  "urban",
  "road",
] as const;
export type LandCover = (typeof LAND_COVER)[number];

export type PoiKind =
  | "town-large"
  | "town"
  | "town-industrial"
  | "commercial"
  | "mountain"
  | "forest-compounds"
  | "quarry"
  | "hospital"
  | "dam"
  | "cabins"
  | "prison"
  | "military"
  | "industrial"
  | "superstore"
  | "airfield";

export type WorldMeta = {
  version: number;
  world: { size: number; grid: number; spacing: number; heightOffset: number; seaLevel: number };
  cover: { size: number; classes: string[] };
  waterBodies: Array<{
    id: string;
    level: number;
    bounds: [number, number, number, number];
    areaHa: number;
  }>;
  rivers: Array<{ id: string; width: number; points: Array<[number, number]> }>;
  bridges: Array<{
    id: string;
    a: [number, number];
    b: [number, number];
    deck: number;
    width: number;
    /** A dam: the deck is the top of a solid wall down to the ground (no piers). */
    solid?: boolean;
  }>;
  runways: Array<{ a: [number, number]; b: [number, number]; width: number }>;
  /** Flattened summit tops on Iron Peaks for sniper positions, highest first (y = the flat top). */
  perches?: Array<{ x: number; z: number; y: number }>;
  /** Road centrelines read off the concept map (art/br/build_world.py extract_roads). */
  roads: Array<{ width: number; points: Array<[number, number]> }>;
  /**
   * Country dead ends (build_world.py connect_roads): roads that run out in the open, as
   * [x, z, dx, dz] with the unit heading the road had there. The countryside puts a farm or a
   * cabin at each, so a road leads somewhere.
   */
  roadEnds?: Array<[number, number, number, number]>;
  pois: Array<{
    id: string;
    name: string;
    kind: PoiKind;
    x: number;
    z: number;
    radius: number;
    /** Flattened building pad (POIs with buildings only): ground height and radius in metres. */
    padHeight?: number;
    padRadius?: number;
    /**
     * Towns on street grids (read off the concept map): the x of each north-south street and the
     * z of each east-west street (m), every block [column, row, roof density 0..1], street width.
     * The whole grid is on the pad (padHeight).
     */
    town?: { xs: number[]; zs: number[]; blocks: Array<[number, number, number]>; street: number };
  }>;
  stats: { minHeight: number; maxHeight: number; landFraction: number };
};

/** True for points inside the playable square. */
export const inWorld = (x: number, z: number) =>
  Math.abs(x) <= WORLD_HALF && Math.abs(z) <= WORLD_HALF;

/** Map grid reference of a world point, e.g. "E9" (null outside the map). */
export function gridRef(x: number, z: number): string | null {
  if (!inWorld(x, z)) return null;
  const col = Math.min(9, Math.floor((x + WORLD_HALF) / MAP_CELL));
  const row = Math.min(9, Math.floor((z + WORLD_HALF) / MAP_CELL));
  return `${MAP_COLUMNS[col]}${row + 1}`;
}

/** Centre of a map grid cell ("E9" → world x/z), or null for an invalid reference. */
export function cellCentre(ref: string): { x: number; z: number } | null {
  const m = /^([A-J])(10|[1-9])$/.exec(ref.trim().toUpperCase());
  if (!m) return null;
  const col = MAP_COLUMNS.indexOf(m[1]!);
  const row = Number(m[2]) - 1;
  return { x: -WORLD_HALF + (col + 0.5) * MAP_CELL, z: -WORLD_HALF + (row + 0.5) * MAP_CELL };
}

/** World x/z → normalised map UV (0..1, v down), as drawn on the map overlay. */
export const worldToMapUv = (x: number, z: number) => ({
  u: (x + WORLD_HALF) / WORLD_SIZE,
  v: (z + WORLD_HALF) / WORLD_SIZE,
});
export const mapUvToWorld = (u: number, v: number) => ({
  x: u * WORLD_SIZE - WORLD_HALF,
  z: v * WORLD_SIZE - WORLD_HALF,
});
