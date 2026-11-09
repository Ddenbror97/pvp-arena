import { useAuth } from "@/lib/auth";
import { canPlayBattleRoyale } from "./access";

/** Whether this player may open the Battle Royale: signed in (public since 2026-11-09). */
export function useBrAccess() {
  const { ready, userId } = useAuth();
  return {
    isPending: !ready,
    isError: false,
    data: ready ? canPlayBattleRoyale(userId) : undefined,
  };
}
