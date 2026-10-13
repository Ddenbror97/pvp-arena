/** Shared by the browser (early feedback) and the server (the real check). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIN_SIDE = 128;
/** Header dimensions above this are refused before any decoding. */
export const AVATAR_MAX_SIDE = 4096;
export const AVATAR_MAX_PIXELS = 4096 * 4096;
export const AVATAR_OUTPUT_SIDE = 256;
/** The browser uploads the finished 256×256 WebP; the server refuses anything larger. */
export const AVATAR_UPLOAD_MAX_BYTES = 200 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
export const AVATAR_LIMITS_LABEL = "Maximum 2 MB · JPG, PNG or WebP";

export type AvatarErrorCode =
  | "AUTH_REQUIRED"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "UNSUPPORTED_FORMAT"
  | "ANIMATED_IMAGE"
  | "MALFORMED_IMAGE"
  | "TOO_SMALL"
  | "TOO_LARGE_DIMENSIONS"
  | "CONTENT_REJECTED"
  | "RATE_LIMITED"
  | "SUPERSEDED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR";

export const AVATAR_ERROR_MESSAGES: Record<AvatarErrorCode, string> = {
  AUTH_REQUIRED: "Sign in to change your avatar.",
  FILE_TOO_LARGE: "This file is over 2 MB. Choose a smaller image.",
  EMPTY_FILE: "This file is empty. Choose another image.",
  UNSUPPORTED_FORMAT: "Use a JPG, PNG or WebP image.",
  ANIMATED_IMAGE: "Animated images can't be used. Choose a still image.",
  MALFORMED_IMAGE: "This image couldn't be read. Try exporting it again or choose another image.",
  TOO_SMALL: "This image is too small. Use one at least 128 × 128 pixels.",
  TOO_LARGE_DIMENSIONS: "This image is too large. Use one up to 4096 pixels on each side.",
  CONTENT_REJECTED: "This image can't be used as an avatar. Please choose another image.",
  RATE_LIMITED: "You've changed your avatar many times recently. Try again later.",
  SUPERSEDED: "A newer avatar change replaced this one.",
  SERVER_ERROR: "We couldn't save your avatar right now. Please try again.",
  NETWORK_ERROR: "The upload didn't reach us. Check your connection and try again.",
};

export function isAvatarErrorCode(v: unknown): v is AvatarErrorCode {
  return typeof v === "string" && v in AVATAR_ERROR_MESSAGES;
}

/** Crop square in the orientation-corrected image, as fractions of width/height. */
export type AvatarCrop = { x: number; y: number; size: number };
