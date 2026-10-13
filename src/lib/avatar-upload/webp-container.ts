/**
 * Rebuilds a still WebP from its image bitstream alone. EXIF, XMP, ICC,
 * unknown chunks and anything after the RIFF payload are dropped without
 * re-encoding, so the stored file holds exactly the pixels that were checked.
 */
import { AvatarError } from "./sniff";

const ascii = (b: Uint8Array, at: number) =>
  String.fromCharCode(b[at]!, b[at + 1]!, b[at + 2]!, b[at + 3]!);
const u32le = (b: Uint8Array, i: number) =>
  (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16)) + ((b[i + 3]! << 24) >>> 0);
const le32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];

type Chunk = { type: string; data: Uint8Array };

function chunkBytes({ type, data }: Chunk): number[] {
  const out = [...type].map((c) => c.charCodeAt(0));
  out.push(...le32(data.length), ...data);
  if (data.length & 1) out.push(0);
  return out;
}

function riff(chunks: Chunk[]): Uint8Array {
  const body = [0x57, 0x45, 0x42, 0x50, ...chunks.flatMap(chunkBytes)];
  return new Uint8Array([0x52, 0x49, 0x46, 0x46, ...le32(body.length), ...body]);
}

/** Expects bytes that already passed `readImageHeader` as a still WebP. */
export function rebuildStillWebp(b: Uint8Array, width: number, height: number): Uint8Array {
  const end = u32le(b, 4) + 8;
  const chunks: Chunk[] = [];
  for (let i = 12; i + 8 <= end;) {
    const len = u32le(b, i + 4);
    if (i + 8 + len > end) throw new AvatarError("MALFORMED_IMAGE");
    chunks.push({ type: ascii(b, i), data: b.slice(i + 8, i + 8 + len) });
    i += 8 + len + (len & 1);
  }
  const image = chunks.filter((c) => c.type === "VP8 " || c.type === "VP8L");
  const alpha = chunks.filter((c) => c.type === "ALPH");
  if (image.length !== 1 || alpha.length > 1) throw new AvatarError("MALFORMED_IMAGE");
  const [bitstream] = image as [Chunk];
  if (bitstream.type === "VP8L" || !alpha.length) return riff([bitstream]);
  const vp8x = new Uint8Array([0x10, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)]);
  return riff([{ type: "VP8X", data: vp8x }, alpha[0]!, bitstream]);
}
