/**
 * Map ids on their own, without any map's geometry. Code in the script every page loads (the
 * queue notice in the page shell, the duel server functions, the loading art that route heads
 * preload) needs only these strings; taking them from registry.ts pulled every map's layout
 * into that script and compiled the maps on every page.
 *
 * tests/page-shell-weight.test.ts fails if this list is not exactly the registry's rotation:
 * adding a map to the rotation means adding its id here.
 */
export const DEFAULT_MAP_KEY = "dustfront";
export const ROTATION_MAP_KEYS = [
  "dustfront",
  "frostline",
  "lost-trail",
  "crossfire",
  "suburbia",
] as const;
