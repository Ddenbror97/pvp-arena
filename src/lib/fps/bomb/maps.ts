import type { Solid } from "../map";
import type { GameMap } from "../maps/types";
import { IRON_DISTRICT } from "./iron-district";
import { SANDGATE, SANDGATE_SITES, SANDGATE_SPAWNS } from "./sandgate";
import {
  IRON_DISTRICT_BOMBSITES,
  IRON_DISTRICT_CALLOUTS,
  IRON_DISTRICT_FLOORS,
  IRON_DISTRICT_TEAM_SPAWNS,
} from "../iron-district-layout";
import type { Bombsite } from "./rules";

/**
 * The Bomb Defusal map registry. A match carries its `mapId` (drawn by the room when the match is
 * created, like the 1v1 rotation); the room, the bots, the per-recipient snapshot filter and every
 * client resolve the same map from it. Plain data, no Three.js: shared by the browser, the match
 * Worker and tests.
 */
export type BombMapId = "sandgate" | "iron-district";

/** A plant zone: the planter's feet inside the rectangle and, where given, between y0 and y1. */
export type SiteZone = {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  readonly y0?: number;
  readonly y1?: number;
};
/** A team spawn; `y` is the feet height (0 when absent). */
export type TeamSpawn = {
  readonly x: number;
  readonly y?: number;
  readonly z: number;
  readonly yaw: number;
};

export type BombMap = {
  readonly id: BombMapId;
  readonly name: string;
  /** In the random 5v5 rotation (a new match draws uniformly among these). */
  readonly rotation: boolean;
  readonly map: GameMap;
  readonly sites: Readonly<Record<Bombsite, SiteZone>>;
  readonly spawns: {
    readonly police: readonly TeamSpawn[];
    readonly terrorist: readonly TeamSpawn[];
  };
  /** Named places for the minimap (name, x, z, feet height). */
  readonly callouts: ReadonlyArray<readonly [string, number, number, number]>;
  /**
   * Multi-level maps: the walkable floors (x0, x1, z0, z1, height) the minimap draws instead of the
   * ground footprints of the solids (which would cover every terrace).
   */
  readonly floors?: ReadonlyArray<readonly [number, number, number, number, number]>;
};

const SANDGATE_BOMB: BombMap = {
  id: "sandgate",
  name: "Sandgate",
  rotation: true,
  map: SANDGATE,
  sites: SANDGATE_SITES,
  spawns: SANDGATE_SPAWNS,
  callouts: [],
};
const IRON_DISTRICT_BOMB: BombMap = {
  id: "iron-district",
  name: "Iron District",
  rotation: true,
  map: IRON_DISTRICT,
  sites: IRON_DISTRICT_BOMBSITES,
  spawns: IRON_DISTRICT_TEAM_SPAWNS,
  callouts: IRON_DISTRICT_CALLOUTS,
  floors: IRON_DISTRICT_FLOORS,
};

export const BOMB_MAPS: Readonly<Record<BombMapId, BombMap>> = {
  sandgate: SANDGATE_BOMB,
  "iron-district": IRON_DISTRICT_BOMB,
};
export const BOMB_MAP_IDS = Object.keys(BOMB_MAPS) as BombMapId[];
export const BOMB_ROTATION: readonly BombMapId[] = BOMB_MAP_IDS.filter(
  (id) => BOMB_MAPS[id].rotation,
);
if (!BOMB_ROTATION.length) throw new Error("The 5v5 map rotation is empty");

export const isBombMapId = (value: unknown): value is BombMapId =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(BOMB_MAPS, value);

/**
 * Draw a rotation map uniformly. `random` returns [0, 1); the room passes a crypto-backed source.
 * Only the room draws: clients learn the map from the match (welcome and every snapshot).
 */
export function pickBombMap(random: () => number = Math.random): BombMapId {
  const i = Math.floor(random() * BOMB_ROTATION.length);
  return BOMB_ROTATION[Math.min(BOMB_ROTATION.length - 1, Math.max(0, i))]!;
}

/**
 * The map of a match. A missing id (matches created before the registry) is Sandgate; an unknown
 * id is an error, never a silent fallback (a client must never simulate another map than the room).
 */
export function bombMap(id?: string | null): BombMap {
  if (id === undefined || id === null) return SANDGATE_BOMB;
  if (!isBombMapId(id)) throw new Error(`UNKNOWN_BOMB_MAP:${id}`);
  return BOMB_MAPS[id];
}
export const bombMapOf = (state: { mapId?: string | null }) => bombMap(state.mapId);
/** The compiled collision map of a match. */
export const gameMapOf = (state: { mapId?: string | null }) => bombMap(state.mapId).map;

/** Feet height of a spawn. */
export const spawnY = (s: TeamSpawn) => s.y ?? 0;

/** The bombsite whose plant zone holds feet at (x, y, z), if any. */
export function bombsiteIn(m: BombMap, x: number, y: number, z: number): Bombsite | null {
  for (const site of ["A", "B"] as const) {
    const r = m.sites[site];
    if (
      x >= r.x0 &&
      x <= r.x1 &&
      z >= r.z0 &&
      z <= r.z1 &&
      (r.y0 === undefined || y >= r.y0) &&
      (r.y1 === undefined || y <= r.y1)
    )
      return site;
  }
  return null;
}

/** Ground footprints for the minimap: solids that reach the floor band of some walkable level. */
export function minimapSolids(m: BombMap): readonly Solid[] {
  return [...m.map.boxes, ...m.map.walls].filter((b) => b.h >= 0.6 && b.y - b.h / 2 < 2.2);
}
