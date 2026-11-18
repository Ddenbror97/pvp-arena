/** Keep the guide renderer and its publishing audit on the same real routes. Public routes only:
 * sign-in pages (/wallet, /profile, /prestige) redirect a signed-out reader to /auth. */
export const GUIDE_SITE_PATHS = [
  "/",
  "/coinflip",
  "/roulette",
  "/slott",
  "/poker",
  "/8-ball-pool",
  "/fps-1v1",
  "/fps-duel",
  "/fps-bomb",
  "/fps-br",
  "/fps-graphics-guide",
  "/fairness",
  "/about",
  "/how-it-works",
  "/terms",
  "/privacy",
  "/responsible-gambling",
  "/guides",
  "/auth",
] as const;
export type GuideSitePath = (typeof GUIDE_SITE_PATHS)[number];
