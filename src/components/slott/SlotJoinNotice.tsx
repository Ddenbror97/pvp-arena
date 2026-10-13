import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchMySlot, useSlotRealtime } from "@/lib/slott/api";
import { slotJoinAnnouncement } from "@/lib/slott/join-notice";

const TOLD_KEY = "pvp-slot-join-told";

function readTold(): number | null {
  try {
    const n = Number(sessionStorage.getItem(TOLD_KEY));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeTold(id: number) {
  try {
    sessionStorage.setItem(TOLD_KEY, String(id));
  } catch {
    /* private mode */
  }
}

/** Tells the host, wherever they are on the site, that an opponent sat down. */
export function SlotJoinNotice() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useSlotRealtime();
  const mine = useQuery({
    queryKey: ["slot-mine", userId],
    queryFn: () => fetchMySlot(userId!),
    enabled: !!userId,
    refetchInterval: 4000,
  });
  const told = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    if (told.current === undefined) told.current = readTold();
    const g = mine.data;
    const decision = slotJoinAnnouncement({
      game: g ? { id: g.id, status: g.status, creatorId: g.creator_id } : null,
      userId,
      pathname,
      toldId: told.current,
    });
    if (decision.toldId !== told.current && decision.toldId != null) {
      told.current = decision.toldId;
      writeTold(decision.toldId);
    }
    if (!decision.toast || !g) return;
    const name = g.opponent?.username;
    toast("Opponent joined", {
      id: `slot-join-${g.id}`,
      description: name ? `${name} joined your match` : "New player joined",
      duration: 15000,
      action: {
        label: "Play",
        onClick: () =>
          navigate({ to: "/slott/$gameId", params: { gameId: String(g.id) } }),
      },
    });
  }, [mine.data, navigate, pathname, userId]);

  return null;
}
