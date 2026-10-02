import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { serverOffset, useNow, useServerClock, useWalletRealtime } from "@/lib/jackpot/api";
import { useBalanceHold } from "@/lib/balance-hold";
import { ANIMATION_MS, LATE_LAND_MS, coinLandingTime } from "@/lib/coinflip/coin-motion";
import { formatUsd } from "@/lib/jackpot/math";
import { crownPlacement, PlayerPrestigeIdentity } from "@/components/prestige/PlayerPrestigeIdentity";
import { usePrestigeIdentities } from "@/components/prestige/PrestigeProvider";
import { APP } from "@/lib/config";
import { emitSound } from "@/lib/sound";
import { fetchCoinflip, opposite, tickCoinflip, useCoinflipRealtime, type CfGameView, type CoinSide } from "@/lib/coinflip/api";
import type { PrestigeIdentity } from "@/lib/prestige/api";
import { verifyCoinflip, type CoinflipCheck } from "@/lib/fairness/coinflip";
import { coinHeads as headsAsset, coinTails as tailsAsset } from "@/assets/media";
import { Button } from "@/components/ui/button";
import { Coin } from "./Coin";

const Celebration = lazy(() => import("@/components/jackpot/Celebration").then((m) => ({ default: m.Celebration })));

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
  const identities = usePrestigeIdentities([g?.creator_id, g?.opponent_id].filter((id): id is string => !!id));

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

  // The side becomes visible only after a tick moves the game to FLIPPING. If this view
  // started the flip without it, remember when it arrived so the coin lands smoothly.
  const seen = useRef<{ id: number; sawHidden: boolean; revealAt: number | null } | null>(null);
  if (g) {
    if (seen.current?.id !== g.id) seen.current = { id: g.id, sawHidden: false, revealAt: null };
    if (!g.winning_side) seen.current.sawHidden = true;
    else if (seen.current.sawHidden && seen.current.revealAt == null) seen.current.revealAt = now;
  }
  const revealAt = g && seen.current?.id === g.id ? seen.current.revealAt : null;
  const side = (g?.winning_side as CoinSide | null) ?? null;
  const landAt = start != null ? coinLandingTime({ start, side, revealAt }) : null;
  const involved = !!userId && !!g && (userId === g.creator_id || userId === g.opponent_id);
  useBalanceHold(
    "coinflip",
    involved && start != null && landAt != null && landAt > now ? (landAt === Infinity ? start + ANIMATION_MS + LATE_LAND_MS : landAt) - serverOffset() : null,
  );

  if (q.isLoading) return <div className="mx-auto w-full max-w-4xl"><StageBox className="animate-pulse" /></div>;
  if (!g) return <p className="text-muted-foreground">Game not found.</p>;

  let phase: "waiting" | "cancelled" | "found" | "flipping" | "result";
  if (g.status === "CANCELLED") phase = "cancelled";
  else if (g.status === "WAITING") phase = "waiting";
  else if (start != null && now < start) phase = "found";
  // The result appears only once the coin rests on the authoritative face.
  else if (landAt != null && now < landAt) phase = "flipping";
  else phase = "result";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center justify-between">
        <Link to="/coinflip" className="text-sm text-muted-foreground hover:text-foreground">← Coinflip lobby</Link>
        <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-gold">{APP.creditsLabel}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl">Coinflip #{g.id}</h1>
        <span className="rounded bg-secondary px-2 py-0.5 text-xs">{g.status}</span>
      </div>

      <StageBox>
        <MatchStage g={g} phase={phase} start={start} revealAt={revealAt} serverNow={serverNow} now={now} me={userId} identities={identities} />
      </StageBox>

      <FairnessPanel g={g} />
      {phase === "result" && g.winner_id === userId && seen.current?.id === g.id && seen.current.sawHidden && (
        <Suspense fallback={null}>
          <Celebration />
        </Suspense>
      )}
    </div>
  );
}

function useMatchAvatarSize() {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return wide ? 120 : 72;
}

const CENTER_COIN = 128;
/** Coin reserves 1.5× its face for the flip lift, and the face sits in the middle of that box. */
const CENTER_COIN_BOX = CENTER_COIN * 1.5;
const CENTER_COUNTDOWN = 148;
/** Same box for the loading state, the countdown and the flip, so landing on a game does not move the page. */
const STAGE_BOX = "game-stage relative mt-3 h-[21rem] touch-pan-y overflow-clip rounded-2xl border border-border bg-card p-4 sm:h-[26rem] sm:px-10 sm:py-8";

