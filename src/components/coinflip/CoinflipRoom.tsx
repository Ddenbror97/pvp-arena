import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNow, useServerClock, useWalletRealtime } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { APP } from "@/lib/config";
import { emitSound } from "@/lib/sound";
import { fetchCoinflip, opposite, tickCoinflip, useCoinflipRealtime, type CfGameView, type CoinSide } from "@/lib/coinflip/api";
import { verifyCoinflip, type CoinflipCheck } from "@/lib/fairness/coinflip";
import headsAsset from "@/assets/coin-heads.png.asset.json";
import tailsAsset from "@/assets/coin-tails.png.asset.json";
import { Celebration } from "@/components/jackpot/Celebration";
import { Button } from "@/components/ui/button";
import { Coin } from "./Coin";
import { SideChip } from "./OpenGames";

const IN_PROGRESS = ["READY", "FLIPPING", "SETTLEMENT"];

export function CoinflipRoom({ id }: { id: number }) {
  const { userId } = useAuth();
  useWalletRealtime(userId);
  useCoinflipRealtime();
  const qc = useQueryClient();
  const serverNow = useServerClock();
  useNow(100);
  const q = useQuery({
    queryKey: ["coinflip", id],
    queryFn: () => fetchCoinflip(id),
    // Realtime is a hint only: poll authoritative state while the game is live.
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "WAITING" ? 4000 : s && IN_PROGRESS.includes(s) ? 800 : false;
    },
  });
  const g = q.data ?? null;

  const now = serverNow();
  const start = g?.animation_start_at ? new Date(g.animation_start_at).getTime() : null;
  const end = g?.animation_end_at ? new Date(g.animation_end_at).getTime() : null;
  const expires = g ? new Date(g.expires_at).getTime() : null;

  // Accelerate the server worker once an authoritative deadline passes. The
  // server re-checks every deadline itself; the game finishes without us too.
  const due =
    !!g &&
    ((g.status === "WAITING" && expires != null && now >= expires) ||
      (g.status === "READY" && start != null && now >= start) ||
      ((g.status === "FLIPPING" || g.status === "SETTLEMENT") && end != null && now >= end));
  useEffect(() => {
    if (!due) return;
    const run = async () => {
      await tickCoinflip();
      qc.invalidateQueries({ queryKey: ["coinflip", id] });
    };
    void run();
    const t = setInterval(run, 1000);
    return () => clearInterval(t);
  }, [due, id, qc]);

  useEffect(() => {
    if (g?.status === "COMPLETED") qc.invalidateQueries({ queryKey: ["wallet"] });
  }, [g?.status, qc]);

  if (q.isLoading) return <div className="h-[520px] animate-pulse rounded-2xl bg-card" />;
  if (!g) return <p className="text-muted-foreground">Game not found.</p>;

  let phase: "waiting" | "cancelled" | "found" | "flipping" | "result";
  if (g.status === "CANCELLED") phase = "cancelled";
  else if (g.status === "WAITING") phase = "waiting";
  else if (start != null && now < start) phase = "found";
  else if (end != null && now < end) phase = "flipping";
  else phase = "result";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <Link to="/coinflip" className="text-sm text-muted-foreground hover:text-foreground">← Coinflip lobby</Link>
        <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-gold">{APP.creditsLabel}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl">Coinflip #{g.id}</h1>
        <span className="rounded bg-secondary px-2 py-0.5 text-xs">{g.status}</span>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-2xl border border-border bg-card p-4 sm:px-8 sm:py-5">
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <PlayerSlot g={g} slot="creator" phase={phase} me={userId} />
          <Center g={g} phase={phase} start={start} serverNow={serverNow} now={now} me={userId} />
          <PlayerSlot g={g} slot="opponent" phase={phase} me={userId} />
        </div>
        {phase === "result" && <ResultCard g={g} me={userId} />}
      </div>

      <FairnessPanel g={g} />
    </div>
  );
}

