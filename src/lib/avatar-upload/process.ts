import type { AvatarDecoder } from "./codecs";
import { AVATAR_OUTPUT_SIDE, AVATAR_UPLOAD_MAX_BYTES } from "./limits";
import { moderateAvatarImage } from "./moderation";
import { AvatarError, readImageHeader, sniffFormat } from "./sniff";
import { rebuildStillWebp } from "./webp-container";

export type VerifiedAvatar = { webp: Uint8Array; width: number; height: number };

/**
 * The browser crops and encodes; nothing it sends is trusted. The upload must
 * be a still 256×256 WebP. Its container is rebuilt from the image bitstream
 * (dropping metadata and appended data), and that exact bitstream is decoded
 * and content-checked before it can be stored.
 */
export async function verifyAvatar(
  bytes: Uint8Array,
  decoder: AvatarDecoder,
): Promise<VerifiedAvatar> {
  if (bytes.length === 0) throw new AvatarError("EMPTY_FILE");
  if (bytes.length > AVATAR_UPLOAD_MAX_BYTES) throw new AvatarError("FILE_TOO_LARGE");
  if (sniffFormat(bytes) !== "webp") throw new AvatarError("UNSUPPORTED_FORMAT");
  const header = readImageHeader(bytes);
  if (header.width !== AVATAR_OUTPUT_SIDE || header.height !== AVATAR_OUTPUT_SIDE)
    throw new AvatarError("MALFORMED_IMAGE");

  const webp = rebuildStillWebp(bytes, header.width, header.height);
  let pixels;
  try {
    pixels = await decoder.decodeWebp(webp);
  } catch {
    throw new AvatarError("MALFORMED_IMAGE");
  }
  if (
    pixels.width !== AVATAR_OUTPUT_SIDE ||
    pixels.height !== AVATAR_OUTPUT_SIDE ||
    pixels.data.length !== AVATAR_OUTPUT_SIDE * AVATAR_OUTPUT_SIDE * 4
  ) {
    throw new AvatarError("MALFORMED_IMAGE");
  }
  const verdict = await moderateAvatarImage(pixels);
  if (!verdict.ok) throw new AvatarError("CONTENT_REJECTED");
  return { webp, width: AVATAR_OUTPUT_SIDE, height: AVATAR_OUTPUT_SIDE };
}
