import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import frameStarter from "@/assets/prestige/frame-starter.webp";
import frameBronze from "@/assets/prestige/frame-bronze.webp";
import frameSteel from "@/assets/prestige/frame-steel.webp";
import frameSilver from "@/assets/prestige/frame-silver.webp";
import frameNeon from "@/assets/prestige/frame-neon.webp";
import frameGold from "@/assets/prestige/frame-gold.webp";
import frameEmerald from "@/assets/prestige/frame-emerald.webp";
import frameDiamond from "@/assets/prestige/frame-diamond.webp";
import frameCosmic from "@/assets/prestige/frame-cosmic.webp";
import frameElite from "@/assets/prestige/frame-elite.webp";
import frameRoyal from "@/assets/prestige/frame-royal.webp";
import frameCelestial from "@/assets/prestige/frame-celestial.webp";
import frameRgb from "@/assets/prestige/frame-rgb.webp";
import frameVortex from "@/assets/prestige/frame-vortex.webp";
import frameStone from "@/assets/prestige/frame-stone.webp";
import frameNature from "@/assets/prestige/frame-nature.webp";
import frameTidal from "@/assets/prestige/frame-tidal.webp";
import frameGlitch from "@/assets/prestige/frame-glitch.webp";
import frameVoid from "@/assets/prestige/frame-void.webp";
import frameNebula from "@/assets/prestige/frame-nebula.webp";
import frameDragonfire from "@/assets/prestige/frame-dragonfire.webp";
import frameOrbit from "@/assets/prestige/frame-orbit.webp";
import frameAngel from "@/assets/prestige/frame-angel.webp";
import crownGold from "@/assets/prestige/crown-gold.webp";
import crownDiamond from "@/assets/prestige/crown-diamond.webp";
import crownRoyal from "@/assets/prestige/crown-royal.webp";
import crownLegend from "@/assets/prestige/crown-legend.webp";
import crownSteel from "@/assets/prestige/crown-steel.webp";
import crownFrost from "@/assets/prestige/crown-frost.webp";
import crownInferno from "@/assets/prestige/crown-inferno.webp";
import lootSilver from "@/assets/prestige/lootbox-silver.webp";
import lootPurple from "@/assets/prestige/lootbox-purple.webp";
import lootGreen from "@/assets/prestige/lootbox-green.webp";
import lootDaily from "@/assets/prestige/lootbox-daily.webp";

type ArtProps = {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  animated?: boolean | undefined;
};

type FrameShape = "square" | "circle" | "hex" | "diamond" | "star";

/** Pointy-top hex: `point` is the vertical radius, `flat` the horizontal one, both as a share of the art width. */
function hexClip(flat: number, point: number) {
  const pad = ((point - flat) / (2 * point)) * 100;
  const left = pad.toFixed(1);
  const right = (100 - pad).toFixed(1);
  return `polygon(50% 0%, ${right}% 25%, ${right}% 75%, 50% 100%, ${left}% 75%, ${left}% 25%)`;
}

const DIAMOND = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
const STAR =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

/**
 * Painted art keyed by cosmetics.asset_key. Frames are square files with the
 * opening centred. `opening` is half the photo window as a share of the art
 * width, measured from the art so the photo fills the hole. `shape` clips
 * that window when the hole is not a square. Crowns are trimmed; `aspect` is
 * height / width.
 */
const FRAMES: Record<
  string,
  { src: string; opening: number; accent: string; shape: FrameShape; clip?: string }
