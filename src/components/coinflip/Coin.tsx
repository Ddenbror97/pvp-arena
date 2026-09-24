import { useEffect, useRef } from "react";

/**
 * Presentation only. The coin's rotation is a pure function of elapsed server
 * time and the server-decided side; there is no randomness anywhere.
 *   0.0–0.5s accelerate · 0.5–2.5s high speed · 2.5–3.2s slow down · 3.5s land.
 */
export const ANIMATION_MS = 3500;
const BASE_TURNS = 12; // full turns; HEADS lands on 0deg, TAILS on 180deg

function progress(u: number) {
  // Accelerating start, long fast middle, dramatic ease-out landing.
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const a = 0.5 / 3.5;
  if (u < a) return 0.06 * (u / a) ** 2;
  const v = (u - a) / (1 - a);
  return 0.06 + 0.94 * (1 - (1 - v) ** 3.2);
}

function tailsOffset(u: number) {
  // Extra half-turn blended in only during the slowdown (after the result is long known).
  const s = Math.min(1, Math.max(0, (u - 0.72) / 0.28));
  return 180 * s * s * (3 - 2 * s);
}

export function coinAngle(elapsedMs: number, side: "HEADS" | "TAILS" | null) {
  const u = elapsedMs / ANIMATION_MS;
  return progress(u) * BASE_TURNS * 360 + (side === "TAILS" ? tailsOffset(u) : 0);
}

interface Props {
  /** Server-authoritative animation start (ms, already offset to server time). */
  startMs: number | null;
  side: "HEADS" | "TAILS" | null;
  serverNow: () => number;
  /** Show a resting face (before start / after end). */
  restSide?: "HEADS" | "TAILS" | null;
  size?: number;
}

export function Coin({ startMs, side, serverNow, restSide = "HEADS", size = 150 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const sideRef = useRef(side);
  sideRef.current = side;

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const el = ref.current;
      const w = wrap.current;
      if (el && w) {
        if (startMs == null) {
          el.style.transform = `rotateY(${restSide === "TAILS" ? 180 : 0}deg)`;
          w.style.transform = "translateY(0) scale(1)";
        } else {
          const t = Math.min(ANIMATION_MS, Math.max(0, serverNow() - startMs));
          const u = t / ANIMATION_MS;
          el.style.transform = `rotateY(${coinAngle(t, sideRef.current)}deg)`;
          const lift = Math.sin(Math.PI * Math.min(1, u * 1.1)) * 0.22;
          w.style.transform = `translateY(${-lift * size}px) scale(${1 + lift * 0.6})`;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [startMs, serverNow, restSide, size]);

  return (
    <div className="flex items-center justify-center" style={{ perspective: size * 4, height: size * 1.5 }}>
      <div ref={wrap} style={{ willChange: "transform" }}>
        <div ref={ref} className="relative" style={{ width: size, height: size, transformStyle: "preserve-3d", willChange: "transform" }}>
          <Face label="HEADS" glyph="H" size={size} className="coin-face coin-heads" />
          <Face label="TAILS" glyph="T" size={size} className="coin-face coin-tails" back />
        </div>
      </div>
    </div>
  );
}

function Face({ label, glyph, className, back, size }: { label: string; glyph: string; className: string; back?: boolean; size: number }) {
  return (
    <div
      className={`${className} absolute inset-0 flex flex-col items-center justify-center rounded-full`}
      style={{ backfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : undefined }}
      aria-hidden
    >
      <span className="font-display text-[34%] leading-none" style={{ fontSize: size * 0.32 }}>{glyph}</span>
      <span className="mt-1 text-[10px] font-bold tracking-[0.4em]">{label}</span>
    </div>
  );
}
