import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { DEALER_IMAGE, DEALER_RIG, DEALER_SIZE } from "@/lib/poker/assets";
import type { DealerPose } from "@/lib/poker/director";
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

/**
 * The dealer: an animated cutout rig built from the supplied character art (not a 3D or
 * facially rigged model). Layers of the same image move independently: the whole figure
 * sways and leans toward the seat she is attending to, the torso breathes, the head turns
 * and tilts, each hand works on its own, and the jaw opens with the loudness of the line
 * she is speaking (a syllable rhythm when the browser's speech engine is talking, since it
 * exposes no audio). Poses and focus come from the presentation director, so every
 * deliberate movement follows a real table event.
 */
export const Dealer = memo(function Dealer({
  pose,
  look,
  caption,
  className,
}: {
  pose: DealerPose;
  /** Where she looks: x in -1 (left) .. 1 (right), y in 0 (level) .. 1 (down toward the near seats). */
  look: { x: number; y: number } | null;
  caption: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const speaking = useDealerSpeaking();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof window === "undefined") return;
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
  }, [speaking]);

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
  return (
    <div
      ref={root}
      className={cn("poker-dealer", className)}
      data-pose={pose}
      data-speaking={speaking ? "1" : "0"}
      data-looking={look ? "1" : "0"}
      style={
        {
          aspectRatio: `${DEALER_SIZE.w} / ${DEALER_SIZE.h}`,
          "--neck-x": pct(DEALER_RIG.neck.x),
          "--neck-y": pct(DEALER_RIG.neck.y),
          "--torso-y": pct(t1),
          "--lx": (look?.x ?? 0).toFixed(3),
          "--ly": (look?.y ?? 0).toFixed(3),
        } as React.CSSProperties
      }
    >
      <span className="poker-dealer-glow" aria-hidden />
      <span className="poker-dealer-shadow" aria-hidden />
      {failed ? (
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
        style={{ left: pct(DEALER_RIG.deck.x), top: pct(DEALER_RIG.deck.y) }}
        aria-hidden
      >
        <span className="poker-riffle poker-riffle-l" />
        <span className="poker-riffle poker-riffle-r" />
      </span>
      <span className="poker-dealer-label">Dealer</span>
      <span className="poker-dealer-caption" aria-live="polite">
        {caption ? <span key={caption}>{caption}</span> : null}
      </span>
    </div>
  );
});
