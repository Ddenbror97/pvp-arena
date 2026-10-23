import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { serverOffset, useNow, useServerClock, useWalletRealtime } from "@/lib/jackpot/api";
import { useBalanceHold } from "@/lib/balance-hold";
import { ANIMATION_MS, LATE_LAND_MS, coinLandingTime } from "@/lib/coinflip/coin-motion";
import { formatUsd } from "@/lib/jackpot/math";
import {
  crownPlacement,
  PlayerPrestigeIdentity,
} from "@/components/prestige/PlayerPrestigeIdentity";
import { usePrestigeIdentities } from "@/components/prestige/PrestigeProvider";
import { APP } from "@/lib/config";
import { emitSound } from "@/lib/sound";
import {
  coinflipCallBot,
  fetchCoinflip,
  opposite,
  useCoinflipRealtime,
  type CfGameView,
  type CoinSide,
} from "@/lib/coinflip/api";
import { friendlyError } from "@/lib/jackpot/errors";
import { useBotConfig } from "@/lib/bots";
import type { PrestigeIdentity } from "@/lib/prestige/api";
import { verifyCoinflip, type CoinflipCheck } from "@/lib/fairness/coinflip";
import { coinHeads as headsAsset, coinTails as tailsAsset } from "@/assets/media";
import { Button } from "@/components/ui/button";
import { Coin } from "./Coin";

const Celebration = lazy(() =>
  import("@/components/jackpot/Celebration").then((m) => ({ default: m.Celebration })),
);

const IN_PROGRESS = ["READY", "FLIPPING", "SETTLEMENT"];

export function CoinflipRoom({ id }: { id: number }) {
  const { userId } = useAuth();
  const bots = useBotConfig();
  useWalletRealtime(userId);
  useCoinflipRealtime();
  const qc = useQueryClient();
  const serverNow = useServerClock();
  useNow(100);
  const q = useQuery({
    queryKey: ["coinflip", id],
    queryFn: () => fetchCoinflip(id),
    // The one-second worker advances deadlines. This poll only refreshes the view.
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === "WAITING") return 2_000;
      if (s && IN_PROGRESS.includes(s)) return 800;
      return false;
    },
  });
  const g = q.data ?? null;
  const identities = usePrestigeIdentities(
    [g?.creator_id, g?.opponent_id].filter((id): id is string => !!id),
  );

  const now = serverNow();
  const start = g?.animation_start_at ? new Date(g.animation_start_at).getTime() : null;

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
    involved && start != null && landAt != null && landAt > now
      ? (landAt === Infinity ? start + ANIMATION_MS + LATE_LAND_MS : landAt) - serverOffset()
      : null,
  );

  if (q.isLoading) return <CoinflipRoomFallback />;
  if (!g) return <p className="text-muted-foreground">Game not found.</p>;

  let phase: "waiting" | "cancelled" | "found" | "flipping" | "result";
  if (g.status === "CANCELLED") phase = "cancelled";
  else if (g.status === "WAITING") phase = "waiting";
  else if (start != null && now < start) phase = "found";
  // The result appears only once the coin rests on the authoritative face.
  else if (landAt != null && now < landAt) phase = "flipping";
  else phase = "result";

  return (
    <RoomFrame title={`Coinflip #${g.id}`} status={g.status}>
      <StageBox>
        <MatchStage
          g={g}
          phase={phase}
          start={start}
          revealAt={revealAt}
          serverNow={serverNow}
          now={now}
          me={userId}
          identities={identities}
          botsReady={bots.isSuccess}
          botsOn={bots.data?.coinflip === true}
        />
      </StageBox>

      <FairnessPanel g={g} />
      {phase === "result" &&
        g.winner_id === userId &&
        seen.current?.id === g.id &&
        seen.current.sawHidden && (
          <Suspense fallback={null}>
            <Celebration />
          </Suspense>
        )}
    </RoomFrame>
  );
}

/** Header rows are a fixed height so the stage does not drop when the game row arrives. */
export function CoinflipRoomFallback() {
  return (
    <RoomFrame title="Coinflip">
      <StageBox className="animate-pulse" />
      <FairnessShell />
    </RoomFrame>
  );
}

