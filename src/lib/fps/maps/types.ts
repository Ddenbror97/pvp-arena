import type { Solid, Surface } from "../map";

/** Plain-data map definition. Shared by the browser, the match Worker and tests (no Three.js). */
export type MapSpawn = { readonly x: number; readonly z: number; readonly yaw: number };
export type MapPoint = { readonly x: number; readonly z: number };
export type BotOpening = "center" | "north" | "south";

/**
 * Practice-bot patrol for a bot spawning on the east (+x) side. The bot mirrors every point in x
 * when it spawns west. A round's itinerary is `openings[opening]`, then `sweep` (the enemy spawn),
 * then the flank opposite the opening (`flanks.north` after a south opening, `flanks.south`
 * otherwise), then `regroup`. Points are on the ground and reachable on the map's ground grid.
 */
export type BotRoutes = {
  readonly openings: Readonly<Record<BotOpening, readonly MapPoint[]>>;
  readonly sweep: readonly MapPoint[];
  readonly flanks: Readonly<{ north: readonly MapPoint[]; south: readonly MapPoint[] }>;
  readonly regroup: readonly MapPoint[];
};

/** World lighting and atmosphere (colours are 0xRRGGBB). */
export type MapLighting = {
  readonly background: number;
  readonly fog: { readonly color: number; readonly near: number; readonly far: number };
  readonly hemisphere: {
    readonly sky: number;
    readonly ground: number;
    readonly intensity: number;
  };
  readonly sun: {
    readonly color: number;
    readonly intensity: number;
    readonly position: readonly [number, number, number];
  };
  readonly environmentIntensity: number;
  readonly exposure: number;
};

/** Browser-only presentation data; gameplay never reads it. */
export type MapPresentation = {
  /** Blender-built render scene (meshopt GLB) that dresses exactly the gameplay solids. */
  readonly modelUrl: string;
  readonly lighting: MapLighting;
  /** Gradient sky dome colours. */
  readonly sky: { readonly zenith: number; readonly horizon: number; readonly haze: number };
  /** Static sun shadow frustum: half extent around the origin and far plane (metres). */
  readonly shadow: { readonly extent: number; readonly far: number; readonly mapSize: number };
  /** World camera far plane (metres). */
  readonly viewDistance: number;
  /** Blockout tint per surface, shown before the GLB is ready (and if it fails to load). */
  readonly blockout: Readonly<Record<Surface, number>> & { readonly floor: number };
};

export type MapDefinition = {
  /** Stable identifier carried by match configs and snapshots. Never rename a shipped id. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** Movement rectangle centred on the origin (metres). */
  readonly arena: { readonly width: number; readonly depth: number };
  /** Block movement and bullets. */
  readonly boxes: readonly Solid[];
  /** Bullets only (e.g. arch lintels above head height). */
  readonly structures: readonly Solid[];
  /** Bullet-only perimeter walls. */
  readonly walls: readonly Solid[];
  /** Movement only (organic edges, gorges, impassable undergrowth); bullets and sight pass. */
  readonly barriers: readonly Solid[];
  /** Ground impact/footstep material (default "concrete"). */
  readonly floorSurface?: Surface;
  /** Seat spawns before halftime (the sides swap afterwards). */
  readonly spawns: { readonly A: MapSpawn; readonly B: MapSpawn };
  readonly bot: BotRoutes;
  readonly presentation: MapPresentation;
};

export type SolidBounds = {
  readonly b: Solid;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
};

/** A definition plus the derived collision sets every engine system uses. */
export type GameMap = MapDefinition & {
  readonly floor: Solid;
  /** Bullet and sight-line solids, in tracing order: boxes, walls, structures, floor. */
  readonly worldSolids: readonly Solid[];
  /** Movement solids: boxes then barriers. */
  readonly movementSolids: readonly Solid[];
  /** `worldSolids` with precomputed bounds (visibility prefilter). */
  readonly worldBounds: readonly SolidBounds[];
};
