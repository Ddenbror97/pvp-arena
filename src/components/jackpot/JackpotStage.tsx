import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useBalanceHold } from "@/lib/balance-hold";
import {
  serverOffset,
  useLiveJackpot,
  useNow,
  useServerClock,
  useWalletRealtime,
} from "@/lib/jackpot/api";
import { formatChance, formatUsd } from "@/lib/jackpot/math";
import { emitSound } from "@/lib/sound";
import { JACKPOT_SPIN_MS, JACKPOT_WINNER_MS, jackpotSpinStart } from "@/lib/jackpot/reveal";
import { JackpotWheel } from "./JackpotWheel";
import { PlayerList } from "./PlayerList";
import { EntryPanel } from "./EntryPanel";
import {
  PlayerPrestigeIdentity,
  reservedCrownHeadroom,
} from "@/components/prestige/PlayerPrestigeIdentity";
import { usePrestigeIdentities } from "@/components/prestige/PrestigeProvider";
import { ShieldCheck } from "lucide-react";
import { GameChat } from "@/components/chat/GameChat";
import type { JackpotPaint } from "@/lib/first-paint";

type Phase = "live" | "spinning" | "winner";

function fmtClock(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const Celebration = lazy(() => import("./Celebration").then((m) => ({ default: m.Celebration })));

export function JackpotStage({ chat }: { chat: JackpotPaint["chat"] }) {
  const { userId } = useAuth();
  useWalletRealtime(userId);
  const { game, players, playersPending, stage, finishReveal } = useLiveJackpot();
  const identities = usePrestigeIdentities(players.map((p) => p.user_id));
  const serverNow = useServerClock();
  useNow(200);
  const endMs = game?.scheduled_end_at ? new Date(game.scheduled_end_at).getTime() : null;
  const remaining =
    endMs && (game?.status === "ACTIVE" || game?.status === "DRAWING")
      ? Math.max(0, endMs - serverNow())
      : null;
  const expired = remaining === 0;
  const closed = expired || game?.status === "DRAWING" || !!stage;
  const playerPot = players.reduce((sum, player) => sum + Number(player.total_amount), 0);
  const pot = Math.max(Number(game?.pot_amount ?? 0), playerPot);
  const seated = Math.max(game?.player_count ?? 0, players.length);
  const my = players.find((p) => p.user_id === userId);

  // One shared, server-anchored timeline for the reveal. Every screen computes
  // the same moments from the game's own timestamps, so all viewers see the
  // countdown end, the wheel spin and the winner at the same time, no matter
  // when their live update arrived — including someone who left and came back.
  //   deadline -> spin (JACKPOT_SPIN_MS) -> winner (JACKPOT_WINNER_MS) -> next game
  const spinStart = jackpotSpinStart(stage);
  const t = serverNow();
  const phase: Phase =
    spinStart == null || t < spinStart
      ? "live"
      : t < spinStart + JACKPOT_SPIN_MS
        ? "spinning"
        : "winner";
  const revealOver = spinStart != null && t >= spinStart + JACKPOT_SPIN_MS + JACKPOT_WINNER_MS;

  // Settlement credits the winner before the wheel even starts; keep balances
  // showing the pre-draw value for participants until the wheel has landed.
  const inRound = !!userId && players.some((p) => p.user_id === userId);
  const holdUntil = !inRound
    ? null
    : spinStart != null
      ? spinStart + JACKPOT_SPIN_MS
      : closed && endMs != null
        ? endMs + JACKPOT_SPIN_MS + 5000
        : null;
  useBalanceHold("jackpot", holdUntil != null && holdUntil > t ? holdUntil - serverOffset() : null);

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
      if (
        game.player_count > p.players &&
        game.player_count > 2 &&
        p.end &&
        endMs &&
        endMs > p.end
      ) {
        emitSound("player_join");
        toast("+10 seconds added", { description: "New player joined" });
      } else if (game.player_count > p.players && game.player_count >= 2) {
        emitSound("player_join");
      }
    }
    prev.current = { id: game.id, players: game.player_count, end: endMs, status: game.status };
  }, [game, endMs]);

  const winner = stage ? players.find((p) => p.user_id === stage.winner_id) : null;
  const winnerIdentity = winner ? identities.get(winner.user_id) : undefined;
  const spin = useMemo(
    () =>
      stage && spinStart != null && stage.winner_id
        ? {
            winnerId: stage.winner_id,
            winningTicket: Number(stage.winning_ticket),
            startAt: spinStart,
          }
        : null,
    [stage, spinStart],
  );

  return (
    <div className="grid gap-4 lg:h-[34rem] lg:grid-cols-[260px_minmax(0,1fr)_280px] lg:items-stretch xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      {/* Chat. Same 34rem window as the coinflip and roulette side chats. */}
      <section className="order-4 h-72 sm:h-80 lg:order-1 lg:h-full lg:min-h-0">
        <GameChat gameType="jackpot" initial={chat} className="h-full" />
      </section>

      {/* Wheel */}
      <section className="order-1 flex flex-col items-center justify-center rounded-xl border border-border bg-card px-3 py-3 lg:order-2 lg:h-full lg:min-h-0">
        <div className="mb-2 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Jackpot{" "}
            <span className="tabular inline-block min-w-[4ch] text-left">#{game?.id ?? "—"}</span>
          </div>
        </div>
        <JackpotWheel
          players={players}
          spin={spin}
          now={serverNow}
          highlightId={phase === "winner" ? stage?.winner_id : null}
          roundId={Number(game?.id ?? 0)}
        >
          {phase === "winner" && stage && winner ? (
            <div className="animate-rise-in flex flex-col items-center px-4 text-center">
              <PlayerPrestigeIdentity
                avatar={winner.profiles?.avatar_url}
                name={winner.profiles?.username}
                frame={winnerIdentity?.frame}
                crown={winnerIdentity?.crown}
                level={winnerIdentity?.level}
                tier={winnerIdentity?.tier}
                size={96}
                minHeadroom={reservedCrownHeadroom(96)}
                priority
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
              {stage.rake_bps > 0 ? (
                <div className="tabular mt-1 text-[11px] text-muted-foreground">
                  {stage.payout_amount === stage.pot_amount ? (
                    `Pot ${formatUsd(stage.pot_amount)} · fee-free win`
                  ) : (
                    <>
                      Pot {formatUsd(stage.pot_amount)} − {stage.rake_bps / 100}% fee
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : phase === "spinning" ? (
            <div className="text-center">
              <div className="font-display text-sm tracking-[0.25em] text-rival">
                NO MORE ENTRIES
              </div>
              <div className="tabular mt-2 text-3xl font-semibold sm:text-4xl">
                {formatUsd(pot)}
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Spinning
              </div>
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
                suppressHydrationWarning
                className={`tabular mt-3 text-2xl sm:text-3xl ${remaining != null && remaining < 10000 ? "text-rival" : "text-primary"}`}
              >
                {remaining != null ? fmtClock(remaining) : "--:--"}
              </div>
              <div suppressHydrationWarning className="mt-1 text-[11px] text-muted-foreground">
                {expired || game?.status === "DRAWING"
                  ? "Drawing"
                  : game?.status === "ACTIVE"
                    ? "Countdown running"
                    : seated >= 2
                      ? "Starting"
                      : seated === 1
                        ? "Waiting for a 2nd player"
                        : "Waiting for players"}
              </div>
            </div>
          )}
        </JackpotWheel>
        {game ? (
          <Link
            to="/fairness"
            className="mt-2 inline-flex h-[17px] max-w-full items-center gap-1.5 text-[11px] leading-[17px] text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Seed commitment <span className="tabular">{game.server_seed_hash.slice(0, 16)}…</span>
            </span>
          </Link>
        ) : (
          <div aria-hidden className="mt-2 h-[17px]" />
        )}
      </section>

      {/* Entry */}
      <section className="order-2 flex min-h-0 flex-col gap-4 lg:order-3 lg:h-full lg:overflow-hidden">
        <EntryPanel game={game} myTotal={my?.total_amount ?? 0} closed={closed} />
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="font-display text-xs uppercase tracking-widest">Players</h2>
            <span className="tabular text-xs text-muted-foreground">
              {playersPending
                ? "\u00a0"
                : `${seated} players · ${Math.max(game?.entry_count ?? 0, players.length)} entries`}
            </span>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PlayerList
              players={players}
              pending={playersPending}
              reserveCount={seated}
              pot={pot}
              meId={userId}
              winnerId={phase === "winner" ? stage?.winner_id : null}
              roundId={Number(game?.id ?? 0)}
            />
          </div>
        </section>
      </section>

      {phase === "winner" && stage?.winner_id === userId && (
        <Suspense fallback={null}>
          <Celebration />
        </Suspense>
      )}
    </div>
  );
}
