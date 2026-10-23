import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyPool } from "@/lib/pool/api";
import { poolJoinAnnouncement } from "@/lib/pool/join-notice";

const TOLD_KEY = "pvp-pool-join-told";

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

function PoolLive({ userId }: { userId: string }) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`pool-mine-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pool_matches",
          filter: `creator_id=eq.${userId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["pool-mine", userId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, userId]);
  return null;
}

/**
 * Tells the host, wherever they are on the site, that an opponent sat down.
 * Mounted for every signed-in visitor. It only polls fast, and only subscribes,
 * while that visitor is hosting a table that is still waiting.
 */
export function PoolJoinNotice() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mine = useQuery({
    queryKey: ["pool-mine", userId],
    queryFn: () => fetchMyPool(userId!),
    enabled: !!userId,
    refetchInterval: (q) =>
      q.state.data?.status === "WAITING" && q.state.data.creator_id === userId ? 4_000 : 20_000,
  });
  const hosting = mine.data?.status === "WAITING" && mine.data.creator_id === userId;
  const told = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    if (told.current === undefined) told.current = readTold();
    const g = mine.data;
    const decision = poolJoinAnnouncement({
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
      id: `pool-join-${g.id}`,
      description: name ? `${name} joined your match` : "New player joined",
      duration: 15000,
      action: {
        label: "Play",
        onClick: () => navigate({ to: "/pool/$matchId", params: { matchId: String(g.id) } }),
      },
    });
  }, [mine.data, navigate, pathname, userId]);

  return hosting && userId ? <PoolLive userId={userId} /> : null;
}
