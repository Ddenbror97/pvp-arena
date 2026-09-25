import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  tickJackpot,
  useLiveJackpot,
  useNow,
  useServerClock,
  useWalletRealtime,
} from "@/lib/jackpot/api";
import { formatChance, formatUsd } from "@/lib/jackpot/math";
import { emitSound } from "@/lib/sound";
import { JackpotWheel, colorFor } from "./JackpotWheel";
import { PlayerList } from "./PlayerList";
import { EntryPanel } from "./EntryPanel";
import { PlayerAvatar } from "./Avatar";
import { Celebration } from "./Celebration";
import { ShieldCheck } from "lucide-react";

type Phase = "live" | "locked" | "spinning" | "winner";

function fmtClock(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const GameChat = lazy(() =>
  import("@/components/chat/GameChat").then((m) => ({ default: m.GameChat })),
);

export function JackpotStage() {
  const { userId } = useAuth();
  useWalletRealtime(userId);
  const { game, players, stage, finishReveal, resync } = useLiveJackpot();
  const serverNow = useServerClock();
  useNow(200);
  const endMs = game?.scheduled_end_at ? new Date(game.scheduled_end_at).getTime() : null;
  const remaining = game?.status === "ACTIVE" && endMs ? Math.max(0, endMs - serverNow()) : null;
  const expired = remaining === 0;
  const closed = expired || game?.status === "DRAWING" || !!stage;
  const pot = Number(game?.pot_amount ?? 0);
  const my = players.find((p) => p.user_id === userId);

  // One shared, server-anchored timeline for the reveal. Every screen computes
  // the same moments from the game's own timestamps, so all viewers see the
  // countdown end, the wheel spin and the winner at the same time, no matter
  // when their live update arrived.
  //   deadline -> 3,2,1 countdown -> spin (SPIN_MS) -> winner (WINNER_MS) -> next game
  const doneMs = stage?.completed_at ? new Date(stage.completed_at).getTime() : null;
  const stageEnd = stage?.scheduled_end_at ? new Date(stage.scheduled_end_at).getTime() : doneMs;
  const spinStart =
    stage && doneMs != null ? Math.max((stageEnd ?? doneMs) + LEAD_MS, doneMs + MIN_LOCK_MS) : null;
  const t = serverNow();
  const phase: Phase =
    spinStart == null
      ? "live"
      : t < spinStart
        ? "locked"
        : t < spinStart + SPIN_MS
          ? "spinning"
          : "winner";
  const revealOver = spinStart != null && t >= spinStart + SPIN_MS + WINNER_MS;

  useEffect(() => {
    if (revealOver) finishReveal();
  }, [revealOver, finishReveal]);

  // Sounds / toast once per phase change of a given game.
  const announced = useRef<string>("");
  useEffect(() => {
    if (!stage) return;
    const key = `${stage.id}:${phase}`;
    if (announced.current === key) return;
    announced.current = key;
    if (phase === "locked") emitSound("lock");
    if (phase === "winner") {
      if (stage.winner_id === userId) {
        emitSound("win");
        toast.success(`You won ${formatUsd(stage.payout_amount ?? 0)}!`);
      } else if (players.some((p) => p.user_id === userId)) emitSound("lose");
    }
  }, [stage, phase, userId, players]);

  // Light, non-spammy notifications.
  const prev = useRef<{ id: number; players: number; end: number | null; status: string } | null>(
    null,
  );
  useEffect(() => {
    if (!game) return;
    const p = prev.current;
    if (p && p.id === game.id) {
      if (game.player_count > p.players && game.player_count >= 2) {
        emitSound("player_join");
        if (p.end && endMs && endMs > p.end && game.player_count > 2)
          toast("+10 seconds added", { description: "New player joined" });
        else if (game.player_count === 2)
          toast("Countdown started", { description: "Second player joined — 60 seconds" });
      }
      if (p.status !== "DRAWING" && game.status === "DRAWING")
        toast("No more entries", { description: "Drawing winner..." });
    }
    prev.current = { id: game.id, players: game.player_count, end: endMs, status: game.status };
  }, [game, endMs]);

  const winner = stage ? players.find((p) => p.user_id === stage.winner_id) : null;
  const winnerColor = winner ? colorFor(players.indexOf(winner)) : undefined;
  const spin = useMemo(
    () =>
      stage && (phase === "spinning" || phase === "winner")
        ? { winnerId: stage.winner_id!, winningTicket: Number(stage.winning_ticket) }
        : null,
    [stage, phase],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_280px] lg:items-start xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      {/* Chat */}
      <section className="order-4 lg:order-1 lg:self-stretch">
        <ClientOnly fallback={<div className="h-72 animate-pulse rounded-xl border border-border bg-card sm:h-96 lg:h-full lg:min-h-[34rem]" />}>
          <Suspense fallback={<div className="h-72 animate-pulse rounded-xl border border-border bg-card sm:h-96 lg:h-full lg:min-h-[34rem]" />}>
                    <GameChat gameType="jackpot" className="h-72 sm:h-96 lg:h-full lg:min-h-[34rem]" />
          </Suspense>
        </ClientOnly>
      </section>

      {/* Wheel */}
      <section className="order-1 flex flex-col items-center lg:order-2">
        <div className="mb-4 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Jackpot <span className="tabular inline-block min-w-[4ch] text-left">#{game?.id ?? "—"}</span>
          </div>
        </div>
        <JackpotWheel
          players={players}
          spin={spin}
          onSpinEnd={onSpinEnd}
          highlightId={phase === "winner" ? stage?.winner_id : null}
        >
          {phase === "winner" && stage && winner ? (
            <div className="animate-rise-in flex flex-col items-center px-4 text-center">
              <PlayerAvatar
                src={winner.profiles?.avatar_url}
                name={winner.profiles?.username}
                className="glow-gold h-20 w-20 sm:h-24 sm:w-24"
                color={winnerColor}
              />
              <div className="mt-3 font-display text-xs tracking-[0.35em] text-gold">WINNER</div>
              <div className="mt-1 truncate font-display text-lg sm:text-xl">
                {winner.profiles?.username}
              </div>
              <div className="tabular mt-1 text-xs text-muted-foreground">
                {formatChance(stage.winner_total ?? 0, stage.pot_amount)} chance
              </div>
              <div className="tabular mt-1 text-xl font-semibold text-primary sm:text-2xl">
                Won {formatUsd(stage.payout_amount ?? 0)}
              </div>
            </div>
          ) : phase === "locked" ||
            phase === "spinning" ||
            game?.status === "DRAWING" ||
            expired ? (
            <div className="text-center">
              <div className="font-display text-sm tracking-[0.25em] text-rival">
                NO MORE ENTRIES
              </div>
              <div className="tabular mt-2 text-3xl font-semibold sm:text-4xl">
                {formatUsd(pot)}
              </div>
              {(() => {
                const since = endMs ? serverNow() - endMs : 0;
                const n = Math.max(1, 3 - Math.floor(Math.max(0, since) / 1000));
                return (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <div className="relative grid h-14 w-14 place-items-center">
                      <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                      <span key={n} className="tabular animate-scale-in font-display text-2xl text-primary">{n}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Picking winner</div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                Current jackpot
              </div>
              <div className="tabular mt-1 text-3xl font-semibold sm:text-5xl">
                {formatUsd(pot)}
              </div>
              <div
                className={`tabular mt-3 text-2xl sm:text-3xl ${remaining != null && remaining < 10000 ? "text-rival" : "text-primary"}`}
              >
                {remaining != null ? fmtClock(remaining) : "--:--"}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {game?.status === "ACTIVE"
                  ? "Countdown running"
                  : (game?.player_count ?? 0) === 1
                    ? "Waiting for a 2nd player"
                    : "Waiting for players"}
              </div>
            </div>
          )}
        </JackpotWheel>
        {game ? (
          <Link
            to="/fairness"
            className="mt-4 inline-flex max-w-full items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Seed commitment <span className="tabular">{game.server_seed_hash.slice(0, 16)}…</span>
            </span>
          </Link>
        ) : (
          <div aria-hidden className="mt-4 h-[17px]" />
        )}
      </section>

      {/* Entry */}
      <section className="order-2 flex flex-col gap-4 lg:order-3">
        <EntryPanel game={game} myTotal={my?.total_amount ?? 0} closed={closed} />
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="font-display text-xs uppercase tracking-widest">Players</h2>
            <span className="tabular text-xs text-muted-foreground">
              {game?.player_count ?? 0} players · {game?.entry_count ?? 0} entries
            </span>
          </header>
          <PlayerList
            players={players}
            pot={pot}
            meId={userId}
            winnerId={phase === "winner" ? stage?.winner_id : null}
          />
        </section>
      </section>

      {phase === "winner" && stage?.winner_id === userId && <Celebration />}
    </div>
  );
}
