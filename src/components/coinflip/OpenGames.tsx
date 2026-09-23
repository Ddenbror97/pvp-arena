import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatUsd } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { fetchOpenCoinflips, fetchRecentCoinflips, opposite, type CfGameView, type CoinSide } from "@/lib/coinflip/api";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <p className="text-sm text-muted-foreground">Loading...</p>
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
  const [pending, setPending] = useState(false);
  const key = useRef<string | null>(null);
  const side = g.creator_side as CoinSide;

  async function join() {
    if (pending) return;
    setPending(true);
    key.current ??= crypto.randomUUID();
    const { error } = await supabase.rpc("coinflip_join", { p_game_id: g.id, p_idempotency_key: key.current });
    setPending(false);
    if (error) {
      toast.error(friendlyError(error));
      if (!/fetch|network/i.test(error.message)) key.current = null;
      qc.invalidateQueries({ queryKey: ["coinflip-open"] });
      return;
    }
    qc.invalidateQueries({ queryKey: ["wallet"] });
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
    <section className="mt-12">
      <h2 className="mb-4 font-display text-sm uppercase tracking-widest">Recent coinflips</h2>
      {!q.data?.length ? (
        <p className="text-sm text-muted-foreground">{q.isLoading ? "Loading..." : "No completed games yet."}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {q.data.map((g) => {
            const w = g.winner_id === g.creator_id ? g.creator : g.opponent;
            return (
              <Link key={g.id} to="/coinflip/$gameId" params={{ gameId: String(g.id) }} className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="tabular">Coinflip #{g.id}</span>
                  {g.winning_side && <SideChip side={g.winning_side as CoinSide} />}
                </div>
                <div className="tabular mt-2 text-xl font-semibold">{formatUsd(g.pot_amount)}</div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <PlayerAvatar src={w?.avatar_url} name={w?.username} className="h-6 w-6" />
                  <span className="truncate">@{w?.username ?? "unknown"} won</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
