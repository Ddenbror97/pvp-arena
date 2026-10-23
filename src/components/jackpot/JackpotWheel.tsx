import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { wheelSegments } from "@/lib/jackpot/math";
import { JACKPOT_SPIN_MS } from "@/lib/jackpot/reveal";
import { loadWheelFace, paintWheel, wheelSlices } from "@/lib/jackpot/wheel-bitmap";
import { wheelTextureQuiet, winnerShade } from "@/lib/jackpot/wheel-picture";
import {
  WHEEL_RING_HOLD_MS,
  wheelClockDrift,
  wheelShouldSeek,
  wheelStartTime,
  wheelTimingFunction,
} from "@/lib/jackpot/wheel-motion";
import type { PlayerRow } from "@/lib/jackpot/api";
import { emitSound } from "@/lib/sound";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface SpinTarget {
  winnerId: string;
  winningTicket: number;
  /** Server-clock ms when the spin begins. Every viewer derives the same position from it. */
  startAt: number;
}

interface Props {
  players: PlayerRow[];
  spin: SpinTarget | null;
  /** Server-synced clock. */
  now: () => number;
  highlightId?: string | null | undefined;
  /** Rotates the palette so the same joiner is not the same color every round. */
  roundId?: number | undefined;
  children?: React.ReactNode;
}

/** Ratchet updates. Coarse on purpose: the picture does not wait on the audio clock. */
const CUE_MS = 50;

function wheelTimelineNow(): number | null {
  const t = document.timeline?.currentTime;
  return typeof t === "number" && Number.isFinite(t) ? t : null;
}

