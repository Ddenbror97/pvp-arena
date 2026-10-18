import type { AvatarCrop } from "./limits";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Crop square in source pixels. Out-of-range or missing values fall back to a centred square. */
export function cropRect(width: number, height: number, crop: AvatarCrop | null | undefined) {
  const short = Math.min(width, height);
  const ok = crop && [crop.x, crop.y, crop.size].every((n) => Number.isFinite(n));
  const size = Math.round(clamp(ok ? crop.size : 1, 0.1, 1) * short);
  const side = Math.max(1, Math.min(short, size));
  const left = ok ? Math.round(clamp(crop.x, 0, 1) * width) : Math.round((width - side) / 2);
  const top = ok ? Math.round(clamp(crop.y, 0, 1) * height) : Math.round((height - side) / 2);
  return { left: clamp(left, 0, width - side), top: clamp(top, 0, height - side), side };
}
