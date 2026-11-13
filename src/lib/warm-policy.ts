/**
 * How much the idle warm-up (router.tsx) fetches ahead of a click, by the page the visitor is on.
 *
 * - "all": lobby and account pages. Route code, lobby data and game art, so the next game opens
 *   filled in.
 * - "code": reading pages (guides, legal, about, fairness). Only the route code. A reader who
 *   never opens a game does not download game art or run the lobby reads; hovering or touching
 *   a game link in the header fetches that game's data and art (SiteHeader).
 * - "none": inside a match or at a table. Nothing may compete with the game for the network or
 *   the main thread, and the header is hidden there.
 */
export type WarmScope = "all" | "code" | "none";

const IN_MATCH = [
  /^\/fps\/[^/]+\/?$/,
  /^\/fps-(bomb|br)\/?$/,
  /^\/poker\/[^/]+\/?$/,
  /^\/pool\/[^/]+\/?$/,
];

const READING =
  /^\/(guides|terms|privacy|responsible-gambling|editorial|about|how-it-works|fairness|fps-graphics-guide|fps-1v1)(\/|$)/;

export function warmScope(pathname: string): WarmScope {
  if (IN_MATCH.some((route) => route.test(pathname))) return "none";
  if (READING.test(pathname)) return "code";
  return "all";
}
