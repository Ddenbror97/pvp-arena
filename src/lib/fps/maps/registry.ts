import type { Solid } from "../map";
import { MAP_DEFINITIONS } from "./catalog";
import type { GameMap, MapDefinition } from "./types";

export type {
  BotOpening,
  BotRoutes,
  GameMap,
  MapDefinition,
  MapLighting,
  MapPoint,
  MapPresentation,
  MapSpawn,
} from "./types";

/**
 * The shared map registry. To add a map: write its definition next to dustfront.ts (generated
 * gameplay solids + presentation data), then add it to catalog.ts. The match config's `map_id`
 * selects it; the authoritative match state carries it to the server simulation, the bot, the
 * redaction/visibility checks and every client, so all of them resolve the same map.
 */
const DEFINITIONS: readonly MapDefinition[] = MAP_DEFINITIONS;

export type MapId = (typeof MAP_DEFINITIONS)[number]["id"];
/** Matches created without a map (all checkpoints before the registry) play Dustfront. */
export const DEFAULT_MAP_ID: MapId = "dustfront";

const bounds = (b: Solid) => ({
  b,
  minX: b.x - b.w / 2,
  maxX: b.x + b.w / 2,
  minY: b.y - b.h / 2,
  maxY: b.y + b.h / 2,
  minZ: b.z - b.d / 2,
  maxZ: b.z + b.d / 2,
});

/** Derive the collision sets once per map (module load), never per tick. */
export function compileMap(definition: MapDefinition): GameMap {
  const floor: Solid = {
    id: "floor",
    x: 0,
    y: -0.2,
    z: 0,
    w: definition.arena.width,
    h: 0.4,
    d: definition.arena.depth,
    surface: definition.floorSurface ?? "concrete",
  };
  const worldSolids = Object.freeze([
    ...definition.boxes,
    ...definition.walls,
    ...definition.structures,
    floor,
  ]);
  return Object.freeze({
    ...definition,
    floor,
    worldSolids,
    movementSolids: Object.freeze([...definition.boxes, ...definition.barriers]),
    worldBounds: Object.freeze(worldSolids.map(bounds)),
  });
}

const MAPS: ReadonlyMap<string, GameMap> = new Map(
  DEFINITIONS.map((definition) => [definition.id, compileMap(definition)]),
);
if (MAPS.size !== DEFINITIONS.length) throw new Error("Duplicate map id in the registry");

export const MAP_IDS: readonly MapId[] = DEFINITIONS.map((d) => d.id as MapId);
export const isMapId = (value: unknown): value is MapId =>
  typeof value === "string" && MAPS.has(value);
/** The compiled default map (Dustfront). */
export const DEFAULT_MAP: GameMap = MAPS.get(DEFAULT_MAP_ID)!;

/**
 * Resolve a map id. A missing id (legacy match state or config) is Dustfront; an unknown id is
 * an error, never a silent fallback, so a client or server can never simulate a different map
 * from the one the match was created with.
 */
export function getMap(id?: string | null): GameMap {
  if (id === undefined || id === null) return DEFAULT_MAP;
  const map = MAPS.get(id);
  if (!map) throw new Error(`UNKNOWN_MAP:${id}`);
  return map;
}
/** The map of a match (its authoritative `mapId`). */
export const mapOf = (state: { mapId?: string | null }) => getMap(state.mapId);
export const listMaps = (): readonly GameMap[] => [...MAPS.values()];