function PlayerSlot({ g, slot, phase, me }: { g: CfGameView; slot: "creator" | "opponent"; phase: string; me: string | null }) {
  const side = (slot === "creator" ? g.creator_side : opposite(g.creator_side as CoinSide)) as CoinSide;
  const p = slot === "creator" ? g.creator : g.opponent;
  const uid = slot === "creator" ? g.creator_id : g.opponent_id;
  const won = phase === "result" && g.winner_id && g.winner_id === uid;
  const lost = phase === "result" && g.winner_id && g.winner_id !== uid;
  return (
    <div className={`flex flex-col items-center text-center transition ${lost ? "opacity-40" : ""} ${slot === "opponent" ? "sm:order-last" : ""}`}>
      {uid ? (
        <SideCoin side={side} className={`h-14 w-14 ${won ? "glow-gold" : ""}`} />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border text-2xl text-muted-foreground animate-pulse">?</div>
      )}
      <div className="mt-2 truncate text-sm font-semibold">{uid ? `@${p?.username ?? "player"}${uid === me ? " (you)" : ""}` : "Waiting..."}</div>
      <div className="tabular mt-0.5 font-display text-base">{formatUsd(g.amount)}</div>
      <SideChip side={side} className="mt-2" />
    </div>
  );
}

function Center({ g, phase, start, serverNow, now, me }: { g: CfGameView; phase: string; start: number | null; serverNow: () => number; now: number; me: string | null }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const played = useRef<string | null>(null);
  useEffect(() => {
    if (played.current === phase) return;
    played.current = phase;
    if (phase === "flipping") emitSound("spin_start");
    if (phase === "result" && g.winner_id) emitSound(g.winner_id === me ? "win" : "lose");
  }, [phase, g.winner_id, me]);

  if (phase === "waiting") {
    const left = Math.max(0, Math.ceil((new Date(g.expires_at).getTime() - now) / 1000));
    async function cancel() {
      setPending(true);
      const { error } = await supabase.rpc("coinflip_cancel", { p_game_id: g.id });
      setPending(false);
      if (error) toast.error(friendlyError(error));
      else toast.success("Game cancelled. Your wager was returned.");
      qc.invalidateQueries({ queryKey: ["coinflip", g.id] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    }
    return (
      <div className="flex flex-col items-center text-center">
        <Coin startMs={null} side={null} serverNow={serverNow} restSide={g.creator_side as CoinSide} size={110} />
        <div className="font-display text-lg">Waiting for opponent...</div>
        <div className="mt-1 text-sm text-muted-foreground">Waiting for <b>{opposite(g.creator_side as CoinSide)}</b> · expires in <span className="tabular">{left}s</span></div>
        {g.creator_id === me && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={cancel} disabled={pending}>Cancel and refund</Button>
        )}
      </div>
    );
  }
  if (phase === "cancelled") {
    return (
      <div className="text-center">
        <div className="font-display text-lg">Game cancelled</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {g.cancel_reason === "EXPIRED" ? "No opponent joined in time." : "Cancelled by the creator."} The wager was returned.
        </div>
      </div>
    );
  }
  if (phase === "found") {
    const n = Math.max(1, Math.ceil((start! - now) / 1000));
    return (
      <div className="flex flex-col items-center text-center">
        <div className="text-xs font-bold tracking-[0.4em] text-primary">OPPONENT FOUND</div>
        <div className="tabular mt-2 text-sm text-muted-foreground">{formatUsd(g.amount)} VS {formatUsd(g.amount)}</div>
        <div key={n} className="animate-count-pop mt-2 font-display text-5xl">{n}</div>
        <div className="mt-2 text-xs text-muted-foreground">Starting in {n}...</div>
      </div>
    );
  }
  const revealed = phase !== "flipping" && !!g.winning_side;
  const tone = g.winning_side === "HEADS" ? "text-primary" : "text-rival";
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`relative ${revealed ? `animate-coin-land ${tone}` : ""}`}>
        {revealed && (
          <>
            <span className="shockwave h-[130px] w-[130px]" />
            <span className="shockwave h-[130px] w-[130px]" style={{ animationDelay: "0.18s" }} />
            <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-current opacity-30 blur-2xl" />
          </>
        )}
        <Coin startMs={start} side={(g.winning_side as CoinSide | null) ?? null} serverNow={serverNow} size={130} />
      </div>
      {phase === "flipping" ? (
        <div className="font-display text-sm tracking-[0.4em] text-muted-foreground">FLIPPING</div>
      ) : (
        <div className={`animate-win-slam font-display text-3xl tracking-[0.25em] ${tone}`} style={{ textShadow: "0 0 24px currentColor" }}>
          {g.winning_side ?? "..."}
        </div>
      )}
    </div>
  );
}

