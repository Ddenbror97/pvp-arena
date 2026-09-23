import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLiveJackpot, useNow, useServerClock, useWalletRealtime } from "@/lib/jackpot/api";
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

export function JackpotStage() {
  const { userId } = useAuth();
  useWalletRealtime(userId);
  const { game, players, stage, finishReveal } = useLiveJackpot();
  const serverNow = useServerClock();
  useNow(200);
  const [phase, setPhase] = useState<Phase>("live");

  const endMs = game?.scheduled_end_at ? new Date(game.scheduled_end_at).getTime() : null;
  const remaining = game?.status === "ACTIVE" && endMs ? Math.max(0, endMs - serverNow()) : null;
  const expired = remaining === 0;
  const closed = expired || game?.status === "DRAWING" || !!stage;
  const pot = Number(game?.pot_amount ?? 0);
  const my = players.find((p) => p.user_id === userId);

  // Nudge the server to settle once the authoritative deadline passes. The
  // server verifies the deadline itself; this only avoids waiting for the
  // background worker.
  useEffect(() => {
    if (stage || !(expired || game?.status === "DRAWING")) return;
    void supabase.rpc("jackpot_tick");
    const id = setInterval(() => void supabase.rpc("jackpot_tick"), 1500);
    return () => clearInterval(id);
  }, [expired, game?.status, stage]);

  // Reveal sequence for a completed (already settled) game.
  useEffect(() => {
    if (!stage) {
      setPhase("live");
      return;
    }
    setPhase("locked");
    emitSound("lock");
    const t = setTimeout(() => setPhase("spinning"), 1400);
    return () => clearTimeout(t);
  }, [stage]);

  const onSpinEnd = useCallback(() => {
    setPhase("winner");
    if (stage?.winner_id === userId) {
      emitSound("win");
      toast.success(`You won ${formatUsd(stage!.payout_amount ?? 0)}!`);
    } else if (players.some((p) => p.user_id === userId)) emitSound("lose");
    setTimeout(() => finishReveal(), 6500);
  }, [stage, userId, players, finishReveal]);

  // Light, non-spammy notifications.
  const prev = useRef<{ id: number; players: number; end: number | null; status: string } | null>(null);
  useEffect(() => {
    if (!game) return;
    const p = prev.current;
    if (p && p.id === game.id) {
      if (game.player_count > p.players && game.player_count >= 2) {
        emitSound("player_join");
        if (p.end && endMs && endMs > p.end && game.player_count > 2) toast("+10 seconds added", { description: "New player joined" });
        else if (game.player_count === 2) toast("Countdown started", { description: "Second player joined — 60 seconds" });
      }
      if (p.status !== "DRAWING" && game.status === "DRAWING") toast("No more entries", { description: "Drawing winner..." });
    }
    prev.current = { id: game.id, players: game.player_count, end: endMs, status: game.status };
  }, [game, endMs]);

  const winner = stage ? players.find((p) => p.user_id === stage.winner_id) : null;
  const winnerColor = winner ? colorFor(players.indexOf(winner)) : undefined;
  const spin = useMemo(
    () => (stage && (phase === "spinning" || phase === "winner") ? { winnerId: stage.winner_id!, winningTicket: Number(stage.winning_ticket) } : null),
    [stage, phase],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.35fr)_1fr]">
      {/* Players */}
      <section className="order-3 rounded-2xl border border-border bg-card lg:order-1">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-sm uppercase tracking-widest">Players</h2>
          <span className="tabular text-xs text-muted-foreground">
            {game?.player_count ?? 0} players · {game?.entry_count ?? 0} entries
          </span>
        </header>
        <PlayerList players={players} pot={pot} meId={userId} winnerId={phase === "winner" ? stage?.winner_id : null} />
      </section>

      {/* Wheel */}
      <section className="order-1 flex flex-col items-center lg:order-2">
        <div className="mb-4 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Jackpot <span className="tabular">#{game?.id ?? "—"}</span>
          </div>
        </div>
        <JackpotWheel players={players} spin={spin} onSpinEnd={onSpinEnd} highlightId={phase === "winner" ? stage?.winner_id : null}>
          {phase === "winner" && stage && winner ? (
            <div className="animate-rise-in flex flex-col items-center px-4 text-center">
              <PlayerAvatar src={winner.profiles?.avatar_url} name={winner.profiles?.username} className="glow-gold h-20 w-20 sm:h-24 sm:w-24" color={winnerColor} />
              <div className="mt-3 font-display text-xs tracking-[0.35em] text-gold">WINNER</div>
              <div className="mt-1 truncate font-display text-lg sm:text-xl">@{winner.profiles?.username}</div>
              <div className="tabular mt-1 text-xs text-muted-foreground">
                {formatChance(stage.winner_total ?? 0, stage.pot_amount)} chance
              </div>
              <div className="tabular mt-1 text-xl font-semibold text-primary sm:text-2xl">Won {formatUsd(stage.payout_amount ?? 0)}</div>
            </div>
          ) : phase === "locked" || phase === "spinning" || game?.status === "DRAWING" || expired ? (
            <div className="text-center">
              <div className="font-display text-sm tracking-[0.25em] text-rival">NO MORE ENTRIES</div>
              <div className="tabular mt-2 text-3xl font-semibold sm:text-4xl">{formatUsd(pot)}</div>
              <div className="mt-2 animate-pulse text-xs uppercase tracking-widest text-muted-foreground">Drawing...</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Current jackpot</div>
              <div className="tabular mt-1 text-3xl font-semibold sm:text-5xl">{formatUsd(pot)}</div>
              <div className={`tabular mt-3 text-2xl sm:text-3xl ${remaining != null && remaining < 10000 ? "text-rival" : "text-primary"}`}>
                {remaining != null ? fmtClock(remaining) : "--:--"}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {game?.status === "ACTIVE" ? "Countdown running" : (game?.player_count ?? 0) === 1 ? "Waiting for a 2nd player" : "Waiting for players"}
              </div>
            </div>
          )}
        </JackpotWheel>
        {game && (
          <Link to="/fairness" className="mt-4 inline-flex max-w-full items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Seed commitment <span className="tabular">{game.server_seed_hash.slice(0, 16)}…</span>
            </span>
          </Link>
        )}
      </section>

      {/* Entry */}
      <section className="order-2 lg:order-3">
        <EntryPanel game={game} myTotal={my?.total_amount ?? 0} closed={closed} />
      </section>

      {phase === "winner" && stage?.winner_id === userId && <Celebration />}
      {phase === "winner" && stage?.winner_id !== userId && <CelebrationLite />}
    </div>
  );
}

function CelebrationLite() {
  return null;
}
