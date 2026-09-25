import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd } from "@/lib/jackpot/math";

type DepositRow = {
  id: string;
  status: string;
  usd_cents: number;
  asset_key: string;
};

/**
 * Live deposit feedback. Deposits are credited by the server-side watcher once
 * the block is confirmed by both providers, which takes up to ~90s. Without
 * feedback the balance looks unchanged in that window, so surface the deposit
 * as soon as it is seen on chain and refresh the balance the moment it lands.
 *
 * Purely presentational: it never decides amounts or crediting.
 */
export function useDepositNotifications(userId: string | null) {
  const qc = useQueryClient();
  // Only announce each (deposit, status) pair once per session.
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;
    const announce = (row: DepositRow) => {
      const key = `${row.id}:${row.status}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      const amount = formatUsd(Number(row.usd_cents ?? 0));
      if (row.status === "DETECTED") {
        toast.info(`${amount} ${row.asset_key} deposit seen on Base — confirming…`, { id: row.id, duration: 8000 });
      } else if (row.status === "CONFIRMED") {
        toast.info(`${amount} deposit confirmed — crediting…`, { id: row.id, duration: 8000 });
      } else if (row.status === "CREDITED") {
        toast.success(`${amount} added to your balance`, { id: row.id, duration: 8000 });
      } else if (row.status === "UNMATCHED" || row.status === "REJECTED") {
        toast.warning(`${amount} deposit needs review — support will follow up`, { id: row.id, duration: 10000 });
      }
      // Any status change may move money, so refresh balance and activity.
      qc.invalidateQueries({ queryKey: ["wallet", userId] });
      qc.invalidateQueries({ queryKey: ["crypto-activity"] });
    };

    const ch = supabase
      .channel(`deposits-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crypto_deposits", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as DepositRow | null;
          if (row?.id && row.status) announce(row);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);
}