/** Display-only count-up of an already-settled amount. */
function CountUp({ cents, ms = 900 }: { cents: number; ms?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(cents * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cents, ms]);
  return <>{formatUsd(v)}</>;
}

function ResultCard({ g, me }: { g: CfGameView; me: string | null }) {
  const winner = g.winner_id === g.creator_id ? g.creator : g.opponent;
  const settled = g.status === "COMPLETED";
  const involved = me && (me === g.creator_id || me === g.opponent_id);
  const iWon = involved && g.winner_id === me;
  return (
    <div className="animate-rise-in mt-4 border-t border-border pt-4">
      {settled && iWon && <Celebration />}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.3em] text-gold">WINNER</div>
          <div className="truncate font-display text-base">@{winner?.username ?? "player"}</div>
        </div>
        {involved && settled && (
          <div className="text-right">
            <div className={`animate-win-slam font-display ${iWon ? "text-2xl text-gold" : "text-lg"}`} style={iWon ? { textShadow: "0 0 20px currentColor" } : undefined}>
              {iWon ? "YOU WON!" : "YOU LOST"}
            </div>
            <div className={`tabular text-sm ${iWon ? "text-primary" : "text-rival"}`}>
              {iWon ? <>+<CountUp cents={g.payout_amount ?? 0} /></> : `-${formatUsd(g.amount)}`} <span className="text-xs">{APP.creditsLabel}</span>
            </div>
          </div>
        )}
        <dl className="tabular flex gap-5 text-sm">
          <div><dt className="text-[10px] text-muted-foreground">Pot</dt><dd>{formatUsd(g.pot_amount)}</dd></div>
          <div><dt className="text-[10px] text-muted-foreground">Payout</dt><dd>{settled ? formatUsd(g.payout_amount ?? 0) : "Settling..."}</dd></div>
        </dl>
        {settled && (
          <Button asChild size="sm" className="w-full font-display animate-win-pop sm:w-auto sm:px-8">
            <Link to="/coinflip">Play again</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function FairnessPanel({ g }: { g: CfGameView }) {
  const [res, setRes] = useState<{ ok: boolean; checks: CoinflipCheck[] } | null>(null);
  return (
    <details className="group mt-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="font-display uppercase tracking-widest">Provably fair</span>
        <span className="tabular hidden truncate sm:inline">· {g.server_seed_hash.slice(0, 16)}…</span>
        <span className="ml-auto group-open:hidden">Details</span>
        <span className="ml-auto hidden group-open:inline">Hide</span>
      </summary>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <Row k="Server seed hash (committed at creation)" v={g.server_seed_hash} />
        <Row k="Message" v={`PVPCasino:coinflip:${g.protocol_version}:${g.id}:${g.draw_version}`} />
        <Row k="Server seed" v={g.server_seed ?? "Revealed when the game completes"} />
        <Row k="Created" v={new Date(g.created_at).toLocaleString()} />
        {g.joined_at && <Row k="Opponent joined" v={new Date(g.joined_at).toLocaleString()} />}
        {g.completed_at && <Row k="Completed" v={new Date(g.completed_at).toLocaleString()} />}
      </dl>
      {g.status === "COMPLETED" && (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={async () =>
            setRes(await verifyCoinflip({ id: String(g.id), draw_version: g.draw_version, server_seed_hash: g.server_seed_hash, server_seed: g.server_seed, winning_side: g.winning_side as CoinSide | null }))
          }
        >
          Verify in my browser
        </Button>
      )}
      {res && (
        <ul className="mt-4 space-y-2">
          {res.checks.map((c) => (
            <li key={c.label} className="flex gap-2">
              {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rival" />}
              <div className="min-w-0"><div>{c.label}</div><div className="tabular break-all text-xs text-muted-foreground">{c.detail}</div></div>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="tabular break-all text-xs">{v}</dd>
    </div>
  );
}

function SideCoin({ side, className }: { side: CoinSide; className?: string }) {
  return (
    <img
      src={(side === "HEADS" ? headsAsset : tailsAsset).url}
      alt={side === "HEADS" ? "Heads" : "Tails"}
      width={56}
      height={56}
      draggable={false}
      className={`shrink-0 rounded-full object-cover select-none ${className ?? ""}`}
    />
  );
}
