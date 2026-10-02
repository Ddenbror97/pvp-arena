import type { CSSProperties } from "react";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { AvatarFrame, CrownAccessory, crownAspect, frameClip, frameOpening } from "./frames";

/**
 * Where a crown sits on an identity of `size` px: its base rests on the top
 * rim (the frame's ring, or the avatar's edge without a frame) and only the
 * base overlaps it. `headroom` is how far the crown rises above the avatar
 * box; the component reserves that space so lists and scroll areas never clip it.
 */
export function crownPlacement(size: number, frame: string | null | undefined, crown: string | null | undefined) {
  const inset = Math.round(size * (frame ? 0.5 - frameOpening(frame) : 0.16));
  if (!crown) return { inset, width: 0, height: 0, top: 0, headroom: 0 };
  const width = size * 0.5;
  const height = width * crownAspect(crown);
  const rim = frame ? inset * 0.45 : inset + size * 0.02;
  const top = rim + height * 0.14 - height;
  return { inset, width, height, top, headroom: Math.max(0, Math.ceil(-top)) };
}

export function PlayerPrestigeIdentity({
  avatar,
  name,
  frame,
  crown,
  level,
  tier,
  size = 48,
  showMeta = false,
  previewSrc,
  reserveHeadroom = true,
  className,
}: {
  previewSrc?: string | null | undefined;
  /** Off where the parent has fixed height with spare room above (e.g. the site header). */
  reserveHeadroom?: boolean | undefined;
  avatar?: string | null | undefined;
  name?: string | null | undefined;
  frame?: string | null | undefined;
  crown?: string | null | undefined;
  level?: number | null | undefined;
  tier?: string | null | undefined;
  size?: number | undefined;
  showMeta?: boolean | undefined;
  className?: string | undefined;
}) {
  const label = [name, tier, level ? `level ${level}` : null].filter(Boolean).join(", ");
  const place = crownPlacement(size, frame, crown);
  const clip = frameClip(frame);
  const style: CSSProperties = { width: size, height: size };
  return (
    <span
      className={className ? `inline-flex flex-col items-center ${className}` : "inline-flex flex-col items-center"}
      style={reserveHeadroom && place.headroom ? { paddingTop: place.headroom } : undefined}
    >
      <span className="relative inline-flex shrink-0" style={style} role="img" aria-label={label || "Player"}>
        <span className={`absolute overflow-clip ${clip ? "" : "rounded-[8%]"}`} style={{ inset: place.inset, clipPath: clip }}>
          <PlayerAvatar src={avatar} previewSrc={previewSrc} name={name ?? undefined} className="h-full w-full ring-0" />
        </span>
        {frame ? <AvatarFrame assetKey={frame} className="pointer-events-none absolute inset-0 z-10 h-full w-full" /> : null}
        <CrownAccessory
          assetKey={crown}
          className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
          style={{
            top: place.top,
            width: place.width,
            height: place.height,
            filter: `drop-shadow(0 ${Math.max(1, size * 0.02)}px ${Math.max(1, size * 0.03)}px rgb(0 0 0 / 0.55))`,
          }}
        />
      </span>
      {showMeta && (tier || level) ? (
        <span className="mt-2 text-center">
          {tier ? <span className="block font-display text-[10px] uppercase tracking-[0.22em] text-gold">{tier}</span> : null}
          {level ? <span className="mt-0.5 block text-xs text-muted-foreground">Level {level}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
