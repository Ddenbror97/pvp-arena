import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatUsd } from "@/lib/jackpot/math";
import type { PrestigeLevel } from "@/lib/prestige/api";
import { lootTier, type LootTier } from "@/lib/prestige/loot";
import { ArtStage, lootAccent, LootBoxArt, RARITY_COLOR } from "./frames";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Phase = "idle" | "charging" | "opening" | "revealed";

/** Same anticipation for every open, so timing never hints at the prize. */
export const CHARGE_MS = 1100;
export const BURST_MS = 450;

export const FX: Record<
  LootTier,
  { particles: number; rings: number; rays: boolean; dim: boolean; amount: string; label: string }
> = {
  common: {
    particles: 0,
    rings: 0,
    rays: false,
    dim: false,
    amount: "text-4xl",
    label: "Common prize",
  },
  uncommon: {
    particles: 8,
    rings: 1,
    rays: false,
    dim: false,
    amount: "text-4xl",
    label: "Uncommon prize",
  },
  rare: {
    particles: 14,
    rings: 1,
    rays: false,
    dim: false,
    amount: "text-5xl",
    label: "Rare prize",
  },
  epic: {
    particles: 24,
    rings: 2,
    rays: true,
    dim: false,
    amount: "text-5xl",
    label: "Epic prize",
  },
  legendary: {
    particles: 40,
    rings: 3,
    rays: true,
    dim: true,
    amount: "text-6xl",
    label: "Top prize",
  },
};

export function reducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function Particles({ count, color }: { count: number; color: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const wave = i >= 20 ? 1 : 0;
        const style = {
          "--a": `${(i * 360) / Math.min(count, 20) + wave * 9 + ((i * 17) % 11)}deg`,
          "--d": `${70 + wave * 40 + ((i * 29) % 45)}px`,
          background: i % 4 === 0 ? "#fff7d6" : color,
          animationDelay: `${wave * 320 + (i % 3) * 45}ms`,
          width: i % 5 === 0 ? 8 : 5,
          height: i % 5 === 0 ? 8 : 5,
          marginLeft: i % 5 === 0 ? -4 : -2.5,
          marginTop: i % 5 === 0 ? -4 : -2.5,
        } as CSSProperties;
        return (
          <span
            key={i}
            aria-hidden
            className="loot-particle pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={style}
          />
        );
      })}
    </>
  );
}

export function LootBoxOpening({
  row,
  onOpen,
  onRevealed,
}: {
  row: PrestigeLevel;
  /** Claims the box; resolves to the paid cents, or null when the claim failed. */
  onOpen: () => Promise<number | null>;
  onRevealed: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(row.claimed ? "revealed" : "idle");
  const [won, setWon] = useState<number | null>(row.claimed ? row.won : null);
  const [fresh, setFresh] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function open() {
    if (phase !== "idle") return;
    const reduce = reducedMotion();
    setPhase("charging");
    const [result] = await Promise.all([onOpen(), wait(reduce ? 0 : CHARGE_MS)]);
    if (!alive.current) return;
    if (result == null) {
      setPhase("idle");
      return;
    }
    setWon(result);
    setPhase("opening");
    await wait(reduce ? 0 : BURST_MS);
    if (!alive.current) return;
    setFresh(true);
    setPhase("revealed");
    onRevealed();
  }

  const tier = won != null ? lootTier(won) : "common";
  const fx = FX[tier];
  const color = RARITY_COLOR[tier] ?? "#94a3b8";
  const boxColor = lootAccent(row.box);
  const revealed = phase === "revealed" && won != null;
  const celebrate = revealed && fresh;

  return (
    <div className="w-full">
      <ArtStage
        accent={revealed ? color : boxColor}
        rarity={revealed ? tier : "epic"}
        solid
        className="h-48 w-full"
      >
        {celebrate && fx.dim ? (
          <span aria-hidden className="loot-reveal-soft absolute inset-0 bg-black/45" />
        ) : null}
        {celebrate && fx.rays ? (
          <span
            aria-hidden
            className="loot-rays pointer-events-none absolute left-1/2 top-1/2 -ml-[180px] -mt-[180px] h-[360px] w-[360px] rounded-full"
            style={{
              background: `repeating-conic-gradient(from 0deg, color-mix(in oklab, ${color} ${fx.dim ? 38 : 24}%, transparent) 0deg 7deg, transparent 7deg 22deg)`,
              maskImage: "radial-gradient(circle, black 18%, transparent 68%)",
              WebkitMaskImage: "radial-gradient(circle, black 18%, transparent 68%)",
            }}
          />
        ) : null}

        {phase === "charging" || phase === "opening" ? (
          <span
            aria-hidden
            className="loot-charge-glow pointer-events-none absolute left-1/2 top-1/2 -ml-24 -mt-24 h-48 w-48 rounded-full blur-2xl"
            style={{ background: boxColor }}
          />
        ) : null}
        {phase === "opening" ? (
          <span
            aria-hidden
            className="loot-flash pointer-events-none absolute left-1/2 top-1/2 -ml-16 -mt-16 h-32 w-32 rounded-full bg-white blur-md"
          />
        ) : null}

        {phase !== "revealed" ? (
          <span
            className={cn(
              "relative flex items-center justify-center",
              phase === "charging" && "loot-charge",
              phase === "opening" && "loot-burst",
              !row.unlocked && "opacity-60 saturate-[.55]",
            )}
          >
            <LootBoxArt box={row.box} width={160} animated={phase === "idle" && row.unlocked} />
          </span>
        ) : null}

        {revealed ? (
          <div className="relative z-10 flex flex-col items-center px-4 text-center">
            {celebrate
              ? Array.from({ length: fx.rings }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="loot-ring pointer-events-none absolute left-1/2 top-1/2 -ml-16 -mt-16 h-32 w-32 rounded-full border-2"
                    style={{ borderColor: color, animationDelay: `${i * 260}ms` }}
                  />
                ))
              : null}
            {celebrate ? <Particles count={fx.particles} color={color} /> : null}
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color }}>
              {celebrate ? fx.label : "This box paid"}
            </p>
            <p
              className={cn(
                "mt-1 font-display tabular leading-none",
                fx.amount,
                celebrate && (tier === "common" ? "loot-reveal-soft" : "loot-reveal"),
                tier === "legendary" && "loot-shimmer",
              )}
              style={
                tier === "legendary"
                  ? {
                      filter: `drop-shadow(0 0 22px color-mix(in oklab, ${color} 60%, transparent))`,
                    }
                  : {
                      color: "#34d399",
                      textShadow: `0 0 ${tier === "common" ? 14 : 26}px color-mix(in oklab, #34d399 55%, transparent)`,
                    }
              }
            >
              {formatUsd(won)}
            </p>
          </div>
        ) : null}
      </ArtStage>

      <div className="mt-4 flex flex-col items-center gap-2" aria-live="polite">
        {revealed ? (
          <p className="text-sm text-muted-foreground">
            {fresh
              ? `You won ${formatUsd(won)}. It's in your balance now.`
              : "Opened. The prize is in your balance."}
          </p>
        ) : !row.unlocked ? (
          <>
            <p className="text-sm text-muted-foreground">Reach level {row.level}</p>
            <Button type="button" disabled className="min-h-11">
              Locked
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {phase === "idle" ? "Ready to open" : "Opening…"}
            </p>
            <Button
              type="button"
              className="min-h-11 min-w-36"
              disabled={phase !== "idle"}
              onClick={() => void open()}
            >
              {phase === "idle" ? "Open box" : "Opening…"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
