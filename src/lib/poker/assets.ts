import dealerCutout from "@/assets/poker/dealer.webp";
import { preloadDealerFrames } from "@/lib/poker/dealer-frames";

/**
 * Dealer character art. The default is the supplied PVP dealer cutout (transparent WebP,
 * 682x799). `VITE_POKER_DEALER_IMAGE` can point at another cutout with the same framing.
 */
export const DEALER_IMAGE =
  (import.meta.env["VITE_POKER_DEALER_IMAGE"] as string | undefined) || dealerCutout;

/** Intrinsic size of the dealer art, so the box is reserved before it loads (no layout shift). */
export const DEALER_SIZE = { w: 682, h: 799 };

/**
 * Rig landmarks as fractions of the art box. The deck is the card stack in her hands:
 * every dealt card starts there. The neck is the head layer's pivot.
 */
export const DEALER_RIG = {
  deck: { x: 0.525, y: 0.915 },
  neck: { x: 0.5, y: 0.4 },
  /** Bottom of the head layer's feathered band / top of the torso band. */
  headBand: [0.4, 0.5] as const,
  /** Torso band that breathes; below it the arms and cards stay still on the table. */
  torsoBand: [0.74, 0.82] as const,
  /**
   * Mouth, measured on the art: lip corners, the line between the lips at the centre,
   * and the chin. The jaw (lower lip and chin) drops from the lip line while she speaks.
   */
  mouth: { left: 0.4501, right: 0.5293, cx: 0.4897, line: 0.2916, corner: 0.2853, chin: 0.343 },
  /** Between the card in her left hand and the deck in her right: the hands move apart here. */
  handSplit: 0.523,
};

export function warmDealer() {
  if (typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = DEALER_IMAGE;
  void img.decode().catch(() => {});
  void preloadDealerFrames();
}
