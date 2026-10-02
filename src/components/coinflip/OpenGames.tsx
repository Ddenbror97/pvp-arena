import { useRef, useState } from "react";
import { Link, getRouteApi, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatUsd } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { openRoom, fetchLiveCoinflips, fetchOpenCoinflips, fetchRecentCoinflips, opposite, type CfGameView, type CoinSide } from "@/lib/coinflip/api";
import { coinLandingTime } from "@/lib/coinflip/coin-motion";
import { useNow, useServerClock } from "@/lib/jackpot/api";
import { Coin } from "./Coin";
import { coinHeads as headsAsset, coinTails as tailsAsset } from "@/assets/media";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time-ago";
import { EDGE_TO_EDGE, RecentPager, usePagedRecent } from "@/components/recent/usePagedRecent";

export function SideChip({ side, className }: { side: CoinSide; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wider", side === "HEADS" ? "bg-coin-heads/15 text-coin-heads" : "bg-coin-tails/15 text-coin-tails", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", side === "HEADS" ? "coin-heads" : "coin-tails")} />
      {side}
    </span>
  );
}

export function OpenGames() {
  const { userId, profile } = useAuth();
  const q = useQuery({ queryKey: ["coinflip-open"], queryFn: fetchOpenCoinflips, refetchInterval: 5000 });
  const live = useQuery({ queryKey: ["coinflip-live"], queryFn: fetchLiveCoinflips, refetchInterval: 1500 });
  const waiting = q.data ?? [];
  const playing = live.data ?? [];
  const listsPending = q.isPending || live.isPending;
  const empty = !listsPending && waiting.length === 0 && playing.length === 0;
  return (
    <section className="min-w-0">
      <h2 className="mb-3 font-display text-sm uppercase tracking-widest">
        Open games{waiting.length > 0 ? <span className="tabular text-muted-foreground"> · {waiting.length}</span> : null}
      </h2>
      {listsPending ? (
        <div aria-busy="true" className="grid min-h-[5.5rem] animate-pulse grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-border" />
          <div className="hidden rounded-2xl border border-dashed border-border sm:block" />
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-7 text-center text-muted-foreground">
          <p className="text-sm text-foreground/80">No open games</p>
          <p className="mt-1 text-xs">Create one and wait for an opponent.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {playing.map((g) => <LiveCard key={g.id} g={g} />)}
          {waiting.map((g) => <OpenCard key={g.id} g={g} mine={g.creator_id === userId} canJoin={!!profile} />)}
        </div>
      )}
    </section>
  );
}

function LiveCard({ g }: { g: CfGameView }) {
  return (
    <Link
      to="/coinflip/$gameId"
      params={{ gameId: String(g.id) }}
      className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-primary/40 bg-card p-3 transition hover:border-primary sm:gap-4 sm:p-4"
    >
      <LiveCoin g={g} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <span className="truncate">{g.creator?.username ?? "player"}</span>
          <span className="shrink-0 text-[10px] font-normal text-muted-foreground">vs</span>
          <span className="truncate">{g.opponent?.username ?? "player"}</span>
        </div>
        <div className="tabular truncate font-display text-base sm:text-lg">{formatUsd(g.pot_amount)}</div>
        <LiveLabel g={g} />
      </div>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Watch</span>
    </Link>
  );
}

function LiveLabel({ g }: { g: CfGameView }) {
  const serverNow = useServerClock();
  useNow(500);
  const now = serverNow();
  const start = g.animation_start_at ? new Date(g.animation_start_at).getTime() : null;
  const text = start != null && now < start ? "Starting" : "Flipping";
  return <p suppressHydrationWarning className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">{text}</p>;
}

function LiveCoin({ g }: { g: CfGameView }) {
  const serverNow = useServerClock();
  useNow(200);
  const now = serverNow();
  const start = g.animation_start_at ? new Date(g.animation_start_at).getTime() : null;
  const seen = useRef<{ sawHidden: boolean; revealAt: number | null }>({ sawHidden: false, revealAt: null });
  if (!g.winning_side) seen.current.sawHidden = true;
  else if (seen.current.sawHidden && seen.current.revealAt == null) seen.current.revealAt = now;
  const side = (g.winning_side as CoinSide | null) ?? null;
  const landAt = start != null ? coinLandingTime({ start, side, revealAt: seen.current.revealAt }) : null;
  const flipping = start != null && now >= start && now < (landAt ?? Infinity);
  const rest = (side ?? g.creator_side) as CoinSide;
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center">
      {flipping ? (
        <Coin startMs={start} side={side} revealAt={seen.current.revealAt} serverNow={serverNow} size={40} embedded />
      ) : (
        <SideCoinImg side={rest} className="h-10 w-10" />
      )}
    </div>
  );
}