> = {
  starter: { src: frameStarter, opening: 0.41, accent: "#cbd5e1", shape: "circle" },
  bronze: { src: frameBronze, opening: 0.372, accent: "#d08a4f", shape: "circle" },
  steel: {
    src: frameSteel,
    opening: 0.4,
    accent: "#94a3b8",
    shape: "hex",
    clip: hexClip(0.328, 0.4),
  },
  silver: { src: frameSilver, opening: 0.37, accent: "#e2e8f0", shape: "square" },
  neon: { src: frameNeon, opening: 0.355, accent: "#c056ff", shape: "square" },
  gold: { src: frameGold, opening: 0.34, accent: "#f5b942", shape: "circle" },
  emerald: { src: frameEmerald, opening: 0.368, accent: "#34d399", shape: "circle" },
  diamond: { src: frameDiamond, opening: 0.367, accent: "#67c8ff", shape: "diamond" },
  cosmic: { src: frameCosmic, opening: 0.25, accent: "#9d5cff", shape: "circle" },
  elite: {
    src: frameElite,
    opening: 0.35,
    accent: "#f5b942",
    shape: "hex",
    clip: hexClip(0.272, 0.35),
  },
  royal: { src: frameRoyal, opening: 0.23, accent: "#a855f7", shape: "circle" },
  celestial: { src: frameCelestial, opening: 0.34, accent: "#c084fc", shape: "star" },
  legend: { src: frameRgb, opening: 0.305, accent: "#f472b6", shape: "circle" },
  vortex: { src: frameVortex, opening: 0.282, accent: "#94a3b8", shape: "circle" },
  stone: { src: frameStone, opening: 0.204, accent: "#a8a29e", shape: "circle" },
  nature: { src: frameNature, opening: 0.236, accent: "#84cc16", shape: "circle" },
  tidal: { src: frameTidal, opening: 0.24, accent: "#38bdf8", shape: "circle" },
  glitch: { src: frameGlitch, opening: 0.268, accent: "#22d3ee", shape: "circle" },
  void: { src: frameVoid, opening: 0.206, accent: "#8b5cf6", shape: "circle" },
  nebula: { src: frameNebula, opening: 0.206, accent: "#c084fc", shape: "circle" },
  dragonfire: { src: frameDragonfire, opening: 0.203, accent: "#f97316", shape: "circle" },
  orbit: { src: frameOrbit, opening: 0.22, accent: "#a78bfa", shape: "circle" },
  angel: { src: frameAngel, opening: 0.249, accent: "#fde68a", shape: "circle" },
};

const CROWNS: Record<string, { src: string; aspect: number; accent: string }> = {
  "crown-gold": { src: crownGold, aspect: 0.694, accent: "#f5b942" },
  "crown-diamond": { src: crownDiamond, aspect: 0.812, accent: "#38bdf8" },
  "crown-royal": { src: crownRoyal, aspect: 0.903, accent: "#a855f7" },
  "crown-legend": { src: crownLegend, aspect: 0.798, accent: "#a855f7" },
  "crown-steel": { src: crownSteel, aspect: 0.904, accent: "#cbd5e1" },
  "crown-frost": { src: crownFrost, aspect: 0.816, accent: "#38bdf8" },
  "crown-inferno": { src: crownInferno, aspect: 0.917, accent: "#f59e0b" },
};

/** Keyed by prestige_rewards.metadata.box. Trimmed art; `aspect` is height / width. */
const LOOT_BOXES: Record<string, { src: string; aspect: number; accent: string }> = {
  silver: { src: lootSilver, aspect: 0.739, accent: "#cbd5e1" },
  purple: { src: lootPurple, aspect: 0.736, accent: "#a855f7" },
  green: { src: lootGreen, aspect: 0.736, accent: "#4ade80" },
  daily: { src: lootDaily, aspect: 0.61, accent: "#3b82f6" },
};

export function lootAccent(box: string | null | undefined): string {
  return (box && LOOT_BOXES[box]?.accent) || "#a855f7";
}

export const RARITY_COLOR: Record<string, string> = {
  common: "#94a3b8",
  uncommon: "#7dd3fc",
  rare: "#f5b942",
  epic: "#b77cff",
  legendary: "#d58cff",
};

