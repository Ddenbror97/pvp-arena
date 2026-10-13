import { createServerFn } from "@tanstack/react-start";

/**
 * Kept so a tab that still posts the old nudge URL gets an empty success.
 * Settlement is the one-second worker. This handler does not open a database call.
 */
export const nudgeRouletteRound = createServerFn({ method: "POST" }).handler(async () => {
  return { ok: true as const };
});