function RoomFrame({
  title,
  status,
  children,
}: {
  title: string;
  status?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex h-5 items-center justify-between pr-8">
        <Link
          to="/coinflip"
          resetScroll={false}
          className="text-sm leading-5 text-muted-foreground hover:text-foreground"
        >
          ← Coinflip lobby
        </Link>
        <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold leading-none tracking-wider text-gold">
          {APP.creditsLabel}
        </span>
      </div>
      <div className="mt-3 flex h-8 items-center gap-3">
        <h1 className="truncate font-display text-2xl leading-8">{title}</h1>
        {status ? (
          <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs leading-5">
            {status}
          </span>
        ) : (
          <span className="inline-block h-5 w-16 shrink-0 rounded bg-secondary/70" />
        )}
      </div>
      {children}
    </div>
  );
}

function useMatchAvatarSize() {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches,
  );
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
const STAGE_BOX =
  "game-stage cf-game-window relative mt-3 h-[21rem] touch-pan-y overflow-clip rounded-2xl border border-border bg-card p-4 sm:h-[26rem] sm:px-10 sm:py-8";

function StageBox({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={className ? `${STAGE_BOX} ${className}` : STAGE_BOX}>{children}</div>;
}

function MatchStage({
  g,
  phase,
  start,
  revealAt,
  serverNow,
  now,
  me,
  identities,
  botsReady,
  botsOn,
}: {
  g: CfGameView;
  phase: string;
  start: number | null;
  revealAt: number | null;
  serverNow: () => number;
  now: number;
  me: string | null;
  identities: Map<string, PrestigeIdentity>;
  botsReady: boolean;
  botsOn: boolean;
}) {
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
      <div
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3"
        style={crownPad ? { paddingTop: crownPad } : undefined}
      >
        <PlayerSlot
          g={g}
          slot="creator"
          phase={phase}
          identity={identities.get(g.creator_id)}
          avatarSize={avatarSize}
          band={band}
        />
        <div className="grid place-items-center" style={{ width: band, height: band }}>
          <Center
            g={g}
            phase={phase}
            start={start}
            revealAt={revealAt}
            serverNow={serverNow}
            now={now}
            me={me}
            coinSize={coinSize}
            compact={compact}
          />
        </div>
        <PlayerSlot
          g={g}
          slot="opponent"
          phase={phase}
          identity={g.opponent_id ? identities.get(g.opponent_id) : undefined}
          avatarSize={avatarSize}
          band={band}
        />
      </div>
      <StageNote g={g} phase={phase} now={now} me={me} botsReady={botsReady} botsOn={botsOn} />
      {/* Sits in the stage's existing padding, so the card does not grow when the coin lands. */}
      <p className="tabular pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs leading-4 text-muted-foreground sm:bottom-3">
        {feeLine}
      </p>
    </div>
  );
}

function PlayerSlot({
  g,
  slot,
  phase,
  identity,
  avatarSize,
  band,
}: {
  g: CfGameView;
  slot: "creator" | "opponent";
  phase: string;
  identity?: PrestigeIdentity | undefined;
  avatarSize: number;
  band: number;
}) {
  const side = (
    slot === "creator" ? g.creator_side : opposite(g.creator_side as CoinSide)
  ) as CoinSide;
  const p = slot === "creator" ? g.creator : g.opponent;
  const uid = slot === "creator" ? g.creator_id : g.opponent_id;
  const lost = phase === "result" && g.winner_id && g.winner_id !== uid;
  return (
    <div className={`flex min-w-0 flex-col items-center text-center ${lost ? "opacity-40" : ""}`}>
      <div className="grid place-items-center" style={{ height: band }}>
        {uid ? (
          <span className="relative inline-flex">
            <PlayerPrestigeIdentity
              avatar={p?.avatar_url}
              name={p?.username}
              frame={identity?.frame}
              crown={identity?.crown}
              level={identity?.level}
              tier={identity?.tier}
              size={avatarSize}
              reserveHeadroom={false}
            />
            <SideCoin
              side={side}
              overlay
              className="absolute z-30"
              style={coinBadgePlacement(
                avatarSize,
                !!identity?.frame,
                slot === "creator" ? "left" : "right",
              )}
            />
          </span>
        ) : (
          <div
            className="flex items-center justify-center rounded-[8%] border-2 border-dashed border-border text-2xl text-muted-foreground"
            style={{ width: avatarSize, height: avatarSize }}
          >
            ?
          </div>
        )}
      </div>
      <div className="mt-3 flex max-w-full items-center justify-center gap-1.5 text-sm font-semibold sm:text-base">
        <span className="truncate">{uid ? (p?.username ?? "player") : "Waiting..."}</span>
        {p?.is_bot ? <BotTag /> : null}
      </div>
    </div>
  );
}

