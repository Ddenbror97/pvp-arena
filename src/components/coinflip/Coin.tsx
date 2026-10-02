import { useEffect, useRef } from "react";
import { coinHeads as headsAsset, coinTails as tailsAsset } from "@/assets/media";
import { coinAngleAt, coinLandingTime, liftProgress } from "@/lib/coinflip/coin-motion";

interface Props {
  /** Server-authoritative animation start (ms, already offset to server time). */
  startMs: number | null;
  side: "HEADS" | "TAILS" | null;
  /** Client time the side arrived after this view had already started the flip without it. */
  revealAt?: number | null;
  serverNow: () => number;
  /** Show a resting face (before start / after end). */
  restSide?: "HEADS" | "TAILS" | null;
  size?: number;
  /** Fits a list row: no lift, and the box is exactly the coin size. */
  embedded?: boolean;
}

export function Coin({ startMs, side, revealAt = null, serverNow, restSide = "HEADS", size = 150, embedded = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // One frame loop per (start, side, reveal); it stops once the coin rests on the authoritative face.
  useEffect(() => {
    let raf = 0;
    const m = startMs == null ? null : { start: startMs, side, revealAt };
    const land = m ? coinLandingTime(m) : 0;
    const frame = () => {
      const el = ref.current;
      const w = wrap.current;
      const t = serverNow();
      if (el && w) {
        if (!m) {
          el.style.transform = `rotateY(${restSide === "TAILS" ? 180 : 0}deg)`;
          w.style.transform = "translateY(0) scale(1)";
        } else {
          el.style.transform = `rotateY(${coinAngleAt(m, t)}deg)`;
          const u = liftProgress(m, t);
          const lift = embedded ? 0 : Math.sin(Math.PI * Math.min(1, u * 1.1)) * 0.22;
          w.style.transform = `translateY(${-lift * size}px) scale(${1 + lift * 0.6})`;
        }
      }
      if (m && t < land + 50) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [startMs, side, revealAt, serverNow, restSide, size, embedded]);

  return (
    <div className="flex touch-pan-y items-center justify-center" style={{ perspective: size * 4, height: embedded ? size : size * 1.5 }}>
      <div ref={wrap} style={{ willChange: "transform", touchAction: "pan-y" }}>
        <div ref={ref} className="relative" style={{ width: size, height: size, transformStyle: "preserve-3d", willChange: "transform", touchAction: "pan-y" }}>
          <Face src={headsAsset} label="HEADS" size={size} />
          <Face src={tailsAsset} label="TAILS" size={size} back />
        </div>
      </div>
    </div>
  );
}

function Face({ src, label, back, size }: { src: string; label: string; back?: boolean; size: number }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-full"
      style={{ backfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : undefined }}
      aria-hidden
    >
      <img
        src={src}
        alt={label}
        width={size}
        height={size}
        draggable={false}
        className="h-full w-full rounded-full object-cover select-none"
      />
    </div>
  );
}
