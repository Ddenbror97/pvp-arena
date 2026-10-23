/**
 * The match table is the supplied transparent art. Pocket centres stay on the
 * physics pockets. The cloth rectangle stays on the view.
 */

import tableUrl from "@/assets/pool/table.webp";
import { TABLE_CLOTH } from "./table-art";
import { viewOf } from "./view";

let art: HTMLImageElement | null = null;
let loading: Promise<void> | null = null;

/** Resolves once the table art can be drawn. A missing image resolves empty. */
export function whenTableArt(): Promise<void> {
  if (art) return Promise.resolve();
  if (typeof Image === "undefined") return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        art = img;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = tableUrl;
    });
  }
  return loading;
}

if (typeof window !== "undefined") void whenTableArt();

/** Draw the table art into a bitmap the match caches. Null until the art loads. */
export function buildTable(w: number, h: number): HTMLCanvasElement | null {
  if (!art || w < 1 || h < 1) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { innerW, innerH, padX, padY } = viewOf(w, h);
  const destW = (art.naturalWidth * innerW) / TABLE_CLOTH.w;
  const destH = (art.naturalHeight * innerH) / TABLE_CLOTH.h;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    art,
    padX - (TABLE_CLOTH.x * innerW) / TABLE_CLOTH.w,
    padY - (TABLE_CLOTH.y * innerH) / TABLE_CLOTH.h,
    destW,
    destH,
  );
  return canvas;
}
