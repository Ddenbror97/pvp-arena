import webpDec from "@jsquash/webp/codec/dec/webp_dec.wasm?module";
import { createDecoder } from "./codecs";

export function serverDecoder() {
  return createDecoder(webpDec);
}
