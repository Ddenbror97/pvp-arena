import { createServerFn } from "@tanstack/react-start";
import { snapshotView, type GameSnapshotView, type SnapshotGame } from "./snapshot";

const GAMES: readonly SnapshotGame[] = ["coinflip", "jackpot", "roulette"];

/** Cached public activity for one game. Never throws; null means render the guide without it. */
export const getGameSnapshot = createServerFn({ method: "GET" })
  .inputValidator((game: unknown): SnapshotGame => {
    if (typeof game !== "string" || !GAMES.includes(game as SnapshotGame))
      throw new Error("UNKNOWN_GAME");
    return game as SnapshotGame;
  })
  .handler(async ({ data: game }): Promise<GameSnapshotView | null> => {
    try {
      const { loadGameSnapshot } = await import("./snapshot.server");
      return snapshotView(await loadGameSnapshot(), game);
    } catch {
      return null;
    }
  });