export function rarityOf(assetKey: string | null | undefined): string {
  if (!assetKey) return "common";
  if (
    [
      "legend",
      "celestial",
      "crown-legend",
      "dragonfire",
      "orbit",
      "angel",
      "crown-inferno",
    ].includes(assetKey)
  )
    return "legendary";
  if (
    ["diamond", "cosmic", "elite", "royal", "crown-diamond", "crown-royal", "nebula"].includes(
      assetKey,
    )
  )
    return "epic";
  if (["gold", "crown-gold", "tidal", "glitch", "void", "crown-frost"].includes(assetKey))
    return "rare";
  if (["silver", "neon", "emerald"].includes(assetKey)) return "uncommon";
  return "common";
}

export function accentOf(assetKey: string | null | undefined): string {
  const fallback = "#f5b942";
  if (!assetKey) return fallback;
  return (
    FRAMES[assetKey]?.accent ??
    CROWNS[assetKey]?.accent ??
    RARITY_COLOR[rarityOf(assetKey)] ??
    fallback
  );
}

/** Half the photo window under a frame, as a share of the frame width. */
export function frameOpening(assetKey: string | null | undefined): number {
  return (assetKey && FRAMES[assetKey]?.opening) || 0.34;
}

/** Clips the square photo to the frame hole. Square frames keep the rounded-square photo. */
export function frameClip(assetKey: string | null | undefined): string | undefined {
  const frame = assetKey ? FRAMES[assetKey] : undefined;
  if (!frame || frame.shape === "square") return undefined;
  if (frame.shape === "circle") return "circle(50%)";
  if (frame.shape === "diamond") return DIAMOND;
  if (frame.shape === "star") return STAR;
  return frame.clip;
}

export function crownAspect(assetKey: string | null | undefined): number {
  return (assetKey && CROWNS[assetKey]?.aspect) || 0.75;
}

/** Every painted frame and crown, so a list can reserve the tallest crown before identities load. */
export const FRAME_ASSET_KEYS = Object.keys(FRAMES);
export const CROWN_ASSET_KEYS = Object.keys(CROWNS);

const paintedArt = new Set<string>();

function Art({ src, className, style, animated }: ArtProps & { src: string }) {
  const known = paintedArt.has(src);
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      decoding={known ? "sync" : "async"}
      loading={known ? "eager" : "lazy"}
      onLoad={() => paintedArt.add(src)}
      className={cn("select-none object-contain", animated && "prestige-art-live", className)}
      style={style}
    />
  );
}

/** Frames are always still: the art stays put around the avatar. */
export function AvatarFrame({
  assetKey,
  className,
  style,
}: Omit<ArtProps, "animated"> & { assetKey?: string | null | undefined }) {
  const art = assetKey ? FRAMES[assetKey] : undefined;
  if (!art) return null;
  return <Art src={art.src} className={className} style={style} />;
}

export function CrownAccessory({
  assetKey,
  className,
  style,
  animated,
}: ArtProps & { assetKey?: string | null | undefined }) {
  const art = assetKey ? CROWNS[assetKey] : undefined;
  if (!art) return null;
  return <Art src={art.src} className={className} style={style} animated={animated} />;
}

export function LootBoxArt({
  box,
  width,
  className,
  animated,
}: Omit<ArtProps, "style"> & { box?: string | null | undefined; width: number }) {
  const art = box ? LOOT_BOXES[box] : undefined;
  if (!art) return null;
  return (
    <Art
      src={art.src}
      className={className}
      style={{ width, height: width * art.aspect }}
      animated={animated}
    />
  );
}

/** Display well behind transparent art, with a soft accent glow. Dark by default; the light theme paints a pale well. `solid` skips that edge, for scenes that flash and dim. */
export function ArtStage({
  accent,
  rarity,
  locked,
  solid,
  className,
  children,
}: {
  accent: string;
  rarity: string;
  locked?: boolean | undefined;
  solid?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  const strong = rarity === "rare" || rarity === "epic" || rarity === "legendary";
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl bg-[#0f0f16]",
        !solid && "art-stage",
        className,
      )}
      style={{
        backgroundImage: `radial-gradient(circle at 50% 45%, color-mix(in oklab, ${accent} ${locked ? 8 : strong ? 26 : 14}%, transparent), transparent 68%)`,
      }}
    >
      {children}
    </div>
  );
}
