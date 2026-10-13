/**
 * The server's only image codec: a WebAssembly WebP decoder used to prove an
 * upload is a real image and to read its pixels for the content check.
 * Workers cannot compile WebAssembly from bytes at runtime, so callers pass a
 * precompiled module: `codecs.server.ts` imports it through the bundler and
 * tests compile it from node_modules.
 */
import webpDec from "@jsquash/webp/codec/dec/webp_dec.js";
import { initEmscriptenModule } from "@jsquash/webp/utils.js";

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

export type AvatarDecoder = {
  decodeWebp(bytes: Uint8Array): Promise<Pixels>;
};

/** The codec builds its result with `new ImageData(...)`, which Node and Workers lack. */
function ensureImageData() {
  const g = globalThis as { ImageData?: unknown };
  if (typeof g.ImageData === "function") return;
  g.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace = "srgb";
    constructor(data: Uint8ClampedArray | number, width: number, height?: number) {
      if (typeof data === "number") {
        this.width = data;
        this.height = width;
        this.data = new Uint8ClampedArray(data * width * 4);
      } else {
        this.data = data;
        this.width = width;
        this.height = height ?? data.length / 4 / width;
      }
    }
  };
}

function ab(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

let cached: Promise<AvatarDecoder> | null = null;

export function createDecoder(webpDecModule: WebAssembly.Module): Promise<AvatarDecoder> {
  if (cached) return cached;
  cached = (async () => {
    ensureImageData();
    const webp = await initEmscriptenModule(webpDec, webpDecModule);
    return {
      async decodeWebp(bytes) {
        const img = webp.decode(ab(bytes));
        if (!img || !img.width || !img.height) throw new Error("DECODE_FAILED");
        return { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height };
      },
    } satisfies AvatarDecoder;
  })();
  cached.catch(() => {
    cached = null;
  });
  return cached;
}
