import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatUsd } from "@/lib/jackpot/math";
import { equipCosmetic, prestigeError } from "@/lib/prestige/api";
import {
  chestError,
  chestTier,
  fetchChestStatus,
  formatCountdown,
  openDailyChest,
  type ChestReward,
  type ChestStatus,
} from "@/lib/prestige/daily-chest";
import { markSeen, scrollToWardrobe } from "@/lib/prestige/wardrobe";
import type { LootTier } from "@/lib/prestige/loot";
import { AvatarFrame, CrownAccessory, crownAspect, LootBoxArt, RARITY_COLOR } from "./frames";
import { BURST_MS, CHARGE_MS, FX, Particles, reducedMotion, wait } from "./LootBoxOpening";
import { cn } from "@/lib/utils";

type Phase = "idle" | "charging" | "burst" | "reveal" | "leaving";

const CHEST = "#3b82f6";
const TICKET = "#f5b942";
const XP = "#7dd3fc";
const CASH = "#34d399";
const LEAVE_MS = 350;

/** How long the prize stays over the chest. Cosmetics wait longer so there is time to equip. */
const HOLD_MS: Record<LootTier, number> = {
  common: 3200,
  uncommon: 3800,
  rare: 4600,
  epic: 5400,
  legendary: 6500,
};
const COSMETIC_HOLD_MS = 10_000;

function useServerCountdown(status: ChestStatus | undefined, onDone: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const offset = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (status) offset.current = +new Date(status.server_time) - Date.now();
  }, [status]);
  const target = status?.next_at ? +new Date(status.next_at) : null;
  useEffect(() => {
    if (target == null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t + offset.current >= target) {
        window.clearInterval(id);
        done.current();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return target == null ? null : Math.max(0, target - (now + offset.current));
}

function rewardTitle(r: ChestReward) {
  if (r.kind === "credits") return formatUsd(r.amount ?? 0);
  if (r.kind === "xp") return `+${(r.amount ?? 0).toLocaleString("en-US")} XP`;
  if (r.kind === "fee_ticket") return "Fee-free win";
  return r.cosmetic?.name ?? "Cosmetic";
}

function rewardColor(r: ChestReward, tier: LootTier) {
  if (r.kind === "fee_ticket") return TICKET;
  if (r.kind === "credits") return tier === "common" ? CASH : (RARITY_COLOR[tier] ?? CASH);
  if (r.kind === "xp") return XP;
  return RARITY_COLOR[r.cosmetic?.rarity ?? tier] ?? RARITY_COLOR[tier] ?? CHEST;
}

function Rays({
  color,
  className,
  strength = 30,
}: {
  color: string;
  className?: string;
  strength?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 -ml-[110px] -mt-[110px] h-[220px] w-[220px] rounded-full sm:-ml-[150px] sm:-mt-[150px] sm:h-[300px] sm:w-[300px]",
        className,
      )}
      style={{
        background: `repeating-conic-gradient(from 0deg, color-mix(in oklab, ${color} ${strength}%, transparent) 0deg 8deg, transparent 8deg 24deg)`,
        maskImage: "radial-gradient(circle, black 14%, transparent 66%)",
        WebkitMaskImage: "radial-gradient(circle, black 14%, transparent 66%)",
      }}
    />
  );
}