export function JackpotWheel({ players, spin, now, highlightId, roundId = 0, children }: Props) {
  const segments = useMemo(() => wheelSegments(players), [players]);
  const slices = useMemo(() => wheelSlices(segments, roundId), [segments, roundId]);
  const pictureKey = slices
    .map(
      (slice) =>
        `${slice.start.toFixed(3)}:${slice.end.toFixed(3)}:${slice.color}:${slice.avatar ?? ""}`,
    )
    .join("|");
  const rotor = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const nowRef = useRef(now);
  nowRef.current = now;
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const slicesRef = useRef(slices);
  slicesRef.current = slices;
  const winnerSeg = spin ? segments.find((s) => s.user_id === spin.winnerId) : undefined;

  // Final rotation: land inside the winner's slice at a spot derived from the
  // (already decided) winning ticket, so all viewers land on the same pixel.
  const target = useMemo(() => {
    if (!spin || !winnerSeg) return null;
    const frac = 0.15 + 0.7 * ((spin.winningTicket % 997) / 997);
    const angle = winnerSeg.start + (winnerSeg.end - winnerSeg.start) * frac;
    return 8 * 360 + (360 - angle);
  }, [spin, winnerSeg]);

  // Bake slices and faces into one bitmap. A later face decode waits out the
  // slow end of a spin so the landing is not a texture upload.
  useIso(() => {
    const el = canvas.current;
    const stage = rotor.current;
    if (!el || !stage) return;
    let dead = false;
    let timer = 0;
    let raf = 0;
    let lastCss = 0;
    const draw = (reason: "content" | "size") => {
      if (dead) return;
      const css = stage.clientWidth;
      if (css < 2) return;
      const start = spinRef.current?.startAt;
      const remain =
        start == null ? Number.POSITIVE_INFINITY : start + JACKPOT_SPIN_MS - nowRef.current();
      if (reason === "content" && wheelTextureQuiet(remain, el.dataset["ready"] === "1")) {
        clearTimeout(timer);
        timer = window.setTimeout(() => draw("content"), remain + 40);
        return;
      }
      paintWheel(el, css, slicesRef.current);
      if (el.width > 0) el.dataset["ready"] = "1";
      lastCss = css;
    };
    const schedule = (reason: "content" | "size") => {
      if (reason === "size") {
        cancelAnimationFrame(raf);
        draw("size");
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => draw("content"));
    };
    draw("content");
    const urls = new Set(
      slicesRef.current.flatMap((slice) => (slice.avatar ? [slice.avatar] : [])),
    );
    for (const url of urls) {
      void loadWheelFace(url).then(() => {
        if (!dead) schedule("content");
      });
    }
    const resize = new ResizeObserver(() => {
      const css = stage.clientWidth;
      if (Math.abs(css - lastCss) < 2) return;
      schedule("size");
    });
    resize.observe(stage);
    return () => {
      dead = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      resize.disconnect();
    };
  }, [pictureKey]);

  // One compositor transform for the whole spin. The clock is anchored once.
  // Nothing in this effect reads the animation back, so a busy main thread
  // cannot make the wheel step. A hidden tab is re-anchored from the clocks.
  const startAt = spin?.startAt;
  useIso(() => {
    const el = rotor.current;
    const stage = box.current;
    if (!el) return;
    if (startAt == null || target == null) {
      for (const running of el.getAnimations()) running.cancel();
      el.style.transform = "";
      if (stage) delete stage.dataset["spinning"];
      return;
    }
    const started = startAt;
    const anim = el.animate(
      [{ transform: "rotate(0deg)" }, { transform: `rotate(${target}deg)` }],
      {
        duration: JACKPOT_SPIN_MS,
        easing: wheelTimingFunction(),
        fill: "both",
      },
    );
    const timeline = wheelTimelineNow();
    let startTime = timeline == null ? null : wheelStartTime(timeline, nowRef.current(), started);
    if (startTime != null) anim.startTime = startTime;

    let ringTimer = 0;
    const elapsed0 = nowRef.current() - started;
    if (stage && elapsed0 < JACKPOT_SPIN_MS + WHEEL_RING_HOLD_MS) {
      stage.dataset["spinning"] = "1";
      ringTimer = window.setTimeout(
        () => {
          delete stage.dataset["spinning"];
        },
        Math.max(0, JACKPOT_SPIN_MS - elapsed0) + WHEEL_RING_HOLD_MS,
      );
    }

    let alignTimer = 0;
    const align = () => {
      if (startTime == null) return;
      const serverNow = nowRef.current();
      const remain = started + JACKPOT_SPIN_MS - serverNow;
      const timelineNow = wheelTimelineNow();
      if (timelineNow == null || remain <= 0) {
        clearInterval(alignTimer);
        document.removeEventListener("visibilitychange", align);
        return;
      }
      const drift = wheelClockDrift(timelineNow, startTime, serverNow, started);
      if (!wheelShouldSeek(drift, remain)) return;
      startTime = wheelStartTime(timelineNow, serverNow, started);
      anim.startTime = startTime;
    };
    if (elapsed0 < JACKPOT_SPIN_MS) {
      alignTimer = window.setInterval(align, 1000);
      document.addEventListener("visibilitychange", align);
    }

    let stopped = elapsed0 >= JACKPOT_SPIN_MS;
    let cueTimer = 0;
    let armTimer = 0;
    const cue = () => {
      const elapsed = nowRef.current() - started;
      if (stopped) return;
      if (elapsed < 0) return;
      if (elapsed >= JACKPOT_SPIN_MS) {
        stopped = true;
        emitSound("spin_stop");
        return;
      }
      emitSound("wheel_spin", { elapsedMs: elapsed });
    };
    const armCue = () => {
      const elapsed = nowRef.current() - started;
      if (elapsed < 0) {
        armTimer = window.setTimeout(armCue, Math.min(CUE_MS, -elapsed));
        return;
      }
      cue();
      if (!stopped) cueTimer = window.setInterval(cue, CUE_MS);
    };
    if (!stopped) armCue();

    return () => {
      clearTimeout(ringTimer);
      clearTimeout(armTimer);
      clearInterval(cueTimer);
      clearInterval(alignTimer);
      document.removeEventListener("visibilitychange", align);
      anim.cancel();
      if (stage) delete stage.dataset["spinning"];
      emitSound("spin_stop");
    };
  }, [startAt, target]);

  // Pause the decorative RGB ring while the page scrolls or the wheel is off-screen:
  // repainting the rotating gradient + blur during scroll caused jank on mid-range phones.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let t = 0;
    const onScroll = () => {
      el.dataset["ringPaused"] = "1";
      clearTimeout(t);
      t = window.setTimeout(() => {
        if (el.dataset["visible"] !== "0") delete el.dataset["ringPaused"];
      }, 180);
    };
    const io = new IntersectionObserver(([e]) => {
      el.dataset["visible"] = e?.isIntersecting ? "1" : "0";
      if (e?.isIntersecting) delete el.dataset["ringPaused"];
      else el.dataset["ringPaused"] = "1";
    });
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  const shade =
    highlightId && winnerSeg && target != null && highlightId === winnerSeg.user_id
      ? {
          background: winnerShade(winnerSeg.start, winnerSeg.end),
          transform: `rotate(${target}deg)`,
        }
      : null;

  return (
    <div
      ref={box}
      data-panel
      className="game-stage relative mx-auto aspect-square w-full max-w-[min(340px,86vw)] touch-pan-y sm:max-w-[460px] [&_*]:touch-pan-y"
    >
      <div className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2">
        <div className="h-0 w-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-primary drop-shadow-[0_0_10px_var(--primary)]" />
      </div>
      <div aria-hidden className="rgb-ring rgb-ring-blur" />
      <div aria-hidden className="rgb-ring" />
      <div className="jp-wheel-base absolute inset-0 rounded-full bg-surface ring-1 ring-border" />
      <div ref={rotor} className="jp-wheel-rotor absolute inset-0">
        <canvas ref={canvas} className="block h-full w-full" aria-hidden />
      </div>
      {shade ? <div aria-hidden className="jp-wheel-shade" style={shade} /> : null}
      <div className="jp-wheel-hub absolute inset-[18%] z-10 flex items-center justify-center rounded-full bg-background ring-1 ring-border">
        {children}
      </div>
    </div>
  );
}
