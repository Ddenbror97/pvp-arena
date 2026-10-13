import type { QueryClient } from "@tanstack/react-query";
import {
  leaderboardCall,
  PUBLIC_BOARD_PAGE,
  type PublicBoard,
  type PublicListRow,
} from "@/lib/leaderboard/api";

const PAINT_BUDGET_MS = 700;

function cap<T>(promise: Promise<T>, deadline: number): Promise<T | undefined> {
  const ms = deadline - Date.now();
  if (ms <= 0) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (data) => {
        clearTimeout(timer);
        resolve(data);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}

/** Read-only. The page ticks after it is on screen; a document render must not write. */
export async function loadPublicListPaint(): Promise<PublicListRow[] | null> {
  if (typeof window !== "undefined") return null;
  const data = await cap(
    leaderboardCall<PublicListRow[]>("leaderboard_public_list"),
    Date.now() + PAINT_BUDGET_MS,
  );
  return data ?? null;
}

export async function loadPublicBoardPaint(campaignId: string): Promise<PublicBoard | null> {
  if (typeof window !== "undefined") return null;
  const data = await cap(
    leaderboardCall<PublicBoard>("leaderboard_public_board", {
      p_campaign: campaignId,
      p_limit: PUBLIC_BOARD_PAGE,
      p_offset: 0,
    }),
    Date.now() + PAINT_BUDGET_MS,
  );
  return data ?? null;
}

export function prefetchPublicList(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: ["leaderboard-public-list"],
    queryFn: () => leaderboardCall<PublicListRow[]>("leaderboard_public_list"),
  });
}

export function prefetchPublicBoard(qc: QueryClient, campaignId: string) {
  void qc.prefetchQuery({
    queryKey: ["leaderboard-board", campaignId, 0],
    queryFn: () =>
      leaderboardCall<PublicBoard>("leaderboard_public_board", {
        p_campaign: campaignId,
        p_limit: PUBLIC_BOARD_PAGE,
        p_offset: 0,
      }),
  });
}
