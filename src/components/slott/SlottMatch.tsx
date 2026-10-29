import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Gem, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { serverOffset, useServerClock, useWalletRealtime } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { useBotConfig } from "@/lib/bots";
import { emitSound } from "@/lib/sound";
import { channelFresh, channelLive } from "@/lib/live-channel";
import { SLOT_FRESH_MS, slotRefetchMs } from "@/lib/slott/poll";
import { PlayerPrestigeIdentity } from "@/components/prestige/PlayerPrestigeIdentity";
import { usePrestigeIdentities } from "@/components/prestige/PrestigeProvider";
import type { PrestigeIdentity } from "@/lib/prestige/api";
import {
  fetchOpenSlots,
  fetchSlotBonuses,
  fetchSlotGame,
  slotCreate,
  fetchSlotSpins,
  seatOf,
  slotCallBot,
  slotJoin,
  slotSpin,
  turnSeat,
  useSlotRealtime,
  winAmount,
  type SlotBonusEvent,
  type SlotGameView,
  type SlotSpin,
} from "@/lib/slott/api";
import { verifySlott, type SlottCheck } from "@/lib/fairness/slott";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reels } from "./Reels";
import { SpinFx } from "./SpinFx";
import { hitCells, NO_HITS, spinReveal, winLevel } from "./hits";
import { admitSpin, reuseSpinKey } from "./spin-guard";
import { BOMB, hasBomb, SYMBOLS } from "@/lib/slott/paytable";
import {
  mergeSlotSpins,
  preferNewerSlotGame,
  reconcileAfter,
  slotSpinCursor,
} from "@/lib/slott/reconcile";
import { SYMBOL_IMG } from "@/lib/slott/symbols";
import {
  bindSlotAudio,
  playBombSfx,
  playHitSfx,
  playMatchSfx,
  playReelSpin,
  playStingSfx,
  playTallySfx,
} from "./sfx";
import { isBaseFinalSpin } from "./presentation";
import {
  AuxButton,
  BetChip,
  BottomBar,
  PotHeader,
  SeatPanel,
  SideControls,
  SidePot,
  SlotCabinet,
} from "./SlotCabinet";
import { TargetChip } from "./SpinFx";
import { scoreFxEndMs } from "./strike";
import { reelValues, TALLY_STEP_MS, tallyEndMs, tallyStartMs } from "./tally";
import { IDLE_GRID, landedAt, presentSpinStart, spinArrivedLive, type ReelSpin } from "./timing";
import { useNextInstant } from "./moment";

const Celebration = lazy(() =>
  import("@/components/jackpot/Celebration").then((m) => ({ default: m.Celebration })),
);

const TIER_LABEL: Record<string, string> = {
  WILD: "WILD",
  MEGA_WILD: "MEGA WILD",
  GOLDEN_WILD: "GOLDEN WILD",
  JACKPOT_WILD: "JACKPOT WILD",
};
const tierLabel = (t: string) => TIER_LABEL[t] ?? t.replace(/_/g, " ");
const fmtLeft = (s: number) => (s < 10 ? s.toFixed(1) : String(Math.ceil(s)));
const toLocal = (iso: string) => new Date(iso).getTime() - serverOffset();
/** Win effects only replay for spins that landed this recently (not on page load). */
const FX_WINDOW_MS = 4000;

