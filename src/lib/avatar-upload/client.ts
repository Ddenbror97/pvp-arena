import { supabase } from "@/integrations/supabase/client";
import {
  AVATAR_MAX_BYTES,
  AVATAR_OUTPUT_SIDE,
  isAvatarErrorCode,
  type AvatarCrop,
  type AvatarErrorCode,
} from "./limits";
import { AvatarError, readImageHeader } from "./sniff";
import { cropRect } from "./transform";

export type PickedImage = { file: File; url: string; width: number; height: number };

const QUALITY = 0.82;

/**
 * Early feedback on the original file, before cropping. The server never sees
 * the original: it independently verifies the finished avatar.
 */
export async function precheckAvatarFile(file: File): Promise<PickedImage> {
  if (file.size === 0) throw new AvatarError("EMPTY_FILE");
  if (file.size > AVATAR_MAX_BYTES) throw new AvatarError("FILE_TOO_LARGE");
  const bytes = new Uint8Array(await file.arrayBuffer());
  readImageHeader(bytes);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { file, url, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    URL.revokeObjectURL(url);
    throw new AvatarError("MALFORMED_IMAGE");
  }
}

/** Draws the crop square upright (browsers apply EXIF orientation) onto a `side`×`side` canvas. */
function drawCrop(
  image: HTMLImageElement,
  crop: AvatarCrop,
  side: number,
): HTMLCanvasElement | null {
  const { left, top, side: s } = cropRect(image.naturalWidth, image.naturalHeight, crop);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, left, top, s, s, 0, 0, side, side);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));

/** Browsers without canvas WebP encoding (Safari) load a WebAssembly encoder on demand. */
async function encodeWithWasm(canvas: HTMLCanvasElement): Promise<Blob> {
  if (import.meta.env.SSR) throw new AvatarError("SERVER_ERROR");
  const [{ default: factory }, { initEmscriptenModule }, { defaultOptions }, { default: wasmUrl }] =
    await Promise.all([
      import("@jsquash/webp/codec/enc/webp_enc.js"),
      import("@jsquash/webp/utils.js"),
      import("@jsquash/webp/meta.js"),
      import("@jsquash/webp/codec/enc/webp_enc.wasm?url"),
    ]);
  const encoder = await initEmscriptenModule(
    factory,
    await WebAssembly.compileStreaming(fetch(wasmUrl)),
  );
  const px = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
  const out = encoder.encode(px.data, px.width, px.height, {
    ...defaultOptions,
    quality: QUALITY * 100,
    method: 4,
  });
  if (!out) throw new AvatarError("SERVER_ERROR");
  return new Blob([out], { type: "image/webp" });
}

/** The finished avatar the server verifies: a still 256×256 WebP with no metadata. */
export async function renderAvatarWebp(image: HTMLImageElement, crop: AvatarCrop): Promise<Blob> {
  await image.decode().catch(() => {});
  const canvas = drawCrop(image, crop, AVATAR_OUTPUT_SIDE);
  if (!canvas) throw new AvatarError("SERVER_ERROR");
  const native = await toBlob(canvas, "image/webp", QUALITY);
  if (native?.type === "image/webp") return native;
  try {
    return await encodeWithWasm(canvas);
  } catch (e) {
    throw e instanceof AvatarError ? e : new AvatarError("SERVER_ERROR");
  }
}

export function uploadAvatarFile(
  avatar: Blob,
  onProgress: (fraction: number) => void,
): Promise<{ avatarUrl: string }> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return reject(new AvatarError("AUTH_REQUIRED"));
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/avatar/upload");
      xhr.setRequestHeader("authorization", `Bearer ${token}`);
      xhr.setRequestHeader("content-type", "image/webp");
      xhr.responseType = "json";
      xhr.timeout = 60_000;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        const body = xhr.response as { avatarUrl?: string; error?: string } | null;
        if (xhr.status === 200 && body?.avatarUrl) return resolve({ avatarUrl: body.avatarUrl });
        const code: AvatarErrorCode = isAvatarErrorCode(body?.error) ? body.error : "SERVER_ERROR";
        reject(new AvatarError(code));
      };
      xhr.onerror = () => reject(new AvatarError("NETWORK_ERROR"));
      xhr.ontimeout = () => reject(new AvatarError("NETWORK_ERROR"));
      xhr.send(avatar);
    })();
  });
}

/** Live identity preview of the chosen square. */
export async function cropPreviewUrl(
  image: HTMLImageElement,
  crop: AvatarCrop,
  side = 256,
): Promise<string | null> {
  const canvas = drawCrop(image, crop, side);
  if (!canvas) return null;
  const blob = await toBlob(canvas, "image/webp", 0.8);
  return blob ? URL.createObjectURL(blob) : null;
}