function OpenCard({ g, mine, canJoin }: { g: CfGameView; mine: boolean; canJoin: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const key = useRef<string | null>(null);
  const joining = useRef(false);
  const side = g.creator_side as CoinSide;

  async function join() {
    if (pending || joining.current) return;
    joining.current = true;
    setPending(true);
    try {
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
    } finally {
      joining.current = false;
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-border bg-card p-3 sm:gap-4 sm:p-4">
      <SideCoinImg side={side} className="h-10 w-10 sm:h-11 sm:w-11" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{g.creator?.username ?? "player"}</div>
        <div className="tabular truncate font-display text-base sm:text-lg">{formatUsd(g.amount)}</div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <SideChip side={side} /> VS <SideChip side={opposite(side)} />
        </div>
      </div>
      <div className="shrink-0">
        {mine ? (
          <Button asChild size="sm" variant="secondary" className="min-h-11"><Link to="/coinflip/$gameId" params={{ gameId: String(g.id) }}>Open</Link></Button>
        ) : canJoin ? (
          <Button size="sm" onClick={join} disabled={pending} className="min-h-11 font-display">{pending ? "..." : "JOIN"}</Button>
        ) : (
          <Button asChild size="sm" className="min-h-11"><Link to="/auth">Sign in</Link></Button>
        )}
      </div>
    </div>
  );
}

export function RecentCoinflips() {
  const paintedAt = getRouteApi("/coinflip").useLoaderData().recent?.at;
  const { rows, isLoading, page, hasNext, hasPrev, next, prev, pauseProps } =
    usePagedRecent("coinflip-recent", fetchRecentCoinflips);
  return (
    <section className={EDGE_TO_EDGE} {...pauseProps}>
      <h2 className="section-kicker mb-2 font-display text-xs uppercase tracking-widest">Recent coinflips</h2>
      {!rows.length ? (
        <p className="text-sm text-muted-foreground">{isLoading ? "Loading..." : "No completed games yet."}</p>
      ) : (
        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] gap-2 border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground sm:grid-cols-[4.5rem_minmax(0,1fr)_5rem_6rem_5rem]">
            <span>Game</span><span>Players</span><span className="hidden sm:block">Side</span><span className="text-right">Pot</span><span className="hidden text-right sm:block">When</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((g) => {
              const creatorWon = g.winner_id === g.creator_id;
              const name = (p: typeof g.creator, won: boolean, s: CoinSide) => (
                <span className={cn("flex min-w-0 items-center gap-1.5", !won && "opacity-50")}>
                  <SideCoinImg side={s} className="h-5 w-5" />
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
                      {name(g.creator, creatorWon, g.creator_side as CoinSide)}
                      <span className="shrink-0 text-[10px] text-muted-foreground">vs</span>
                      {name(g.opponent, !creatorWon, opposite(g.creator_side as CoinSide))}
                    </span>
                    <span className="hidden sm:block">{g.winning_side && <SideChip side={g.winning_side as CoinSide} />}</span>
                    <span className="tabular text-right font-semibold">{formatUsd(g.pot_amount)}</span>
                    <span suppressHydrationWarning className="hidden text-right text-xs text-muted-foreground sm:block">{timeAgo(g.completed_at, paintedAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <RecentPager page={page} hasPrev={hasPrev} hasNext={hasNext} onPrev={prev} onNext={next} />
        </div>
      )}
    </section>
  );
}

function SideCoinImg({ side, className }: { side: CoinSide; className?: string }) {
  return (
    <img
      src={side === "HEADS" ? headsAsset : tailsAsset}
      alt={side === "HEADS" ? "Heads" : "Tails"}
      width={44}
      height={44}
      draggable={false}
      className={cn("shrink-0 rounded-full object-cover select-none", className)}
    />
  );
}
