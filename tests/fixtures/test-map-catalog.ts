import { DUSTFRONT } from "../../src/lib/fps/maps/dustfront";
import { TEST_GRID } from "./test-map";

/** Replaces src/lib/fps/maps/catalog.ts in registry tests: Dustfront plus the test map. */
export const MAP_DEFINITIONS = [DUSTFRONT, TEST_GRID] as const;
