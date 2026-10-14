import { memo, useState } from "react";
import { DEALER_IMAGE, DEALER_RIG, DEALER_SIZE } from "@/lib/poker/assets";
import type { DealerPose } from "@/lib/poker/director";
import { cn } from "@/lib/utils";

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const [h0, h1] = DEALER_RIG.headBand;
const [t0, t1] = DEALER_RIG.torsoBand;
// Complementary feathered masks: head + torso + base sum to the full figure, so the
// layers recombine into the original image when the rig is at rest.
const HEAD_MASK = `linear-gradient(to bottom, #000 ${pct(h0)}, transparent ${pct(h1)})`;
const TORSO_MASK = `linear-gradient(to bottom, transparent ${pct(h0)}, #000 ${pct(h1)}, #000 ${pct(t0)}, transparent ${pct(t1)})`;
const BASE_MASK = `linear-gradient(to bottom, transparent ${pct(t0)}, #000 ${pct(t1)})`;

/**
 * The dealer: an animated cutout rig built from the supplied character art (not a 3D or
 * facially rigged model). Three feathered layers of the same image move independently:
 * the head and hair tilt about the neck, the torso breathes, and the arms and cards stay
 * planted on the table. Poses come from the presentation director, so every movement
 * follows a real table event. A riffle layer over her deck animates during the shuffle.
 * The face never moves on its own: no fake blinking or lip motion.
 */
export const Dealer = memo(function Dealer({
  pose,
  caption,
  className,
}: {
  pose: DealerPose;
  caption: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
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
  return (
    <div
      className={cn("poker-dealer", className)}
      data-pose={pose}
      style={
        {
          aspectRatio: `${DEALER_SIZE.w} / ${DEALER_SIZE.h}`,
          "--neck-x": pct(DEALER_RIG.neck.x),
          "--neck-y": pct(DEALER_RIG.neck.y),
          "--torso-y": pct(t1),
        } as React.CSSProperties
      }
    >
      <span className="poker-dealer-glow" aria-hidden />
      {failed ? (
        <span className="poker-dealer-fallback" role="img" aria-label="Dealer">
          <span>Dealer</span>
        </span>
      ) : (
        <span className="poker-dealer-rig" role="img" aria-label="PVP dealer">
          {layer(BASE_MASK, "poker-dealer-base")}
          {layer(TORSO_MASK, "poker-dealer-torso")}
          {layer(HEAD_MASK, "poker-dealer-head")}
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
