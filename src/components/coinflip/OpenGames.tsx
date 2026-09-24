import { useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatUsd } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { openRoom, fetchOpenCoinflips, fetchRecentCoinflips, opposite, type CfGameView, type CoinSide } from "@/lib/coinflip/api";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time-ago";

export function SideChip({ side, className }: { side: CoinSide; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wider", side === "HEADS" ? "bg-primary/15 text-primary" : "bg-rival/15 text-rival", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", side === "HEADS" ? "coin-heads" : "coin-tails")} />
      {side}
    </span>
  );
}

export function OpenGames() {
  const { userId, profile } = useAuth();
  const q = useQuery({ queryKey: ["coinflip-open"], queryFn: fetchOpenCoinflips, refetchInterval: 5000 });
  return (
    <section>
      <h2 className="mb-3 font-display text-sm uppercase tracking-widest">Open games</h2>
      {q.isLoading ? (
        <div aria-busy="true" className="animate-pulse rounded-2xl border border-dashed border-border p-8 text-center text-sm text-transparent select-none">
          No open games. Create one and wait for an opponent.
        </div>
      ) : !q.data?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No open games. Create one and wait for an opponent.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data.map((g) => <OpenCard key={g.id} g={g} mine={g.creator_id === userId} canJoin={!!profile} />)}
        </div>
      )}
    </section>
  );
}

function OpenCard({ g, mine, canJoin }: { g: CfGameView; mine: boolean; canJoin: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const key = useRef<string | null>(null);
  const side = g.creator_side as CoinSide;

  async function join() {
    if (pending) return;
    setPending(true);
    key.current ??= crypto.randomUUID();
    const { error } = await supabase.rpc("coinflip_join", { p_game_id: g.id, p_idempotency_key: key.current });
    if (error) {
      setPending(false);
      toast.error(friendlyError(error));
      if (!/fetch|network/i.test(error.message)) key.current = null;
      qc.invalidateQueries({ queryKey: ["coinflip-open"] });
      return;
    }
    qc.invalidateQueries({ queryKey: ["wallet"] });
    await openRoom(qc, router, g.id);
    setPending(false);
    navigate({ to: "/coinflip/$gameId", params: { gameId: String(g.id) } });
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <PlayerAvatar src={g.creator?.avatar_url} name={g.creator?.username} className="h-11 w-11" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">@{g.creator?.username ?? "player"}</div>
        <div className="tabular font-display text-lg">{formatUsd(g.amount)}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <SideChip side={side} /> VS <SideChip side={opposite(side)} />
        </div>
      </div>
      <div className="text-right">
        <div className="tabular text-xs text-muted-foreground">WIN <span className="text-primary">{formatUsd(g.pot_amount - Math.floor((g.pot_amount * g.fee_bps) / 10000))}</span></div>
        {mine ? (
          <Button asChild size="sm" variant="secondary" className="mt-2"><Link to="/coinflip/$gameId" params={{ gameId: String(g.id) }}>Yours</Link></Button>
        ) : canJoin ? (
          <Button size="sm" onClick={join} disabled={pending} className="mt-2 font-display">{pending ? "..." : "JOIN"}</Button>
        ) : (
          <Button asChild size="sm" className="mt-2"><Link to="/auth">Sign in</Link></Button>
        )}
      </div>
    </div>
  );
}

export function RecentCoinflips() {
  const q = useQuery({ queryKey: ["coinflip-recent"], queryFn: () => fetchRecentCoinflips() });
  return (
    <section className="mt-8">
      <h2 className="mb-2 font-display text-xs uppercase tracking-widest">Recent coinflips</h2>
      {!q.data?.length ? (
        <p className="text-sm text-muted-foreground">{q.isLoading ? "Loading..." : "No completed games yet."}</p>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-border bg-card">
          <div className="sticky top-0 z-10 grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] gap-2 border-b border-border bg-card px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground sm:grid-cols-[4.5rem_minmax(0,1fr)_5rem_6rem_5rem]">
            <span>Game</span><span>Players</span><span className="hidden sm:block">Side</span><span className="text-right">Pot</span><span className="hidden text-right sm:block">When</span>
          </div>
          <ul className="divide-y divide-border">
            {q.data.map((g) => {
              const creatorWon = g.winner_id === g.creator_id;
              const name = (p: typeof g.creator, won: boolean) => (
                <span className={cn("flex min-w-0 items-center gap-1.5", !won && "opacity-50")}>
                  <PlayerAvatar src={p?.avatar_url} name={p?.username} className="h-5 w-5 shrink-0" />
                  <span className={cn("truncate", won && "font-semibold")}>{p?.username ?? "unknown"}</span>
                </span>
              );
              return (
                <li key={g.id}>
                  <Link
                    to="/coinflip/$gameId"
                    params={{ gameId: String(g.id) }}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-center gap-2 px-3 py-1.5 text-sm transition hover:bg-secondary/50 sm:grid-cols-[4.5rem_minmax(0,1fr)_5rem_6rem_5rem]"
                  >
                    <span className="tabular text-xs text-muted-foreground">#{g.id}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      {name(g.creator, creatorWon)}
                      <span className="shrink-0 text-[10px] text-muted-foreground">vs</span>
                      {name(g.opponent, !creatorWon)}
                    </span>
                    <span className="hidden sm:block">{g.winning_side && <SideChip side={g.winning_side as CoinSide} />}</span>
                    <span className="tabular text-right font-semibold">{formatUsd(g.pot_amount)}</span>
                    <span className="hidden text-right text-xs text-muted-foreground sm:block">{timeAgo(g.completed_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