/** The prize art, sized to sit where the chest was. */
function Prize({ reward, tier, color }: { reward: ChestReward; tier: LootTier; color: string }) {
  if (reward.kind === "cosmetic" && reward.cosmetic) {
    const key = reward.cosmetic.asset_key;
    if (reward.cosmetic.type === "crown") {
      return (
        <>
          <CrownAccessory
            assetKey={key}
            animated
            className="relative sm:hidden"
            style={{ width: 74, height: 74 * crownAspect(key) }}
          />
          <CrownAccessory
            assetKey={key}
            animated
            className="relative hidden sm:block"
            style={{ width: 109, height: 109 * crownAspect(key) }}
          />
        </>
      );
    }
    return (
      <>
        <AvatarFrame assetKey={key} className="relative h-[67px] w-[67px] sm:hidden" />
        <AvatarFrame assetKey={key} className="relative hidden h-[99px] w-[99px] sm:block" />
      </>
    );
  }
  if (reward.kind === "fee_ticket") {
    return (
      <span
        className="relative flex h-11 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed sm:h-16 sm:w-28"
        style={{
          borderColor: TICKET,
          background: `linear-gradient(135deg, color-mix(in oklab, ${TICKET} 30%, #120c02), #1a1204)`,
          boxShadow: `0 0 36px -4px ${TICKET}`,
        }}
      >
        <Ticket className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: TICKET }} aria-hidden />
        <span
          className="mt-0.5 font-display text-[10px] tracking-[0.2em] sm:text-xs"
          style={{ color: TICKET }}
        >
          0% FEE
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "relative font-display tabular text-2xl leading-none sm:text-4xl",
        tier === "legendary" && "loot-shimmer",
      )}
      style={
        tier === "legendary"
          ? { filter: `drop-shadow(0 0 22px color-mix(in oklab, ${color} 60%, transparent))` }
          : {
              color,
              textShadow: `0 0 24px color-mix(in oklab, ${color} 65%, transparent), 0 2px 0 rgb(0 0 0 / 45%)`,
            }
      }
    >
      {rewardTitle(reward)}
    </span>
  );
}

