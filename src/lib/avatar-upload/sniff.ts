/**
 * Identifies an upload from its bytes alone and reads its dimensions from the
 * header, so the server never trusts the filename, extension or browser MIME
 * type and never decodes an oversized image.
 */
import {
  AVATAR_MAX_PIXELS,
  AVATAR_MAX_SIDE,
  AVATAR_MIN_SIDE,
  type AvatarErrorCode,
} from "./limits";

export type ImageFormat = "jpeg" | "png" | "webp";
export type ImageHeader = {
  format: ImageFormat;
  width: number;
  height: number;
  orientation: number;
};

export class AvatarError extends Error {
  constructor(public code: AvatarErrorCode) {
    super(code);
  }
}

const fail = (code: AvatarErrorCode): never => {
  throw new AvatarError(code);
};

function ascii(b: Uint8Array, at: number, len: number): string {
  let s = "";
  for (let i = 0; i < len && at + i < b.length; i++) s += String.fromCharCode(b[at + i]!);
  return s;
}
const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!;
const u32be = (b: Uint8Array, i: number) =>
  ((b[i]! << 24) >>> 0) + (b[i + 1]! << 16) + (b[i + 2]! << 8) + b[i + 3]!;
const u16le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const u32le = (b: Uint8Array, i: number) =>
  (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16)) + ((b[i + 3]! << 24) >>> 0);

export function sniffFormat(b: Uint8Array): ImageFormat | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    ascii(b, 1, 3) === "PNG" &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return "png";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  return null;
}

/** EXIF orientation (1–8) from a TIFF block; 1 when absent or unreadable. */
export function exifOrientation(b: Uint8Array, start: number, end: number): number {
  if (end - start < 8) return 1;
  const order = ascii(b, start, 2);
  const le = order === "II";
  if (!le && order !== "MM") return 1;
  const r16 = (i: number) => (i + 2 > end ? -1 : le ? u16le(b, i) : u16be(b, i));
  const r32 = (i: number) => (i + 4 > end ? -1 : le ? u32le(b, i) : u32be(b, i));
  if (r16(start + 2) !== 42) return 1;
  const ifd = start + r32(start + 4);
  if (ifd < start || ifd + 2 > end) return 1;
  const count = r16(ifd);
  for (let n = 0; n < count && n < 256; n++) {
    const e = ifd + 2 + n * 12;
    if (e + 12 > end) break;
    if (r16(e) === 0x0112) {
      const v = r16(e + 8);
      return v >= 1 && v <= 8 ? v : 1;
    }
  }
  return 1;
}

function readJpeg(b: Uint8Array): ImageHeader {
  let i = 2;
  let orientation = 1;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) fail("MALFORMED_IMAGE");
    while (b[i] === 0xff && i < b.length) i++;
    const marker = b[i]!;
    i++;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xd9 || marker === 0xda) break;
    if (i + 2 > b.length) break;
    const len = u16be(b, i);
    if (len < 2 || i + len > b.length) fail("MALFORMED_IMAGE");
    if (marker === 0xe1 && ascii(b, i + 2, 4) === "Exif" && b[i + 6] === 0 && b[i + 7] === 0) {
      orientation = exifOrientation(b, i + 8, i + len);
    }
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (len < 8) fail("MALFORMED_IMAGE");
      return { format: "jpeg", height: u16be(b, i + 3), width: u16be(b, i + 5), orientation };
    }
    i += len;
  }
  return fail("MALFORMED_IMAGE");
}

function readPng(b: Uint8Array): ImageHeader {
  if (b.length < 33 || ascii(b, 12, 4) !== "IHDR" || u32be(b, 8) !== 13) fail("MALFORMED_IMAGE");
  const width = u32be(b, 16);
  const height = u32be(b, 20);
  let i = 8;
  let sawData = false;
  while (i + 12 <= b.length) {
    const len = u32be(b, i);
    const type = ascii(b, i + 4, 4);
    if (i + 12 + len > b.length) fail("MALFORMED_IMAGE");
    if (type === "acTL" || type === "fcTL") fail("ANIMATED_IMAGE");
    if (type === "IDAT") sawData = true;
    if (type === "IEND") break;
    i += 12 + len;
  }
  if (!sawData) fail("MALFORMED_IMAGE");
  return { format: "png", width, height, orientation: 1 };
}

function readWebp(b: Uint8Array): ImageHeader {
  const riff = u32le(b, 4);
  if (riff + 8 > b.length || riff < 12) fail("MALFORMED_IMAGE");
  const end = riff + 8;
  let i = 12;
  let width = 0;
  let height = 0;
  let orientation = 1;
  let sawImage = false;
  while (i + 8 <= end) {
    const type = ascii(b, i, 4);
    const len = u32le(b, i + 4);
    const data = i + 8;
    if (data + len > end) fail("MALFORMED_IMAGE");
    if (type === "ANIM" || type === "ANMF") fail("ANIMATED_IMAGE");
    if (type === "VP8X") {
      if (len < 10) fail("MALFORMED_IMAGE");
      if (b[data]! & 0x02) fail("ANIMATED_IMAGE");
      width = u24le(b, data + 4) + 1;
      height = u24le(b, data + 7) + 1;
    } else if (type === "VP8 ") {
      if (len < 10 || b[data + 3] !== 0x9d || b[data + 4] !== 0x01 || b[data + 5] !== 0x2a)
        fail("MALFORMED_IMAGE");
      if (!width) {
        width = u16le(b, data + 6) & 0x3fff;
        height = u16le(b, data + 8) & 0x3fff;
      }
      sawImage = true;
    } else if (type === "VP8L") {
      if (len < 5 || b[data] !== 0x2f) fail("MALFORMED_IMAGE");
      if (!width) {
        const bits = u32le(b, data + 1);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      sawImage = true;
    } else if (type === "EXIF") {
      const off = ascii(b, data, 6) === "Exif\0\0" ? data + 6 : data;
      orientation = exifOrientation(b, off, data + len);
    }
    i = data + len + (len & 1);
  }
  if (!sawImage || !width || !height) fail("MALFORMED_IMAGE");
  return { format: "webp", width, height, orientation };
}

export function readImageHeader(b: Uint8Array): ImageHeader {
  const format = sniffFormat(b);
  if (!format) return fail("UNSUPPORTED_FORMAT");
  const header = format === "jpeg" ? readJpeg(b) : format === "png" ? readPng(b) : readWebp(b);
  if (!header.width || !header.height) fail("MALFORMED_IMAGE");
  if (
    header.width > AVATAR_MAX_SIDE ||
    header.height > AVATAR_MAX_SIDE ||
    header.width * header.height > AVATAR_MAX_PIXELS
  ) {
    fail("TOO_LARGE_DIMENSIONS");
  }
  if (header.width < AVATAR_MIN_SIDE || header.height < AVATAR_MIN_SIDE) fail("TOO_SMALL");
  return header;
}
