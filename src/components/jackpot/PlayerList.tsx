import { useMemo } from "react";
import type { PlayerRow } from "@/lib/jackpot/api";
import { formatChance, formatUsd } from "@/lib/jackpot/math";
import { PlayerAvatar } from "./Avatar";
import { colorFor } from "./JackpotWheel";
import { cn } from "@/lib/utils";

export function PlayerList({ players, pot, meId, winnerId }: { players: PlayerRow[]; pot: number; meId: string | null; winnerId?: string | null | undefined }) {
  // Colors follow wheel order (join order); list is sorted by stake.
  const colorIdx = useMemo(() => new Map(players.map((p, i) => [p.user_id, i])), [players]);
  const sorted = useMemo(() => [...players].sort((a, b) => b.total_amount - a.total_amount || a.first_entry_at.localeCompare(b.first_entry_at)), [players]);

  if (!players.length) {
    return <p className="px-3 py-8 text-center text-sm text-muted-foreground">No players yet. Be the first in.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {sorted.map((p) => {
        const color = colorFor(colorIdx.get(p.user_id) ?? 0);
        const isMe = p.user_id === meId;
        return (
          <li
            key={p.user_id}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 transition-colors animate-rise-in",
              isMe && "bg-primary/5",
              winnerId === p.user_id && "bg-gold/10",
            )}
          >
            <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: color }} />
            <PlayerAvatar src={p.profiles?.avatar_url} name={p.profiles?.username} className="h-7 w-7 shrink-0" color={color} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">{p.profiles?.username ?? "player"}</span>
                {isMe && <span className="rounded bg-primary/15 px-1.5 text-[10px] font-bold uppercase text-primary">you</span>}
              </div>
            </div>
            <div className="shrink-0 text-right leading-tight">
              <div className="tabular text-sm font-semibold">{formatUsd(p.total_amount)}</div>
              <div className="tabular text-xs" style={{ color }}>
                {formatChance(p.total_amount, pot)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
