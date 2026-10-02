import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, History, Sparkles, Users, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { readAuthHint } from "@/lib/auth-hint";
import { useWallet, useWalletRealtime } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { PlayerPrestigeIdentity } from "@/components/prestige/PlayerPrestigeIdentity";
import { equippedAssets, usePrestige } from "@/components/prestige/PrestigeProvider";
import { Button } from "@/components/ui/button";
import { PlayButton, SignInPlayButton } from "@/components/game/BetSlip";
import { timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";
import {
  fetchMySlot,
  fetchOpenSlots,
  fetchRecentSlots,
  slotCreate,
  slotJoin,
  SLOT_RECENT_PAGE_SIZE,
  useSlotConfig,
  useSlotRealtime,
  winAmount,
  type SlotGameView,
} from "@/lib/slott/api";
import { scoreGrid, SYMBOLS } from "@/lib/slott/paytable";
import { Reels } from "./Reels";
import { SpinFx } from "./SpinFx";
import { hitCells, NO_HITS, winLevel } from "./hits";
import { playHitSfx, playReelSpin, playTallySfx } from "./sfx";
import { reelValues, TALLY_STEP_MS, tallyStartMs } from "./tally";
import { PotHeader, SeatPanel, SlotCabinet } from "./SlotCabinet";
import { HowItWorks, StepRail } from "./HowItWorks";
import { IDLE_GRID, landedAt, type ReelSpin } from "./timing";
import { RECENT_PAGE_SIZE, RecentPager, usePagedRecent } from "@/components/recent/usePagedRecent";

const FALLBACK_STAKES = [100, 500, 1000, 2500, 5000, 10000];
const DEMO_EVERY_MS = 7000;
const DEMO_SPIN_MS = 3200;
const DEMO_SFX = { ambient: true, volume: 0.45 } as const;
/** Hand-picked showcase grids (reel-major). Cosmetic only; real spins come from the server seed. */
const DEMOS: { grid: number[]; tier?: string; bps?: number }[] = [
  { grid: [4, 12, 0, 9, 15, 3, 10, 1, 6, 18, 2, 14, 8, 0, 13, 5, 2, 16, 6, 3] },
  { grid: [12, 5, 1, 15, 0, 12, 9, 4, 10, 6, 7, 2, 14, 12, 3, 13, 12, 8, 16, 19] },
  { grid: [1, 6, 7, 11, 13, 2, 9, 11, 7, 4, 15, 11, 10, 7, 3, 0, 17, 5, 14, 8], tier: "WILD", bps: 2000 },
  { grid: [0, 19, 10, 5, 8, 19, 1, 13, 3, 7, 12, 6, 14, 19, 2, 15, 9, 19, 4, 11] },
];
const TIPS = [
  "Equal stakes · 6 spins each · highest score takes the P2P pot",
  "3+ matching symbols on a payline multiply them ×5, ×15 or ×50",
  "3 or more WILDs add a rare PVPspinArena bonus to the shared pot",
  "Tied after 12 spins? Sudden-death spins decide it",
];

const DESKTOP = "(min-width: 1024px)";
/** Sticky offset of the desktop machine: the 64px site header plus a 16px gap. */
const PIN_TOP = 80;
/**
 * The desktop machine width before the cabinet measures itself: 49vw, capped at
 * 1100px, or the height-bound width when the window is wide and short. That is the
 * 5:4 reel well filling the column (100dvh minus the 72px header and padding) less
 * the frame chrome, so the server paint already matches the fitted machine.
 */
const MACHINE_W = "min(49vw, 1100px, calc(125dvh - 134.5px))";

/** `null` until hydrated: the server cannot know the viewport, so CSS picks the layout first. */
function useDesktop(): boolean | null {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(DESKTOP);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(DESKTOP).matches,
    () => null,
  );
}

