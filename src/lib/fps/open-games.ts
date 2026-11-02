import type { DuelLobbyData } from "./quote";

export type OpenGame = DuelLobbyData["open"][number];
/** The lobby RPC returns the latest twenty rooms, not the full site inventory. */
export const OPEN_GAME_LIMIT = 20;
export const OPEN_GAME_PAGE_SIZE = 5;
export const LOBBY_FRESH_MS = 30_000;

export function openGames(data: DuelLobbyData | undefined, now: number): OpenGame[] {
  if (!data?.enabled || !data.cash_enabled) return [];
  const seen = new Set<string>();
  return data.open.slice(0, OPEN_GAME_LIMIT).filter((room) => {
    if (
      seen.has(room.id) ||
      room.status !== "WAITING" ||
      room.opponent_id ||
      room.private ||
      !Number.isSafeInteger(room.stake) ||
      room.stake <= 0 ||
      room.stake > 5000 ||
      !data.stakes.includes(room.stake) ||
      ![5, 9, 13].includes(room.best_of) ||
      !(Date.parse(room.expires_at) > now)
    )
      return false;
    seen.add(room.id);
    return true;
  });
}

/** A reviewed quote must never silently become another room or different terms. */
export function sameRoomTerms(reviewed: OpenGame, current: OpenGame) {
  return (
    reviewed.id === current.id &&
    reviewed.creator_id === current.creator_id &&
    reviewed.stake === current.stake &&
    reviewed.best_of === current.best_of &&
    reviewed.expires_at === current.expires_at
  );
}

/** Empty/error states back off; visible rooms remain responsive. Query defaults pause hidden tabs. */
export function lobbyPollMs(hasRooms: boolean, failed: boolean) {
  return hasRooms && !failed ? 5_000 : 15_000;
}
