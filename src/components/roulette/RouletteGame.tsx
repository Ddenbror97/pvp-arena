import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNow, useServerClock, useWallet } from "@/lib/jackpot/api";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import {
  fetchCurrentRound,
  fetchHistory,
  fetchRoundBets,
  multiplierLabel,
  useRouletteRealtime,
  useRouletteSetup,
  type RlColor,
} from "@/lib/roulette/api";
import { RouletteStrip } from "./RouletteStrip";
import { COIN, CoinImg } from "./coins";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DUE = ["BETTING", "LOCKED", "SPINNING", "SETTLEMENT"];

export function RouletteGame() {
  useRouletteRealtime();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const now = useServerClock();
  useNow(200);
  const setup = useRouletteSetup();
  const round = useQuery({ queryKey: ["roulette-round"], queryFn: fetchCurrentRound, refetchInterval: 4000 });
  const history = useQuery({ queryKey: ["roulette-history"], queryFn: () => fetchHistory(12) });
  const g = round.data ?? null;
  const bets = useQuery({
    queryKey: ["roulette-bets", g?.id],
    queryFn: () => fetchRoundBets(Number(g!.id)),
    enabled: g != null,
  });
  const wallet = useWallet(userId);

  // Nudge the server when a server deadline has passed. The server decides what (if anything) is due.
  const ticking = useRef(false);
  useEffect(() => {
    if (!userId || !g || !DUE.includes(g.status)) return;
    const deadline =
      g.status === "BETTING" ? g.betting_ends_at : g.status === "LOCKED" ? g.spin_start_at : g.status === "SPINNING" ? g.spin_end_at : null;
    const due = deadline ? new Date(deadline).getTime() - now() : 0;
    const id = setTimeout(async () => {
      if (ticking.current) return;
      ticking.current = true;
      try {
        await supabase.rpc("roulette_tick");
      } finally {
        ticking.current = false;
        qc.invalidateQueries({ queryKey: ["roulette-round"] });
        qc.invalidateQueries({ queryKey: ["roulette-history"] });
        qc.invalidateQueries({ queryKey: ["wallet", userId] });
      }
    }, Math.max(150, due + 150));
    return () => clearTimeout(id);
  }, [userId, g?.id, g?.status, g?.betting_ends_at, g?.spin_start_at, g?.spin_end_at, now, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  const wheel = setup.data?.wheels.find((w) => w.version === (g?.wheel_version ?? setup.data?.cfg.wheel_version));
  const layout = (wheel?.layout ?? []) as RlColor[];
  const mults = (wheel?.multipliers_bps ?? {}) as Record<RlColor, number>;

  const [input, setInput] = useState("1.00");
  const [pending, setPending] = useState<RlColor | null>(null);
  const amount = parseUsdToCents(input);
  const balance = wallet.data?.available ?? 0;
  const min = Number(setup.data?.cfg.min_bet ?? 100);
  const max = Number(setup.data?.cfg.max_bet ?? 1000000);
  const bettingOpen = !g || g.status === "WAITING" || (g.status === "BETTING" && new Date(g.betting_ends_at!).getTime() > now());

  async function place(color: RlColor): Promise<void> {
    if (amount == null || amount < min || amount > max) { toast.error(`Bet between ${formatUsd(min)} and ${formatUsd(max)}.`); return; }
    if (amount > balance) { toast.error("Not enough balance for that bet."); return; }
    setPending(color);
    try {
      const { error } = await supabase.rpc("roulette_bet", { p_color: color, p_amount: amount, p_idempotency_key: crypto.randomUUID() });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["roulette-round"] });
      qc.invalidateQueries({ queryKey: ["roulette-bets"] });
      qc.invalidateQueries({ queryKey: ["wallet", userId] });
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setPending(null);
    }
  }

  const adjust = (f: (c: number) => number) => setInput(((Math.max(0, f(amount ?? 0))) / 100).toFixed(2));

  let status = "Waiting for the first bet";
  if (g?.status === "BETTING") status = `Rolling in ${Math.max(0, (new Date(g.betting_ends_at!).getTime() - now()) / 1000).toFixed(1)}s`;
  else if (g?.status === "LOCKED") status = "Bets locked";
  else if (g?.status === "SPINNING") status = now() >= new Date(g.spin_end_at!).getTime() ? "Settling…" : "Rolling…";
  else if (g?.status === "SETTLEMENT") status = "Settling…";
  const landed = g?.winning_color && g.spin_end_at && now() >= new Date(g.spin_end_at).getTime() ? g.winning_color : null;
  if (landed) status = `Landed on ${COIN[landed].label}`;

  const betTime = g?.betting_ends_at && g.betting_started_at
    ? Math.max(0, Math.min(1, (new Date(g.betting_ends_at).getTime() - now()) / (g.betting_seconds * 1000)))
    : 0;

  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Previous rolls</span>
        <div className="flex h-6 gap-1">
          {(history.data ?? []).map((h) => (
            <CoinImg key={h.id} c={h.winning_color!} size={24} className="rounded-full" />
          ))}
        </div>
      </div>

      {layout.length ? <RouletteStrip layout={layout} game={g} now={now} /> : <div className="h-24 animate-pulse rounded-xl bg-card" />}

      <div className="rounded-xl border border-border bg-card p-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-display" aria-live="polite">{status}</span>
          <span className="tabular text-muted-foreground">Round #{g?.id ?? "—"} · Pot {formatUsd(Number(g?.pot_amount ?? 0))}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
          <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${betTime * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2.5">
        <span className="tabular text-sm text-muted-foreground">
          Balance <span className="font-semibold text-foreground">{formatUsd(balance)}</span>
        </span>
        <Input
          aria-label="Bet amount in USD"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="tabular h-9 w-28"
        />
        {[
          ["Clear", () => setInput("0.00")],
          ["+1", () => adjust((c) => c + 100)],
          ["+10", () => adjust((c) => c + 1000)],
          ["+100", () => adjust((c) => c + 10000)],
          ["½", () => adjust((c) => Math.floor(c / 2))],
          ["x2", () => adjust((c) => c * 2)],
          ["Max", () => setInput((Math.min(balance, max) / 100).toFixed(2))],
        ].map(([l, f]) => (
          <Button key={l as string} size="sm" variant="secondary" onClick={f as () => void}>{l as string}</Button>
        ))}
        <span className="ml-auto rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">TEST CREDITS</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(["RED", "GREEN", "BLACK"] as RlColor[]).filter((c) => mults[c] != null).map((c) => {
          const list = (bets.data ?? []).filter((b) => b.color === c);
          const total = list.reduce((s, b) => s + Number(b.amount), 0);
          return (
            <div key={c} className={cn("flex min-h-44 flex-col rounded-xl border bg-card transition-all duration-500", landed === c ? "border-primary" : "border-border", landed && landed !== c && "opacity-60")}>
              <button
                type="button"
                disabled={!!userId && (!bettingOpen || pending != null)}
                onClick={() => (userId ? place(c) : (window.location.href = "/auth"))}
                className="group m-2 flex items-center gap-3 rounded-xl border border-border bg-secondary/60 p-2 text-left transition hover:-translate-y-0.5 hover:border-primary/60 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ boxShadow: landed === c ? `0 0 24px ${COIN[c].glow}` : undefined }}
              >
                <CoinImg c={c} size={44} className="rounded-full transition-transform group-hover:rotate-12 group-hover:scale-110" />
                <span className="flex-1">
                  <span className="block font-display text-sm">{userId ? (pending === c ? "Placing…" : "Place bet") : "Sign in"}</span>
                  <span className="block text-xs text-muted-foreground">{COIN[c].label}</span>
                </span>
                <span className="font-display text-lg" style={{ color: COIN[c].glow }}>{mults[c] ? multiplierLabel(mults[c]) : "…"}</span>
              </button>
              <div className="flex justify-between px-3 text-xs text-muted-foreground">
                <span>{list.length} bets</span>
                <span className="tabular">{formatUsd(total)}</span>
              </div>
              <ul className="mt-2 space-y-1 px-3 pb-3 text-sm">
                {list.slice(-12).reverse().map((b) => (
                  <li key={b.id} className={cn("flex justify-between", landed && (landed === c ? "text-foreground" : "text-muted-foreground line-through"))}>
                    <span className="truncate">{b.player?.username ?? "player"}</span>
                    <span className="tabular">{formatUsd(Number(b.amount))}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        15 coins: 7 Purple (2x, 46.67%), 7 Silver (2x, 46.67%), 1 Green (14x, 6.67%). Payouts include your stake. The result is
        drawn on the server when betting closes and can be checked on the <Link to="/fairness" className="underline">Fairness</Link> page.
      </p>
    </div>
  );
}