function useDemo() {
  const [state, setState] = useState<{ spin: ReelSpin | null; landed: boolean; i: number }>({ spin: null, landed: true, i: -1 });
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    let prev = IDLE_GRID;
    let land: ReturnType<typeof setTimeout> | undefined;
    let next: ReturnType<typeof setTimeout>;
    const go = () => {
      if (document.visibilityState === "hidden") {
        next = setTimeout(go, 1500);
        return;
      }
      const d = DEMOS[i % DEMOS.length]!;
      const spin: ReelSpin = { key: `demo:${i}`, grid: d.grid, prev, startAt: Date.now(), durationMs: DEMO_SPIN_MS };
      prev = d.grid;
      const n = i;
      setState({ spin, landed: false, i: n });
      playReelSpin(spin, DEMO_SFX);
      land = setTimeout(() => {
        setState((s) => (s.i === n ? { ...s, landed: true } : s));
        const sc = scoreGrid(d.grid);
        playHitSfx(sc.lines, winLevel(sc.lineScore, !!d.tier), !!d.tier, DEMO_SFX);
        playTallySfx(reelValues(d.grid), tallyStartMs(sc.lines), TALLY_STEP_MS, DEMO_SFX);
      }, landedAt(spin) - Date.now());
      i++;
      next = setTimeout(go, DEMO_EVERY_MS);
    };
    next = setTimeout(go, 900);
    return () => {
      clearTimeout(land);
      clearTimeout(next);
    };
  }, []);
  return state;
}

