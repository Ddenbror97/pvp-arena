import { avatarSrc } from "@/lib/avatar";
import { playerColor } from "@/lib/jackpot/colors";
import {
  WHEEL_INNER,
  WHEEL_R,
  WHEEL_VIEW,
  wheelAvatarCenter,
  wheelShowsAvatar,
} from "@/lib/jackpot/wheel-picture";

export interface WheelSlicePaint {
  start: number;
  end: number;
  color: string;
  avatar: string | null;
}

const faces = new Map<string, HTMLImageElement | null>();
const loads = new Map<string, Promise<HTMLImageElement | null>>();

function loadOnce(url: string, cors: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      const decoded = img.decode?.();
      if (decoded) decoded.then(() => resolve(img)).catch(() => resolve(img));
      else resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Decode a face once. DiceBear allows CORS; a custom avatar that does not still draws. */
export function loadWheelFace(url: string): Promise<HTMLImageElement | null> {
  const pending = loads.get(url);
  if (pending) return pending;
  const run = loadOnce(url, true).then((img) => img ?? loadOnce(url, false));
  const stored = run.then((img) => {
    faces.set(url, img);
    return img;
  });
  loads.set(url, stored);
  return stored;
}

export function wheelSlices(
  segments: { start: number; end: number; profiles?: { avatar_url: string | null } | null }[],
  roundId: number,
): WheelSlicePaint[] {
  return segments.map((segment, index) => {
    const sweep = segment.end - segment.start;
    return {
      start: segment.start,
      end: segment.end,
      color: playerColor(index, roundId),
      avatar: wheelShowsAvatar(sweep) ? avatarSrc(segment.profiles?.avatar_url) : null,
    };
  });
}

let probe: HTMLSpanElement | null = null;

function resolved(prop: "color" | "backgroundColor", value: string): string {
  if (typeof document === "undefined") return value;
  if (!probe) {
    probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;visibility:hidden";
    document.documentElement.appendChild(probe);
  }
  probe.style.color = "";
  probe.style.backgroundColor = "";
  probe.style[prop] = value;
  const read = getComputedStyle(probe)[prop];
  return read && read !== "rgba(0, 0, 0, 0)" ? read : value;
}

function rad(deg: number): number {
  return ((deg - 90) * Math.PI) / 180;
}

/**
 * One bitmap for the whole spin. Two players and a hundred players then cost
 * the same on the compositor: a single texture, rotated.
 */
export function paintWheel(
  canvas: HTMLCanvasElement,
  cssSize: number,
  slices: WheelSlicePaint[],
): void {
  const css = Math.round(cssSize);
  if (css < 2) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(css * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (canvas.width !== px || canvas.height !== px) {
    canvas.width = px;
    canvas.height = px;
  }
  const unit = (dpr * css) / WHEEL_VIEW;
  ctx.setTransform(unit, 0, 0, unit, 0, 0);
  ctx.clearRect(0, 0, WHEEL_VIEW, WHEEL_VIEW);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const gap = resolved("backgroundColor", "var(--background)");
  if (slices.length === 0) {
    ctx.beginPath();
    ctx.arc(WHEEL_R, WHEEL_R, (WHEEL_R + WHEEL_INNER) / 2 - 4, 0, Math.PI * 2);
    ctx.strokeStyle = resolved("color", "var(--wheel-tick, var(--border))");
    ctx.lineWidth = WHEEL_R - WHEEL_INNER - 8;
    ctx.setLineDash([4, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  for (const slice of slices) {
    const color = resolved("color", slice.color);
    const sweep = slice.end - slice.start;
    ctx.beginPath();
    if (sweep >= 359.999) {
      ctx.arc(WHEEL_R, WHEEL_R, WHEEL_R - 8, 0, Math.PI * 2);
      ctx.arc(WHEEL_R, WHEEL_R, WHEEL_INNER, 0, Math.PI * 2, true);
      ctx.fillStyle = color;
      ctx.fill("evenodd");
    } else {
      ctx.arc(WHEEL_R, WHEEL_R, WHEEL_R - 8, rad(slice.start), rad(slice.end));
      ctx.arc(WHEEL_R, WHEEL_R, WHEEL_INNER, rad(slice.end), rad(slice.start), true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.strokeStyle = gap;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  for (const slice of slices) {
    if (!slice.avatar) continue;
    const face = faces.get(slice.avatar);
    if (!face) continue;
    const { x, y } = wheelAvatarCenter(slice.start, slice.end);
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.fillStyle = gap;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(face, x - 15, y - 15, 30, 30);
    ctx.restore();
  }
}
