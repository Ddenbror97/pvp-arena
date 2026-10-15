import { memo, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { serverOffset, useNow, useServerClock, useWallet } from "@/lib/jackpot/api";
import { channelLive } from "@/lib/live-channel";
import { useBalanceHold } from "@/lib/balance-hold";
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
  type RlGame,
} from "@/lib/roulette/api";
import { betIntentFor, type BetIntent } from "@/lib/roulette/bet-intent";
import { rouletteBarFill, rouletteBarLabel } from "@/lib/roulette/countdown";
import { PlayerPrestigeIdentity } from "@/components/prestige/PlayerPrestigeIdentity";
import { usePrestigeIdentities } from "@/components/prestige/PrestigeProvider";
import { RouletteStrip } from "./RouletteStrip";
import { COIN, CoinImg } from "./coins";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DUE = ["BETTING", "LOCKED", "SPINNING", "SETTLEMENT"];

/** Presentation-only progress. Server timestamps remain the source of truth. */
const BettingCountdownBar = memo(function BettingCountdownBar({
  active,
  opensAt,
  startedAt,
  endsAt,
  now,
}: {
  active: boolean;
  opensAt: string | null;
  startedAt: string | null;
  endsAt: string | null;
  now: () => number;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const progress = rouletteBarFill(active, opensAt, startedAt, endsAt, now());

  useLayoutEffect(() => {
    const element = bar.current;
    if (!element) return;
    let frame = 0;
    let cancelled = false;
    const render = () => {
      if (cancelled) return;
      const next = rouletteBarFill(active, opensAt, startedAt, endsAt, now());
      element.style.transform = `scaleX(${next})`;
      const end = endsAt ? Date.parse(endsAt) : 0;
      if (active && Number.isFinite(end) && now() < end) frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, opensAt, startedAt, endsAt, now]);

  return (
    <div
      ref={bar}
      data-roulette-countdown-fill
      suppressHydrationWarning
      className="absolute inset-y-0 left-0 w-full origin-left bg-primary/80 shadow-[0_0_12px_var(--primary)] will-change-transform"
      style={{ transform: `scaleX(${progress})` }}
    />
  );
});

const RESULT_HOLD_MS = 3500;
const RESULT_HOLD_MAX_MS = 6000;

/** Fallback polling for when realtime is slow or down: tight around the next deadline. */
function roundPollMs(g: RlGame | null, at: number) {
  const live = channelLive("roulette");
  if (!g || !DUE.includes(g.status)) return live ? 8000 : 4000;
  const deadline =
    g.status === "BETTING"
      ? g.betting_ends_at
      : g.status === "LOCKED"
        ? g.spin_start_at
        : g.status === "SPINNING"
          ? g.spin_end_at
          : null;
  if (!deadline) return 1000;
  return new Date(deadline).getTime() - at < 1500 ? 1000 : live ? 8000 : 4000;
}

export function RouletteGame() {
  useRouletteRealtime();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const now = useServerClock();
  useNow(200);
  const setup = useRouletteSetup();
  const round = useQuery({
    queryKey: ["roulette-round"],
    queryFn: fetchCurrentRound,
    refetchInterval: (q) => roundPollMs(q.state.data ?? null, Date.now() + serverOffset()),
  });
  const history = useQuery({ queryKey: ["roulette-history", 48], queryFn: () => fetchHistory(48) });
  const live = round.data ?? null;
  // Presentation hold: keep the finished round (winning coin + green/red names) on screen
  // for a few seconds after the strip stops, even if the server already opened the next round.
  const finished = useRef<typeof live>(null);
  if (live?.winning_color && live.spin_end_at) finished.current = live;
  const f = finished.current;
  const resultEnd = f ? new Date(f.spin_end_at!).getTime() : 0;
  const nextStart =
    live?.status === "BETTING" && live.betting_started_at
      ? Date.parse(live.betting_started_at)
      : NaN;
  // Hand over to the next round when its betting clock starts, so the bar never sits idle between.
  const holdUntil = Number.isFinite(nextStart)
    ? Math.max(resultEnd + RESULT_HOLD_MS, Math.min(nextStart, resultEnd + RESULT_HOLD_MAX_MS))
    : resultEnd + RESULT_HOLD_MS;
  const holding = !!f && f.id !== live?.id && now() < holdUntil;
  const g = holding ? f : live;
  const bets = useQuery({
    queryKey: ["roulette-bets", g?.id],
    queryFn: () => fetchRoundBets(Number(g!.id)),
    enabled: g != null,
  });
  const identities = usePrestigeIdentities((bets.data ?? []).map((b) => b.user_id));
  const wallet = useWallet(userId);
  const involved =
    !!userId && (bets.data ?? []).some((bet) => bet.user_id === userId);
  const spinEndMs = g?.spin_end_at ? new Date(g.spin_end_at).getTime() : null;
  const revealing =
    g?.status === "LOCKED" || g?.status === "SPINNING" || g?.status === "SETTLEMENT";
  const clock = now();
  useBalanceHold(
    "roulette",
    involved && revealing && spinEndMs != null && spinEndMs > clock
      ? spinEndMs - serverOffset()
      : null,
  );
  const playOpen = useQuery({
    queryKey: ["real-play-open"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("real_play_open" as never);
      if (error) throw error;
      return Boolean(data);
    },
  });

  const wheel = setup.data?.wheels.find(
    (w) => w.version === (g?.wheel_version ?? setup.data?.cfg.wheel_version),
  );
  const layout = (wheel?.layout ?? []) as RlColor[];
  const mults = (wheel?.multipliers_bps ?? {}) as Record<RlColor, number>;

  const [input, setInput] = useState("1.00");
  const [pending, setPending] = useState<RlColor | null>(null);
  const submitting = useRef(false);
  const pendingKey = useRef<BetIntent | null>(null);
  const amount = parseUsdToCents(input);
  const balance = wallet.data?.available ?? 0;
  const min = Number(setup.data?.cfg.min_bet ?? 100);
  const max = Number(setup.data?.cfg.max_bet ?? 1000000);
  const bettingOpen =
    !holding &&
    (!live ||
      live.status === "WAITING" ||
      (live.status === "BETTING" && new Date(live.betting_ends_at!).getTime() > now()));

  async function place(color: RlColor): Promise<void> {
    if (submitting.current) return;
    if (!bettingOpen || playOpen.data === false) return;
    if (amount == null || amount < min || amount > max) {
      toast.error(`Bet between ${formatUsd(min)} and ${formatUsd(max)}.`);
      return;
    }
    if (amount > balance) {
      toast.error("Not enough balance for that bet.");
      return;
    }
    submitting.current = true;
    setPending(color);
    pendingKey.current = betIntentFor(pendingKey.current, color, amount, () => crypto.randomUUID());
    try {
      const { error } = await supabase.rpc("roulette_bet", {
        p_color: color,
        p_amount: amount,
        p_idempotency_key: pendingKey.current.key,
      });
      if (error) throw error;
      pendingKey.current = null;
      qc.invalidateQueries({ queryKey: ["roulette-round"] });
      qc.invalidateQueries({ queryKey: ["roulette-bets"] });
      qc.invalidateQueries({ queryKey: ["wallet", userId] });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      if (!/fetch|network/i.test(message)) pendingKey.current = null;
      toast.error(friendlyError(e));
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  const adjust = (f: (c: number) => number) =>
    setInput((Math.max(0, f(amount ?? 0)) / 100).toFixed(2));

  const status = rouletteBarLabel(g, now());
  const landed =
    g?.winning_color && g.spin_end_at && now() >= new Date(g.spin_end_at).getTime()
      ? g.winning_color
      : null;

  return (
    <div className="flex min-w-0 flex-col gap-2.5 xl:h-full xl:min-h-0 xl:gap-1">
      <div className="flex h-6 items-center gap-3">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
          Previous rolls
        </span>
        <div className="flex h-6 min-w-0 flex-1 items-center gap-1.5 overflow-clip">
          {(history.data ?? []).map((h) => (
            <CoinImg key={h.id} c={h.winning_color!} size={22} className="shrink-0 rounded-full" />
          ))}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
      </div>

      {layout.length ? (
        <RouletteStrip layout={layout} game={g} now={now} />
      ) : (
        <div className="h-[124px] animate-pulse rounded-xl bg-card" />
      )}

      <div
        data-roulette-countdown
        className="relative h-[1.4rem] overflow-clip rounded-full border border-line bg-muted shadow-[inset_0_1px_0_rgb(140_150_255/14%)]"
      >
        <BettingCountdownBar
          active={g?.status === "BETTING"}
          opensAt={g?.created_at ?? null}
          startedAt={g?.betting_started_at ?? null}
          endsAt={g?.betting_ends_at ?? null}
          now={now}
        />
        <div className="relative flex h-full items-center px-3.5 text-xs">
          <span suppressHydrationWarning className="font-display" aria-live="polite">
            {status}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 sm:gap-2 sm:p-2.5 xl:py-0">
        <span className="tabular mr-auto text-[11px] text-muted-foreground sm:mr-0 sm:min-w-[8.5rem] sm:text-sm">
          Balance <span className="ml-1.5 font-semibold text-foreground">{formatUsd(balance)}</span>
        </span>
        <Input
          aria-label="Bet amount in USD"
          inputMode="decimal"
          value={input}
          disabled={pending != null}
          onChange={(e) => setInput(e.target.value)}
          className="tabular h-7 w-[4.25rem] bg-background px-2 sm:h-9 sm:w-32 sm:px-3"
        />
        <Link
          to="/fairness"
          className="order-3 shrink-0 rounded-lg bg-primary/35 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-soft hover:bg-primary/45 sm:order-last sm:ml-auto sm:px-3.5 sm:py-2"
          aria-label="Provably fair — verify roulette rounds"
        >
          <span className="sm:hidden">FAIR</span>
          <span className="hidden sm:inline">PROVABLY FAIR</span>
        </Link>
        <div className="order-4 grid w-full grid-cols-7 gap-1 sm:order-none sm:flex sm:w-auto sm:gap-2">
          {[
            ["Clear", () => setInput("0.00")],
            ["+1", () => adjust((c) => c + 100)],
            ["+10", () => adjust((c) => c + 1000)],
            ["+100", () => adjust((c) => c + 10000)],
            ["½", () => adjust((c) => Math.floor(c / 2))],
            ["x2", () => adjust((c) => c * 2)],
            ["Max", () => setInput((Math.min(balance, max) / 100).toFixed(2))],
          ].map(([l, f]) => (
            <Button
              key={l as string}
              size="sm"
              variant="secondary"
              disabled={pending != null}
              className="h-6 border border-border px-0 text-[10px] shadow-none sm:h-8 sm:px-3 sm:text-xs"
              onClick={f as () => void}
            >
              {l as string}
            </Button>
          ))}
        </div>
      </div>

      {playOpen.data === false && (
        <p className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">
          Real-money play opens soon. Rounds keep running, and betting unlocks as soon as it's live.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-3 xl:min-h-0 xl:flex-1">
        {(["RED", "GREEN", "BLACK"] as RlColor[])
          .filter((c) => !Object.keys(mults).length || mults[c] != null)
          .map((c) => {
            const list = (bets.data ?? []).filter((b) => b.color === c);
            const players = new Map<
              string,
              { name: string; avatar: string | null; amount: number }
            >();
            for (const b of list) {
              const row = players.get(b.user_id) ?? {
                name: b.player?.username ?? "player",
                avatar: b.player?.avatar_url ?? null,
                amount: 0,
              };
              row.amount += Number(b.amount);
              players.set(b.user_id, row);
            }
            const rows = [...players.entries()].sort((a, b) => b[1].amount - a[1].amount);
            const total = rows.reduce((s, [, row]) => s + row.amount, 0);
            const [leaderId, leader] = rows[0] ?? [];
            return (
              <div
                key={c}
                className={cn(
                  `bet-col-${c} flex min-h-0 flex-col rounded-xl border transition-all duration-500 max-sm:max-h-60 xl:h-full`,
                  landed === c && "shadow-[0_0_28px_rgb(139_53_236/35%)]",
                  landed && landed !== c && "opacity-60",
                )}
              >
                <button
                  type="button"
                  disabled={
                    !!userId && (!bettingOpen || pending != null || playOpen.data === false)
                  }
                  onClick={() => (userId ? place(c) : (window.location.href = "/auth"))}
                  className={`bet-chip-${c} group @container m-2 grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:border-primary/60 disabled:opacity-50 disabled:hover:translate-y-0 sm:m-2.5 sm:p-2.5`}
                  style={{ boxShadow: landed === c ? `0 0 24px ${COIN[c].glow}` : undefined }}
                >
                  <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <CoinImg
                      c={c}
                      size={34}
                      className="rounded-full transition-transform group-hover:rotate-12 group-hover:scale-110 sm:hidden"
                    />
                    <CoinImg
                      c={c}
                      size={40}
                      className="hidden rounded-full transition-transform group-hover:rotate-12 group-hover:scale-110 sm:block"
                    />
                    <span className="min-w-0 shrink-0">
                      <span className="block font-display text-xs leading-tight sm:text-sm">
                        {userId ? (pending === c ? "Placing…" : "Place bet") : "Sign in"}
                      </span>
                      <span className="block text-[10px] text-muted-foreground sm:text-xs">{COIN[c].label}</span>
                    </span>
                  </span>
                  {leader && leaderId ? (
                    <span className="mx-auto flex w-max max-w-full min-w-0 items-center gap-2">
                      <PlayerPrestigeIdentity
                        avatar={leader.avatar}
                        name={leader.name}
                        frame={identities.get(leaderId)?.frame}
                        crown={identities.get(leaderId)?.crown}
                        level={identities.get(leaderId)?.level}
                        tier={identities.get(leaderId)?.tier}
                        size={34}
                        reserveHeadroom={false}
                        className="shrink-0"
                      />
                      <span className="min-w-0 text-left leading-none">
                        <span className="block truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Highest {COIN[c].label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-semibold">{leader.name}</span>
                      </span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="shrink-0 text-right">
                    <span
                      className="block font-display text-base leading-none sm:text-lg"
                      style={{ color: c === "RED" ? "var(--primary-soft)" : COIN[c].glow }}
                    >
                      {mults[c] ? multiplierLabel(mults[c]) : "…"}
                    </span>
                    {total > 0 ? (
                      <span className="tabular mt-1 block text-sm font-semibold">
                        {formatUsd(total)}
                      </span>
                    ) : null}
                  </span>
                </button>
                <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-2 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {rows.map(([id, row]) => (
                    <li
                      key={id}
                      className={cn(
                        "flex items-center justify-between gap-2",
                        landed &&
                          (landed === c ? "font-semibold text-success" : "text-destructive"),
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <PlayerPrestigeIdentity
                          avatar={row.avatar}
                          name={row.name}
                          frame={identities.get(id)?.frame}
                          crown={identities.get(id)?.crown}
                          level={identities.get(id)?.level}
                          tier={identities.get(id)?.tier}
                          size={24}
                        />
                        <span className="min-w-0 truncate">{row.name}</span>
                      </span>
                      <span className="tabular shrink-0">{formatUsd(row.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    </div>
  );
}