export function SlottLobby({ paintedAt }: { paintedAt?: number | undefined }) {
  const { userId, profile, ready, needsProfile } = useAuth();
  const [hint] = useState(readAuthHint);
  useWalletRealtime(userId);
  useSlotRealtime();
  const cfg = useSlotConfig();
  const wallet = useWallet(userId);
  const prestige = usePrestige();
  const style = equippedAssets(prestige.state);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const open = useQuery({ queryKey: ["slot-open"], queryFn: fetchOpenSlots, refetchInterval: 8000, enabled: cfg.isSuccess });
  const mineQ = useQuery({ queryKey: ["slot-mine", userId], queryFn: () => fetchMySlot(userId!), enabled: !!userId && cfg.isSuccess, refetchInterval: 4000 });
  const recent = usePagedRecent("slot-recent", fetchRecentSlots, SLOT_RECENT_PAGE_SIZE);
  // The open list waits on the config, so a disabled query still counts as loading.
  const openLoading = open.isPending && !cfg.isError;

  const stakes = cfg.data?.cfg.stakes?.length ? cfg.data.cfg.stakes : FALLBACK_STAKES;
  const stakeMin = Math.min(...stakes);
  const stakeMax = Math.max(...stakes);
  const [amount, setAmount] = useState((100 / 100).toFixed(2));
  // The bonus figure pops only when the player picks a stake, never on arrival.
  const [stakePicks, setStakePicks] = useState(0);
  const typed = Math.round(Number(amount) * 100);
  const stakeValid = Number.isFinite(typed) && typed >= stakeMin && typed <= stakeMax;
  const stake = stakeValid ? typed : stakeMin;
  const setStake = useCallback((s: number) => {
    setAmount((s / 100).toFixed(2));
    setStakePicks((n) => n + 1);
  }, []);
  const editAmount = useCallback((next: string) => {
    setAmount(next);
    setStakePicks((n) => n + 1);
  }, []);
  const c = cfg.data?.cfg;
  const fee = c?.fee_bps ?? 500;
  const pot = stake * 2;
  const win = pot - Math.floor((pot * fee) / 10000);
  const cap = c ? Math.min(Math.floor((stake * c.match_cap_bps) / 10000), c.max_match_bonus_cents) : Math.min(stake * 3, 30000);
  const balance = wallet.data?.available ?? 0;
  const affordable = stakeValid && stake <= balance;
  const [rules, setRules] = useState(false);

  const [pending, setPending] = useState(false);
  const pendingKey = useRef<{ key: string; stake: number } | null>(null);
  async function create() {
    if (pending || !profile || !stakeValid || !affordable) return;
    setPending(true);
    if (pendingKey.current?.stake !== stake) pendingKey.current = { key: crypto.randomUUID(), stake };
    const { data, error } = await slotCreate(stake, pendingKey.current.key);
    setPending(false);
    if (error) {
      toast.error(friendlyError(error));
      if (!/fetch|network/i.test(error.message)) pendingKey.current = null;
      return;
    }
    pendingKey.current = null;
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["slot-open"] });
    navigate({ to: "/slott/$gameId", params: { gameId: String((data as { game_id: number }).game_id) } });
  }

  const demo = useDemo();
  const d = demo.i >= 0 ? DEMOS[demo.i % DEMOS.length]! : null;
  const score = useMemo(() => (d ? scoreGrid(d.grid) : null), [d]);
  const highlight = useMemo(() => (score && demo.landed ? hitCells(score.lines, winLevel(score.lineScore, !!d?.tier) >= 2) : NO_HITS), [score, demo.landed, d]);
  const demoBonus = d?.tier ? { tier: d.tier, cents: Math.min(Math.floor((stake * (d.bps ?? 0)) / 10000), cap) } : null;
  const best = score?.lines.length ? [...score.lines].sort((a, b) => b.score - a.score)[0]! : null;
  const event =
    d && demo.landed && demoBonus ? (
      <>Demo · {score!.wilds} WILDs hit — <span className="font-semibold text-gold">+{formatUsd(demoBonus.cents)} bonus</span> would go to the shared pot</>
    ) : d && demo.landed && best ? (
      `Demo · ${best.count}× ${SYMBOLS[best.symbol]!.name} line · +${score!.score} points`
    ) : (
      TIPS[(Math.max(0, demo.i) % (TIPS.length - 1)) + 1]
    );

  const openRows = open.data ?? [];
  const mine = mineQ.isSuccess ? mineQ.data : openRows.find((g) => g.creator_id === userId) ?? null;
  const mineLive = mine && (mine.status === "WAITING" || mine.status === "ACTIVE" || mine.status === "SETTLEMENT") ? mine : null;
  const mineWaiting = mineLive?.status === "WAITING";
  const othersOpen = openRows.filter((g) => g.id !== mineLive?.id);
  const others = othersOpen.filter((g) => g.creator_id !== userId);
  const [openPage, setOpenPage] = useState(0);
  const openPages = Math.max(1, Math.ceil(othersOpen.length / RECENT_PAGE_SIZE));
  const openSlice = othersOpen.slice(openPage * RECENT_PAGE_SIZE, openPage * RECENT_PAGE_SIZE + RECENT_PAGE_SIZE);
  useEffect(() => {
    if (openPage > openPages - 1) setOpenPage(Math.max(0, openPages - 1));
  }, [openPage, openPages]);
  const seenStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!mineLive) return;
    const prev = seenStatus.current;
    seenStatus.current = `${mineLive.id}:${mineLive.status}`;
    if (prev === `${mineLive.id}:WAITING` && mineLive.status === "ACTIVE") {
      navigate({ to: "/slott/$gameId", params: { gameId: String(mineLive.id) } });
    }
  }, [mineLive, navigate]);
  const signedOut = !userId && (ready || !hint);
  const balanceLoading = !userId || wallet.isPending;

  const button = signedOut
    ? { label: "SIGN IN", onClick: () => navigate({ to: "/auth" }) }
    : !profile && needsProfile
      ? { label: "SETUP", disabled: true }
      : !stakeValid
        ? { label: "CREATE", disabled: true }
        : !affordable && !balanceLoading
          ? { label: "DEPOSIT", onClick: () => navigate({ to: "/wallet" }) }
          : { label: pending ? "…" : "CREATE", onClick: create, disabled: pending || !profile || balanceLoading || cfg.isError, pulse: !pending && !!profile && !balanceLoading };
  const slipAction =
    button.label === "DEPOSIT"
      ? { label: "Deposit to play", onClick: button.onClick }
      : button.label === "SETUP"
        ? { label: "Finish your profile", disabled: true }
        : { label: pending ? "Creating…" : "Create match", amount: stakeValid ? stake : undefined, onClick: create, disabled: !stakeValid || button.disabled };

  const meAvatar = (size: number) =>
    userId ? (
      <PlayerPrestigeIdentity avatar={profile?.avatar_url} name={profile?.username} frame={style.frame} crown={style.crown} level={prestige.state?.level} tier={prestige.state?.tier} size={size} reserveHeadroom={size > 40} />
    ) : (
      <Mystery size={size} />
    );
  const seatA = (compact: boolean) => (
    <SeatPanel
      compact={compact}
      seat="A"
      avatar={meAvatar(compact ? 30 : 72)}
      name={profile?.username ?? "You"}
      stake={stake}
      badge={signedOut ? null : "YOU"}
      active
      status={
        compact ? (signedOut ? "SIGN IN" : "READY") : signedOut ? (
          <Button asChild size="sm" className="w-full font-display"><Link to="/auth">Sign in to play</Link></Button>
        ) : (
          <PlayButton {...slipAction} className="mt-0" />
        )
      }
    />
  );
  const seatB = (compact: boolean) => (
    <SeatPanel
      compact={compact}
      seat="B"
      avatar={<Mystery size={compact ? 30 : 72} />}
      name={mineWaiting ? "Waiting for you…" : "Challenger"}
      stake={stake}
      status={
        compact ? (
          mineWaiting ? "YOUR MATCH IS OPEN" : others.length ? `${others.length} OPEN` : "WAITING…"
        ) : mine ? (
          <Button asChild size="sm" variant="secondary" className="w-full"><Link to="/slott/$gameId" params={{ gameId: String(mine.id) }}>{mineWaiting ? "Your open match →" : "Your match started — play →"}</Link></Button>
        ) : others.length ? (
          <Button asChild size="sm" variant="secondary" className="w-full"><a href="#slott-challenges">{others.length} open · accept one</a></Button>
        ) : (
          <div className="rounded-xl border border-border py-2.5 text-[11px] tracking-wider text-muted-foreground">WAITING…</div>
        )
      }
    />
  );

  const desktop = useDesktop();
  const [machineW, setMachineW] = useState<number | null>(null);
  const fitMachine = useCallback(
    (w: number, colW: number | undefined) =>
      setMachineW((p) => {
        // Keep the CSS width while the fit agrees with it, so the painted machine never nudges.
        if (p == null) return colW != null && Math.abs(colW - w) < 1.5 ? null : Math.ceil(w);
        return Math.abs(p - w) < 2 ? p : Math.ceil(w);
      }),
    [],
  );
  useEffect(() => {
    const reset = () => setMachineW(null);
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);
  const shake = demo.landed && d?.tier ? `demo:${demo.i}` : null;
  const reels = (
    <Reels
      spin={demo.spin}
      grid={d?.grid ?? IDLE_GRID}
      highlight={highlight}
      landed={demo.landed}
      seamless
      fx={
        <>
          {d && demo.landed && score ? <SpinFx key={demo.i} grid={d.grid} lines={score.lines} score={score.score} bonus={demoBonus} /> : null}
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.18em] text-white/70">DEMO</span>
        </>
      }
    />
  );
  const header = (
    <div className="mb-2 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p aria-hidden="true" className="font-display text-xl leading-tight sm:text-2xl">P2P Slott</p>
        <p className="truncate text-[11px] text-muted-foreground short:hidden sm:text-xs">1 vs 1 slot duel · the other player is your only opponent</p>
      </div>
      <button type="button" onClick={() => setRules(true)} className="slott-chip flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-soft">
        <BookOpen className="h-3.5 w-3.5" /> How it works
      </button>
    </div>
  );
  const rulesDialog = <HowItWorks open={rules} onOpenChange={setRules} tiers={cfg.data?.tiers ?? []} stake={stake} bonusCap={cap} />;

  const desktopTree = (
        <div className="grid h-full min-h-0 grid-cols-[minmax(240px,25fr)_minmax(240px,26fr)_auto] items-stretch gap-3 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <section aria-label="Create a match" className="slott-card shrink-0 p-3">
              <CardTitle icon={<Sparkles className="h-4 w-4" />} title="Create match" sub="Challenge another player and win the pot" />
              <div className="slott-row mt-3 flex items-center gap-2 rounded-xl p-2">
                <div className="flex shrink-0">{meAvatar(36)}</div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex min-w-0 items-center gap-1">
                    <div className="truncate text-sm font-semibold">{profile?.username ?? (signedOut ? "Sign in to play" : "You")}</div>
                    {!signedOut ? <span className="shrink-0 rounded bg-primary/30 px-1 text-[8px] text-foreground">YOU</span> : null}
                  </div>
                  {!signedOut ? <div className="tabular text-[10px] text-muted-foreground">Balance {balanceLoading ? "—" : formatUsd(balance)}</div> : null}
                </div>
                <span className="font-display text-xs text-muted-foreground">VS</span>
                <div className="min-w-0 flex-1 text-right leading-tight">
                  <div className="truncate text-sm font-semibold">{mineWaiting ? "Waiting…" : "Challenger"}</div>
                  <div className="text-[10px] text-muted-foreground">Equal stake</div>
                </div>
                <div className="shrink-0"><Mystery size={36} /></div>
              </div>

              <StakeField id="slott-stake" stakes={stakes} amount={amount} cents={stakeValid ? stake : null} min={stakeMin} max={stakeMax} onAmount={editAmount} onPick={setStake} />

              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-gold/40 bg-[linear-gradient(100deg,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_70%)] px-2.5 py-2 shadow-[0_0_22px_-14px_var(--gold)]">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">+ Bonus</div>
                  <div className="truncate text-[11px] text-muted-foreground">WILDs add it to the pot</div>
                </div>
                <div key={stakePicks} className={cn("tabular shrink-0 text-right leading-none", stakePicks > 0 && "slott-bonus-pop")}>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-gold/80">up to</div>
                  <div className="font-display text-lg text-gold">{formatUsd(cap)}</div>
                </div>
              </div>

              {signedOut ? (
                <SignInPlayButton className="slott-cta h-12" />
              ) : (
                <PlayButton {...slipAction} className={cn("slott-cta h-12", button.pulse && "slott-cta-live")} />
              )}
              {mineLive ? (
                <Link to="/slott/$gameId" params={{ gameId: String(mineLive.id) }} className="mt-1.5 block text-center text-[11px] font-semibold text-primary-soft hover:underline">
                  {mineWaiting ? `Your ${formatUsd(mineLive.stake)} match is open →` : `Opponent joined — play your ${formatUsd(mineLive.stake)} match →`}
                </Link>
              ) : null}
            </section>

            <section aria-label="Recent games" className="slott-card flex min-h-0 flex-1 flex-col overflow-hidden p-3" {...recent.pauseProps}>
              <CardTitle icon={<History className="h-4 w-4" />} title="Recent games" />
              <div className="mt-2">
                <MatchList rows={recent.rows} loading={recent.isLoading} kind="recent" paintedAt={paintedAt} empty={<p className="py-4 text-center text-xs text-muted-foreground">No finished matches yet.</p>} />
              </div>
              {recent.rows.length ? (
                <div className="-mx-3 mt-auto mb-1">
                  <RecentPager page={recent.page} hasPrev={recent.hasPrev} hasNext={recent.hasNext} onPrev={recent.prev} onNext={recent.next} />
                </div>
              ) : null}
            </section>
          </div>

          <section aria-label="Open matches" className="slott-card flex min-h-0 min-w-0 flex-col overflow-hidden p-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle icon={<Users className="h-4 w-4" />} title="Open matches" count={cfg.isError ? undefined : othersOpen.length} live />
              <button type="button" onClick={() => setRules(true)} className="slott-row flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary-soft">
                <BookOpen className="h-3.5 w-3.5" /> How it works
              </button>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
              {cfg.isError ? (
                <LobbyEmpty title="P2P Slott is coming online" text="Matches open here shortly." />
              ) : (
                <>
                  {mineLive ? <YourMatch g={mineLive} started={!mineWaiting} /> : null}
                  <MatchList
                    rows={openSlice}
                    loading={openLoading && !mineLive}
                    kind="open"
                    empty={
                      mineLive ? null : (
                        <LobbyEmpty
                          title="No open matches right now"
                          text="Be the first to create a match, or check back soon."
                          action={
                            signedOut ? (
                              <Link to="/auth" className="slott-row rounded-lg px-4 py-1.5 text-xs font-semibold text-primary-soft">Sign in to play</Link>
                            ) : slipAction.onClick ? (
                              <button type="button" onClick={slipAction.onClick} disabled={slipAction.disabled} className="slott-row rounded-lg px-4 py-1.5 text-xs font-semibold text-primary-soft disabled:opacity-50">
                                {slipAction.label}
                              </button>
                            ) : null
                          }
                        />
                      )
                    }
                  />
                </>
              )}
            </div>
            {othersOpen.length > RECENT_PAGE_SIZE ? (
              <div className="-mx-3 -mb-3 mt-auto">
                <RecentPager
                  page={openPage}
                  hasPrev={openPage > 0}
                  hasNext={openPage < openPages - 1}
                  onPrev={() => setOpenPage((p) => Math.max(0, p - 1))}
                  onNext={() => setOpenPage((p) => Math.min(openPages - 1, p + 1))}
                />
              </div>
            ) : null}
          </section>

          <div data-fit-top={PIN_TOP} className="flex min-h-0 min-w-0 items-stretch justify-end" style={{ width: machineW ?? MACHINE_W }}>
            <SlotCabinet
              edge
              shake={shake}
              reels={reels}
              event={event}
              onFit={fitMachine}
              className="my-auto w-full"
            />
          </div>
        </div>
  );

  const mobileTree = (
    <>
      {header}

      <div className="mx-auto max-w-6xl">
        <SlotCabinet
          shake={shake}
          top={<PotHeader match={stake} pot={pot} bonus={0} maxWin={win + cap} bonusText={`BONUS up to ${formatUsd(cap)}`} />}
          seats={<>{seatA(true)}{seatB(true)}</>}
          left={seatA(false)}
          right={seatB(false)}
          reels={reels}
          event={event}
          bottom={
              <div className="mt-2">
                <div className="flex items-baseline justify-between gap-2 px-0.5">
                  {!signedOut ? <span className="tabular ml-auto text-[11px] text-muted-foreground">Balance <span className="inline-block min-w-[3.25rem] text-right font-semibold text-foreground">{balanceLoading ? "—" : formatUsd(balance)}</span></span> : null}
                </div>
                <StakeField id="slott-stake-mobile" stakes={stakes} amount={amount} cents={stakeValid ? stake : null} min={stakeMin} max={stakeMax} onAmount={editAmount} onPick={setStake} />
              {signedOut ? (
                <Link to="/auth" className="slott-cta mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-[15px] tracking-wide text-white">
                  <Zap className="h-4 w-4 fill-current" /> Sign in to play
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={slipAction.onClick}
                  disabled={slipAction.disabled}
                  className={cn("slott-cta mt-2 flex h-12 w-full items-center justify-between gap-3 rounded-xl px-4 font-display text-[15px] tracking-wide text-white", button.pulse && "slott-cta-live")}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <Zap className="h-4 w-4 shrink-0 fill-current" />
                    {slipAction.label}
                  </span>
                  {slipAction.amount != null ? <span className="tabular shrink-0 rounded-lg bg-black/25 px-2 py-0.5 text-sm">{formatUsd(slipAction.amount)}</span> : null}
                </button>
              )}
              {mine && mineWaiting ? (
                <Link to="/slott/$gameId" params={{ gameId: String(mine.id) }} className="mt-1.5 block text-center text-[11px] font-semibold text-primary-soft">
                  Your {formatUsd(mine.stake)} match is open →
                </Link>
              ) : null}
            </div>
          }
        />

        <StepRail slim onOpen={() => setRules(true)} className="mt-2.5" />

        {cfg.isError ? (
          <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">P2P Slott is coming online. Matches open here shortly.</p>
        ) : (
          <div className="mt-5 space-y-5">
            {mineLive ? <YourMatch g={mineLive} started={!mineWaiting} /> : null}
            <Section id="slott-challenges" title="Challenges waiting" empty="No open challenges. Set your bet and press CREATE — the first player to accept joins your match." rows={othersOpen} loading={openLoading} kind="open" />
            <section className="slott-card overflow-hidden p-3" {...recent.pauseProps}>
              <CardTitle icon={<History className="h-4 w-4" />} title="Recent results" />
              <div className="mt-2">
                <MatchList rows={recent.rows} loading={recent.isLoading} kind="recent" paintedAt={paintedAt} empty={<p className="py-4 text-center text-xs text-muted-foreground">No finished matches yet.</p>} />
              </div>
              {recent.rows.length ? (
                <div className="-mx-3 -mb-3">
                  <RecentPager page={recent.page} hasPrev={recent.hasPrev} hasNext={recent.hasNext} onPrev={recent.prev} onNext={recent.next} />
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </>
  );

  // Until hydration both layouts are in the document and CSS shows the right one; after
  // that only the matching tree stays mounted (its wrapper element is kept, so no remount).
  return (
    <>
      <h1 className="sr-only">P2P Slott</h1>
      {desktop !== false ? <div className={desktop ? "contents" : "hidden lg:contents"}>{desktopTree}</div> : null}
      {desktop !== true ? <div className={desktop === false ? undefined : "lg:hidden"}>{mobileTree}</div> : null}
      {rulesDialog}
    </>
  );
}

function Mystery({ size }: { size: number }) {
  return (
    <div className="grid place-items-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 font-display text-primary-soft" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      ?
    </div>
  );
}

function CardTitle({ icon, title, sub, count, live }: { icon: ReactNode; title: string; sub?: string; count?: number | undefined; live?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-soft">{icon}</div>
      <div className="min-w-0 leading-tight">
        <h2 className="flex items-center gap-2 font-display text-sm tracking-wide">
          {title}
          {count != null ? (
            <span className="slott-count tabular flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold text-muted-foreground">
              {live ? <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_var(--success)]" /> : null}
              {count}
            </span>
          ) : null}
        </h2>
        {sub ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

function YourMatch({ g, started }: { g: SlotGameView; started: boolean }) {
  return (
    <Link
      to="/slott/$gameId"
      params={{ gameId: String(g.id) }}
      className="mb-2 flex items-center gap-2.5 rounded-xl border border-primary/50 bg-primary/15 px-2.5 py-2 shadow-[0_0_22px_-12px_var(--primary)]"
    >
      <PlayerAvatar name={g.creator?.username} src={g.creator?.avatar_url} className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-semibold">{started ? "Opponent joined" : "Your match is open"}</div>
        <div className="tabular truncate text-[11px] text-muted-foreground">
          {formatUsd(g.stake)} each · {started ? "play now, your turn is running" : "waiting for a rival"}
        </div>
      </div>
      <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 font-display text-xs text-primary-foreground">{started ? "Play" : "Open"}</span>
    </Link>
  );
}

const chip = "tabular rounded-lg border py-1.5 text-xs font-semibold transition active:scale-95";

function StakeField({ id, stakes, amount, cents, min, max, onAmount, onPick }: { id: string; stakes: readonly number[]; amount: string; cents: number | null; min: number; max: number; onAmount: (next: string) => void; onPick: (cents: number) => void }) {
  const invalid = cents == null;
  return (
    <div className="mt-3">
      <label htmlFor={id} className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Stake each</label>
      <div className={cn("mt-1.5 flex h-10 items-center gap-1 rounded-xl border bg-background pl-3 pr-2 focus-within:ring-2 focus-within:ring-ring", invalid ? "border-destructive/60" : "border-input")}>
        <span className="text-muted-foreground">$</span>
        <input
          id={id}
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-invalid={invalid}
          className="tabular h-full w-full min-w-0 bg-transparent px-1 text-base font-semibold outline-none"
        />
        <span className="shrink-0 text-[10px] text-muted-foreground">{formatUsd(min).replace(".00", "")}–{formatUsd(max).replace(".00", "")}</span>
      </div>
      <div className="mt-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(stakes.length, 6)}, minmax(0, 1fr))` }}>
        {stakes.map((s) => (
          <button key={s} type="button" aria-pressed={s === cents} onClick={() => onPick(s)} className={cn(chip, s === cents ? "border-primary bg-primary/15 text-primary-soft" : "border-border bg-secondary/60 text-foreground/85 hover:border-primary/50")}>
            {formatUsd(s).replace(".00", "")}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchList({ rows, loading, kind, empty, paintedAt }: { rows: SlotGameView[] | undefined; loading?: boolean; kind: "open" | "recent"; empty: ReactNode; paintedAt?: number | undefined }) {
  if (loading) return <div className="grid gap-1.5">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>;
  if (!rows?.length) return <>{empty}</>;
  return <div className="grid gap-1.5">{rows.map((g) => <MatchCard key={g.id} g={g} kind={kind} paintedAt={paintedAt} {...(kind === "open" ? { lobby: true } : { dense: true })} />)}</div>;
}

function LobbyEmpty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-4 grid h-20 w-20 place-items-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary-soft">
          <Users className="h-7 w-7" />
        </div>
      </div>
      <p className="font-display text-sm">{title}</p>
      <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function Section({ id, title, empty, rows, loading, kind, narrow, dense }: { id?: string; title: string; empty?: string; rows: SlotGameView[] | undefined; loading?: boolean; kind: "open" | "recent"; narrow?: boolean; dense?: boolean }) {
  const grid = cn(dense ? "mt-1 grid gap-1 @[520px]:grid-cols-2" : "mt-2 grid gap-2", !dense && (narrow ? "xl:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"));
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className={cn("font-display uppercase tracking-widest text-muted-foreground", dense ? "text-[10px]" : "text-xs")}>
        {title}
        {rows?.length ? <span className="ml-1.5 text-primary-soft">{rows.length}</span> : null}
      </h2>
      {loading ? (
        <div className={grid}>{[0, 1].map((i) => <div key={i} className={cn("animate-pulse rounded-lg bg-card", dense ? "h-8" : "h-[74px] rounded-xl")} />)}</div>
      ) : !rows?.length ? (
        <p className={cn("border border-dashed border-border text-center text-muted-foreground", dense ? "mt-1 rounded-lg px-2 py-1.5 text-[11px]" : "mt-2 rounded-xl px-4 py-5 text-sm")}>{empty}</p>
      ) : (
        <div className={grid}>{rows.map((g) => <MatchCard key={g.id} g={g} kind={kind} {...(dense ? { dense: true } : {})} />)}</div>
      )}
    </section>
  );
}

function MatchCard({ g, kind, dense, lobby, paintedAt }: { g: SlotGameView; kind: "open" | "recent"; dense?: boolean; lobby?: boolean; paintedAt?: number | undefined }) {
  const { userId, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const key = useRef<string | null>(null);
  const mine = g.creator_id === userId;
  async function join() {
    if (pending) return;
    setPending(true);
    key.current ??= crypto.randomUUID();
    const { error } = await slotJoin(g.id, key.current);
    setPending(false);
    if (error) {
      toast.error(friendlyError(error));
      if (!/fetch|network/i.test(error.message)) key.current = null;
      return;
    }
    qc.invalidateQueries({ queryKey: ["wallet"] });
    navigate({ to: "/slott/$gameId", params: { gameId: String(g.id) } });
  }
  const winner = g.winner_id === g.creator_id ? g.creator : g.winner_id === g.opponent_id ? g.opponent : null;
  if (lobby) {
    return (
      <div className="slott-row flex min-w-0 items-center gap-2.5 rounded-xl p-2">
        <PlayerAvatar name={g.creator?.username} src={g.creator?.avatar_url} className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{g.creator?.username ?? "player"}</div>
          <div className="tabular truncate text-[11px] text-muted-foreground">
            Pot {formatUsd(g.stake * 2)} · win <span className="text-success">{formatUsd(winAmount(g))}</span>
          </div>
        </div>
        <div className="tabular shrink-0 text-right leading-tight">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Entry</div>
          <div className="text-sm font-semibold">{formatUsd(g.stake)}</div>
        </div>
        {!mine && userId && profile ? (
          <Button size="sm" onClick={join} disabled={pending} className="h-8 shrink-0 px-2.5 font-display">
            <Zap className="h-3.5 w-3.5 fill-current" /> Join
          </Button>
        ) : mine ? (
          <Link to="/slott/$gameId" params={{ gameId: String(g.id) }} className="shrink-0 rounded-lg bg-primary px-2.5 py-1 font-display text-xs text-primary-foreground">Open</Link>
        ) : (
          <Button asChild size="sm" variant="secondary" className="h-8 shrink-0 px-2.5">
            <Link to="/slott/$gameId" params={{ gameId: String(g.id) }}>View</Link>
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className={cn("slott-chip flex min-w-0 items-center", dense ? "gap-1.5 rounded-lg p-1.5" : "gap-3 rounded-xl p-3")}>
      <div className="flex shrink-0 -space-x-2">
        <PlayerAvatar name={g.creator?.username} src={g.creator?.avatar_url} className={cn("ring-2 ring-background", dense ? "h-6 w-6" : "h-[34px] w-[34px]")} />
        {g.opponent_id ? (
          <PlayerAvatar name={g.opponent?.username} src={g.opponent?.avatar_url} className={cn("ring-2 ring-background", dense ? "h-6 w-6" : "h-[34px] w-[34px]")} />
        ) : (
          <div className={cn("grid place-items-center rounded-full border-2 border-dashed border-primary/40 bg-background text-primary-soft", dense ? "h-6 w-6 text-[10px]" : "h-[34px] w-[34px] text-xs")}>?</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate font-semibold", dense ? "text-xs" : "text-sm")}>
          {g.creator?.username ?? "player"}
          <span className="text-muted-foreground"> vs </span>
          {g.opponent_id ? (g.opponent?.username ?? "player") : mine ? "waiting…" : "you?"}
        </div>
        <div className="tabular truncate text-[11px] text-muted-foreground">
          {formatUsd(g.stake)} each · win {formatUsd(winAmount(g))}
          {kind === "recent" ? (
            <>
              {" "}· {g.outcome === "DRAW" ? "draw" : `${winner?.username ?? "player"} won ${g.score_a}–${g.score_b}`}
              {g.bonus_total > 0 ? <span className="text-gold"> · +{formatUsd(g.bonus_total)} bonus</span> : null} · <span suppressHydrationWarning>{timeAgo(g.completed_at ?? g.created_at, paintedAt)}</span>
            </>
          ) : null}
        </div>
      </div>
      {kind === "open" && !mine && userId && profile ? (
        <Button size="sm" onClick={join} disabled={pending} className={cn("shrink-0 font-display", dense && "h-7 px-2")}>
          <Zap className="h-3.5 w-3.5 fill-current" /> Accept
        </Button>
      ) : (
        <Button asChild size="sm" variant="secondary" className={cn("shrink-0", dense && "h-7 px-2")}>
          <Link to="/slott/$gameId" params={{ gameId: String(g.id) }}>{kind === "open" && mine ? "Open" : "View"}</Link>
        </Button>
      )}
    </div>
  );
}
