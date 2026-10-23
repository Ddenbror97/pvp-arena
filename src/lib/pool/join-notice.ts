export type PoolJoinSnap = {
  id: number;
  status: string;
  creatorId: string;
};

function pathOf(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * The host is waiting somewhere else when an opponent sits down.
 * The lobby already walks them into the match, and the match page itself
 * needs no prompt. Everywhere else, tell them once per game.
 */
export function poolJoinAnnouncement(input: {
  game: PoolJoinSnap | null;
  userId: string | null;
  pathname: string;
  toldId: number | null;
}): { toast: boolean; toldId: number | null } {
  const { game, userId, toldId } = input;
  if (!game || !userId || game.creatorId !== userId) return { toast: false, toldId };
  if (game.status !== "STARTING" && game.status !== "PLAYING") return { toast: false, toldId };
  const path = pathOf(input.pathname);
  const here = path === "/8-ball-pool" || path === `/pool/${game.id}`;
  if (here || toldId === game.id) return { toast: false, toldId: game.id };
  return { toast: true, toldId: game.id };
}