function StageBox({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={className ? `${STAGE_BOX} ${className}` : STAGE_BOX}>{children}</div>;
}

function MatchStage({ g, phase, start, revealAt, serverNow, now, me, identities }: { g: CfGameView; phase: string; start: number | null; revealAt: number | null; serverNow: () => number; now: number; me: string | null; identities: Map<string, PrestigeIdentity> }) {
  const avatarSize = useMatchAvatarSize();
  const compact = avatarSize < 100;
  const coinSize = compact ? 88 : CENTER_COIN;
  // One band for the countdown disc and the coin. The disc is the taller piece on a phone;
  // the flipping coin is the taller piece on a desktop. Sharing the band keeps both players
  // still when a joined game goes from the countdown to the flip.
  const band = compact ? CENTER_COUNTDOWN : CENTER_COIN_BOX;
  const crown = crownPlacement(avatarSize, "starter", "crown-inferno").headroom;
  const crownPad = Math.max(0, crown - Math.floor((band - avatarSize) / 2));
  const won = g.payout_amount ?? g.pot_amount;
  const showWinnings = phase === "result" && !!g.winner_id;
  const winningsH = 36;
  const feeLine =
    phase === "result" && g.status === "COMPLETED" && g.fee_bps > 0
      ? g.fee_amount === 0
        ? `Pot ${formatUsd(g.pot_amount)} · fee-free win`
        : `Pot ${formatUsd(g.pot_amount)} − ${g.fee_bps / 100}% fee${g.fee_amount != null ? ` (${formatUsd(g.fee_amount)})` : ""}`
      : null;
  return (
    <div>
      <div className="flex items-end justify-center" style={{ height: winningsH }}>
        {showWinnings ? <Winnings amount={won} /> : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3" style={crownPad ? { paddingTop: crownPad } : undefined}>
        <PlayerSlot g={g} slot="creator" phase={phase} identity={identities.get(g.creator_id)} avatarSize={avatarSize} band={band} />
        <div className="grid place-items-center" style={{ width: band, height: band }}>
          <Center g={g} phase={phase} start={start} revealAt={revealAt} serverNow={serverNow} now={now} me={me} coinSize={coinSize} compact={compact} />
        </div>
        <PlayerSlot g={g} slot="opponent" phase={phase} identity={g.opponent_id ? identities.get(g.opponent_id) : undefined} avatarSize={avatarSize} band={band} />
      </div>
      <StageNote g={g} phase={phase} now={now} />
      {/* Sits in the stage's existing padding, so the card does not grow when the coin lands. */}
      <p className="tabular pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs leading-4 text-muted-foreground sm:bottom-3">{feeLine}</p>
    </div>
  );
}

function PlayerSlot({ g, slot, phase, identity, avatarSize, band }: { g: CfGameView; slot: "creator" | "opponent"; phase: string; identity?: PrestigeIdentity; avatarSize: number; band: number }) {
  const side = (slot === "creator" ? g.creator_side : opposite(g.creator_side as CoinSide)) as CoinSide;
  const p = slot === "creator" ? g.creator : g.opponent;
  const uid = slot === "creator" ? g.creator_id : g.opponent_id;
  const lost = phase === "result" && g.winner_id && g.winner_id !== uid;
  return (
    <div className={`flex min-w-0 flex-col items-center text-center ${lost ? "opacity-40" : ""}`}>
      <div className="grid place-items-center" style={{ height: band }}>
        {uid ? (
          <span className="relative inline-flex">
            <PlayerPrestigeIdentity avatar={p?.avatar_url} name={p?.username} frame={identity?.frame} crown={identity?.crown} level={identity?.level} tier={identity?.tier} size={avatarSize} reserveHeadroom={false} />
            <SideCoin side={side} overlay className="absolute z-30" style={coinBadgePlacement(avatarSize, !!identity?.frame, slot === "creator" ? "left" : "right")} />
          </span>
        ) : (
          <div className="flex items-center justify-center rounded-[8%] border-2 border-dashed border-border text-2xl text-muted-foreground" style={{ width: avatarSize, height: avatarSize }}>?</div>
        )}
      </div>
      <div className="mt-3 max-w-full truncate text-sm font-semibold sm:text-base">{uid ? (p?.username ?? "player") : "Waiting..."}</div>
    </div>
  );
}

function StageNote({ g, phase, now }: { g: CfGameView; phase: string; now: number }) {
  if (phase === "waiting") {
    const left = Math.max(0, Math.ceil((new Date(g.expires_at).getTime() - now) / 1000));
    const clock = left >= 3600 ? `${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m` : left >= 60 ? `${Math.floor(left / 60)}m ${left % 60}s` : `${left}s`;
    return (
      <div className="mt-3 text-center">
        <div className="font-display text-lg">Waiting for opponent...</div>
        <div className="mt-1 text-sm text-muted-foreground">Waiting for <b>{opposite(g.creator_side as CoinSide)}</b> · expires in <span className="tabular">{clock}</span></div>
      </div>
    );
  }
  if (phase === "cancelled") {
    return (
      <div className="mt-3 text-center">
        <div className="font-display text-lg">Game cancelled</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {g.cancel_reason === "EXPIRED" ? "No opponent joined in time." : "Cancelled by the creator."} The wager was returned.
        </div>
      </div>
    );
  }
  return null;
}

function Center({ g, phase, start, revealAt, serverNow, now, me, coinSize, compact }: { g: CfGameView; phase: string; start: number | null; revealAt: number | null; serverNow: () => number; now: number; me: string | null; coinSize: number; compact: boolean }) {
  const played = useRef<string | null>(null);
  useEffect(() => {
    if (played.current === phase) return;
    played.current = phase;
    if (phase === "flipping") emitSound("spin_start");
    if (phase === "result" && g.winner_id) emitSound(g.winner_id === me ? "win" : "lose");
  }, [phase, g.winner_id, me]);

  if (phase === "cancelled") return null;
  if (phase === "waiting") {
    return <Coin startMs={null} side={null} serverNow={serverNow} restSide={g.creator_side as CoinSide} size={coinSize} embedded={compact} />;
  }
  if (phase === "found" && start != null) {
    return <Countdown start={start} joinedAt={g.joined_at ? new Date(g.joined_at).getTime() : null} now={now} />;
  }
  return (
    <div className="flex flex-col items-center">
      <Coin startMs={start} side={(g.winning_side as CoinSide | null) ?? null} revealAt={revealAt} serverNow={serverNow} size={coinSize} embedded={compact} />
    </div>
  );
}

function Winnings({ amount }: { amount: number }) {
  return (
    <div className="animate-rise-in text-center leading-none">
      <p className="text-[9px] font-semibold tracking-[0.14em] text-primary sm:text-[10px]">Winnings:</p>
      <p className="mt-px bg-gradient-to-b from-foreground to-primary bg-clip-text font-display text-lg tracking-tight text-transparent tabular sm:text-xl">
        {formatUsd(amount)}
      </p>
    </div>
  );
}

/** 3.5s pre-flip: an RGB disc that fills as the countdown runs out. */
function Countdown({ start, joinedAt, now }: { start: number; joinedAt: number | null; now: number }) {
  const total = Math.max(1, joinedAt != null ? start - joinedAt : 3500);
  const left = Math.min(total, Math.max(0, start - now));
  const filled = Math.min(1, Math.max(0, 1 - left / total));
  const rgb = "oklch(0.72 0.24 25), oklch(0.86 0.18 85), oklch(0.8 0.2 150), oklch(0.74 0.16 220), oklch(0.62 0.24 295), oklch(0.72 0.24 340)";
  const sweep = `conic-gradient(from -90deg, ${rgb} ${filled * 100}%, transparent ${filled * 100}%)`;
  return (
    <div className="relative grid h-[148px] w-[148px] place-items-center">
      <div aria-hidden className="absolute inset-1 rounded-full bg-secondary" />
      <div aria-hidden className="absolute inset-1 rounded-full opacity-80 blur-lg" style={{ background: sweep }} />
      <div aria-hidden className="absolute inset-1 rounded-full shadow-[inset_0_0_18px_rgb(0_0_0/0.35)]" style={{ background: sweep }} />
      <span className="tabular relative z-10 font-display text-4xl leading-none tracking-tight text-foreground drop-shadow-[0_1px_6px_rgb(0_0_0/0.85)]">{(left / 1000).toFixed(1)}</span>
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

/** Coin badge on the outer avatar corner, mirrored so both sit the same distance from the pot. */
function coinBadgePlacement(size: number, framed: boolean, corner: "left" | "right") {
  const base = size >= 100 ? 44 : 32;
  const coin = Math.round((framed ? base : Math.round(base * 0.85)) * 0.9);
  const inset = Math.round(size * (framed ? 0.02 : 0.16));
  const radius = (size - inset * 2) / 2;
  const rim = framed ? size / 2 + radius * Math.SQRT1_2 : size - inset;
  const center = rim - coin * (framed ? 0.28 : 0.35);
  const edge = Math.round(size - (center + coin / 2));
  return { width: coin, height: coin, bottom: edge, [corner]: edge };
}

function SideCoin({ side, className, style, overlay }: { side: CoinSide; className?: string; style?: CSSProperties; overlay?: boolean }) {
  const img = (
    <img
      src={side === "HEADS" ? headsAsset : tailsAsset}
      alt={side === "HEADS" ? "Heads" : "Tails"}
      width={56}
      height={56}
      draggable={false}
      style={overlay ? undefined : style}
      className={overlay ? "h-full w-full scale-125 object-cover" : `shrink-0 rounded-full object-cover select-none ${className ?? ""}`}
    />
  );
  if (!overlay) return img;
  return (
    <span className={`overflow-clip rounded-full ${className ?? ""}`} style={style}>
      {img}
    </span>
  );
}
