import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DEALER_IMAGE, DEALER_RIG, DEALER_SIZE } from "@/lib/poker/assets";
import {
  DEALER_CLIPS,
  DealerClipRunner,
  clipForPose,
  type DealerClipId,
} from "@/lib/poker/dealer-clips";
import {
  DEALER_ANCHOR,
  DEALER_CANVAS,
  DEALER_DECK,
  DEALER_IDLE_URL,
  loadDealerFrame,
  peekDealerFrame,
  preloadDealerFrames,
} from "@/lib/poker/dealer-frames";
import type { DealerPose } from "@/lib/poker/director";
import { useReducedMotion } from "@/lib/poker/prefs";
import { cn } from "@/lib/utils";
import { dealerMouthLevel, useDealerSpeaking } from "./usePresentation";

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const [h0, h1] = DEALER_RIG.headBand;
const [t0, t1] = DEALER_RIG.torsoBand;
const M = DEALER_RIG.mouth;
const split = DEALER_RIG.handSplit;
// Each upper layer fades out over a layer that is still fully opaque underneath, so the
// figure is solid everywhere. Two half-faded layers only reach ~75% coverage, which let the
// neon rail show through her forearms.
const HEAD_MASK = `linear-gradient(to bottom, #000 ${pct(h0)}, transparent ${pct(h1)})`;
const TORSO_MASK = `linear-gradient(to bottom, transparent ${pct(h0 - 0.04)}, #000 ${pct(h0)}, #000 ${pct(t0)}, transparent ${pct(t1)})`;
const BASE_MASK = `linear-gradient(to bottom, transparent ${pct(t0 - 0.04)}, #000 ${pct(t0)})`;
// The hands move separately: the screen-left hand (the card she pitches) fades out over the
// deck hand, which stays opaque a few pixels past the split so the seam is always solid.
const DECK_HAND_MASK = `${BASE_MASK}, linear-gradient(to right, transparent ${pct(split - 0.008)}, #000 ${pct(split - 0.003)})`;
const HAND_L_MASK = `${BASE_MASK}, linear-gradient(to right, #000 ${pct(split)}, transparent ${pct(split + 0.012)})`;
// Lower lip and chin: a hard edge along the lip line so a gap opens when it drops, soft
// everywhere else so the moving skin blends into the still cheek.
const JAW_CLIP = `polygon(${[
  [M.left - 0.03, M.corner + 0.02],
  [M.left, M.corner],
  [M.cx - 0.02, M.line - 0.0005],
  [M.cx, M.line + 0.001],
  [M.cx + 0.02, M.line],
  [M.right, M.corner + 0.001],
  [M.right + 0.03, M.corner + 0.02],
  [M.right + 0.05, M.chin + 0.04],
  [M.left - 0.05, M.chin + 0.04],
]
  .map(([x, y]) => `${pct(x!)} ${pct(y!)}`)
  .join(", ")})`;
// Narrower than the lips, so the corners stay put while the centre opens.
const JAW_MASK = `radial-gradient(ellipse ${pct(0.046)} ${pct(0.05)} at ${pct(M.cx)} ${pct(M.line + 0.014)}, #000 55%, transparent 100%)`;

/** Speech loudness (RMS of a normalised clip) to how far the jaw opens, 0..1. */
const openFor = (rms: number) => Math.min(1, Math.max(0, (rms - 0.03) * 4));

export interface DealerPreview {
  clip: DealerClipId;
  nonce: number;
}

function openingFrame(pose: DealerPose): { frame: string; clip: string } {
  const clip = clipForPose(pose);
  return { frame: DEALER_CLIPS[clip].frames[0]?.frame ?? "idle", clip };
}

/**
 * The dealer. Live poses come from the presentation director and play as ordered
 * stills from the two sprite sheets. The sheets are separate generated poses, so
 * the arm changes in steps. There is no crossfade between different arm positions.
 * If a frame fails to load, the original single-image rig is the fallback. The jaw
 * on that rig still follows the line she is speaking. Frame mode keeps the caption,
 * the voice, and a speaking glow, because the jaw cannot track a swapped face.
 */
