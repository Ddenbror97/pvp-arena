import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";
import { indexableHead } from "./indexable-head";

export const FPS_LOBBY_TITLE = "Free Browser FPS Game – 1v1, 5v5 & Battle Royale | PvPStrike";
export const FPS_LOBBY_DESCRIPTION =
  "Play PvPStrike, a free browser FPS featuring an action-packed Battle Royale with a massive island, plus 1v1 duels and 5v5 Bomb Defusal. No download needed.";

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
