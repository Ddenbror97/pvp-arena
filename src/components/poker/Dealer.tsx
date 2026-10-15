import { memo, useState } from "react";
import { DEALER_IMAGE, DEALER_RIG, DEALER_SIZE } from "@/lib/poker/assets";
import type { DealerPose } from "@/lib/poker/director";
import { cn } from "@/lib/utils";
import { useDealerSpeaking } from "./usePresentation";

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const [h0, h1] = DEALER_RIG.headBand;
const [t0, t1] = DEALER_RIG.torsoBand;
// Each upper layer fades out over a layer that is still fully opaque underneath, so the
// figure is solid everywhere. Two half-faded layers only reach ~75% coverage, which let the
// neon rail show through her forearms.
const HEAD_MASK = `linear-gradient(to bottom, #000 ${pct(h0)}, transparent ${pct(h1)})`;
const TORSO_MASK = `linear-gradient(to bottom, transparent ${pct(h0 - 0.04)}, #000 ${pct(h0)}, #000 ${pct(t0)}, transparent ${pct(t1)})`;
const BASE_MASK = `linear-gradient(to bottom, transparent ${pct(t0 - 0.04)}, #000 ${pct(t0)})`;

/**
 * The dealer: an animated cutout rig built from the supplied character art (not a 3D or
 * facially rigged model). Three layers of the same image move independently: the whole
 * figure sways and leans toward the seat she is attending to, the torso breathes, the head
 * turns, tilts and moves while she speaks, and the hands work the deck when shuffling and
 * dealing. Poses and focus come from the presentation director, so every deliberate
 * movement follows a real table event. The face itself never morphs: no fake blinking or
 * lip shapes.
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
  const layer = (mask: string, cls: string) => (
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
    </span>
  );
  const silhouette = `url("${DEALER_IMAGE}")`;
  return (
    <div
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
          {layer(BASE_MASK, "poker-dealer-base")}
          {layer(TORSO_MASK, "poker-dealer-torso")}
          {layer(HEAD_MASK, "poker-dealer-head")}
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