function BotTag() {
  return (
    <span className="shrink-0 rounded border border-emerald-300/50 px-1 py-px text-[10px] font-semibold leading-none tracking-wide text-emerald-200">
      BOT
    </span>
  );
}

function CallBot({ gameId, enabled }: { gameId: number; enabled: boolean }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const key = useRef(crypto.randomUUID());

  async function call() {
    if (!enabled || pending) return;
    setPending(true);
    const { data, error } = await coinflipCallBot(gameId, key.current);
    setPending(false);
    if (error) {
      if (!/fetch|network/i.test(error.message)) key.current = crypto.randomUUID();
      toast.error(friendlyError(error));
    } else if (data && data.joined === false && data.reason) {
      key.current = crypto.randomUUID();
      toast.error(friendlyError(new Error(data.reason)));
    }
    void qc.invalidateQueries({ queryKey: ["coinflip", gameId] });
    void qc.invalidateQueries({ queryKey: ["coinflip-open"] });
  }

  return (
    <div className="mt-1.5 flex flex-col items-center gap-0.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-28"
        disabled={!enabled || pending}
        onClick={() => void call()}
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        Call Bot
      </Button>
      <p className="text-[11px] leading-4 text-muted-foreground">
        {enabled
          ? "Play against an automated opponent."
          : "Automated opponents are not available right now."}
      </p>
    </div>
  );
}

function StageNote({
  g,
  phase,
  now,
  me,
  botsReady,
  botsOn,
}: {
  g: CfGameView;
  phase: string;
  now: number;
  me: string | null;
  botsReady: boolean;
  botsOn: boolean;
}) {
  if (phase === "waiting") {
    const left = Math.max(0, Math.ceil((new Date(g.expires_at).getTime() - now) / 1000));
    const clock =
      left >= 3600
        ? `${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m`
        : left >= 60
          ? `${Math.floor(left / 60)}m ${left % 60}s`
          : `${left}s`;
    const mine = !!me && me === g.creator_id;
    return (
      <div className="mt-1 text-center">
        <div className="font-display text-base leading-5">Waiting for opponent...</div>
        <div className="text-xs text-muted-foreground">
          {formatUsd(g.amount)} stake · <b>{opposite(g.creator_side as CoinSide)}</b> ·{" "}
          <span className="tabular">{clock}</span>
        </div>
        {mine && botsReady ? <CallBot gameId={g.id} enabled={botsOn} /> : null}
      </div>
    );
  }
  if (phase === "cancelled") {
    return (
      <div className="mt-3 text-center">
        <div className="font-display text-lg">Game cancelled</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {g.cancel_reason === "EXPIRED"
            ? "No opponent joined in time."
            : "Cancelled by the creator."}{" "}
          The wager was returned.
        </div>
      </div>
    );
  }
  return null;
}

function Center({
  g,
  phase,
  start,
  revealAt,
  serverNow,
  now,
  me,
  coinSize,
  compact,
}: {
  g: CfGameView;
  phase: string;
  start: number | null;
  revealAt: number | null;
  serverNow: () => number;
  now: number;
  me: string | null;
  coinSize: number;
  compact: boolean;
}) {
  const played = useRef<string | null>(null);
  useEffect(() => {
    if (played.current === phase) return;
    played.current = phase;
    if (phase === "flipping") emitSound("spin_start");
    if (phase === "result" && g.winner_id) emitSound(g.winner_id === me ? "win" : "lose");
  }, [phase, g.winner_id, me]);

  if (phase === "cancelled") return null;
  if (phase === "waiting") {
    return (
      <Coin
        startMs={null}
        side={null}
        serverNow={serverNow}
        restSide={g.creator_side as CoinSide}
        size={coinSize}
        embedded={compact}
      />
    );
  }
  if (phase === "found" && start != null) {
    return (
      <Countdown
        start={start}
        joinedAt={g.joined_at ? new Date(g.joined_at).getTime() : null}
        now={now}
      />
    );
  }
  return (
    <div className="flex flex-col items-center">
      <Coin
        startMs={start}
        side={(g.winning_side as CoinSide | null) ?? null}
        revealAt={revealAt}
        serverNow={serverNow}
        size={coinSize}
        embedded={compact}
      />
    </div>
  );
}