function Pill({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "tabular absolute left-1/2 whitespace-nowrap rounded-full bg-black/80 px-2.5 py-0.5 font-display text-[11px] tracking-wide text-white shadow-lg backdrop-blur-sm",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}

/** Compact daily chest. The box itself is the control; the prize appears over it, then a cooldown sits on it. */
export function DailyChest() {
  const { userId, ready } = useAuth();
  const qc = useQueryClient();
  const key = ["daily-chest", userId] as const;
  const q = useQuery({
    queryKey: key,
    queryFn: fetchChestStatus,
    enabled: ready && !!userId,
    staleTime: 30_000,
  });
  const status = q.data;
  const [phase, setPhase] = useState<Phase>("idle");
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [equip, setEquip] = useState<"idle" | "pending" | "done">("idle");
  const busy = useRef(false);
  const alive = useRef(true);
  const hold = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      window.clearTimeout(hold.current);
    };
  }, []);

  const remaining = useServerCountdown(status, () => void q.refetch());

  if (!ready || !userId) return null;

  const available = !!status?.available && phase === "idle";
  const cooling = status != null && !status.available && phase === "idle";
  const tier: LootTier = reward ? chestTier(reward) : "common";
  const fx = FX[tier];
  const color = reward ? rewardColor(reward, tier) : CHEST;
  const showPrize = reward != null && (phase === "reveal" || phase === "leaving");
  const tickets = status?.tickets ?? 0;

  function dismiss() {
    window.clearTimeout(hold.current);
    if (!alive.current) return;
    setPhase("leaving");
    window.setTimeout(
      () => {
        if (!alive.current) return;
        setPhase("idle");
        setReward(null);
        setEquip("idle");
      },
      reducedMotion() ? 0 : LEAVE_MS,
    );
  }

  async function open() {
    if (busy.current || !available) return;
    busy.current = true;
    setNote(null);
    const reduce = reducedMotion();
    setPhase("charging");
    let next: ChestStatus | null = null;
    try {
      [next] = await Promise.all([openDailyChest(), wait(reduce ? 0 : CHARGE_MS)]);
    } catch (error) {
      if (alive.current) {
        setNote(chestError(error));
        setPhase("idle");
        void q.refetch();
      }
      busy.current = false;
      return;
    }
    if (!alive.current) return;
    const won = next.last;
    setReward(won);
    setPhase("burst");
    await wait(reduce ? 0 : BURST_MS);
    if (!alive.current) return;
    setPhase("reveal");
    qc.setQueryData(key, next);
    void qc.invalidateQueries({ queryKey: ["prestige", userId] });
    void qc.invalidateQueries({ queryKey: ["wallet"] });
    busy.current = false;
    if (won)
      hold.current = window.setTimeout(
        dismiss,
        won.kind === "cosmetic" ? COSMETIC_HOLD_MS : HOLD_MS[chestTier(won)],
      );
  }

  async function equipNow() {
    const id = reward?.cosmetic?.id;
    if (!id || equip !== "idle") return;
    window.clearTimeout(hold.current);
    setEquip("pending");
    setNote(null);
    try {
      const next = await equipCosmetic(id);
      qc.setQueryData(["prestige", userId], next);
      void qc.invalidateQueries({ queryKey: ["prestige-identities"] });
      markSeen(id);
      if (!alive.current) return;
      setEquip("done");
      hold.current = window.setTimeout(dismiss, 2200);
    } catch (error) {
      if (!alive.current) return;
      setNote(prestigeError(error));
      setEquip("idle");
      hold.current = window.setTimeout(dismiss, 4000);
    }
  }

  const label = available
    ? "Open daily chest"
    : cooling
      ? `Daily chest opened. Next chest in ${remaining != null ? formatCountdown(remaining) : "a moment"}`
      : showPrize
        ? `You won ${rewardTitle(reward)}`
        : "Opening daily chest";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[74px] w-[93px] sm:h-[99px] sm:w-[141px]">
        {/* Idle: a breathing glow and rising motes invite the tap. */}
        {available ? (
          <>
            <span
              aria-hidden
              className="chest-halo pointer-events-none absolute left-1/2 top-1/2 -ml-16 -mt-14 h-28 w-32 rounded-full blur-2xl sm:-ml-24 sm:-mt-20 sm:h-40 sm:w-48"
              style={{ background: `color-mix(in oklab, ${CHEST} 55%, transparent)` }}
            />
            {[-34, -14, 6, 24, 40].map((x, i) => (
              <span
                key={x}
                aria-hidden
                className={cn(
                  "chest-mote pointer-events-none absolute left-1/2 top-[62%] h-1.5 w-1.5 rounded-full",
                  i % 2 && "chest-mote-alt",
                )}
                style={{ "--x": `${x}px`, animationDelay: `${i * 520}ms` } as CSSProperties}
              />
            ))}
          </>
        ) : null}

        {/* Charge: rays wind up and sparks are pulled into the box. */}
        {phase === "charging" ? (
          <>
            <Rays color={CHEST} className="chest-rays-wind" strength={34} />
            <span
              aria-hidden
              className="loot-charge-glow pointer-events-none absolute left-1/2 top-1/2 -ml-20 -mt-20 h-40 w-40 rounded-full blur-2xl"
              style={{ background: CHEST }}
            />
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className="chest-spark-in pointer-events-none absolute left-1/2 top-1/2 -ml-[2px] -mt-[2px] h-1 w-1 rounded-full"
                style={
                  {
                    "--a": `${(i * 360) / 14}deg`,
                    "--d": `${64 + (i % 3) * 14}px`,
                    animationDelay: `${(i % 5) * 110}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </>
        ) : null}

        {/* Burst: white flash and a double shockwave in the prize colour. */}
        {phase === "burst" ? (
          <>
            <span
              aria-hidden
              className="loot-flash chest-flash pointer-events-none absolute left-1/2 top-1/2 -ml-20 -mt-20 h-40 w-40 rounded-full blur-md"
            />
            {[0, 140].map((d) => (
              <span
                key={d}
                aria-hidden
                className="chest-shock pointer-events-none absolute left-1/2 top-1/2 -ml-10 -mt-10 h-20 w-20 rounded-full border-solid"
                style={{ borderColor: color, animationDelay: `${d}ms` }}
              />
            ))}
          </>
        ) : null}

        {/* Reveal: the prize rises over the chest with rays, rings and particles scaled to its rarity. */}
        {showPrize ? (
          <>
            {fx.rays || tier !== "common" ? (
              <Rays
                color={color}
                className={cn("chest-rays-spin", phase === "leaving" && "chest-out")}
                strength={fx.dim ? 42 : 30}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "loot-reveal-soft pointer-events-none absolute left-1/2 top-1/2 -ml-16 -mt-16 h-32 w-32 rounded-full blur-2xl",
                phase === "leaving" && "chest-out",
              )}
              style={{ background: `color-mix(in oklab, ${color} 45%, transparent)` }}
            />
            {phase === "reveal" ? (
              <>
                {Array.from({ length: Math.max(1, fx.rings) }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="loot-ring pointer-events-none absolute left-1/2 top-1/2 -ml-12 -mt-12 h-24 w-24 rounded-full border-2"
                    style={{ borderColor: color, animationDelay: `${i * 240}ms` }}
                  />
                ))}
                <Particles count={Math.max(10, fx.particles)} color={color} />
              </>
            ) : null}
          </>
        ) : null}

        {!showPrize ? (
          <span
            aria-hidden
            className={cn(
              "chest-ground pointer-events-none absolute bottom-[6%] left-1/2 h-3 w-[78%] -translate-x-1/2 sm:h-4",
              cooling && "opacity-60",
            )}
          />
        ) : null}

        <button
          type="button"
          onClick={() => (showPrize ? dismiss() : void open())}
          disabled={!available && !showPrize}
          aria-label={label}
          className={cn(
            "absolute inset-0 grid place-items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            available &&
              "cursor-pointer transition hover:scale-[1.04] hover:brightness-110 active:scale-[0.97]",
            !available && !showPrize && "cursor-default",
          )}
        >
          {showPrize ? (
            <span
              className={cn(
                "flex items-center justify-center",
                phase === "leaving" ? "chest-out" : "chest-pop",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center",
                  phase === "reveal" && "chest-float",
                )}
              >
                <Prize reward={reward} tier={tier} color={color} />
              </span>
            </span>
          ) : (
            <span
              key={cooling ? "cool" : "live"}
              className={cn(
                "flex items-center justify-center",
                phase === "charging" && "chest-shake",
                phase === "burst" && "loot-burst",
                cooling && "chest-settle chest-cool",
              )}
            >
              <span className="chest-art flex items-center justify-center">
                <LootBoxArt box="daily" width={86} animated={available} className="sm:hidden" />
                <LootBoxArt
                  box="daily"
                  width={134}
                  animated={available}
                  className="hidden sm:block"
                />
              </span>
            </span>
          )}
        </button>

        {available ? (
          <Pill
            className="chest-tag pointer-events-none bottom-0"
            style={{ background: CHEST, boxShadow: `0 0 16px -2px ${CHEST}` }}
          >
            OPEN
          </Pill>
        ) : null}
        {cooling && remaining != null ? (
          <Pill className="chest-timer pointer-events-none bottom-0 -translate-x-1/2">
            {formatCountdown(remaining)}
          </Pill>
        ) : null}
        {showPrize && phase === "reveal" ? (
          <Pill
            className="chest-caption pointer-events-none -bottom-2.5 border"
            style={{ borderColor: color, boxShadow: `0 0 18px -4px ${color}` }}
          >
            <span className="mr-1.5 text-[9px] uppercase tracking-[0.2em]" style={{ color }}>
              {reward.kind === "cosmetic"
                ? (reward.cosmetic?.rarity ?? "new")
                : reward.kind === "fee_ticket"
                  ? "epic"
                  : tier}
            </span>
            {reward.kind === "credits"
              ? "Added to balance"
              : reward.kind === "xp"
                ? "Added to prestige"
                : reward.kind === "fee_ticket"
                  ? "Next win pays 0% fee"
                  : rewardTitle(reward)}
          </Pill>
        ) : null}
      </div>

      {showPrize && phase === "reveal" && reward.kind === "cosmetic" ? (
        <div
          className="loot-reveal-soft relative z-20 mt-4 flex items-center gap-1.5"
          style={{ animationDelay: "450ms" }}
        >
          <button
            type="button"
            onClick={() => void equipNow()}
            disabled={equip !== "idle"}
            className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-[0_6px_18px_-6px_var(--color-primary)] transition hover:brightness-110 disabled:opacity-80"
          >
            {equip === "done" ? "Equipped ✓" : equip === "pending" ? "Equipping…" : "Equip now"}
          </button>
          <button
            type="button"
            onClick={() => {
              dismiss();
              scrollToWardrobe();
            }}
            className="rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/85"
          >
            Wardrobe
          </button>
        </div>
      ) : tickets > 0 && !showPrize ? (
        <span
          className="mt-2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
          style={{
            borderColor: `color-mix(in oklab, ${TICKET} 45%, transparent)`,
            color: TICKET,
            background: `color-mix(in oklab, ${TICKET} 10%, transparent)`,
          }}
          title="Applied automatically to your next winning Jackpot, Coinflip or P2P Slott game."
        >
          <Ticket className="h-3 w-3" aria-hidden />
          {tickets} fee-free {tickets === 1 ? "win" : "wins"}
        </span>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {showPrize ? `Daily chest: ${rewardTitle(reward)}` : ""}
      </span>
      {note ? (
        <p className="mt-1 w-40 text-center text-[11px] text-destructive" role="alert">
          {note}
        </p>
      ) : null}
    </div>
  );
}