export const Dealer = memo(function Dealer({
  pose,
  look,
  caption,
  className,
  preview = null,
  motion,
}: {
  pose: DealerPose;
  /** Where she looks: x in -1 (left) .. 1 (right), y in 0 (level) .. 1 (down toward the near seats). */
  look: { x: number; y: number } | null;
  caption: string | null;
  className?: string;
  /** Dev gallery. Restarts the named clip. The table leaves this unset. */
  preview?: DealerPreview | null;
  /** Overrides the system reduced-motion setting. The gallery uses this. */
  motion?: "full" | "reduced";
}) {
  const systemReduced = useReducedMotion();
  const reduced = motion === "reduced" ? true : motion === "full" ? false : systemReduced;
  const speaking = useDealerSpeaking();
  const root = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [framesOk, setFramesOk] = useState(true);
  const [paused, setPaused] = useState(false);
  const [shown, setShown] = useState(() => openingFrame(pose));
  const [heldUrl, setHeldUrl] = useState(DEALER_IDLE_URL);
  const ready = framesOk ? peekDealerFrame(shown.frame) : null;
  const src = ready ?? heldUrl;
  const previewClip = preview?.clip;
  const previewNonce = preview?.nonce;

  useEffect(() => {
    void preloadDealerFrames();
  }, []);

  useEffect(() => {
    if (!framesOk || ready) return;
    let cancel = false;
    void loadDealerFrame(shown.frame)
      .then((url) => {
        if (!cancel) setHeldUrl(url);
      })
      .catch(() => {
        if (!cancel) setFramesOk(false);
      });
    return () => {
      cancel = true;
    };
  }, [framesOk, ready, shown.frame]);

  useLayoutEffect(() => {
    const runner = new DealerClipRunner();
    const now = performance.now();
    if (previewClip) runner.play(previewClip, now, reduced);
    else runner.pose(pose, now, reduced);
    if (typeof document !== "undefined" && document.hidden) {
      runner.pause(now);
      setPaused(true);
    }
    let dead = false;
    let timer = 0;
    const pump = () => {
      if (dead) return;
      const sample = runner.sample(performance.now());
      setShown((cur) =>
        cur.frame === sample.frame && cur.clip === sample.clip
          ? cur
          : { frame: sample.frame, clip: sample.clip },
      );
      if (sample.nextAt != null) {
        timer = window.setTimeout(pump, Math.max(16, sample.nextAt - performance.now()));
        return;
      }
      const quiet =
        !previewClip &&
        pose === "idle" &&
        !reduced &&
        sample.clip === "idle" &&
        !document.hidden &&
        window.innerWidth >= 720;
      if (!quiet) return;
      timer = window.setTimeout(() => {
        if (dead || document.hidden || window.innerWidth < 720) return;
        runner.nudge("wink", performance.now());
        pump();
      }, 9000 + Math.random() * 5000);
    };
    pump();
    const onVis = () => {
      const t = performance.now();
      window.clearTimeout(timer);
      if (document.hidden) {
        runner.pause(t);
        setPaused(true);
        return;
      }
      runner.resume(t);
      setPaused(false);
      pump();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      dead = true;
      runner.dispose();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pose, reduced, previewClip, previewNonce]);

  useEffect(() => {
    const el = root.current;
    if (!el || framesOk || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let open = 0;
    let raf = 0;
    const started = performance.now();
    const frame = (now: number) => {
      const rms = speaking ? dealerMouthLevel() : null;
      let target = 0;
      if (rms !== null) target = openFor(rms);
      else if (speaking) {
        // No audio to read: an irregular ~5 syllables a second.
        const t = (now - started) / 1000;
        const s =
          Math.sin(t * 31) * 0.5 + Math.sin(t * 19.3 + 1.7) * 0.35 + Math.sin(t * 7.1) * 0.15;
        target = Math.max(0, s) * 0.85;
      }
      // Jaws open quickly and close a little slower.
      open += (target - open) * (target > open ? 0.55 : 0.3);
      el.style.setProperty("--mouth", open.toFixed(3));
      if (speaking || open > 0.01) raf = requestAnimationFrame(frame);
      else el.style.setProperty("--mouth", "0");
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [speaking, framesOk]);

  const layer = (mask: string, cls: string, children?: ReactNode) => (
    <span className={cn("poker-dealer-layer", cls)}>
      <img
        src={DEALER_IMAGE}
        alt=""
        width={DEALER_SIZE.w}
        height={DEALER_SIZE.h}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      />
      {children}
    </span>
  );
  const silhouette = `url("${DEALER_IMAGE}")`;
  const box = framesOk ? DEALER_CANVAS : DEALER_SIZE;
  const deck = framesOk ? DEALER_DECK : DEALER_RIG.deck;
  return (
    <div
      ref={root}
      className={cn("poker-dealer", className)}
      data-pose={pose}
      data-clip={shown.clip}
      data-frame={shown.frame}
      data-frames={framesOk ? "1" : "0"}
      data-paused={paused ? "1" : "0"}
      data-speaking={speaking ? "1" : "0"}
      data-looking={look ? "1" : "0"}
      style={
        {
          aspectRatio: `${box.w} / ${box.h}`,
          "--neck-x": pct(DEALER_RIG.neck.x),
          "--neck-y": pct(DEALER_RIG.neck.y),
          "--torso-y": pct(t1),
          "--dealer-ax": pct(DEALER_ANCHOR.x),
          "--dealer-ay": pct(DEALER_ANCHOR.y),
          "--lx": (look?.x ?? 0).toFixed(3),
          "--ly": (look?.y ?? 0).toFixed(3),
        } as CSSProperties
      }
    >
      <span className="poker-dealer-glow" aria-hidden />
      <span className="poker-dealer-shadow" aria-hidden />
      {framesOk ? (
        <span className="poker-dealer-motion" role="img" aria-label="PVP dealer">
          <img
            className="poker-dealer-frame"
            src={src}
            alt=""
            width={DEALER_CANVAS.w}
            height={DEALER_CANVAS.h}
            decoding="async"
            draggable={false}
            onError={() => setFramesOk(false)}
          />
        </span>
      ) : failed ? (
        <span className="poker-dealer-fallback" role="img" aria-label="Dealer">
          <span>Dealer</span>
        </span>
      ) : (
        <span className="poker-dealer-rig" role="img" aria-label="PVP dealer">
          {layer(DECK_HAND_MASK, "poker-dealer-base")}
          {layer(HAND_L_MASK, "poker-dealer-hand-l")}
          {layer(TORSO_MASK, "poker-dealer-torso")}
          {layer(
            HEAD_MASK,
            "poker-dealer-head",
            <>
              <span
                className="poker-dealer-mouth"
                aria-hidden
                style={{
                  left: pct(M.left + 0.012),
                  width: pct(M.right - M.left - 0.024),
                  top: pct(M.line - 0.0005),
                }}
              />
              <span className="poker-dealer-jaw" aria-hidden>
                <img
                  src={DEALER_IMAGE}
                  alt=""
                  width={DEALER_SIZE.w}
                  height={DEALER_SIZE.h}
                  decoding="async"
                  draggable={false}
                  style={{
                    clipPath: JAW_CLIP,
                    maskImage: JAW_MASK,
                    WebkitMaskImage: JAW_MASK,
                  }}
                />
              </span>
            </>,
          )}
          <span
            className="poker-dealer-sheen"
            aria-hidden
            style={{ maskImage: silhouette, WebkitMaskImage: silhouette }}
          />
        </span>
      )}
      <span
        className="poker-dealer-deck"
        data-anchor="deck"
        style={{ left: pct(deck.x), top: pct(deck.y) }}
        aria-hidden
      >
        {framesOk ? null : (
          <>
            <span className="poker-riffle poker-riffle-l" />
            <span className="poker-riffle poker-riffle-r" />
          </>
        )}
      </span>
      <span className="poker-dealer-label">Dealer</span>
      <span className="poker-dealer-caption" aria-live="polite">
        {caption ? <span key={caption}>{caption}</span> : null}
      </span>
    </div>
  );
});