function Winnings({ amount }: { amount: number }) {
  return (
    <div className="animate-rise-in text-center leading-none">
      <p className="text-[9px] font-semibold tracking-[0.14em] text-primary sm:text-[10px]">
        Winnings:
      </p>
      <p className="mt-px bg-gradient-to-b from-foreground to-primary bg-clip-text font-display text-lg tracking-tight text-transparent tabular sm:text-xl">
        {formatUsd(amount)}
      </p>
    </div>
  );
}

/** 3.5s pre-flip: an RGB disc that fills as the countdown runs out. */
function Countdown({
  start,
  joinedAt,
  now,
}: {
  start: number;
  joinedAt: number | null;
  now: number;
}) {
  const total = Math.max(1, joinedAt != null ? start - joinedAt : 3500);
  const left = Math.min(total, Math.max(0, start - now));
  const filled = Math.min(1, Math.max(0, 1 - left / total));
  const rgb =
    "oklch(0.72 0.24 25), oklch(0.86 0.18 85), oklch(0.8 0.2 150), oklch(0.74 0.16 220), oklch(0.62 0.24 295), oklch(0.72 0.24 340)";
  const sweep = `conic-gradient(from -90deg, ${rgb} ${filled * 100}%, transparent ${filled * 100}%)`;
  return (
    <div className="relative grid h-[148px] w-[148px] place-items-center">
      <div aria-hidden className="absolute inset-1 rounded-full bg-secondary" />
      <div
        aria-hidden
        className="absolute inset-1 rounded-full opacity-80 blur-lg"
        style={{ background: sweep }}
      />
      <div
        aria-hidden
        className="absolute inset-1 rounded-full shadow-[inset_0_0_18px_rgb(0_0_0/0.35)]"
        style={{ background: sweep }}
      />
      <span className="tabular relative z-10 font-display text-4xl leading-none tracking-tight text-foreground drop-shadow-[0_1px_6px_rgb(0_0_0/0.85)]">
        {(left / 1000).toFixed(1)}
      </span>
    </div>
  );
}

function FairnessShell({ hash, children }: { hash?: string; children?: ReactNode }) {
  return (
    <details className="group mt-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="font-display uppercase tracking-widest">Provably fair</span>
        <span className="tabular hidden truncate sm:inline">
          {hash ? `· ${hash.slice(0, 16)}…` : "·"}
        </span>
        <span className="ml-auto group-open:hidden">Details</span>
        <span className="ml-auto hidden group-open:inline">Hide</span>
      </summary>
      {children}
    </details>
  );
}

function FairnessPanel({ g }: { g: CfGameView }) {
  const [res, setRes] = useState<{ ok: boolean; checks: CoinflipCheck[] } | null>(null);
  return (
    <FairnessShell hash={g.server_seed_hash}>
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
            setRes(
              await verifyCoinflip({
                id: String(g.id),
                draw_version: g.draw_version,
                server_seed_hash: g.server_seed_hash,
                server_seed: g.server_seed,
                winning_side: g.winning_side as CoinSide | null,
              }),
            )
          }
        >
          Verify in my browser
        </Button>
      )}
      {res && (
        <ul className="mt-4 space-y-2">
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
      )}
    </FairnessShell>
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

function SideCoin({
  side,
  className,
  style,
  overlay,
}: {
  side: CoinSide;
  className?: string;
  style?: CSSProperties;
  overlay?: boolean;
}) {
  const img = (
    <img
      src={side === "HEADS" ? headsAsset : tailsAsset}
      alt={side === "HEADS" ? "Heads" : "Tails"}
      width={56}
      height={56}
      draggable={false}
      style={overlay ? undefined : style}
      className={
        overlay
          ? "h-full w-full scale-125 object-cover"
          : `shrink-0 rounded-full object-cover select-none ${className ?? ""}`
      }
    />
  );
  if (!overlay) return img;
  return (
    <span className={`overflow-clip rounded-full ${className ?? ""}`} style={style}>
      {img}
    </span>
  );
}
