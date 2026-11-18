import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";
import { indexableHead } from "./indexable-head";

export const FPS_LOBBY_TITLE = "FPS Duel: 1v1, 5v5 & Battle Royale | PVPspinArena";
export const FPS_LOBBY_DESCRIPTION =
  "Play PvPStrike browser FPS: 1v1 duels, 5v5 Bomb Defusal and Project Island Battle Royale. Practise free or enter cash 1v1 duels. No download needed.";

/** Complete metadata for the sole public FPS lobby at /. */
export function fpsLobbyHead() {
  return indexableHead({
    path: "/",
    title: FPS_LOBBY_TITLE,
    description: FPS_LOBBY_DESCRIPTION,
    site: true,
    extraLinks: [
      {
        rel: "preload",
        as: "image",
        href: STRIKE_SHOWCASE,
        type: "image/webp",
        fetchPriority: "high",
      },
    ],
  });
}
