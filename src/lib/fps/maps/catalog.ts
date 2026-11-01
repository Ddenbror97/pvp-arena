import { DUSTFRONT } from "./dustfront";
import { LOST_TRAIL } from "./lost-trail";
import type { MapDefinition } from "./types";

/**
 * Every map the game can play. Adding a map is one import and one entry here (its definition
 * lives next to dustfront.ts). Order is display order. Ids are permanent: they are stored in
 * match configs and checkpoints.
 */
export const MAP_DEFINITIONS = [DUSTFRONT, LOST_TRAIL] as const satisfies readonly MapDefinition[];