export function SlottMatch({ id }: { id: number }) {
  const { userId, profile } = useAuth();
  const bots = useBotConfig();
  useEffect(() => bindSlotAudio(), []);
  useWalletRealtime(userId);
  useSlotRealtime(id);
  const qc = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      qc.invalidateQueries({ queryKey: ["slot", id] });
      qc.invalidateQueries({ queryKey: ["slot-spins", id] });
      qc.invalidateQueries({ queryKey: ["slot-bonus", id] });
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [id, qc]);
  const live = (s?: string) => s === "ACTIVE" || s === "SETTLEMENT";
  const gq = useQuery({
    queryKey: ["slot", id],
    queryFn: () =>
      reconcileAfter(
        () => fetchSlotGame(id),
        () => qc.getQueryData<SlotGameView | null>(["slot", id]),
        preferNewerSlotGame,
      ),
    refetchInterval: (q) =>
      slotRefetchMs({
        kind: "game",
        status: q.state.data?.status,
        channelUp: channelLive("slot"),
        fresh: channelFresh(`slot:${id}`, SLOT_FRESH_MS, Date.now(), "slot"),
      }),
  });
  const g = gq.data ?? null;
  const sq = useQuery({
    queryKey: ["slot-spins", id],
    queryFn: () =>
      reconcileAfter(
        () => fetchSlotSpins(id, slotSpinCursor(qc.getQueryData<SlotSpin[]>(["slot-spins", id]))),
        () => qc.getQueryData<SlotSpin[]>(["slot-spins", id]),
        mergeSlotSpins,
      ),
    enabled: !!g && g.status !== "WAITING",
    refetchInterval: () =>
      slotRefetchMs({
        kind: "spins",
        status: g?.status,
        channelUp: channelLive("slot"),
        fresh: channelFresh(`slot:${id}`, SLOT_FRESH_MS, Date.now(), "slot"),
      }),
  });
  const bq = useQuery({
    queryKey: ["slot-bonus", id],
    queryFn: () => fetchSlotBonuses(id),
    enabled: !!g && g.status !== "WAITING",
    refetchInterval: () =>
      slotRefetchMs({
        kind: "bonus",
        status: g?.status,
        channelUp: channelLive("slot"),
        fresh: channelFresh(`slot:${id}`, SLOT_FRESH_MS, Date.now(), "slot"),
      }),
  });
  const identities = usePrestigeIdentities(
    [g?.creator_id, g?.opponent_id].filter((x): x is string => !!x),
  );
  const spins = sq.data ?? [];
  const bonuses = bq.data ?? [];

  const offset = serverOffset();
  const me = g ? seatOf(g, userId) : null;
  const spinMs = g?.spin_ms ?? 3200;
  const latest = spins.length ? spins[spins.length - 1]! : null;
  const kick = useRef<{ spinNo: number; at: number } | null>(null);
  const shown = useRef(new Map<string, { startAt: number; durationMs: number } | null>());
  /** Spin already on the board when this view armed. Later spins always play. */
  const openedOn = useRef<number | null | undefined>(undefined);
  const [kickTick, setKickTick] = useState(0);
  const boardReady = sq.isFetched || g?.status === "WAITING";
  const reelSpin: ReelSpin | null = useMemo(() => {
    if (openedOn.current === undefined && boardReady) openedOn.current = latest?.spin_no ?? null;
    const kicked = kick.current;
    const waiting = !!kicked && (!latest || latest.spin_no < kicked.spinNo);
    if (waiting && g) {
      const prev = latest?.grid ?? IDLE_GRID;
      const key = `${id}:${kicked.spinNo}`;
      // Same key and clock the result will reuse, so the reels are not torn down
      // and restarted when the server row arrives.
      const cached = shown.current.get(key);
      const timing = cached ?? { startAt: kicked.at, durationMs: g.spin_ms };
      if (!cached) shown.current.set(key, timing);
      return { key, grid: prev, prev, startAt: timing.startAt, durationMs: timing.durationMs };
    }
    if (!latest || !g) return null;
    const key = `${id}:${latest.spin_no}`;
    const prev = spins.length > 1 ? spins[spins.length - 2]!.grid : IDLE_GRID;
    const clickedAt = kicked?.spinNo === latest.spin_no ? kicked.at : null;
    const liveArrival = spinArrivedLive(openedOn.current, latest.spin_no);
    if (shown.current.has(key)) {
      const cached = shown.current.get(key);
      if (cached) {
        return {
          key,
          grid: latest.grid,
          prev,
          startAt: cached.startAt,
          durationMs: cached.durationMs,
        };
      }
      if (!liveArrival && clickedAt == null) return null;
      shown.current.delete(key);
    }
    if (!boardReady) return null;
    const serverStart = toLocal(latest.reveal_at) - spinMs;
    const decided = presentSpinStart(serverStart, g.spin_ms, Date.now(), clickedAt, liveArrival);
    shown.current.set(key, decided);
    if (!decided) return null;
    return {
      key,
      grid: latest.grid,
      prev,
      startAt: decided.startAt,
      durationMs: decided.durationMs,
    };
    // kickTick republishes the memo when a click starts or a click is dropped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.spin_no, latest?.reveal_at, id, g?.spin_ms, kickTick, spins.length, boardReady]);
  const showingLatest =
    !!reelSpin && !reelSpin.pending && !!latest && reelSpin.key === `${id}:${latest.spin_no}`;
  const latestStart = showingLatest
    ? reelSpin.startAt
    : latest
      ? toLocal(latest.reveal_at) - spinMs
      : 0;
  const latestLandAt = latest
    ? landedAt({
        grid: latest.grid,
        startAt: showingLatest ? reelSpin.startAt : latestStart,
        durationMs: showingLatest ? reelSpin.durationMs : spinMs,
      })
    : 0;
  const marks: number[] = [];
  if (latestLandAt > 0) {
    marks.push(latestLandAt);
    if (latest) {
      marks.push(latestLandAt + tallyEndMs(latest.lines));
      marks.push(latestLandAt + scoreFxEndMs(tallyStartMs(latest.lines)));
      marks.push(latestLandAt + FX_WINDOW_MS);
    }
  }
  if (reelSpin) marks.push(landedAt(reelSpin));
  if (g?.turn_opens_at) marks.push(new Date(g.turn_opens_at).getTime() - offset);
  if (g?.turn_deadline) marks.push(new Date(g.turn_deadline).getTime() - offset);
  const clockOn = live(g?.status) || marks.some((mark) => mark > Date.now());
  const ticked = useNextInstant(marks, clockOn);
  const now = clockOn ? ticked : Date.now();
  const snow = now + offset;
  const latestLanded = !latest || (reelSpin?.pending ? true : now >= latestLandAt);
  const landed = spins.filter((s) => s !== latest || latestLanded);
  const latestTallied =
    !latest || (reelSpin?.pending ? true : now >= latestLandAt + tallyEndMs(latest.lines));
  const counted = spins.filter((s) => s !== latest || latestTallied);
  const scoreA = counted.filter((s) => s.seat === "A").reduce((a, s) => a + s.score, 0);
  const scoreB = counted.filter((s) => s.seat === "B").reduce((a, s) => a + s.score, 0);
  const bonusShown = landed.reduce((a, s) => a + Number(s.bonus_cents), 0);

  const latestBonus = latest ? bonuses.find((b) => b.spin_no === latest.spin_no) : undefined;
  const bonusFx =
    latest && Number(latest.bonus_cents) > 0
      ? { tier: latestBonus?.tier ?? "WILD", cents: Number(latest.bonus_cents) }
      : null;
  const fresh = !!latest && latestLanded && !reelSpin?.pending && now - latestLandAt < FX_WINDOW_MS;
  // The callout waits a second, then holds. It clears before a newer spin can paint over it.
  const showHit =
    !!latest &&
    latestLanded &&
    !reelSpin?.pending &&
    now < latestLandAt + scoreFxEndMs(tallyStartMs(latest.lines));
  const level = latest
    ? winLevel(
        latest.lines.reduce((a, l) => a + l.score, 0),
        !!bonusFx,
      )
    : 0;
  const highlight = useMemo(
    () => (showHit && latest ? hitCells(latest.lines, level >= 2) : NO_HITS),
    [showHit, latest, level],
  );

  // Sounds follow what the viewer sees.
  const heard = useRef<string | null>(null);
  useEffect(() => {
    if (!latest) return;
    const spinKey = `${id}:${latest.spin_no}:spin`;
    const landKey = `${id}:${latest.spin_no}:land`;
    if (!latestLanded && reelSpin && !reelSpin.pending) {
      if (heard.current === spinKey) return;
      heard.current = spinKey;
      emitSound("spin_start");
      playReelSpin(reelSpin);
      return;
    }
    if (heard.current !== spinKey) {
      heard.current = landKey;
      return;
    }
    if (heard.current === landKey) return;
    heard.current = landKey;
    if (fresh && hasBomb(latest.grid)) {
      playBombSfx();
    } else if (fresh) {
      playHitSfx(latest.lines, level, !!bonusFx);
      playTallySfx(reelValues(latest.grid), tallyStartMs(latest.lines), TALLY_STEP_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest, latestLanded, reelSpin?.key]);

  // Lead changes are called out once the spin's points have counted in.
  const lead = Math.sign(scoreA - scoreB);
  const leadSeen = useRef<number | null>(null);
  const [callout, setCallout] = useState<{ key: number; seat: "A" | "B" } | null>(null);
  useEffect(() => {
    const prev = leadSeen.current;
    leadSeen.current = lead;
    if (prev == null || lead === 0 || lead === prev || !latest || !fresh) return;
    const seat = lead > 0 ? "A" : "B";
    setCallout({ key: latest.spin_no, seat });
    playStingSfx("lead", { volume: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);
  useEffect(() => {
    if (!callout) return;
    const t = setTimeout(() => setCallout(null), 1700);
    return () => clearTimeout(t);
  }, [callout]);

  const finished = g?.status === "COMPLETED" && latestTallied;
  const played = useRef(false);
  const sawLive = useRef(false);
  useEffect(() => {
    if (g && g.status !== "COMPLETED") sawLive.current = true;
  }, [g]);
  useEffect(() => {
    if (!finished || !g || played.current || !me) return;
    played.current = true;
    if (g.outcome === "WIN") {
      const won = g.winner_id === userId;
      emitSound(won ? "win" : "lose");
      if (sawLive.current) playMatchSfx(won ? "win" : "lose");
    } else if (g.outcome === "DRAW") {
      if (sawLive.current) playMatchSfx("draw");
    } else if (g.outcome === "BOMB") emitSound("lose");
    qc.invalidateQueries({ queryKey: ["wallet"] });
  }, [finished, g, me, userId, qc]);

  // Spin action: one idempotency key per spin number, reused on retry of this match only.
  const [pending, setPending] = useState(false);
  const [callingBot, setCallingBot] = useState(false);
  const [auto, setAuto] = useState(false);
  const [heldSpin, setHeldSpin] = useState<number | null>(null);
  const botKey = useRef(crypto.randomUUID());
  const keys = useRef(new Map<number, string>());
  const spinLock = useRef(false);
  const heldRef = useRef<number | null>(null);
  useEffect(() => {
    keys.current.clear();
    spinLock.current = false;
    heldRef.current = null;
    setHeldSpin(null);
    kick.current = null;
  }, [id]);
  useEffect(() => {
    if (heldRef.current != null && g && g.next_spin > heldRef.current) {
      heldRef.current = null;
      setHeldSpin(null);
    }
  }, [g, g?.next_spin]);
  const turn = g && g.status === "ACTIVE" && !g.ends_at ? turnSeat(g.next_spin) : null;
  const opensAt = g?.turn_opens_at ? new Date(g.turn_opens_at).getTime() : null;
  const deadline = g?.turn_deadline ? new Date(g.turn_deadline).getTime() : null;
  const turnOpen = !!turn && opensAt != null && snow >= opensAt && latestLanded;
  const myTurn = !!me && turn === me;
  const canSpin = myTurn && turnOpen && !pending && (g == null || heldSpin !== g.next_spin);

  async function doSpin() {
    if (!g) return;
    if (
      !admitSpin({
        locked: spinLock.current,
        held: heldRef.current,
        canSpin,
        nextSpin: g.next_spin,
      })
    )
      return;
    spinLock.current = true;
    const n = g.next_spin;
    heldRef.current = n;
    setHeldSpin(n);
    const key = keys.current.get(n) ?? crypto.randomUUID();
    keys.current.set(n, key);
    kick.current = { spinNo: n, at: Date.now() };
    setKickTick((tick) => tick + 1);
    setPending(true);
    try {
      const { data, error } = await slotSpin(g.id, n, key);
      if (error) {
        heldRef.current = null;
        setHeldSpin(null);
        if (!reuseSpinKey(error.message)) keys.current.delete(n);
        kick.current = null;
        shown.current.delete(`${id}:${n}`);
        setKickTick((tick) => tick + 1);
        if (!/STALE_ACTION|TURN_NOT_OPEN/.test(error.message)) toast.error(friendlyError(error));
        setAuto(false);
      } else if (data) {
        const r = data as {
          spin_no: number;
          seat: "A" | "B";
          grid: number[];
          score: number;
          wild_count: number;
          lines: SlotSpin["lines"];
          bonus_cents: number;
          reveal_at: string;
        };
        qc.setQueryData<SlotSpin[]>(["slot-spins", g.id], (old = []) =>
          old.some((s) => s.spin_no === r.spin_no)
            ? old
            : [
                ...old,
                {
                  game_id: g.id,
                  spin_no: r.spin_no,
                  seat: r.seat,
                  player_id: userId!,
                  auto: false,
                  grid: r.grid,
                  wild_count: r.wild_count,
                  base_score: 0,
                  line_score: 0,
                  score: r.score,
                  lines: r.lines,
                  bonus_cents: Number(r.bonus_cents),
                  created_at: r.reveal_at,
                  reveal_at: r.reveal_at,
                },
              ].sort((a, b) => a.spin_no - b.spin_no),
        );
      } else {
        heldRef.current = null;
        setHeldSpin(null);
      }
      qc.invalidateQueries({ queryKey: ["slot", id] });
      qc.invalidateQueries({ queryKey: ["slot-spins", id] });
      qc.invalidateQueries({ queryKey: ["slot-bonus", id] });
    } finally {
      spinLock.current = false;
      setPending(false);
    }
  }
  async function callBot() {
    if (callingBot || !bots.data?.slott || !g || me !== "A" || g.status !== "WAITING") return;
    setCallingBot(true);
    const { data, error } = await slotCallBot(g.id, botKey.current);
    setCallingBot(false);
    if (error) {
      if (!/fetch|network/i.test(error.message)) botKey.current = crypto.randomUUID();
      toast.error(friendlyError(error));
    } else if (data && data.joined === false && data.reason) {
      botKey.current = crypto.randomUUID();
      toast.error(friendlyError(new Error(data.reason)));
    } else {
      botKey.current = crypto.randomUUID();
    }
    void qc.invalidateQueries({ queryKey: ["slot", g.id] });
    void qc.invalidateQueries({ queryKey: ["wallet"] });
  }

  useEffect(() => {
    if (auto && canSpin && latestTallied) void doSpin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, canSpin, latestTallied, g?.next_spin]);

  if (gq.isLoading)
    return <div className="h-[calc(100dvh-8rem)] animate-pulse rounded-2xl bg-card" />;
  if (!g) return <p className="text-muted-foreground">Match not found.</p>;

  const perSeat = g.base_spins / 2;
  const doneA = landed.filter((s) => s.seat === "A").length;
  const doneB = landed.filter((s) => s.seat === "B").length;
  const total = g.p2p_pot + bonusShown;
  const maxWin = winAmount(g) + g.bonus_cap;
  const grid = latest ? latest.grid : IDLE_GRID;
  const spinning =
    (!!latest && !latestLanded) ||
    (!!kick.current && (!latest || latest.spin_no < kick.current.spinNo));
  const event = describeLatest(latest, latestLanded, bonuses, g, turn, me, deadline);

  // The challenger's deciding spin (even spin numbers from base_spins on) becomes a target chase.
  const deciding = (n: number) => n % 2 === 0 && n >= g.base_spins;
  const finalNo =
    latest && deciding(latest.spin_no)
      ? latest.spin_no
      : turn === "B" && deciding(g.next_spin) && latestTallied
        ? g.next_spin
        : null;
  const sumBefore = (s: "A" | "B", n: number) =>
    spins.filter((x) => x.seat === s && x.spin_no < n).reduce((a, x) => a + x.score, 0);
  const finalTarget =
    finalNo != null ? sumBefore("A", finalNo) - sumBefore("B", finalNo) + 1 : null;
  const finalChase = finalTarget != null && finalTarget > 0 ? finalTarget : null;
  const latestIsFinal = !!latest && latest.spin_no === finalNo;
  const focusNo =
    kick.current && (!latest || latest.spin_no < kick.current.spinNo)
      ? kick.current.spinNo
      : latest && !latestTallied
        ? latest.spin_no
        : turn && g.status === "ACTIVE"
          ? g.next_spin
          : null;
  const showFinalFlag =
    g.status === "ACTIVE" &&
    !finished &&
    finalChase == null &&
    focusNo != null &&
    isBaseFinalSpin(focusNo, perSeat);
  const reveal = latest
    ? spinReveal(latest, { A: whoName(g, "A"), B: whoName(g, "B") }, (id) => SYMBOLS[id]!.name)
    : null;

  const seat = (s: "A" | "B", compact: boolean) => {
    const uid = s === "A" ? g.creator_id : g.opponent_id;
    const p = s === "A" ? g.creator : g.opponent;
    const idn = uid ? identities.get(uid) : undefined;
    const active = turn === s;
    const won = g.status === "COMPLETED" && !!uid && g.winner_id === uid;
    const lost =
      g.status === "COMPLETED" && (g.outcome === "BOMB" || (g.outcome === "WIN" && !won));
    return (
      <SeatPanel
        compact={compact}
        seat={s}
        avatar={<Avatar uid={uid} p={p} idn={idn} size={compact ? 28 : 52} />}
        name={uid ? (p?.username ?? "player") : "Open seat"}
        stake={g.stake}
        active={active}
        dim={lost}
        badge={me === s ? "YOU" : p?.is_bot ? "BOT" : null}
        score={g.status === "WAITING" ? null : s === "A" ? scoreA : scoreB}
        spins={g.status === "WAITING" ? null : [s === "A" ? doneA : doneB, perSeat]}
        ahead={lead !== 0 && (s === "A" ? lead > 0 : lead < 0)}
        live={active && g.status === "ACTIVE"}
        status={
          compact ? (
            won ? (
              "WINNER"
            ) : active && g.status === "ACTIVE" ? (
              <>
                {me === s ? "YOUR TURN" : "SPINNING"}
                {deadline != null && !spinning ? (
                  <>
                    {" "}
                    · <LiveSeconds deadline={deadline} />
                  </>
                ) : null}
              </>
            ) : null
          ) : (
            <SeatStatus
              seat={s}
              g={g}
              active={active}
              won={won}
              isMe={me === s}
              deadline={spinning ? null : deadline}
              hasUser={!!uid}
            />
          )
        }
      />
    );
  };

  const controls = {
    button: {
      label:
        pending || (spinning && latest?.seat === me)
          ? "…"
          : g.status === "ACTIVE" && me && !myTurn
            ? "WAIT"
            : "SPIN",
      onClick: doSpin,
      disabled: !canSpin,
      pulse: canSpin,
      ariaLabel: "Spin",
      timer:
        myTurn && turnOpen && deadline != null
          ? {
              key: String(deadline),
              leftMs: deadline - snow,
              totalMs: Number(g.turn_seconds) * 1000,
            }
          : null,
    },
    aux:
      g.status === "WAITING" && me === "A" && bots.isSuccess ? (
        <div className="flex w-full flex-col items-center gap-0.5">
          <AuxButton
            onClick={() => void callBot()}
            disabled={callingBot || !bots.data?.slott}
            label="Call bot"
          >
            {callingBot ? "…" : "CALL BOT"}
          </AuxButton>
          <p className="text-center text-[10px] leading-tight text-muted-foreground">
            {bots.data?.slott
              ? "Play against an automated opponent."
              : "Automated opponents are not available right now."}
          </p>
        </div>
      ) : (
        <AuxButton
          onClick={() => setAuto(!auto)}
          disabled={!(g.status === "ACTIVE" && me)}
          active={auto}
          label="Auto spin"
        >
          AUTO
        </AuxButton>
      ),
    value: { label: "TOTAL PRIZE", amount: total },
  };

  return (
    <div>
      <h1 className="sr-only">P2P Slott match #{g.id}</h1>
      <div className="lg:h-[calc(100dvh-4rem)]">
        <SlotCabinet
          bleed
          className="lg:h-full"
          toolbar={
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs lg:mb-0 lg:px-1">
              <Link
                to="/slott"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> P2P Slott lobby
              </Link>
              <span className="tabular text-muted-foreground">Match #{g.id}</span>
            </div>
          }
          shake={fresh && level >= 2 ? `${latest!.spin_no}` : null}
          top={
            <PotHeader
              match={g.stake}
              pot={g.p2p_pot}
              bonus={bonusShown}
              maxWin={maxWin}
              bonusKey={bonusShown}
            />
          }
          seats={
            <>
              {seat("A", true)}
              {seat("B", true)}
            </>
          }
          duel={
            g.status === "WAITING" || g.status === "CANCELLED" ? null : (
              <DuelBar
                a={scoreA}
                b={scoreB}
                nameA={whoName(g, "A")}
                nameB={whoName(g, "B")}
                me={me}
                turn={turn}
                doneA={doneA}
                doneB={doneB}
                perSeat={perSeat}
                left={g.base_spins - Math.min(g.base_spins, landed.length)}
              />
            )
          }
          left={seat("A", false)}
          right={seat("B", false)}
          reels={
            <Reels
              spin={reelSpin}
              grid={grid}
              highlight={highlight}
              landed={!reelSpin || now >= landedAt(reelSpin)}
              fx={
                <>
                  {fresh && hasBomb(latest!.grid) ? (
                    <BombFx key={latest!.spin_no} who={whoName(g, latest!.seat)} />
                  ) : showHit ? (
                    <SpinFx
                      key={latest!.spin_no}
                      grid={latest!.grid}
                      lines={latest!.lines}
                      score={latest!.score}
                      bonus={bonusFx}
                      who={reveal?.who}
                      target={latestIsFinal ? finalChase : null}
                      onTarget={() => playStingSfx("target")}
                    />
                  ) : null}
                  {finalChase != null && !finished && !(latestIsFinal && latestLanded) ? (
                    <TargetChip target={finalChase} label={`${whoName(g, "B")} · FINAL SPIN`} />
                  ) : showFinalFlag ? (
                    <div className="pointer-events-none absolute inset-x-0 top-[5%] flex justify-center">
                      <div className="slott-final-flag">FINAL SPIN</div>
                    </div>
                  ) : null}
                  {callout ? (
                    <LeadCallout
                      key={callout.key}
                      name={whoName(g, callout.seat)}
                      you={callout.seat === me}
                      seat={callout.seat}
                    />
                  ) : null}
                  {g.status === "CANCELLED" ||
                  (finished && !(fresh && hasBomb(latest!.grid))) ||
                  (g.status === "WAITING" && me !== "A") ? (
                    <Overlay g={g} me={me} userId={userId} hasProfile={!!profile} spins={spins} />
                  ) : null}
                </>
              }
            />
          }
          event={event}
          asideLeft={
            <SidePot
              match={g.stake}
              pot={g.p2p_pot}
              bonus={bonusShown}
              maxWin={maxWin}
              bonusKey={bonusShown}
            />
          }
          asideRight={<SideControls {...controls} />}
          bottom={<BottomBar bet={<BetChip amount={g.stake} />} {...controls} />}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 lg:px-6 lg:pb-8">
        <EventFeed
          g={g}
          spins={landed}
          bonuses={bonuses.filter((b) => landed.some((s) => s.spin_no === b.spin_no))}
        />
        <FairnessPanel g={g} spins={spins} />
      </div>
      {finished && g.outcome === "WIN" && g.winner_id === userId ? (
        <Suspense fallback={null}>
          <Celebration />
        </Suspense>
      ) : null}
    </div>
  );
}

function BombFx({ who }: { who: string }) {
  return (
    <div className="slott-bomb-fx" role="status">
      <div className="slott-bomb-flash" />
      <div className="slott-bomb-ring" />
      <div className="slott-bomb-ring slott-bomb-ring-2" />
      <img src={SYMBOL_IMG[BOMB]} alt="" className="slott-bomb-core" />
      <div className="slott-bomb-word">
        <div className="font-display text-3xl tracking-[0.22em] text-white">BOMB</div>
        <div className="mt-1 text-xs text-sky-100">{who} hit the bomb</div>
      </div>
    </div>
  );
}

function Avatar({
  uid,
  p,
  idn,
  size,
}: {
  uid: string | null;
  p: SlotGameView["creator"];
  idn: PrestigeIdentity | undefined;
  size: number;
}) {
  if (!uid)
    return (
      <div
        className="grid place-items-center rounded-xl border-2 border-dashed border-primary/40 text-primary-soft"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  return (
    <PlayerPrestigeIdentity
      avatar={p?.avatar_url}
      name={p?.username}
      frame={idn?.frame}
      crown={idn?.crown}
      level={idn?.level}
      tier={idn?.tier}
      size={size}
      reserveHeadroom={size > 40}
    />
  );
}

function LiveSeconds({ deadline }: { deadline: number }) {
  const serverNow = useServerClock();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), 100);
    return () => clearInterval(id);
  }, [deadline]);
  const left = Math.max(0, Math.ceil((deadline - serverNow()) / 100) / 10);
  return <>{fmtLeft(left)}s</>;
}

function SeatStatus({
  seat,
  g,
  active,
  won,
  isMe,
  deadline,
  hasUser,
}: {
  seat: "A" | "B";
  g: SlotGameView;
  active: boolean;
  won: boolean;
  isMe: boolean;
  deadline: number | null;
  hasUser: boolean;
}) {
  if (g.status === "ACTIVE" && active && isMe) {
    return (
      <div
        className="slott-turn rounded-xl py-2.5 text-[11px] font-semibold tracking-wider text-primary-soft"
        data-seat={seat}
      >
        YOUR TURN
        {deadline != null ? (
          <>
            {" "}
            · <LiveSeconds deadline={deadline} />
          </>
        ) : null}
      </div>
    );
  }
  const text =
    g.status === "ACTIVE" && active ? (
      <>
        SPINNING
        {deadline != null ? (
          <>
            {" "}
            · <LiveSeconds deadline={deadline} />
          </>
        ) : null}
      </>
    ) : won ? (
      "WINNER"
    ) : g.status === "COMPLETED" ? (
      g.outcome === "DRAW" ? (
        "DRAW"
      ) : g.outcome === "BOMB" ? (
        "BOMB"
      ) : (
        "—"
      )
    ) : g.status === "WAITING" ? (
      hasUser ? (
        "READY"
      ) : (
        "WAITING…"
      )
    ) : (
      "WAITING…"
    );
  return (
    <div
      className={cn(
        "rounded-xl border py-2.5 text-[11px] font-semibold tracking-wider",
        won
          ? "border-gold/60 text-gold"
          : active
            ? "border-primary/40 text-primary-soft"
            : "border-border text-muted-foreground",
      )}
      data-seat={seat}
    >
      {text}
    </div>
  );
}

function whoName(g: SlotGameView, seat: "A" | "B") {
  const p = seat === "A" ? g.creator : g.opponent;
  return p?.username ?? (seat === "A" ? "Host" : "Challenger");
}

function describeLatest(
  latest: SlotSpin | null,
  landed: boolean,
  bonuses: SlotBonusEvent[],
  g: SlotGameView,
  turn: "A" | "B" | null,
  me: "A" | "B" | null,
  deadline: number | null,
) {
  if (g.status === "WAITING") return "";
  if (g.status === "COMPLETED")
    return g.outcome === "DRAW"
      ? "It's a draw — both stakes refunded."
      : g.outcome === "BOMB"
        ? "Bomb — the house took both stakes."
        : `Match over · ${g.score_a} – ${g.score_b}`;
  if (!latest)
    return turn
      ? `${turn === me ? "Your" : `${whoName(g, turn)}'s`} turn — spin 1 of ${g.base_spins / 2}.`
      : "Match starting…";
  if (!landed)
    return <span className="text-primary-soft">{whoName(g, latest.seat)} is spinning…</span>;
  if (hasBomb(latest.grid))
    return `${whoName(g, latest.seat)} hit the bomb. Both stakes go to the house.`;
  const b = bonuses.find((x) => x.spin_no === latest.spin_no);
  const next = turn ? (
    <>
      {" "}
      · {turn === me ? "your turn" : `${whoName(g, turn)} next`}
      {deadline != null ? (
        <>
          {" "}
          (<LiveSeconds deadline={deadline} />)
        </>
      ) : null}
    </>
  ) : (
    ""
  );
  if (Number(latest.bonus_cents) > 0)
    return (
      <>
        {whoName(g, latest.seat)} hit a {tierLabel(b?.tier ?? "WILD")}!{" "}
        <span className="font-semibold text-gold">
          +{formatUsd(Number(latest.bonus_cents))} bonus
        </span>{" "}
        added to the pot{next}
      </>
    );
  const lines = latest.lines.length
    ? ` · ${latest.lines.length} line win${latest.lines.length > 1 ? "s" : ""}`
    : "";
  return (
    <>
      {whoName(g, latest.seat)} scored {latest.score}
      {lines}
      {next}
    </>
  );
}

/** Same stake, same opponent: accept their rematch if they opened one, otherwise open ours. */
function Rematch({ g, me, userId }: { g: SlotGameView; me: "A" | "B"; userId: string | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const rival = me === "A" ? g.opponent_id : g.creator_id;
  const rivalName = whoName(g, me === "A" ? "B" : "A");
  const open = useQuery({
    queryKey: ["slot-open"],
    queryFn: fetchOpenSlots,
    refetchInterval: 4000,
  });
  const offer = open.data?.find((x) => x.creator_id === rival && x.stake === g.stake);
  const mine = open.data?.find((x) => x.creator_id === userId);
  const [pending, setPending] = useState(false);
  const key = useRef<string | null>(null);
  const joining = useRef(false);
  const go = (id: number) => navigate({ to: "/slott/$gameId", params: { gameId: String(id) } });
  async function rematch() {
    if (joining.current || pending) return;
    if (mine && !offer) return go(mine.id);
    joining.current = true;
    setPending(true);
    key.current ??= crypto.randomUUID();
    try {
      const res = offer
        ? await slotJoin(offer.id, key.current)
        : await slotCreate(g.stake, key.current);
      if (res.error) {
        toast.error(friendlyError(res.error));
        if (!/fetch|network/i.test(res.error.message)) key.current = null;
        return;
      }
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["slot-open"] });
      go(offer ? offer.id : (res.data as { game_id: number }).game_id);
    } finally {
      joining.current = false;
      setPending(false);
    }
  }
  return (
    <div className="mt-3 flex flex-col items-center gap-1.5">
      {offer ? (
        <div className="animate-pulse text-[11px] font-semibold tracking-wider text-gold">
          {rivalName} wants a rematch
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="font-display"
          onClick={rematch}
          disabled={pending || open.isLoading}
        >
          {pending
            ? "…"
            : offer
              ? `Accept rematch · ${formatUsd(g.stake)}`
              : mine
                ? "Go to your rematch"
                : `Rematch · ${formatUsd(g.stake)}`}
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link to="/slott">Lobby</Link>
        </Button>
      </div>
    </div>
  );
}

/** Tug-of-war strip: who's ahead and by how much, counted the moment each tally finishes. */
function DuelBar({
  a,
  b,
  nameA,
  nameB,
  me,
  turn,
  doneA,
  doneB,
  perSeat,
  left,
}: {
  a: number;
  b: number;
  nameA: string;
  nameB: string;
  me: "A" | "B" | null;
  turn: "A" | "B" | null;
  doneA: number;
  doneB: number;
  perSeat: number;
  left: number;
}) {
  const total = a + b;
  const share = total ? (a / total) * 100 : 50;
  const lead = a === b ? null : a > b ? "A" : "B";
  const index = turn === "A" ? doneA : turn === "B" ? doneB : null;
  const spinLabel =
    turn && index != null
      ? `${turn === me ? "YOUR" : (turn === "A" ? nameA : nameB).toUpperCase()} ${
          index >= perSeat ? `EXTRA ${index - perSeat + 1}` : `SPIN ${index + 1}/${perSeat}`
        }`
      : null;
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider sm:text-[11px]">
      <span
        className={cn(
          "tabular w-9 shrink-0 text-right font-display text-xs sm:text-sm",
          lead === "A" ? "text-primary-soft" : "text-muted-foreground",
        )}
      >
        {a}
      </span>
      <div
        className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-coin-tails/35"
        title={`${nameA} ${a} – ${b} ${nameB}`}
      >
        <div
          className="slott-duel-fill absolute inset-y-0 left-0 rounded-full bg-coin-heads"
          style={{ width: `${share}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
      </div>
      <span
        className={cn(
          "tabular w-9 shrink-0 font-display text-xs sm:text-sm",
          lead === "B" ? "text-primary-soft" : "text-muted-foreground",
        )}
      >
        {b}
      </span>
      <span className="hidden shrink-0 text-muted-foreground sm:inline">
        {spinLabel ??
          (lead
            ? `${lead === me ? "YOU" : (lead === "A" ? nameA : nameB).toUpperCase()} +${Math.abs(a - b)}`
            : "LEVEL")}
        {lead && spinLabel ? ` · +${Math.abs(a - b)}` : ""}
        {left > 0 ? ` · ${left} LEFT` : ""}
      </span>
    </div>
  );
}

function LeadCallout({ name, you, seat }: { name: string; you: boolean; seat: "A" | "B" }) {
  return (
    <div className="slott-fx pointer-events-none absolute inset-x-0 top-[36%] flex justify-center">
      <div
        className={cn(
          "slott-callout rounded-xl border px-4 py-1.5 text-center backdrop-blur-sm",
          seat === "A"
            ? "border-coin-heads/70 bg-coin-heads/20"
            : "border-coin-tails/70 bg-coin-tails/20",
        )}
      >
        <div className="max-w-[14rem] truncate font-display text-base text-white sm:text-xl">
          {you ? "YOU" : name}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.2em] text-gold sm:text-xs">
          {you ? "TAKE THE LEAD" : "TAKES THE LEAD"}
        </div>
      </div>
    </div>
  );
}

function Overlay({
  g,
  me,
  userId,
  hasProfile,
  spins,
}: {
  g: SlotGameView;
  me: "A" | "B" | null;
  userId: string | null;
  hasProfile: boolean;
  spins: SlotSpin[];
}) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const key = useRef<string | null>(null);
  const joining = useRef(false);
  async function join() {
    if (joining.current || pending) return;
    joining.current = true;
    setPending(true);
    key.current ??= crypto.randomUUID();
    try {
      const { error } = await slotJoin(g.id, key.current);
      if (error) {
        toast.error(friendlyError(error));
        if (!/fetch|network/i.test(error.message)) key.current = null;
      }
      qc.invalidateQueries({ queryKey: ["slot", g.id] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    } finally {
      joining.current = false;
      setPending(false);
    }
  }
  let body: React.ReactNode;
  if (g.status === "CANCELLED") {
    body = (
      <>
        <div className="font-display text-lg">Match cancelled</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {g.cancel_reason === "EXPIRED"
            ? "No opponent joined in time."
            : "Cancelled by the creator."}{" "}
          The stake was returned.
        </p>
        <Button asChild size="sm" className="mt-3 font-display">
          <Link to="/slott">Back to lobby</Link>
        </Button>
      </>
    );
  } else if (g.status === "WAITING") {
    body = !userId ? (
      <Button asChild size="sm">
        <Link to="/auth">Sign in to join</Link>
      </Button>
    ) : hasProfile ? (
      <Button size="sm" className="font-display" onClick={join} disabled={pending}>
        {pending ? "Joining…" : `Accept for ${formatUsd(g.stake)}`}
      </Button>
    ) : null;
  } else if (g.outcome === "BOMB") {
    body = (
      <div className="slott-result slott-result-bomb">
        <div className="text-[11px] font-semibold tracking-[0.16em] text-sky-300">BOMB</div>
        <div className="mt-1 font-display text-2xl">House takes the pot</div>
        <p className="mt-1 text-sm text-muted-foreground">
          A bomb landed. Both stakes stay with the house
          {g.bonus_total > 0 ? ", and the promo bonus was returned" : ""}.
        </p>
        <Button asChild size="sm" className="mt-3 font-display">
          <Link to="/slott">Back to lobby</Link>
        </Button>
      </div>
    );
  } else if (g.outcome === "DRAW") {
    body = (
      <div className="slott-result slott-result-draw">
        <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
          DRAW
        </div>
        <div className="mt-1 font-display text-2xl">Scores are level</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Both stakes were refunded. Bonus money returned to the promo budget.
        </p>
        {me ? (
          <Rematch g={g} me={me} userId={userId} />
        ) : (
          <Button asChild size="sm" className="mt-3 font-display">
            <Link to="/slott">Play a match</Link>
          </Button>
        )}
      </div>
    );
  } else {
    const name = g.winner_id === g.creator_id ? g.creator?.username : g.opponent?.username;
    const margin = Math.abs(g.score_a - g.score_b);
    const best = spins.reduce<SlotSpin | null>((b, s) => (!b || s.score > b.score ? s : b), null);
    const mine = g.winner_id === userId;
    body = (
      <div className={mine ? "slott-result slott-result-win" : "slott-result slott-result-lose"}>
        <div className="text-[11px] font-semibold tracking-[0.16em] text-primary-soft">
          {mine ? "YOU WIN" : "MATCH OVER"}
        </div>
        <div className="mt-1 truncate font-display text-xl sm:text-2xl">{name ?? "player"}</div>
        <div className="slott-banner-title tabular mt-1 font-display text-3xl sm:text-4xl">
          {formatUsd(g.payout_amount ?? 0)}
        </div>
        <p className="tabular mt-1 text-xs text-foreground/85">
          {g.score_a} – {g.score_b} · by {margin} pt{margin === 1 ? "" : "s"}
          {best ? (
            <>
              {" "}
              · best spin {best.score} ({whoName(g, best.seat)})
            </>
          ) : null}
        </p>
        {me && !mine ? (
          <p className="mt-1 text-xs text-muted-foreground">You finished behind on the score.</p>
        ) : null}
        <p className="tabular mt-0.5 text-[11px] text-muted-foreground">
          {g.fee_bps > 0 && g.fee_amount === 0 ? (
            <>P2P {formatUsd(g.p2p_pot)} · fee-free win</>
          ) : (
            <>
              P2P {formatUsd(g.p2p_pot)} − {g.fee_bps / 100}% fee ({formatUsd(g.fee_amount ?? 0)})
            </>
          )}
          {g.bonus_total > 0 ? ` + bonus ${formatUsd(g.bonus_total)}` : ""}
        </p>
        {me ? (
          <Rematch g={g} me={me} userId={userId} />
        ) : (
          <Button asChild size="sm" className="mt-3 font-display">
            <Link to="/slott">Play a match</Link>
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="slott-fx pointer-events-auto absolute inset-0 grid place-items-center rounded-lg bg-[#05071a]/80 p-3 text-center backdrop-blur-[2px]">
      <div className="max-w-xs animate-rise-in">{body}</div>
    </div>
  );
}

function EventFeed({
  g,
  spins,
  bonuses,
}: {
  g: SlotGameView;
  spins: SlotSpin[];
  bonuses: SlotBonusEvent[];
}) {
  const rows = [...spins].reverse();
  return (
    <section className="game-panel rounded-xl border p-3">
      <h2 className="font-display text-xs uppercase tracking-widest">Match events</h2>
      {!rows.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {g.status === "WAITING" ? "No spins yet." : "First spin coming up."}
        </p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1 text-[13px]">
          {rows.map((s) => {
            const b = bonuses.find((x) => x.spin_no === s.spin_no);
            return (
              <li
                key={s.spin_no}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 whitespace-nowrap"
              >
                <span className="tabular w-7 shrink-0 text-[11px] text-muted-foreground">
                  #{s.spin_no}
                </span>
                <span className="max-w-[7rem] shrink-0 truncate font-semibold text-primary-soft">
                  {whoName(g, s.seat)}
                </span>
                <span className="tabular">{hasBomb(s.grid) ? "BOMB" : `${s.score} pts`}</span>
                {s.lines.length ? (
                  <span className="text-[11px] text-primary-soft">
                    {s.lines.length} line{s.lines.length > 1 ? "s" : ""}
                  </span>
                ) : null}
                {s.wild_count ? (
                  <span className="text-[11px] text-gold">{s.wild_count}× WILD</span>
                ) : null}
                {s.auto ? <span className="text-[10px] text-muted-foreground">auto</span> : null}
                {b ? (
                  <span className="ml-auto flex items-center gap-1 rounded bg-gold/15 px-1.5 text-[11px] font-semibold text-gold">
                    <Gem className="h-3 w-3" /> {tierLabel(b.tier)} +{formatUsd(b.awarded_cents)} to
                    pot
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FairnessPanel({ g, spins }: { g: SlotGameView; spins: SlotSpin[] }) {
  const [res, setRes] = useState<{ ok: boolean; checks: SlottCheck[] } | null>(null);
  return (
    <details className="group game-panel rounded-xl border px-3 py-2.5 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary-soft" />
        <span className="font-display uppercase tracking-widest">Provably fair</span>
        <span className="ml-auto group-open:hidden">Details</span>
        <span className="ml-auto hidden group-open:inline">Hide</span>
      </summary>
      <dl className="mt-3 grid gap-2">
        <Row k="Server seed hash (committed at creation)" v={g.server_seed_hash} />
        <Row
          k="Message per cell"
          v={`PVPCasino:slott:${g.protocol_version}:${g.id}:<spin>:<cell 0-19>`}
        />
        <Row k="Server seed" v={g.server_seed ?? "Revealed when the match completes"} />
      </dl>
      {g.status === "COMPLETED" ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={async () => setRes(await verifySlott(g, spins))}
        >
          Verify all spins in my browser
        </Button>
      ) : null}
      {res ? (
        <ul className="mt-3 space-y-2">
          {res.checks.map((c) => (
            <li key={c.label} className="flex gap-2">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rival" />
              )}
              <div className="min-w-0">
                <div>{c.label}</div>
                <div className="tabular break-all text-xs text-muted-foreground">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
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
